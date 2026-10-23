import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarPlus, ChevronLeft, Copy, MessageCircle, Navigation, Phone, QrCode } from "lucide-react";
import { BusinessClosedNote } from "../../components/marketplace/BusinessClosedNote";
import { useBusinessStatus } from "../../hooks/useBusinessStatus";
import { closedLine, takesNewActivity } from "../../services/business-closure/logic";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useOnline } from "../../hooks/useOnline";
import { useIsDark } from "../../hooks/useIsDark";
import { PinnedCta, CtaButton } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { Toast } from "../../components/ui/Toast";
import { MembershipPass } from "../../components/marketplace/MembershipPass";
import { MemberTag } from "../../components/marketplace/MemberTag";
import { GymReviews } from "../../components/marketplace/GymReviews";
import { ClassCard } from "../../components/marketplace/ClassCard";
import { MarketEmptyCard, MarketError, MarketOffline, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS, usePress } from "../../components/market/usePress";
import { marketPalette, type MarketPalette } from "../../theme/marketTokens";
import { linePx, textPx } from "../../theme/textSize";
import { startVenueThread } from "../../services/messaging";
import {
  fetchBusinessOwner,
  fetchGymHours,
  fetchMyGymMemberships,
  fetchPlansFor,
  fetchReviewSummary,
  fetchVenue,
  fetchVenueOpenNow,
  fetchVenuePhotos,
  purchaseGymMembership,
  type GymMembership,
  type ReviewSummary,
  type Venue,
  type VenuePhoto,
  type VenuePlan,
} from "../../services/venues";
import { addDaysIso, commitmentLines, currentMembership, memberTag, planSaving, sortPlans } from "../../services/venues/venueLogic";
import { openNowTag, type HoursRow } from "../../services/venues/hours";
import { fetchGymClassesThisWeek, fetchMarketplaceClasses, fetchMyBookedClassIds, type GymClass, type MarketplaceClass } from "../../services/marketplace";
import { formatPrice } from "../../utils/price";
import { useClassBooking, type BookOutcome } from "../../hooks/useClassBooking";
import { ClassTermsSheet } from "./ClassTermsSheet";
import { useKnownPosition } from "../../hooks/useKnownPosition";
import { distanceKm } from "../../services/geo/distance";
import { distanceText } from "../../services/marketplace/classBooking";
import { CompactHeader, DirectionsMenu, GYM_HERO, HeroGallery, HeroPlaceholder, MapDrawing, useCompactHeader } from "./venueParts";
import { recordListingEvent } from "../../services/marketplace/listingEvents";
import { AMENITY_LABELS, firstVisitText, heroPhotos, isLivePassState, knownAmenities, parseListingSource, viewerSpotsLeft } from "../../services/marketplace/listingLogic";
import { time12Split } from "../../utils/time12";
import { formatShortDate } from "../../utils/date";
import { BookingDone, PlanSummary, PurchaseSheet, confirmLabel } from "./PurchaseSheet";
import { areaOf, gymHoursRows, includesText, longDay, planExpiryIso, planRowLine, sheetPlanName, startsToday } from "./gymDetailModel";

// Market + Share 3.0 · W2 · C-MO.4.2.1 Gym detail (`gymDetail`) and
// C-MO.4.2.2 Membership purchase (`memberSheet`, `memberDone`). Literal
// values: Client Explore Screens.dc.html lines 113–202 and its script
// (`PLANS`, `pay()`, `done`). Opened by a gym card on Explore › Gyms
// (/app/marketplace/gym?id=…&tab=…&src=…).
//
// THE BOARD'S PAGE, top to bottom: the 180 cover hero (the venue's cover and
// approved photos, swiped, with the live drawn fallback; the 36 white back
// circle at 12 / 10), the name 22 / 28 800, the rating · distance · area
// line 12 --faint with the 13 gold star, then caps sections (10.5 / 700
// 0.1em --faint, 18 apart): About, Location and hours (radius 18 card, the
// live map drawing in place of MAP, address 12.5 / 700, hours rows 12.5
// --ink2), Amenities (pills), Memberships and day passes (rows with Join),
// and the "Classes at this gym" row.
//
// KEPT LIVE FEATURES (PLAN §3.1 "GymPage"), restyled under the hero: the
// photo pager, the compact header, the Member tag, the distance, the rating
// (the line carries it), Directions (Apple / Google / Copy), Call (D-26),
// Message (start_venue_thread), Opening hours with Open now, First visit,
// the Classes list (28 days, grouped by day), the plans' Save N% and
// commitment lines and the member's own plan, Reviews (GymReviews), the
// pinned CTA states, the pass popup, Book a class, ClassTermsSheet, toasts,
// the closed-business notes and the listing events.
//
// THE TRACK: the live page's four tabs become three on the board's segmented
// track (About · Classes · Reviews). About is the board's page in its order;
// Memberships lives inside it (the board puts it there), so the old
// &tab=memberships opens About scrolled to that section, and "View
// memberships" scrolls to it. "Classes at this gym" opens the Classes tab.
//
// WIRED (Database HANDOVER_API stages 4a–4d, A4, B13): public.gyms, the
// business's membership_plans (valid_for_days and includes feed the row
// lines), purchase_gym_membership() (a PENDING cash membership; nothing
// moves money), my_gym_memberships() (pass_state is the one truth),
// business_classes.gym_id + book_class(), gym_review_summary() /
// GymReviews, start_venue_thread().

type Tab = "about" | "classes" | "reviews";
const TABS: { key: Tab; label: string }[] = [
  { key: "about", label: "About" },
  { key: "classes", label: "Classes" },
  { key: "reviews", label: "Reviews" },
];

/** Local calendar date as YYYY-MM-DD. */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A class group's caps label: "Today", "Tomorrow", "Mon, Oct 12" (D-02). */
const dayLabel = (iso: string, today: string) => {
  if (iso === today) return "Today";
  if (iso === addDaysIso(today, 1)) return "Tomorrow";
  return formatShortDate(new Date(`${iso}T00:00:00`), { weekday: "short", day: "numeric", month: "short" });
};

