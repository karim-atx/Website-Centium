import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Banknote,
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  MessageCircle,
  Navigation,
  Phone,
  QrCode,
  Star,
  Wallet,
  Copy,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useOnline } from "../../hooks/useOnline";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { Toast } from "../../components/ui/Toast";
import { CtaButton } from "../../components/ui/PinnedCta";
import { CentiumMark } from "../../components/icons/CentiumMark";
import { initials } from "../../components/professionals/typeColour";
import { MembershipPass } from "../../components/marketplace/MembershipPass";
import { MemberTag } from "../../components/marketplace/MemberTag";
import { GymReviews } from "../../components/marketplace/GymReviews";
import { VenueImage } from "../../components/marketplace/VenueImage";
import { ClassCard, ExploreEmptyState, RetryLine } from "../../components/marketplace/ClassCard";
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
  type VenuePhoto,
  type ReviewSummary,
  purchaseGymMembership,
  type GymMembership,
  type Venue,
  type VenuePlan,
} from "../../services/venues";
import { addDaysIso, commitmentLines, currentMembership, memberTag, PERIOD, planSaving, sortPlans } from "../../services/venues/venueLogic";
import { hoursLines, isoWeekdayIn, openNowTag, type HoursRow } from "../../services/venues/hours";
import {
  fetchGymClassesThisWeek,
  fetchMarketplaceClasses,
  fetchMyBookedClassIds,
  type GymClass,
  type MarketplaceClass,
} from "../../services/marketplace";
import { formatPrice } from "../../utils/price";
import { useClassBooking, type BookOutcome } from "../../hooks/useClassBooking";
import { ClassTermsSheet } from "./ClassTermsSheet";
import { useKnownPosition } from "../../hooks/useKnownPosition";
import { distanceKm } from "../../services/geo/distance";
import { distanceText } from "../../services/marketplace/classBooking";
import { AmenityChips, CompactHeader, DetailHero, DetailLabel, DirectionsMenu, GYM_HERO, LOGO_SHADOW, MapCard, useCompactHeader } from "./venueParts";
import { recordListingEvent } from "../../services/marketplace/listingEvents";
import { firstVisitText, heroPhotos, isLivePassState, knownAmenities, parseListingSource, viewerSpotsLeft } from "../../services/marketplace/listingLogic";
import { time12Split } from "../../utils/time12";
import { formatShortDate } from "../../utils/date";

// MO1.4.2.1 Gym page (v6 Part B: MO1.4.2.1 and MO1.4.2.1.s), with its tabs
// (About, Classes OURS-gym-classes-tab, Memberships MO1.4.2.2, Reviews
// MO1.4.2.3), Directions (MO1.4.2.4), Call (MO1.4.2.5), membership checkout
// (MO1.4.2.2.1), the confirmed screen and pass (MO1.4.2.2.2, .2.4, .2.5), the
// member state (MO1.4.2.2.3) and Book a class (MO1.4.2.1.1). Opened by a gym
// card on Explore › Gyms (/app/marketplace/gym?id=…&tab=…).
//
// v6 HERO PAGE: the hero, logo, name and actions scroll away; once the name
// has passed under the top edge the compact header (back + name) fades in,
// and the tabs pin under it in one fixed area, with one hairline under the
// tabs only (MO1.4.2.1.s). The tab lives in the URL (&tab=classes), so Back
// from a class returns to the tab it was opened from.
//
// WIRED TO BACKEND STAGE 4a / 4b / 4c / 4d / A4 (Database docs/HANDOVER_API.md):
// the venue is a public.gyms row (address, coordinates, phones, entry
// methods, cover, logo, hours, time zone); plans are its business's
// membership_plans; buying one is purchase_gym_membership() (a PENDING cash
// membership: BR-04, nothing moves money; the amber "Pay on your first
// visit" tag shows until the gym marks it paid); the member state and the
// pass come from my_gym_memberships(), whose pass_state is the one derived
// truth; classes are business_classes.gym_id, booked through book_class();
// reviews are gym_review_summary() / GymReviews; Message is
// start_venue_thread() (one thread per member and venue).
//
// B13 (MK-02, MK-03, MK-04, MK-07): the hero swipes through the cover and
// the business's approved photos (business_photos, PB-O-56; the pager shows
// with two or more); About lists gyms.amenities (PB-O-51, hidden with none)
// and gyms.first_visit ("First visit", hidden when empty); a class card shows
// a non-member's spots capped by the class's Centium spots; listing events
// (fire and forget, once per session): profile_open with the &src= the page
// was opened from, map_open when a maps app is opened from Directions,
// book_tap on "Book membership" and "Confirm booking" and a class card's Book.
//
// BACKEND, NOT BUILT (pending states; nothing here is faked):
// - A start date at checkout: purchase_gym_membership() takes none, so the
//   field shows today, fixed. Whish Money is shown as coming (X-29).
// - Plan features, "Popular", a joining fee and renewal; member-side cancel.

type Tab = "about" | "classes" | "memberships" | "reviews";
const TABS: Tab[] = ["about", "classes", "memberships", "reviews"];

/** Local calendar date as YYYY-MM-DD. */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "Thu, Oct 1, 2026" (MO1.4.2.2.1 Start date). */
const longDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

/** "Mon 12 Oct" (OURS-gym-classes-tab #2), "Today", "Tomorrow". */
const dayLabel = (iso: string, today: string) => {
  if (iso === today) return "Today";
  if (iso === addDaysIso(today, 1)) return "Tomorrow";
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.getDate()} ${formatShortDate(d, { month: "short" })}`;
};

/** "HH:MM" now, for dropping a class that has already started today (book_class() refuses it, ATX86). */
const nowHHMM = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

/** A refusal the server explained (an ATX code): its own message stays inline. */
const isRefusal = (code?: string) => !!code && code.startsWith("ATX");

export function GymPage({ gymId }: { gymId: string }) {
  const { profileReady, user, authUserId } = useApp();
  const navigate = useNavigate();
  const back = useBack("/app/marketplace?tab=gyms");
  const online = useOnline();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "about";
  const [reload, setReload] = useState(0);
  const [gym, setGym] = useState<Venue | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [plans, setPlans] = useState<VenuePlan[]>([]);
  const [memberships, setMemberships] = useState<GymMembership[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [dirAnchor, setDirAnchor] = useState<HTMLButtonElement | null>(null);
  const [dirOpen, setDirOpen] = useState(false);
  const [callAnchor, setCallAnchor] = useState<HTMLButtonElement | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [view, setView] = useState<"page" | "confirmed">("page");
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
  // B9: Book a class asks for the venue's terms first (ATXE4), as the class
  // page does (useClassBooking, ClassTermsSheet).
  const booking = useClassBooking({ classId, businessId: gym?.businessId ?? null, userId: authUserId });
  // #14 PB-O-50: the distance, on the device, once it has shared its position.
  const here = useKnownPosition();
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
    // MO1.4.2.1.1 interaction 10 → MO1.4.4.2 on the class page.
    navigate(`/app/marketplace/class?id=${encodeURIComponent(id)}&booked=1`);
  };
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  // MO1.4.2.1 O-TOAST: a known refusal (an ATX code) keeps its specific line
  // where it happened; any other write failure is the shared toast.
  const [saveFailed, setSaveFailed] = useState(false);
  // A4: undefined while loading; the rows (possibly none = not published).
  const [hours, setHours] = useState<HoursRow[] | undefined>(undefined);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState<boolean | null>(null);
  // OURS-gym-classes-tab: null while loading (read when the tab first opens).
  const [classes, setClasses] = useState<MarketplaceClass[] | null>(null);
  const [classesFailed, setClassesFailed] = useState(false);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  // MO1.4.2.1.s: the compact header and the pinned tabs.
  const { setNameEl, setHeaderEl, shown: compactShown, headerH } = useCompactHeader();
  const [tabsSentinel, setTabsSentinel] = useState<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);
  const keepPin = useRef(false);

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

  // S3 (MO1.4.2.1.s): changing tab while pinned keeps the pin and brings the
  // new tab's content to its top, just under the fixed area.
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
      if (venue.value?.businessId) {
        const businessId = venue.value.businessId;
        recordListingEvent({ businessId, kind: "profile_open", source });
        void fetchVenuePhotos(businessId, venue.value.id).then((ph) => live && setPhotos(ph));
        void fetchBusinessOwner(venue.value.businessId).then((o) => live && setOwner(o));
        const p = await fetchPlansFor([venue.value.businessId]);
        if (!live) return;
        if (p.ok) {
          const sorted = sortPlans(p.value);
          setPlans(sorted);
          setPlansError(null);
          setPlanId((cur) => cur ?? sorted[0]?.id ?? null);
        } else setPlansError(p.message);
      }
    })();
    return () => {
      live = false;
    };
    // source is the URL's &src=, which a tab change keeps; the session gate
    // keeps a reload (Retry) from counting the open again.
  }, [profileReady, gymId, loadMemberships, loadSummary, reload, source]);

  // OURS-gym-classes-tab Data: this venue's classes for the next 28 days
  // (business_classes.gym_id), drawn as Explore's class cards from the
  // marketplace view, with class_seats_left() for the spots.
  const loadClasses = useCallback(async () => {
    const today = todayIso();
    const [g, all, mine] = await Promise.all([
      fetchGymClassesThisWeek(gymId, today, addDaysIso(today, 27)),
      fetchMarketplaceClasses(),
      fetchMyBookedClassIds(),
    ]);
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
  const plan = plans.find((p) => p.id === planId) ?? null;

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
    setReload((n) => n + 1);
  };

  // K19 / O-LOAD: the hero's placeholder and text skeletons (#F5F5F6 /
  // #242730, pulse 1.2 s, static under Reduce motion).
  if (gym === undefined) {
    return (
      <div aria-busy="true">
        <DetailHero height={240} onBack={back} colors={GYM_HERO} />
        <div className="flex flex-col gap-3 pt-14">
          <div className="h-[30px] w-1/2 rounded-xl bg-cream-soft animate-skeleton-pulse" />
          <div className="h-[42px] rounded-xl bg-cream-soft animate-skeleton-pulse" />
          <div className="h-[50px] rounded-2xl bg-cream-soft animate-skeleton-pulse" />
        </div>
      </div>
    );
  }
  if (!gym) {
    return (
      <div>
        <DetailHero height={240} onBack={back} colors={GYM_HERO} />
        {loadFailed ? (
          // K18 / O-ERR.
          <RetryLine className="mt-6 justify-center" message={online ? "Couldn't load this gym." : "You're offline. Try again when you're connected."} onRetry={retry} />
        ) : (
          // K16 (KEEP-SAFETY): hidden or missing, copy unchanged.
          <p className="mt-6 text-center text-[13px] text-charcoal-faint">This gym isn't listed on Explore right now.</p>
        )}
      </div>
    );
  }

  // MO1.4.2.2.2: the confirmed screen, in place of the page until Done.
  if (view === "confirmed" && mine) {
    return (
      <div className="flex flex-col items-center text-center">
        {/* The mark at the old 70 × 76 contain box (the artwork 70 × 72.65). */}
        <span className="mt-1.5 flex w-[70px] h-[76px] items-center justify-center">
          <CentiumMark framing="png" height={(70 * 713) / 687} />
        </span>
        <h1 className="mt-3 mb-0 text-[23px] font-extrabold leading-[1.25] tracking-[-0.02em] text-th-5f5093 dark:text-primary-accent">Welcome to {gym.name}</h1>
        <p className="mt-1.5 mb-0 text-[13px] text-charcoal-soft">Your membership starts today.</p>
        <div className="mt-[17px] w-full">
          <MembershipPass membership={mine} gymLocation={gym.location} memberName={user.firstName} />
        </div>
        <div aria-hidden style={{ height: 60 }} />
        <PinnedCta
          primary={{
            label: "Done",
            onClick: () => setView("page"),
            className: "!bg-fill-pinned !text-on-primary-fill",
          }}
        />
      </div>
    );
  }

  const hasCoords = gym.lat !== null && gym.lng !== null;
  const gymDistance = here && hasCoords ? distanceText(distanceKm(here, { lat: gym.lat as number, lng: gym.lng as number })) : null;
  const dest = hasCoords ? `${gym.lat},${gym.lng}` : gym.location;
  const flash = (note: string) => {
    setCopied(note);
    setTimeout(() => setCopied(null), 1600);
  };
  // MO1.4.2.5: a number hands off to the phone's dialer (tel:); Copy number
  // copies the first (the frame draws one Copy row).
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

  // MO1.4.2.1 #18-19: three outline buttons, 114 × 42, gap 8, r12, 0.5px
  // #AEA1DC (dark #A991FE) on the card fill, 13/19.5 700 #7D67D9 (dark
  // #9A8CD6) with a 15/1.75 icon 6 before the label; disabled at 40%.
  const action = (label: string, Icon: typeof Phone, onClick: ((e: React.MouseEvent<HTMLButtonElement>) => void) | null) => (
    <button
      type="button"
      onClick={onClick ?? undefined}
      disabled={!onClick}
      aria-haspopup={label === "Message" ? undefined : "menu"}
      className="tap flex-1 min-w-0 h-[42px] rounded-xl border-[0.5px] border-th-aea1dc dark:border-primary bg-cream-card inline-flex items-center justify-center gap-1.5 text-[13px] leading-[19.5px] font-bold text-th-7d67d9 dark:text-primary-accent disabled:opacity-40"
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );

  const tag = mine ? memberTag(mine.passState) : null;
  const priceOf = (p: VenuePlan) => formatPrice(p.price) || "$0";
  const buyable = !!gym.businessId;
  const ctaClass = "!bg-fill-pinned !text-on-primary-fill";
  const passCta = { label: "Show membership pass", icon: <QrCode size={16} strokeWidth={1.75} aria-hidden />, onClick: () => setPassOpen(true), className: ctaClass };

  // K11: the pinned CTA per state. About and Classes: a non-member is sent to
  // the plans; a paid member books a class; a member whose membership isn't
  // valid yet (the amber tag) shows their pass. Memberships: the pass, or
  // "Book membership · $X". Reviews: GymReviews pins its own.
  const cta =
    tab === "about" || tab === "classes"
      ? mine
        ? mine.passValid
          ? { label: "Book a class", icon: <CalendarPlus size={16} strokeWidth={1.75} aria-hidden />, onClick: () => void openBook(), className: ctaClass }
          : passCta
        : { label: "View memberships", icon: <CalendarPlus size={16} strokeWidth={1.75} aria-hidden />, onClick: () => selectTab("memberships"), className: ctaClass }
      : tab === "memberships"
      ? mine
        ? passCta
        : plan && buyable
        ? {
            label: `Book membership · ${priceOf(plan)}`,
            icon: <BadgeCheck size={16} strokeWidth={1.75} aria-hidden />,
            onClick: () => {
              if (gym.businessId) recordListingEvent({ businessId: gym.businessId, kind: "book_tap", source, itemId: plan.id });
              setCheckoutError(null);
              setCheckoutOpen(true);
            },
            className: ctaClass,
          }
        : null
      : null;

  const today = todayIso();
  const groups: { day: string; items: MarketplaceClass[] }[] = [];
  for (const c of classes ?? []) {
    const last = groups[groups.length - 1];
    if (last && last.day === c.date) last.items.push(c);
    else groups.push({ day: c.date, items: [c] });
  }

  return (
    <div>
      <CompactHeader title={gym.name} onBack={back} shown={compactShown} hairline={!stuck} headerRef={setHeaderEl} />

      <DetailHero height={240} onBack={back} photos={heroPhotos(gym.coverUrl, photos)} colors={GYM_HERO}>
        {/* #11-12: the logo frame, 64 × 64 r18 with a 2.7 white ring (dark
            #1C1F28, no shadow), its top 212.1 into the 240 hero; the light
            shadow measured on the frame PNG. A4: the venue's logo (its own
            gyms.logo_url, else its business's); with none, or one that fails
            to load, the initials 18/27 800 in a 58 r15 tile: #FFFFFF on
            #241F1B, dark #121317 on #F5F3FA (V6-148). Photo pager (#9-10):
            PB-O-56 (B13), in DetailHero, hidden with one photo. */}
        <span
          data-logo-frame=""
          className={`absolute left-4 -bottom-[36.1px] w-16 h-16 rounded-[18px] bg-cream-card border-[2.7px] border-cream-card ${LOGO_SHADOW}`}
        >
          <span className="absolute inset-[0.3px] rounded-[15px] overflow-hidden bg-charcoal flex items-center justify-center text-[18px] leading-[27px] font-extrabold text-cream">
            <VenueImage srcs={gym.logoUrls} className="absolute inset-0 w-full h-full" fallback={initials(gym.name)} />
          </span>
        </span>
      </DetailHero>

      {/* #13-15: the name 22/33 800 (10 under the logo; two lines at most),
          the Member tag on the right 6 down, the place 12.5/18.8 400 right
          under it, then "· 0.6 km" (PB-O-50, from the gym's coordinates when
          the device has shared its position). The name drives the compact
          header. */}
      <div className="mt-[46px] flex items-start gap-2.5">
        <h1 ref={setNameEl} className="m-0 flex-1 min-w-0 text-[22px] leading-[33px] font-extrabold text-charcoal line-clamp-2 [overflow-wrap:anywhere]">
          {gym.name}
        </h1>
        {tag && <MemberTag label={tag.label} tone={tag.tone} className="mt-[6px]" />}
      </div>
      {(gym.location || gymDistance) && (
        <p className="m-0 text-[12.5px] leading-[18.8px] text-charcoal-faint">{[gym.location, gymDistance].filter(Boolean).join(" · ")}</p>
      )}
      {/* #16-17: the rating pill 24 tall, pad 0 9, 0.5px #D9A441 (dark
          #E0B360) on #FBF3E2 (dark gold-pale, O3), Star 11 #D9A441 (dark
          #E0B360) 4 before "4.7 · 128 reviews" 11.5/17.3 700 #9A7424 (dark
          #CAB082, O3). From gym_review_summary(); only with a review. */}
      {summary && summary.total > 0 && (
        <div className="mt-2 flex">
          <span
            data-rating-pill=""
            className="inline-flex items-center gap-1 h-6 px-[9px] rounded-full border-[0.5px] border-[#D9A441] dark:border-[#E0B360] bg-[#FBF3E2] dark:bg-gold-pale text-[11.5px] leading-[17.3px] font-bold text-[#9A7424] dark:text-[#CAB082] tabular-nums"
          >
            <Star size={11} strokeWidth={1.5} className="fill-[#D9A441] text-[#D9A441] dark:fill-[#E0B360] dark:text-[#E0B360]" aria-hidden />
            {summary.average.toFixed(1)} · {summary.total} {summary.total === 1 ? "review" : "reviews"}
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {action("Directions", Navigation, dest ? (e) => { setDirAnchor(e.currentTarget); setDirOpen(true); } : null)}
        {action("Call", Phone, gym.phones.length > 0 ? (e) => { setCallAnchor(e.currentTarget); setCallOpen(true); } : null)}
        {/* MO1.4.2.6 (4d): a customer may start the venue's thread; a minor,
            a hidden venue or an inactive business takes no new conversation
            (K14, the server's message under the row). */}
        {action(
          "Message",
          MessageCircle,
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
        )}
      </div>
      {msgError && (
        <p role="alert" className="mt-2 mb-0 text-[12px] font-semibold text-status-high">
          {msgError}
        </p>
      )}
      {/* O-OFF: what was loaded stays; writes are off until the connection is back. */}
      {!online && (
        <p role="status" className="mt-2 mb-0 text-[12px] leading-[18px] font-semibold text-charcoal-soft">
          You're offline. Showing what was loaded.
        </p>
      )}

      {/* #20-23 / .s #1-4: the tabs in a full-bleed wrapper that pins under
          the compact header (one fixed area, fill #FFFFFF / #121317). The
          track sits 16 under the buttons (the wrapper's 6 + 10, as one 16
          here) and the content 16 under the track (pad 10, margin -10). One
          1px hairline under the tabs while pinned (V6-91). Equal tabs, the
          Part B dark track #303141. */}
      <div ref={setTabsSentinel} aria-hidden style={{ height: 1, marginBottom: -1 }} />
      <div
        data-gym-tabs=""
        data-stuck={stuck ? "true" : "false"}
        className="sticky z-20 -mx-4 px-4 pt-4 pb-2.5 -mb-2.5 bg-cream"
        style={{ top: headerH }}
      >
        <SegmentedTabs
          size="compact"
          labelSize={12}
          darkTone="partB"
          items={[
            { key: "about", label: "About" },
            { key: "classes", label: "Classes" },
            { key: "memberships", label: "Memberships" },
            { key: "reviews", label: "Reviews" },
          ]}
          activeKey={tab}
          onChange={(k) => selectTab(k as Tab)}
        />
        {stuck && <span aria-hidden data-tabs-hairline="" className="absolute inset-x-0 bottom-0 h-px bg-hair-08 dark:bg-hair-10" />}
      </div>

      {/* Room under a short tab so it can keep the pin (S3). */}
      <div style={{ minHeight: `calc(100dvh - ${headerH + 82}px)` }}>
        {plansError && (
          <p role="alert" className="mt-3 mb-0 text-[12px] font-semibold text-status-high">
            {plansError}
          </p>
        )}

        {tab === "about" && (
          <div className="mt-4 flex flex-col">
            {gym.bio && <p className="m-0 text-[14px] leading-[22.4px] text-charcoal-soft whitespace-pre-wrap [overflow-wrap:anywhere]">{gym.bio}</p>}
            <OpeningHours
              className={gym.bio ? "mt-[22px]" : ""}
              rows={hours}
              error={hoursError}
              today={isoWeekdayIn(gym.timezone)}
              openNow={openNow}
            />
            {/* Amenities (#25, #35-36): PB-O-51 (B13 gyms.amenities), hidden with none. */}
            {knownAmenities(gym.amenities).length > 0 && (
              <>
                <DetailLabel className="mt-[22px]">Amenities</DetailLabel>
                <AmenityChips className="mt-2" values={gym.amenities} />
              </>
            )}
            {/* B13 MK-02 gyms.first_visit (not drawn on this frame, OURS): the
                business side's "First visit" title, the text as the bio. */}
            {firstVisitText(gym.firstVisit) && (
              <>
                <DetailLabel className="mt-[22px]">First visit</DetailLabel>
                <p data-first-visit="" className="mt-2 mb-0 text-[14px] leading-[22.4px] text-charcoal-soft whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {firstVisitText(gym.firstVisit)}
                </p>
              </>
            )}
            {(gym.location || hasCoords) && (
              <>
                <DetailLabel className="mt-[22px]">Location</DetailLabel>
                <div className="mt-2">
                  <MapCard address={gym.location} />
                </div>
              </>
            )}
          </div>
        )}

        {tab === "classes" && (
          // OURS-gym-classes-tab: this gym's upcoming classes in place.
          <div className="mt-4 flex flex-col" data-gym-classes="">
            <p className="m-0 text-[13px] leading-[19.5px] text-charcoal-soft">Upcoming classes at {gym.name}.</p>
            {classes === null ? (
              <div className="mt-[22px] flex flex-col gap-2.5" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} aria-hidden className="h-[117.3px] rounded-[18px] bg-cream-soft animate-skeleton-pulse" />
                ))}
              </div>
            ) : classesFailed && classes.length === 0 ? (
              <RetryLine
                className="mt-4"
                message="Couldn't load classes."
                onRetry={() => {
                  setClasses(null);
                  setClassesFailed(false);
                }}
              />
            ) : classes.length === 0 ? (
              <ExploreEmptyState icon={<CalendarDays size={24} strokeWidth={1.75} />} title="No classes coming up" body="Classes at this gym will show here." />
            ) : (
              groups.map((g) => (
                <section key={g.day}>
                  <DetailLabel className="mt-[22px]">{dayLabel(g.day, today)}</DetailLabel>
                  <div className="mt-2 flex flex-col gap-2.5">
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

        {tab === "memberships" &&
          (mine ? (
            // The member's Memberships tab (not drawn): their plan, its tag
            // and dates, and the pass CTA (MO1.4.2.2.3's). B0 makes the plan
            // nullable: "Membership" then.
            <div className="mt-4 rounded-[18px] border-[1.5px] border-charcoal/10 bg-cream-card px-4 py-3.5 flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-charcoal truncate">{mine.planName || "Membership"}</span>
                <span className="block text-[11.5px] text-charcoal-faint tabular-nums">
                  {formatPrice(mine.priceAgreed) || "$0"} · {mine.expiresOn ? `until ${formatShortDate(new Date(`${mine.expiresOn}T00:00:00`), { day: "numeric", month: "short", year: "numeric" })}` : "no end date"}
                </span>
              </span>
              {tag && <MemberTag label={tag.label} tone={tag.tone} />}
            </div>
          ) : !buyable ? (
            <Empty icon={<BadgeCheck size={26} strokeWidth={1.75} />} title="No memberships yet" line="This gym doesn't sell memberships on Centium yet." />
          ) : plans.length === 0 ? (
            <Empty icon={<BadgeCheck size={26} strokeWidth={1.75} />} title="No memberships yet" line="Plans from this gym will show here." />
          ) : (
            <div className="mt-4 flex flex-col">
              {/* MO1.4.2.2 #7: 13/400 text.secondary. A membership starts the
                  day it's bought. */}
              <p className="m-0 text-[13px] leading-[1.5] text-charcoal-soft">Choose a membership. Access starts on the day you book.</p>
              <div role="radiogroup" aria-label="Memberships" className="mt-2.5 flex flex-col gap-2.5">
                {plans.map((p) => {
                  const on = p.id === planId;
                  const save = planSaving(p, plans);
                  return (
                    // MO1.4.2.2 #8-10: padding 14 16, r18, 1.5 px
                    // rgba(36,31,27,.1) edge; the selected one #7D67D9 (dark
                    // #9A8CD6) with a soft ring. Radio 18, name 15/700, price
                    // 17/800 with its unit 11.5/400; "Save N%" 12.5/400.
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPlanId(p.id)}
                      className={`tap w-full text-start rounded-[18px] bg-cream-card px-4 py-3.5 border-[1.5px] ${
                        on ? "border-th-7d67d9 dark:border-primary-accent ring-[3px] ring-primary-pale" : "border-charcoal/10"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 ${
                            on ? "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "border-[1.5px] border-charcoal/[0.18]"
                          }`}
                        >
                          {on && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className="flex-1 min-w-0 text-[15px] font-bold text-charcoal truncate">{p.name}</span>
                        <span className="shrink-0 text-[17px] font-extrabold text-charcoal tabular-nums">
                          {priceOf(p)}
                          <span className="text-[11.5px] font-normal text-charcoal-faint">/{PERIOD[p.billing]}</span>
                        </span>
                      </span>
                      {save !== null && (
                        <span className="mt-2 ms-7 flex items-center gap-2 text-[12.5px] text-charcoal-soft">
                          <span aria-hidden className="w-[5px] h-[5px] rounded-full bg-th-7d67d9 dark:bg-primary-accent" />
                          Save {save}%
                        </span>
                      )}
                      {/* MB-05 follow-up 5: the plan's commitment, information only. */}
                      {commitmentLines(p.minimumTermMonths, p.noticeDays).length > 0 && (
                        <span className="mt-1.5 ms-7 block text-[12px] text-charcoal-faint">{commitmentLines(p.minimumTermMonths, p.noticeDays).join(" · ")}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* MO1.4.2.2 #11, 12/400 text.muted: cash only; Whish coming (X-29). */}
              <p className="mt-3 mb-0 text-[12px] leading-[1.5] text-charcoal-faint">Pay in cash at the gym on your first visit. Whish Money is coming soon.</p>
            </div>
          ))}

        {tab === "reviews" && <GymReviews gymId={gym.id} gymName={gym.name} summary={summary} onChanged={() => void loadSummary()} />}

        {copied && (
          <p role="status" className="mt-3 text-center text-[12px] font-semibold text-charcoal-soft">
            {copied}
          </p>
        )}
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

      {/* MO1.4.2.5 (S5): the gym's numbers (public_phones, in order) and Copy
          number. 4a stores no label per number, so each row is the number. */}
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

      {/* MO1.4.2.2.1 (K8): the checkout sheet. */}
      <BottomSheet
        open={checkoutOpen && !!plan}
        onClose={() => !busy && setCheckoutOpen(false)}
        title={`Join ${gym.name}`}
        footer={
          plan && (
            <CtaButton
              size="page"
              label={`Book membership · ${priceOf(plan)}`}
              icon={<BadgeCheck size={16} strokeWidth={1.75} aria-hidden />}
              loading={busy}
              disabled={!online}
              className={ctaClass}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                const r = await purchaseGymMembership(gym.id, plan.id);
                if (!r.ok) {
                  setBusy(false);
                  if (isRefusal(r.code)) setCheckoutError(r.message);
                  else setSaveFailed(true);
                  // ATX83: they already hold one; show it.
                  if (r.code === "ATX83") await loadMemberships();
                  return;
                }
                await loadMemberships();
                setBusy(false);
                setCheckoutOpen(false);
                setView("confirmed");
              }}
            />
          )
        }
      >
        {plan && (
          <div className="flex flex-col">
            {/* #14-16: the summary card, a 44 r12 logo tile, the name 14.5/700,
                the plan 12/400 muted, the price 15/800. */}
            <div className="rounded-2xl border border-charcoal/[0.08] bg-cream-card p-3.5 flex items-center gap-3">
              <span className="relative w-11 h-11 rounded-xl overflow-hidden bg-charcoal flex items-center justify-center shrink-0 text-[14px] font-extrabold text-cream" aria-hidden>
                <VenueImage srcs={gym.logoUrls} className="absolute inset-0 w-full h-full" fallback={initials(gym.name)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-bold text-charcoal truncate">{gym.name}</span>
                <span className="block text-[12px] text-charcoal-faint">{plan.name} membership</span>
              </span>
              <span className="shrink-0 text-[15px] font-extrabold text-charcoal tabular-nums">{priceOf(plan)}</span>
            </div>

            <DetailLabel className="mt-[22px]">Start date</DetailLabel>
            {/* Drawn as a date field; purchase_gym_membership() starts a
                membership today and takes no date, so it is fixed. */}
            <div aria-disabled="true" className="mt-2.5 h-[46px] rounded-xl bg-cream-soft px-3.5 flex items-center gap-2.5 text-charcoal">
              <CalendarDays size={16} strokeWidth={1.75} className="text-charcoal-faint" aria-hidden />
              <span className="flex-1 text-[15px] font-medium">{longDate(new Date())}</span>
              <ChevronDown size={16} strokeWidth={1.75} className="text-charcoal-faint opacity-40" aria-hidden />
            </div>

            <DetailLabel className="mt-[22px]">Payment</DetailLabel>
            <div className="mt-2.5 flex flex-col gap-2" role="radiogroup" aria-label="Payment">
              {[
                { key: "whish", Icon: Wallet, name: "Whish Money", hint: "Coming soon", on: false, off: true },
                { key: "cash", Icon: Banknote, name: "Cash at the gym", hint: "Pay on your first visit", on: true, off: false },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={o.on}
                  disabled={o.off}
                  className={`w-full rounded-[14px] px-3 py-2.5 flex items-center gap-3 text-start bg-cream-card disabled:opacity-40 ${
                    o.on ? "border-[1.5px] border-th-7d67d9 dark:border-primary-accent ring-[3px] ring-primary-pale" : "border border-charcoal/[0.10]"
                  }`}
                >
                  <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0 text-th-7d67d9 dark:text-primary-accent" aria-hidden>
                    <o.Icon size={16} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-charcoal">{o.name}</span>
                    <span className="block text-[12px] text-charcoal-faint">{o.hint}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      o.on ? "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "border-[1.5px] border-charcoal/[0.18]"
                    }`}
                  >
                    {o.on && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>

            <DetailLabel className="mt-[22px]">Total</DetailLabel>
            <div className="mt-2.5 rounded-2xl border border-charcoal/[0.08] bg-cream-card p-3.5 flex flex-col gap-2 text-[13.5px] text-charcoal tabular-nums">
              <span className="flex justify-between gap-3">
                <span>{plan.name} membership</span>
                <span>${plan.price.toFixed(2)}</span>
              </span>
              <span className="h-px bg-charcoal/[0.08]" aria-hidden />
              <span className="flex justify-between gap-3 font-extrabold">
                <span>Total</span>
                <span>${plan.price.toFixed(2)}</span>
              </span>
            </div>
            <p className="mt-3 mb-0 text-[12px] leading-[1.5] text-charcoal-faint">
              Pay at the gym on your first visit. Your pass works once the gym marks it paid.
            </p>
            {!online && <p className="mt-3 mb-0 text-[12px] font-semibold text-charcoal-soft">You're offline.</p>}
            {checkoutError && (
              <p role="alert" className="mt-3 mb-0 text-[12px] font-semibold text-status-high">
                {checkoutError}
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      {/* MO1.4.2.2.3 (K10): Show membership pass, a centred popup (X-01 "ours":
          342 / r22 / 48). */}
      <CentredPopup open={passOpen && !!mine} onClose={() => setPassOpen(false)} title={gym.name} geometry="ours">
        {mine && <MembershipPass membership={mine} gymLocation={gym.location} memberName={user.firstName} />}
        <button type="button" onClick={() => setPassOpen(false)} className="tap mt-2 w-full h-12 text-[14px] font-bold text-th-7d67d9 dark:text-primary-accent">
          Done
        </button>
      </CentredPopup>

      {/* MO1.4.2.1.1 (K12): Book a class (no ×; outside dismisses): this
          week's classes at this venue, each with its own price. */}
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
          <DetailLabel>This week</DetailLabel>
          {week === null ? (
            <div className="mt-2.5 h-[66px] rounded-2xl bg-cream-soft animate-skeleton-pulse" aria-busy="true" />
          ) : week.length === 0 ? (
            <p className={`mt-2.5 mb-0 text-[12.5px] ${weekError ? "font-semibold text-status-high" : "text-charcoal-faint"}`} role={weekError ? "alert" : undefined}>
              {weekError ?? "No classes here this week."}
            </p>
          ) : (
            <div role="radiogroup" aria-label="This week" className="mt-2.5 flex flex-col gap-2">
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
                    className={`tap w-full rounded-2xl bg-cream-card p-2.5 flex items-center gap-3 text-start disabled:opacity-40 ${
                      on ? "border-[1.5px] border-th-7d67d9 dark:border-primary-accent ring-[3px] ring-primary-pale" : "border border-charcoal/[0.08]"
                    }`}
                  >
                    <span className="w-[39px] h-9 rounded-[10px] bg-primary-pale flex flex-col items-center justify-center shrink-0" aria-hidden>
                      <span className="text-[10px] font-extrabold uppercase leading-none text-th-7d67d9 dark:text-primary-accent">
                        {new Date(`${c.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      {/* V6-148: 12-hour, "8:00" with "AM" below. */}
                      <span className="mt-0.5 text-[13px] font-extrabold leading-none text-charcoal tabular-nums">{t?.time ?? c.startTime}</span>
                      <span className="mt-px text-[8.5px] font-extrabold leading-none text-charcoal-soft">{t?.meridiem}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-bold text-charcoal truncate">{c.title}</span>
                      <span className="block text-[12px] text-charcoal-faint">
                        {full ? "Full" : `${c.seatsLeft} ${c.seatsLeft === 1 ? "spot" : "spots"} left`}
                      </span>
                    </span>
                    <MemberTag label={c.price} tone="member" />
                  </button>
                );
              })}
            </div>
          )}
          {bookError && (
            <p role="alert" className="mt-2.5 mb-0 text-[12px] font-semibold text-status-high">
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
        {week && week.length > 0 && !online && <p className="mt-2 mb-0 text-center text-[12px] font-semibold text-charcoal-soft">You're offline.</p>}
        {/* "See all classes" (14/700 primary.accent) opens the in-place Classes tab (OURS-gym-classes-tab). */}
        <button
          type="button"
          onClick={() => {
            setBookOpen(false);
            selectTab("classes");
          }}
          className="tap mt-2 w-full h-9 text-[14px] font-bold text-th-7d67d9 dark:text-primary-accent"
        >
          See all classes
        </button>
      </CentredPopup>

      {/* OURS-class-terms (B9, ATXE4): the venue's terms before the first
          booking; Agree and book records them and books the chosen class. */}
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

      {/* O-TOAST: a write that failed for no stated reason (a dropped
          connection, a server error); nothing changed on screen. */}
      <Toast open={saveFailed} message="Couldn't save. Try again." tone="error" onExpire={() => setSaveFailed(false)} />
    </div>
  );
}

/** Foundations › Empty state, as Explore's MO1.4.3 block. */
function Empty({ icon, title, line }: { icon: React.ReactNode; title: string; line: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 px-6 pt-10">
      <span className="w-14 h-14 rounded-[18px] bg-primary-pale flex items-center justify-center text-th-7d67d9 dark:text-primary-accent">{icon}</span>
      <p className="m-0 text-[15px] font-bold text-charcoal">{title}</p>
      <p className="m-0 text-[12.5px] font-medium text-charcoal-faint leading-[1.55] max-w-[260px]">{line}</p>
    </div>
  );
}

/**
 * MO1.4.2.1 #25-34 (backend stage A4). The section label, then a 358-wide
 * card 8 under it: 0.5 px #241F1B@8% / #F5F3FA@8% edge, r16, no fill; rows
 * pad 10 14 on a 40 pitch (10 + 19.5 + 10 + 0.5) with a 0.5 px hairline at
 * 5% between (ink 30% under High contrast); the day 13/19.5 500 charcoal,
 * the hours 13/19.5 500 tabular charcoal-soft on the right, 12-hour (D1:
 * "5:30 AM to 11:00 PM", wrapping right-aligned at Larger text); today's
 * row on #F0EDF9 / #303141 in 700 #7D67D9 / #9A8CD6 (both columns), "today"
 * on the venue's clock (K22). Rows from hoursLines().
 *
 * Not drawn, kept (K2-K5): the Open now / Closed now tag beside the label
 * (venue_is_open_at; null = no tag); no published hours = one 13/19.5 500
 * muted line in the card; a failed read = the danger line under the label.
 */
function OpeningHours({
  rows,
  error,
  today,
  openNow,
  className = "",
}: {
  rows: HoursRow[] | undefined;
  error: string | null;
  today: number | null;
  openNow: boolean | null;
  className?: string;
}) {
  if (rows === undefined) {
    return (
      <div className={className} aria-busy="true">
        <div className="h-[15.8px] w-28 rounded bg-cream-soft animate-skeleton-pulse" />
        <div className="mt-2 h-[120px] rounded-2xl bg-cream-soft animate-skeleton-pulse" />
      </div>
    );
  }
  const lines = hoursLines(rows, today);
  const tag = openNowTag(openNow);
  return (
    <section className={className}>
      <div className="flex items-center justify-between gap-2">
        <DetailLabel>Opening hours</DetailLabel>
        {tag && <MemberTag label={tag.label} tone={tag.tone} />}
      </div>
      {error ? (
        <p role="alert" className="mt-2 mb-0 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      ) : (
        <div
          data-hours-card=""
          className="mt-2 rounded-2xl border-[0.5px] border-hair-08 overflow-hidden divide-y-[0.5px] divide-charcoal/[0.05] [html.high-contrast_&]:divide-charcoal/30"
        >
          {lines.length === 0 ? (
            <p className="m-0 px-[14px] py-[10px] text-[13px] leading-[19.5px] font-medium text-charcoal-faint">This gym hasn't published its opening hours yet.</p>
          ) : (
            lines.map((l) => (
              <div
                key={l.key}
                data-hours-row={l.today ? "today" : ""}
                className={`flex items-baseline justify-between gap-3 px-[14px] py-[10px] text-[13px] leading-[19.5px] ${
                  l.today ? "bg-primary-pale font-bold text-th-7d67d9 dark:text-primary-accent" : "font-medium"
                }`}
              >
                <span className={`min-w-0 ${l.today ? "" : "text-charcoal"}`}>{l.label}</span>
                <span className={`min-w-0 text-right tabular-nums ${l.today ? "" : "text-charcoal-soft"}`}>{l.value}</span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