/** "HH:MM" now, for dropping a class that has already started today (book_class() refuses it, ATX86). */
const nowHHMM = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

/** A refusal the server explained (an ATX code): its own message stays inline. */
const isRefusal = (code?: string) => !!code && code.startsWith("ATX");

const priceOf = (p: { price: number }) => formatPrice(p.price) || "$0";

export function GymPage({ gymId }: { gymId: string }) {
  const { profileReady, user, authUserId } = useApp();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const back = useBack("/app/marketplace?tab=gyms");
  const online = useOnline();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "classes" || tabParam === "reviews" ? tabParam : "about";
  const [reload, setReload] = useState(0);
  const [gym, setGym] = useState<Venue | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  // null while loading.
  const [plans, setPlans] = useState<VenuePlan[] | null>(null);
  const [memberships, setMemberships] = useState<GymMembership[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [dirAnchor, setDirAnchor] = useState<HTMLElement | null>(null);
  const [dirOpen, setDirOpen] = useState(false);
  const [callAnchor, setCallAnchor] = useState<HTMLButtonElement | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  // The plan whose Join was tapped (the purchase sheet's plan).
  const [planId, setPlanId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // memberDone: what was bought, until Done.
  const [done, setDone] = useState<{ planName: string; until: string; price: string } | null>(null);
  const [passOpen, setPassOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [week, setWeek] = useState<GymClass[] | null>(null);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  // B13 MK-03: the business's approved photos for this venue.
  const [photos, setPhotos] = useState<VenuePhoto[]>([]);
  // B13 MK-07: where the page was opened from (&src=…), else 'direct'.
  const source = parseListingSource(params.get("src"));
  // B9: Book a class asks for the venue's terms first (ATXE4), as the class page does.
  const booking = useClassBooking({ classId, businessId: gym?.businessId ?? null, userId: authUserId });
  // CP: a closed or paused business sells and books nothing new; a member keeps their pass.
  const bizStatus = useBusinessStatus(gym?.businessId);
  const takesNew = takesNewActivity(bizStatus);
  // #14 PB-O-50: the distance, on the device, once it has shared its position.
  const here = useKnownPosition();
  // O-TOAST: a write that failed for no stated reason.
  const [saveFailed, setSaveFailed] = useState(false);
  const settleBooking = (r: BookOutcome, id: string) => {
    if (r.kind === "terms") {
      setBookOpen(false);
      return;
    }
    if (r.kind === "error") {
      if (!r.message) return;
      if (isRefusal(r.code)) {
        setBookError(r.message);
        setBookOpen(true);
      } else setSaveFailed(true);
      return;
    }
    setBookOpen(false);
    navigate(`/app/marketplace/class?id=${encodeURIComponent(id)}&booked=1`);
  };
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  // A4: undefined while loading; the rows (possibly none = not published).
  const [hours, setHours] = useState<HoursRow[] | undefined>(undefined);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState<boolean | null>(null);
  // The Classes tab: null while loading (read when the tab first opens).
  const [classes, setClasses] = useState<MarketplaceClass[] | null>(null);
  const [classesFailed, setClassesFailed] = useState(false);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  // The compact header and the pinned track (v6 hero page, kept).
  const { setNameEl, setHeaderEl, shown: compactShown, headerH } = useCompactHeader();
  const [tabsSentinel, setTabsSentinel] = useState<HTMLDivElement | null>(null);
  const [trackEl, setTrackEl] = useState<HTMLDivElement | null>(null);
  const [plansEl, setPlansEl] = useState<HTMLElement | null>(null);
  const [stuck, setStuck] = useState(false);
  const keepPin = useRef(false);
  // The old &tab=memberships: About, scrolled to Memberships once.
  const wantPlans = useRef(tabParam === "memberships");

  useEffect(() => {
    if (!tabsSentinel) return;
    const h = headerH;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < h), {
      rootMargin: `${-Math.round(h)}px 0px 0px 0px`,
      threshold: [0, 1],
    });
    io.observe(tabsSentinel);
    return () => io.disconnect();
  }, [tabsSentinel, headerH]);

  // Changing tab while pinned keeps the pin and brings the new tab's content to its top.
  const selectTab = (k: Tab) => {
    if (stuck) keepPin.current = true;
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (k === "about") n.delete("tab");
        else n.set("tab", k);
        return n;
      },
      { replace: true }
    );
  };
  useLayoutEffect(() => {
    if (!keepPin.current || !tabsSentinel) return;
    keepPin.current = false;
    window.scrollTo({ top: tabsSentinel.getBoundingClientRect().top + window.scrollY - headerH + 1 });
  }, [tab, tabsSentinel, headerH]);

  /** "View memberships" / &tab=memberships: the section's label just under the pinned track. */
  const scrollToPlans = useCallback(() => {
    if (!plansEl) return;
    const under = headerH + (trackEl?.offsetHeight ?? 0) + 8;
    window.scrollTo({ top: plansEl.getBoundingClientRect().top + window.scrollY - under });
  }, [plansEl, headerH, trackEl]);
  const viewPlans = () => {
    if (tab !== "about") {
      wantPlans.current = true;
      selectTab("about");
    } else scrollToPlans();
  };
  useEffect(() => {
    if (!wantPlans.current || tab !== "about" || !plansEl || plans === null) return;
    wantPlans.current = false;
    if (tabParam === "memberships") {
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete("tab");
          return n;
        },
        { replace: true }
      );
    }
    requestAnimationFrame(scrollToPlans);
  }, [tab, tabParam, plansEl, plans, scrollToPlans, setParams]);

  useEffect(() => {
    if (!profileReady) return;
    let live = true;
    void Promise.all([fetchGymHours(gymId), fetchVenueOpenNow(gymId)]).then(([h, o]) => {
      if (!live) return;
      if (h.ok) {
        setHours(h.value);
        setHoursError(null);
      } else {
        setHours([]);
        setHoursError(h.message);
      }
      // A failed check shows no tag rather than guessing.
      setOpenNow(o.ok ? o.value : null);
    });
    return () => {
      live = false;
    };
  }, [profileReady, gymId, reload]);

  const loadSummary = useCallback(async () => {
    const r = await fetchReviewSummary(gymId);
    if (r.ok) setSummary(r.value);
  }, [gymId]);

  const loadMemberships = useCallback(async () => {
    const r = await fetchMyGymMemberships();
    if (r.ok) setMemberships(r.value);
    return r;
  }, []);

  useEffect(() => {
    if (!profileReady) return;
    let live = true;
    void (async () => {
      const [venue] = await Promise.all([fetchVenue(gymId), loadMemberships(), loadSummary()]);
      if (!live) return;
      if (!venue.ok) {
        setLoadFailed(true);
        setGym(null);
        return;
      }
      setLoadFailed(false);
      setGym(venue.value);
      if (!venue.value?.businessId) {
        setPlans([]);
        return;
      }
      const businessId = venue.value.businessId;
      recordListingEvent({ businessId, kind: "profile_open", source });
      void fetchVenuePhotos(businessId, venue.value.id).then((ph) => live && setPhotos(ph));
      void fetchBusinessOwner(businessId).then((o) => live && setOwner(o));
      const p = await fetchPlansFor([businessId]);
      if (!live) return;
      if (p.ok) {
        setPlans(sortPlans(p.value));
        setPlansError(null);
      } else {
        setPlans([]);
        setPlansError(p.message);
      }
    })();
    return () => {
      live = false;
    };
    // source is the URL's &src=, which a tab change keeps; the session gate
    // keeps a reload (Retry) from counting the open again.
  }, [profileReady, gymId, loadMemberships, loadSummary, reload, source]);

  // The Classes tab: this venue's classes for the next 28 days (business_classes.gym_id),
  // drawn as Explore's class cards from the marketplace view, with class_seats_left() for the spots.
  const loadClasses = useCallback(async () => {
    const today = todayIso();
    const [g, all, mine] = await Promise.all([fetchGymClassesThisWeek(gymId, today, addDaysIso(today, 27)), fetchMarketplaceClasses(), fetchMyBookedClassIds()]);
    if (!g.ok || !all.ok) {
      setClassesFailed(true);
      setClasses((prev) => prev ?? []);
      return;
    }
    const byId = new Map(all.classes.map((c) => [c.classId, c]));
    const hhmm = nowHHMM();
    const list: MarketplaceClass[] = [];
    for (const x of g.value) {
      if (x.date === today && x.startTime <= hhmm) continue;
      const c = byId.get(x.classId);
      if (c) list.push({ ...c, spotsRemaining: Math.max(0, x.seatsLeft), isFull: x.seatsLeft <= 0 });
    }
    setClassesFailed(false);
    setClasses(list);
    setBookedIds(mine);
  }, [gymId]);

  useEffect(() => {
    if (!profileReady || tab !== "classes" || classes !== null) return;
    void (async () => {
      await loadClasses();
    })();
  }, [profileReady, tab, classes, loadClasses]);

  const mine = useMemo(() => currentMembership(memberships, gymId), [memberships, gymId]);
  const plan = (plans ?? []).find((p) => p.id === planId) ?? null;

  const openBook = async () => {
    setBookOpen(true);
    setBookError(null);
    setWeek(null);
    setWeekError(null);
    const today = todayIso();
    const r = await fetchGymClassesThisWeek(gymId, today, addDaysIso(today, 6));
    if (!r.ok) {
      setWeekError(r.message);
      setWeek([]);
      return;
    }
    // A class earlier today has started; book_class() would refuse it (ATX86).
    const hhmm = nowHHMM();
    const upcoming = r.value.filter((c) => c.date > today || c.startTime > hhmm);
    setWeek(upcoming);
    setClassId(upcoming.find((c) => c.seatsLeft > 0)?.classId ?? null);
  };

  const retry = () => {
    setGym(undefined);
    setHours(undefined);
    setPlans(null);
    setReload((n) => n + 1);
  };

  const closeDone = useCallback(() => setDone(null), []);

  // D-04 loading: the hero's fallback and skeletons shaped like the page.
  if (gym === undefined) {
    return (
      <div aria-busy="true" style={{ lineHeight: "normal" }}>
        <GymHero onBack={back} photos={[]} m={m} />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <span aria-hidden className="animate-skeleton-pulse" style={{ display: "block", height: 28, width: "55%", borderRadius: 999, background: m.soft }} />
          <span aria-hidden className="animate-skeleton-pulse" style={{ display: "block", height: 14, width: "40%", borderRadius: 999, background: m.soft }} />
        </div>
        <MarketSkeleton radius={18} rows={4} label="Loading this gym" style={{ marginTop: 18 }} />
      </div>
    );
  }
  if (!gym) {
    return (
      <div style={{ lineHeight: "normal" }}>
        <GymHero onBack={back} photos={[]} m={m} />
        {loadFailed ? (
          <MarketError thing="this gym" onRetry={retry} style={{ marginTop: 16 }} />
        ) : (
          // K16 (KEEP-SAFETY): hidden or missing, copy unchanged.
          <p style={{ margin: "24px 0 0", textAlign: "center", fontSize: textPx(13), color: m.faint }}>This gym isn't listed on Explore right now.</p>
        )}
      </div>
    );
  }

  const hasCoords = gym.lat !== null && gym.lng !== null;
  const gymDistance = here && hasCoords ? distanceText(distanceKm(here, { lat: gym.lat as number, lng: gym.lng as number })) : null;
  const flash = (note: string) => setCopied(note);
  // MO1.4.2.5: a number hands off to the phone's dialer (tel:); Copy number copies the first.
  const call = (v: string) => {
    if (v === "copy") {
      void navigator.clipboard?.writeText(gym.phones[0]).then(
        () => flash("Number copied"),
        () => undefined
      );
      return;
    }
    const phone = gym.phones[Number(v)];
    if (phone) window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
  };
  const openDirections = (el: HTMLElement) => {
    setDirAnchor(el);
    setDirOpen(true);
  };

  const tag = mine ? memberTag(mine.passState) : null;
  const buyable = !!gym.businessId;
  const ctaClass = "!bg-fill-pinned !text-on-primary-fill";
  const passCta = { label: "Show membership pass", icon: <QrCode size={16} strokeWidth={1.75} aria-hidden />, onClick: () => setPassOpen(true), className: ctaClass };

  // K11: the pinned CTA per state. About and Classes: a non-member is sent to
  // the plans; a paid member books a class; a member whose membership isn't
  // valid yet (the amber tag) shows their pass. Reviews: GymReviews pins its own.
  const cta =
    tab === "reviews"
      ? null
      : mine
        ? mine.passValid && takesNew
          ? { label: "Book a class", icon: <CalendarPlus size={16} strokeWidth={1.75} aria-hidden />, onClick: () => void openBook(), className: ctaClass }
          : passCta
        : takesNew && buyable && (plans?.length ?? 0) > 0
          ? { label: "View memberships", icon: <CalendarPlus size={16} strokeWidth={1.75} aria-hidden />, onClick: () => viewPlans(), className: ctaClass }
          : null;

  const join = (p: VenuePlan) => {
    if (gym.businessId) recordListingEvent({ businessId: gym.businessId, kind: "book_tap", source, itemId: p.id });
    setPlanId(p.id);
    setCheckoutError(null);
    setCheckoutOpen(true);
  };

  const confirm = async () => {
    if (busy || !plan || !online) return;
    setBusy(true);
    setCheckoutError(null);
    const r = await purchaseGymMembership(gym.id, plan.id);
    if (!r.ok) {
      setBusy(false);
      // A refusal keeps the server's words; any other failure the service's
      // "Couldn't book that membership. Try again." Both inline, in the sheet.
      setCheckoutError(r.message);
      // ATX83: they already hold one; show it.
      if (r.code === "ATX83") await loadMemberships();
      return;
    }
    await loadMemberships();
    setBusy(false);
    setCheckoutOpen(false);
    setDone({ planName: plan.name, until: planExpiryIso(todayIso(), plan.validForDays, plan.billing), price: priceOf(plan) });
  };

  const today = todayIso();
  const groups: { day: string; items: MarketplaceClass[] }[] = [];
  for (const c of classes ?? []) {
    const last = groups[groups.length - 1];
    if (last && last.day === c.date) last.items.push(c);
    else groups.push({ day: c.date, items: [c] });
  }

  const amenities = knownAmenities(gym.amenities);
  const firstVisit = firstVisitText(gym.firstVisit);
  const ratingLine = [summary && summary.total > 0 ? summary.average.toFixed(1) : null, gymDistance, areaOf(gym.location) || null].filter(Boolean).join(" · ");
  const sheetPlan = plan;
  const sheetRows = sheetPlan
    ? [
        { k: "Starts", v: startsToday(today) },
        { k: "Valid until", v: longDay(planExpiryIso(today, sheetPlan.validForDays, sheetPlan.billing)) },
        ...(includesText(sheetPlan.includes, true) ? [{ k: "Includes", v: includesText(sheetPlan.includes, true) as string }] : []),
        ...(commitmentLines(sheetPlan.minimumTermMonths, sheetPlan.noticeDays).length > 0
          ? [{ k: "Commitment", v: commitmentLines(sheetPlan.minimumTermMonths, sheetPlan.noticeDays).join(" · ") }]
          : []),
      ]
    : [];

  return (
    <div style={{ lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      <CompactHeader title={gym.name} onBack={back} shown={compactShown} hairline={!stuck} headerRef={setHeaderEl} />

      <GymHero onBack={back} photos={heroPhotos(gym.coverUrl, photos)} m={m} />

      {/* The name 22 / 28 800 (16 under the hero) with the Member tag; the
          line 12 --faint, 4 under it: the 13 gold star, the rating, the
          distance (PB-O-50) and the area. */}
      <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <h1
          ref={setNameEl}
          className="line-clamp-2 [overflow-wrap:anywhere]"
          style={{ margin: 0, flex: 1, minWidth: 0, fontSize: textPx(22), lineHeight: linePx(28), fontWeight: 800, color: m.ink }}
        >
          {gym.name}
        </h1>
        {tag && <MemberTag label={tag.label} tone={tag.tone} className="mt-[3px]" />}
      </div>
      {ratingLine && (
        <div
          data-rating-line=""
          aria-label={summary && summary.total > 0 ? `Rated ${summary.average.toFixed(1)} from ${summary.total} ${summary.total === 1 ? "review" : "reviews"}. ${[gymDistance, areaOf(gym.location)].filter(Boolean).join(", ")}` : undefined}
          style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, fontSize: textPx(12), color: m.faint }}
        >
          {summary && summary.total > 0 && (
            <svg width={13} height={13} viewBox="0 0 24 24" fill={m.gold} stroke={m.gold} strokeWidth={1.5} strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
          <span style={{ minWidth: 0 }}>{ratingLine}</span>
        </div>
      )}

      {/* Kept (not drawn): Directions, Call, Message, as three --soft buttons. */}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <ActionButton m={m} label="Directions" Icon={Navigation} menu onClick={gym.location || hasCoords ? (e) => openDirections(e.currentTarget) : null} />
        <ActionButton
          m={m}
          label="Call"
          Icon={Phone}
          menu
          onClick={
            gym.phones.length > 0
              ? (e) => {
                  setCallAnchor(e.currentTarget);
                  setCallOpen(true);
                }
              : null
          }
        />
        {/* MO1.4.2.6 (4d): a customer may start the venue's thread; the server's message under the row when refused. */}
        <ActionButton
          m={m}
          label="Message"
          Icon={MessageCircle}
          onClick={
            owner && !msgBusy && online
              ? async () => {
                  setMsgBusy(true);
                  setMsgError(null);
                  const r = await startVenueThread(gym.id);
                  if (!r.ok) {
                    setMsgBusy(false);
                    setMsgError(r.message);
                    return;
                  }
                  navigate("/app/messages", { state: { threadId: r.threadId } });
                }
              : null
          }
        />
      </div>
      {msgError && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: textPx(12), fontWeight: 600, color: m.high }}>
          {msgError}
        </p>
      )}
      <BusinessClosedNote status={bizStatus} />
      {/* O-OFF: what was loaded stays; writes are off until the connection is back. */}
      <MarketOffline loaded style={{ marginTop: 10 }} />

      {/* The segmented track (--segtrack r16 p6 gap 5; 40 tall r12 13 / 700),
          pinned under the compact header with one hairline while pinned. */}
      <div ref={setTabsSentinel} aria-hidden style={{ height: 1, marginBottom: -1 }} />
      <div ref={setTrackEl} data-gym-tabs="" data-stuck={stuck ? "true" : "false"} className="sticky z-20 -mx-4 px-4" style={{ top: headerH, paddingTop: 14, paddingBottom: 10, background: m.page }}>
        <SegTrack m={m} tabs={TABS} active={tab} onChange={selectTab} />
        {stuck && <span aria-hidden data-tabs-hairline="" className="absolute inset-x-0 bottom-0" style={{ height: 1, background: m.hair }} />}
      </div>

      {/* Room under a short tab so it can keep the pin. */}
      <div style={{ minHeight: `calc(100dvh - ${headerH + 82}px)` }}>
        {tab === "about" && (
          <div data-gym-about="" style={{ display: "flex", flexDirection: "column" }}>
            {gym.bio && (
              <>
                <Caps m={m} style={{ marginTop: 8 }}>
                  About
                </Caps>
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: "6px 0 0", fontSize: textPx(13), lineHeight: linePx(19.5), color: m.ink2 }}>
                  {gym.bio}
                </p>
              </>
            )}

            <LocationHours
              m={m}
              first={!gym.bio}
              address={gym.location || null}
              showMap={!!gym.location || hasCoords}
              onMap={openDirections}
              rows={hours}
              error={hoursError}
              openNow={openNow}
            />

            {/* PB-O-51 (B13 gyms.amenities): the board's pills; hidden with none. */}
            {amenities.length > 0 && (
              <>
                <Caps m={m} style={{ marginTop: 18 }}>
                  Amenities
                </Caps>
                <ul data-amenities="" style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {amenities.map((k) => (
                    <li key={k} data-amenity={k} style={{ padding: "5px 10px", borderRadius: 999, background: m.pale, color: m.pdark, fontSize: textPx(11.5), fontWeight: 700 }}>
                      {AMENITY_LABELS[k]}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* B13 MK-02 gyms.first_visit (not drawn, kept): the bio's style. */}
            {firstVisit && (
              <>
                <Caps m={m} style={{ marginTop: 18 }}>
                  First visit
                </Caps>
                <p data-first-visit="" className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: "6px 0 0", fontSize: textPx(13), lineHeight: linePx(19.5), color: m.ink2 }}>
                  {firstVisit}
                </p>
              </>
            )}

            <section ref={setPlansEl} data-gym-plans="" aria-labelledby="gym-plans-label">
              <Caps m={m} id="gym-plans-label" style={{ marginTop: 18 }}>
                Memberships and day passes
              </Caps>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {plans === null ? (
                  <MarketSkeleton radius={18} rows={2} count={2} gap={8} label="Loading memberships" />
                ) : plansError ? (
                  <MarketError thing="memberships" onRetry={retry} />
                ) : (
                  <>
                    {mine && <MyPlanRow m={m} membership={mine} />}
                    {!mine && !takesNew ? (
                      <MarketEmptyCard title="No new memberships" body={closedLine(bizStatus, "bookings") ?? undefined} />
                    ) : !buyable ? (
                      <MarketEmptyCard title="No memberships yet" body="This gym doesn't sell memberships on Centium yet." />
                    ) : plans.length === 0 ? (
                      !mine && <MarketEmptyCard title="No memberships yet" body="Plans from this gym will show here." />
                    ) : (
                      plans.map((p) => <PlanRow key={p.id} m={m} plan={p} save={planSaving(p, plans)} onJoin={!mine && takesNew ? () => join(p) : null} />)
                    )}
                  </>
                )}
              </div>
            </section>

            {/* "Classes at this gym": 52 tall r16 --soft, 13.5 / 700, the 16 chevron --faint; opens the Classes tab. */}
            <WideRow m={m} label="Classes at this gym" onClick={() => selectTab("classes")} />
          </div>
        )}

        {tab === "classes" && (
          // The venue's upcoming classes in place (28 days, grouped by day).
          <div data-gym-classes="" style={{ display: "flex", flexDirection: "column" }}>
            <p style={{ margin: "8px 0 0", fontSize: textPx(13), lineHeight: linePx(19.5), color: m.ink2 }}>Upcoming classes at {gym.name}.</p>
            {classes === null ? (
              <MarketSkeleton radius={18} rows={3} count={3} label="Loading classes" style={{ marginTop: 18 }} />
            ) : classesFailed && classes.length === 0 ? (
              <MarketError
                thing="classes"
                onRetry={() => {
                  setClasses(null);
                  setClassesFailed(false);
                }}
                style={{ marginTop: 14 }}
              />
            ) : classes.length === 0 ? (
              <MarketEmptyCard title="No classes coming up" body="Classes at this gym will show here." style={{ marginTop: 14 }} />
            ) : (
              groups.map((g) => (
                <section key={g.day}>
                  <Caps m={m} style={{ marginTop: 18 }}>
                    {dayLabel(g.day, today)}
                  </Caps>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                    {g.items.map((c) => (
                      <ClassCard
                        key={c.classId}
                        c={(() => {
                          // B13 MK-04: a non-member's spots stop at the class's Centium spots.
                          const left = viewerSpotsLeft(c.spotsRemaining, c.centiumSpotsLeft, !!mine && isLivePassState(mine.passState));
                          return left === c.spotsRemaining ? c : { ...c, spotsRemaining: left, isFull: c.isFull || left <= 0 };
                        })()}
                        booked={bookedIds.has(c.classId)}
                        hideVenue
                        onOpen={(x) => navigate(`/app/marketplace/class?id=${encodeURIComponent(x.classId)}`)}
                        onBook={(x) => recordListingEvent({ businessId: x.businessId, kind: "book_tap", source, itemId: x.classId })}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {tab === "reviews" && <GymReviews gymId={gym.id} gymName={gym.name} summary={summary} onChanged={() => void loadSummary()} />}
      </div>

      {cta && (
        <>
          <div aria-hidden style={{ height: 60 }} />
          <PinnedCta primary={cta} />
        </>
      )}

      {/* MO1.4.2.4 (S4): Directions, shared with the class page's Location. */}
      <DirectionsMenu
        open={dirOpen}
        onClose={() => setDirOpen(false)}
        anchor={dirAnchor}
        address={gym.location}
        coords={hasCoords ? { lat: gym.lat as number, lng: gym.lng as number } : null}
        onCopied={flash}
        onMapOpen={() => gym.businessId && recordListingEvent({ businessId: gym.businessId, kind: "map_open", source })}
      />

      {/* MO1.4.2.5 (S5, D-26): the gym's numbers (public_phones, in order) and Copy number. */}
      <PopupMenu<string>
        open={callOpen}
        onClose={() => setCallOpen(false)}
        anchor={callAnchor}
        align="left"
        width={220}
        options={[
          ...gym.phones.map((p, i) => ({ value: String(i), label: p, icon: <Phone size={16} strokeWidth={1.75} /> })),
          ...(gym.phones.length > 0 ? [{ value: "copy", label: "Copy number", icon: <Copy size={16} strokeWidth={1.75} /> }] : []),
        ]}
        onSelect={call}
      />

      {/* C-MO.4.2.2 memberSheet: "Join {gym}", the plan box, cash at the front desk. */}
      <PurchaseSheet
        open={checkoutOpen && !!sheetPlan}
        onClose={() => setCheckoutOpen(false)}
        title={`Join ${gym.name}`}
        summary={sheetPlan ? <PlanSummary name={sheetPlanName(sheetPlan.name)} price={priceOf(sheetPlan)} rows={sheetRows} /> : null}
        cashHint="Pay at the front desk on your first visit"
        ctaLabel={sheetPlan && sheetPlan.price > 0 ? confirmLabel(priceOf(sheetPlan)) : "Confirm"}
        busy={busy}
        disabled={!online}
        error={checkoutError}
        note={
          <>
            <p style={{ margin: 0, fontSize: textPx(12), lineHeight: linePx(17), color: m.faint }}>Your pass works once the gym marks it paid.</p>
            {!online && <p style={{ margin: 0, fontSize: textPx(12), fontWeight: 600, color: m.ink2 }}>You're offline.</p>}
          </>
        }
        onConfirm={() => void confirm()}
      />

      {/* C-MO.4.2.2 memberDone, in place of the old confirmed screen. */}
      <BookingDone
        open={!!done}
        title="You're a member"
        body={done ? `Your ${sheetPlanName(done.planName)} at ${gym.name} starts today.` : ""}
        rows={done ? [{ k: "Plan", v: done.planName }, { k: "Valid until", v: longDay(done.until) }, { k: "Payment", v: `${done.price} · Cash at the front desk` }] : []}
        bookingsTab="memberships"
        onDone={closeDone}
      />

      {/* MO1.4.2.2.3 (K10): Show membership pass, a centred popup. */}
      <CentredPopup open={passOpen && !!mine} onClose={() => setPassOpen(false)} title={gym.name} geometry="ours">
        {mine && <MembershipPass membership={mine} gymLocation={gym.location} memberName={user.firstName} />}
        <button type="button" onClick={() => setPassOpen(false)} className="tap market-focus" style={{ marginTop: 8, width: "100%", height: 48, border: 0, background: "none", font: "inherit", fontSize: textPx(14), fontWeight: 700, color: m.ink2 }}>
          Done
        </button>
      </CentredPopup>

      {/* MO1.4.2.1.1 (K12): Book a class, this week's classes at this venue. */}
      <CentredPopup
        open={bookOpen}
        onClose={() => !busy && !booking.busy && setBookOpen(false)}
        title="Book a class"
        icon={<CalendarPlus size={22} strokeWidth={1.75} />}
        body={`${gym.name} · this week's classes`}
        bodyWeight={400}
        geometry="ours"
      >
        <div className="text-start">
          <Caps m={m}>This week</Caps>
          {week === null ? (
            <MarketSkeleton radius={18} rows={2} label="Loading this week's classes" style={{ marginTop: 10 }} />
          ) : week.length === 0 ? (
            <p role={weekError ? "alert" : undefined} style={{ margin: "10px 0 0", fontSize: textPx(12.5), fontWeight: weekError ? 600 : 400, color: weekError ? m.high : m.faint }}>
              {weekError ?? "No classes here this week."}
            </p>
          ) : (
            <div role="radiogroup" aria-label="This week" style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {week.map((c) => {
                const on = c.classId === classId;
                const full = c.seatsLeft <= 0;
                const t = time12Split(c.startTime);
                return (
                  <button
                    key={c.classId}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={full}
                    onClick={() => setClassId(c.classId)}
                    className="hit market-focus"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 10,
                      borderRadius: 14,
                      background: m.card,
                      border: on ? `1.5px solid ${m.segactive}` : `0.5px solid ${m.border}`,
                      textAlign: "start",
                      font: "inherit",
                      color: m.ink,
                      opacity: full ? 0.4 : 1,
                      cursor: full ? "default" : "pointer",
                    }}
                  >
                    <span aria-hidden style={{ width: 39, height: 36, borderRadius: 10, background: m.pale, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: m.pdark }}>{new Date(`${c.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <span style={{ marginTop: 2, fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{t?.time ?? c.startTime}</span>
                      <span style={{ marginTop: 1, fontSize: 8.5, fontWeight: 800, color: m.ink2 }}>{t?.meridiem}</span>
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="truncate" style={{ display: "block", fontSize: textPx(14), fontWeight: 700 }}>
                        {c.title}
                      </span>
                      <span style={{ display: "block", fontSize: textPx(11.5), color: m.faint }}>{full ? "Full" : `${c.seatsLeft} ${c.seatsLeft === 1 ? "spot" : "spots"} left`}</span>
                    </span>
                    <span style={{ fontSize: textPx(14), fontWeight: 800, whiteSpace: "nowrap" }}>{c.price}</span>
                  </button>
                );
              })}
            </div>
          )}
          {bookError && (
            <p role="alert" style={{ margin: "10px 0 0", fontSize: textPx(12), fontWeight: 600, color: m.high }}>
              {bookError}
            </p>
          )}
        </div>
        {week && week.length > 0 && (
          <CtaButton
            size="page"
            label="Confirm booking"
            loading={booking.busy}
            disabled={!classId || !online}
            className={`mt-5 ${ctaClass}`}
            onClick={async () => {
              if (!classId || booking.busy) return;
              if (gym.businessId) recordListingEvent({ businessId: gym.businessId, kind: "book_tap", source, itemId: classId });
              setBookError(null);
              settleBooking(await booking.start(), classId);
            }}
          />
        )}
        {week && week.length > 0 && !online && <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: textPx(12), fontWeight: 600, color: m.ink2 }}>You're offline.</p>}
        <button
          type="button"
          onClick={() => {
            setBookOpen(false);
            selectTab("classes");
          }}
          className="tap market-focus"
          style={{ marginTop: 8, width: "100%", height: 36, border: 0, background: "none", font: "inherit", fontSize: textPx(14), fontWeight: 700, color: m.accent }}
        >
          See all classes
        </button>
      </CentredPopup>

      {/* OURS-class-terms (B9, ATXE4): the venue's terms before the first booking. */}
      <ClassTermsSheet
        docs={booking.terms}
        businessName={gym.name}
        busy={booking.busy}
        online={online}
        error={booking.termsError}
        onAgree={async () => {
          if (!classId) return;
          settleBooking(await booking.agree(), classId);
        }}
        onClose={booking.closeTerms}
      />

      <Toast open={!!copied} message={copied ?? ""} onExpire={() => setCopied(null)} duration={1600} />
      {/* O-TOAST: a write that failed for no stated reason; nothing changed on screen. */}
      <Toast open={saveFailed} message="Couldn't save. Try again." tone="error" onExpire={() => setSaveFailed(false)} />
    </div>
  );
}

/**
 * The 180 cover hero (lines 115–117): the venue's cover and approved photos
 * swiped across it (B13 pager with two or more), over the live drawn
 * fallback (GYM_HERO) when there is none or none loads; the 36 --card back
 * circle at left 12, top 10 (under the safe area) with the 18 chevron, a
 * 44 hit box. The page's 24 top padding and 16 gutters are cancelled so the
 * hero is full bleed from the top edge.
 */
function GymHero({ onBack, photos, m }: { onBack: () => void; photos: string[]; m: MarketPalette }) {
  return (
    <div
      data-gym-hero=""
      className="relative -mx-4 -mt-[calc(env(safe-area-inset-top)+24px)] overflow-hidden"
      style={{ height: "calc(env(safe-area-inset-top) + 180px)", background: m.soft }}
    >
      <HeroPlaceholder height={180} base={GYM_HERO.base} band={GYM_HERO.band} />
      {photos.length > 0 && <HeroGallery photos={photos} />}
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="hit market-focus"
        style={{
          position: "absolute",
          left: 12,
          top: "calc(env(safe-area-inset-top) + 10px)",
          width: 36,
          height: 36,
          borderRadius: 999,
          border: 0,
          padding: 0,
          background: m.card,
          color: m.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** The board's caps section label: 10.5 / 700, 0.1em, uppercase, --faint. */
function Caps({ m, children, style, id }: { m: MarketPalette; children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  return (
    <h2 id={id} style={{ margin: 0, fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, ...style }}>
      {children}
    </h2>
  );
}

/**
 * The segmented track (Client Explore Screens lines 59–62): --segtrack,
 * radius 16, padding 6, gap 5; each tab 40 tall radius 12 13 / 700, active
 * --segactive / --onfill, idle --segidle / --segink. A tablist with arrow
 * keys.
 */
function SegTrack<K extends string>({ m, tabs, active, onChange }: { m: MarketPalette; tabs: { key: K; label: string }[]; active: K; onChange: (k: K) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + tabs.length) % tabs.length;
    onChange(tabs[n].key);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" aria-label="Gym sections" style={{ display: "flex", gap: 5, padding: 6, borderRadius: 16, background: m.segtrack }}>
      {tabs.map((t, i) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKey(e, i)}
            className="hit market-focus"
            style={{
              flex: 1,
              minWidth: 0,
              height: 40,
              borderRadius: 12,
              border: 0,
              background: on ? m.segactive : m.segidle,
              color: on ? m.onfill : m.segink,
              font: "inherit",
              fontSize: textPx(13),
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Directions / Call / Message (kept, not drawn): 44 tall radius 12 --soft, 13 / 700 --ink, the 15 icon --pdark; 40% when unavailable. */
function ActionButton({
  m,
  label,
  Icon,
  menu,
  onClick,
}: {
  m: MarketPalette;
  label: string;
  Icon: typeof Phone;
  menu?: boolean;
  onClick: ((e: React.MouseEvent<HTMLButtonElement>) => void) | null;
}) {
  const press = usePress();
  return (
    <button
      type="button"
      onClick={onClick ?? undefined}
      disabled={!onClick}
      aria-haspopup={menu ? "menu" : undefined}
      className="market-focus"
      {...press.handlers}
      style={{
        flex: 1,
        minWidth: 0,
        height: 44,
        borderRadius: 12,
        border: 0,
        background: m.soft,
        color: m.ink,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        font: "inherit",
        fontSize: textPx(13),
        fontWeight: 700,
        opacity: onClick ? 1 : 0.4,
        cursor: onClick ? "pointer" : "default",
        ...(onClick ? press.style : {}),
      }}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden style={{ color: m.pdark, flexShrink: 0 }} />
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * "Location and hours" (lines 123–130): the label (with the kept Open now /
 * Closed now tag on the right), then the card 8 under it: radius 18, 0.5px
 * --hair, --card; the live map drawing 96 tall in place of MAP (a button:
 * the Directions menu); then padding 12 14, column gap 6, 12.5: the address
 * 700 --ink, the hours rows --ink2 with the 12-hour range on the right.
 * Loading: --soft bars; a failed read: the danger line; none published: one
 * --faint line.
 */
function LocationHours({
  m,
  first,
  address,
  showMap,
  onMap,
  rows,
  error,
  openNow,
}: {
  m: MarketPalette;
  first: boolean;
  address: string | null;
  showMap: boolean;
  onMap: (el: HTMLElement) => void;
  rows: HoursRow[] | undefined;
  error: string | null;
  openNow: boolean | null;
}) {
  const lines = rows ? gymHoursRows(rows) : [];
  const tag = openNowTag(openNow);
  return (
    <section aria-labelledby="gym-hours-label">
      {/* The tag sits on the label's centre line without changing the board's 18 / 8 spacing. */}
      <div style={{ marginTop: first ? 8 : 18, position: "relative", paddingRight: tag ? 96 : 0 }}>
        <Caps m={m} id="gym-hours-label">
          Location and hours
        </Caps>
        {tag && (
          <span style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
            <MemberTag label={tag.label} tone={tag.tone} />
          </span>
        )}
      </div>
      <div data-hours-card="" style={{ marginTop: 8, borderRadius: 18, border: `0.5px solid ${m.hair}`, overflow: "hidden", background: m.card }}>
        {showMap && (
          <button
            type="button"
            onClick={(e) => onMap(e.currentTarget)}
            aria-haspopup="menu"
            aria-label={address ? `Directions to ${address}` : "Directions"}
            className="market-focus"
            style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", cursor: "pointer" }}
          >
            <MapDrawing style={{ height: 96 }} />
          </button>
        )}
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, fontSize: textPx(12.5) }}>
          {address && <div style={{ fontWeight: 700, color: m.ink }}>{address}</div>}
          {rows === undefined ? (
            <div role="status" aria-busy="true" aria-label="Loading opening hours" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[0, 1].map((i) => (
                <span key={i} aria-hidden className="animate-skeleton-pulse" style={{ display: "block", height: 17, borderRadius: 999, background: m.soft }} />
              ))}
            </div>
          ) : error ? (
            <p role="alert" style={{ margin: 0, fontWeight: 600, color: m.high }}>
              {error}
            </p>
          ) : lines.length === 0 ? (
            <p style={{ margin: 0, color: m.faint }}>This gym hasn't published its opening hours yet.</p>
          ) : (
            lines.map((l) => (
              <div key={l.key} data-hours-row="" style={{ display: "flex", justifyContent: "space-between", gap: 12, color: m.ink2 }}>
                <span style={{ minWidth: 0 }}>{l.label}</span>
                <span style={{ minWidth: 0, textAlign: "right" }}>{l.value}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * A plan row (lines 142–148): radius 16, 0.5px --hair, --card, padding 12
 * 12 12 14, gap 12; the name 14 / 700, the line 11.5 --faint (margin-top
 * 1); the price 14 / 800; "Join" 32 tall, padding 0 14, radius 10, --fill /
 * --onfill 12 / 800 (a 44 hit box). Kept: "Save N%" and the commitment
 * lines on a second --faint line. No Join for a member or a closed business.
 */
function PlanRow({ m, plan, save, onJoin }: { m: MarketPalette; plan: VenuePlan; save: number | null; onJoin: (() => void) | null }) {
  const press = usePress();
  const extra = [save !== null ? `Save ${save}%` : null, ...commitmentLines(plan.minimumTermMonths, plan.noticeDays)].filter(Boolean).join(" · ");
  return (
    <div data-plan-row="" style={{ borderRadius: 16, border: `0.5px solid ${m.hair}`, background: m.card, padding: "12px 12px 12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: textPx(14), fontWeight: 700, color: m.ink }}>{plan.name}</div>
        <div style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>{planRowLine(plan)}</div>
        {extra && <div style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>{extra}</div>}
      </div>
      <div style={{ fontSize: textPx(14), fontWeight: 800, whiteSpace: "nowrap", color: m.ink, fontVariantNumeric: "tabular-nums" }}>{priceOf(plan)}</div>
      {onJoin && (
        <button
          type="button"
          onClick={onJoin}
          aria-label={`Join: ${plan.name}, ${priceOf(plan)}`}
          className="hit market-focus"
          {...press.handlers}
          style={{
            height: 32,
            padding: "0 14px",
            borderRadius: 10,
            border: 0,
            background: m.fill,
            color: m.onfill,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            font: "inherit",
            fontSize: textPx(12),
            fontWeight: 800,
            cursor: "pointer",
            ...press.style,
          }}
        >
          Join
        </button>
      )}
    </div>
  );
}

/** The member's own plan (kept, not drawn): a plan row with its Member / "Pay on your first visit" tag in place of Join. */
function MyPlanRow({ m, membership }: { m: MarketPalette; membership: GymMembership }) {
  const tag = memberTag(membership.passState);
  return (
    <div data-my-plan="" style={{ borderRadius: 16, border: `0.5px solid ${m.hair}`, background: m.card, padding: "12px 12px 12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: textPx(14), fontWeight: 700, color: m.ink }}>{membership.planName || "Membership"}</div>
        <div style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>
          {membership.expiresOn ? `Your plan · valid until ${longDay(membership.expiresOn)}` : "Your plan · no end date"}
        </div>
      </div>
      <div style={{ fontSize: textPx(14), fontWeight: 800, whiteSpace: "nowrap", color: m.ink, fontVariantNumeric: "tabular-nums" }}>{formatPrice(membership.priceAgreed) || "$0"}</div>
      <MemberTag label={tag.label} tone={tag.tone} />
    </div>
  );
}

/** A 52 tall radius 16 --soft row, 13.5 / 700 --ink, the 16 chevron --faint (line 151). */
function WideRow({ m, label, onClick }: { m: MarketPalette; label: string; onClick: () => void }) {
  const press = usePress();
  return (
    <button
      type="button"
      onClick={onClick}
      className="market-focus"
      {...press.handlers}
      style={{
        marginTop: 12,
        height: 52,
        width: "100%",
        borderRadius: 16,
        border: 0,
        background: m.soft,
        color: m.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        font: "inherit",
        fontSize: textPx(13.5),
        fontWeight: 700,
        cursor: "pointer",
        textAlign: "start",
        ...press.style,
      }}
    >
      {label}
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}
