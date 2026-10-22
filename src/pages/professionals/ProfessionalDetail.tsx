import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Handshake, Link2, Lock } from "lucide-react";
import { PinnedSlot } from "../../components/ui/PinnedCta";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useOpenThread } from "../../components/messages/useOpenThread";
import { useIsDark } from "../../hooks/useIsDark";
import { useApp } from "../../context/AppContext";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { fetchClientSince, isActiveClientOf, professionalRole } from "../../services/connected-professional";
import { fetchPublicCv, type PublicCv } from "../../services/professional-cv";
import { VerifiedCheck } from "../../components/cv/CvBadges";
import { HireSheet } from "../../components/hire/HireSheet";
import { YourHireCard } from "../../components/hire/YourHireCard";
import { fetchMyHires, fetchPlansFor, hireDecline, hireStatusLabel, liveHireWith, planPriceLabel, type MyHire, type Plan } from "../../services/hires";
import { fetchDeclineReasonLabel, fetchMyHireRequest, sendHireRequest, type HireRequest, type HireRequestExtras, type HireRequestState } from "../../services/hire-request";
import {
  NOT_TAKING_BOOKINGS,
  bookingAllowed,
  declineIsFinal,
  declineText,
  fetchBookableSessions,
  fetchOpenSlots,
  localDay,
  mondayOf,
  previewInviteLink,
  professionalByHandle,
  sessionsThatFit,
  slotsByDay,
  weekDays,
  type BookableSession,
} from "../../services/public-pro";
import { getMyAccessRequests, type AccessRequest } from "../../services/access-requests";
import { AccessRequestNotice } from "../../components/professionals/AccessRequestNotice";
import { DataSharingSection } from "../../components/professionals/DataSharingSection";
import { useProfessionalReviews } from "../../hooks/useProfessionalReviews";
import { MyReviewCard, ReviewFormSheet } from "../../components/professionals/ReviewForms";
import { priceLabel, sessionLine } from "../../components/pro/profile/profileModel";
import { fetchPublicProfile, type PublicProfile } from "../../services/pro-profile";
import type { MarketResult } from "../../services/market/rpc";
import { HiredBadge, MarketAvatar, Star } from "../../components/market/ProfessionalCard";
import { SegmentedTicketStrip } from "../../components/market/SegmentedTicketStrip";
import { FOCUS_CSS } from "../../components/market/usePress";
import { useStrip } from "../business-market/listingParts";
import { BookingDone } from "../marketplace/PurchaseSheet";
import { BackRow, Caps, EmptyBlock, PressButton } from "./profile/parts";
import { AboutTab, type Availability, type WhereRow } from "./profile/AboutTab";
import { ServicesTab } from "./profile/ServicesTab";
import { WorkTab, type WorkState } from "./profile/WorkTab";
import { ReviewsTab } from "./profile/ReviewsTab";
import { BookSheet, type BookedResult } from "./profile/BookSheet";
import { fetchConnectedSocials } from "./profile/connectedSocials";
import { averageOf, typeLabel, profileRatingLine, reviewLines, serviceRows, sessionWhen, socialLinks, summaryFigure, summaryLine } from "./profile/profileModel";

// Market + Share 3.0 · W5 · C-MO.4.9 Professional profile (Client
// Professional Screens lines 52–158; HANDOVER §4 "C-MO.4.9"). Literal values:
// - the back row with the eyebrow "PROFESSIONAL" (10.5 / 700, 0.1em, --faint);
// - the identity (margin-top 8, gap 14, centred): the 72 avatar (initials
//   22 / 800 on the person's fixed step colour), the name 22 / 28 800, the
//   specialty 13 --ink2, the rating line 12 --faint with the 12 star
//   (margin-top 2, gap 4);
// - the hired chip (margin-top 12): HiredBadge "chip" (--tealbg / --tealink,
//   or --soft / --faint "No Centium work yet");
// - Hire / Message (margin-top 14, a 1fr 1fr grid, gap 8): 46 tall, radius
//   14, 14 / 800; Hire --fill / --onfill, Message 1px --border / --pdark;
// - the SegmentedTicketStrip About · Services · Work history · Reviews (steps
//   1–4, margin-top 14).
// D-27: no phone, email, social link or website for anyone who is not a
// CONNECTED client; every reader here selects no contact column, and the
// social handles are read only after the live connection check says yes.
//
// DATA. The live readers keep the page working while DB10 is pending:
// identity, about and CV from public_professional_directory / the public CV
// views (or the invite's own readers); Services from appointment_services
// (Book) and professional_plans_for (Hire); Reviews from professional_reviews.
// professional_public_profile (DB10) adds the hired count, point offers
// (DB2), Teaches at, Work history and the class reviews with the gym's name.
//
// KEPT LIVE FEATURES (PLAN §3.2): ?invite= banner; ?hire= deep link; "Client
// since"; CvView, Where and Availability this week under About; Book a
// session (the live booking, Services › Book); My review + edit; YourHireCard
// with Cancel hire; cancel / decline notes; AccessRequestNotice + "Choose
// what to share"; "Ask {first} for a client code"; Message + Hire (Hire
// disabled signed out; on your own profile only Message). The professional's
// own MO3 preview (`preview`) is the same page with their pinned pair.

/**
 * Optional props (Release 3 W6, MO3 public profile preview): the page as a
 * client sees it, for the professional themselves. Unset, the page is the
 * client directory profile.
 */
export interface ProfessionalDetailPreview {
  /** Whose profile, in place of the route id. */
  profileId: string;
  /** Used when the directory has no row (not listed yet): the page still shows what a client would. */
  fallbackListing: DirectoryListing | null;
  /** Top right of the back row (MO3 "Preview as client", Share). */
  headerRight?: ReactNode;
  /** Under the back row (HireAvailabilityNotice, a toast). */
  above?: ReactNode;
  /** The pinned bar in place of Message and Hire (MO3 Hire and Book a session). */
  pinned?: ReactNode;
  /** Where "See all reviews" goes (the directory reviews page needs a listing). */
  reviewsHref?: string;
}

type Tab = "about" | "services" | "work" | "reviews";
const TABS: { key: Tab; label: string }[] = [
  { key: "about", label: "About" },
  { key: "services", label: "Services" },
  { key: "work", label: "Work history" },
  { key: "reviews", label: "Reviews" },
];

type ServicesData = { allowed: boolean; sessions: BookableSession[]; plans: Plan[]; week: number[] | null };

export default function ProfessionalDetail({ preview }: { preview?: ProfessionalDetailPreview } = {}) {
  const params = useParams();
  const id = preview?.profileId ?? params.id;
  const isPreview = !!preview;
  const fallbackListing = preview?.fallbackListing ?? null;
  const navigate = useNavigate();
  const { authUserId, pointsSummary, refreshAchievements } = useApp();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const today = localDay(new Date());

  // ---- the listing (live identity), with the invite link's own readers ----
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [listingLoading, setListingLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteCode = isPreview ? null : searchParams.get("invite");

  useEffect(() => {
    if (!id) {
      setListingLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const found = await fetchListing(id);
      if (cancelled) return;
      let invited: DirectoryListing | null = null;
      if (!found && !fallbackListing && inviteCode) {
        const inv = await previewInviteLink(inviteCode);
        if (inv.ok && inv.data && inv.data.professionalId === id) {
          const byHandle = inv.data.handle ? await professionalByHandle(inv.data.handle) : null;
          const h = byHandle && byHandle.ok ? byHandle.data : null;
          invited = {
            profileId: id,
            name: inv.data.firstName,
            avatarUrl: inv.data.avatarUrl,
            subtype: inv.data.subtype,
            specialty: h?.specialty ?? null,
            location: null,
            bio: null,
            monthlyRate: null,
            consultationRate: null,
            paymentModalities: [],
            averageRating: null,
            reviewCount: 0,
            headline: h?.headline ?? null,
            skills: [],
            hasVerifiedLicence: inv.data.licenceVerified,
          };
        }
        if (cancelled) return;
      }
      setListing(found ?? fallbackListing ?? invited);
      setListingLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fallbackListing, inviteCode]);

  const isReal = !!listing;
  const proId = listing?.profileId ?? null;

  // ---- whether the caller is this professional's client (null = not answered) ----
  const [checked, setChecked] = useState<{ id: string | null; active: boolean }>({ id: null, active: false });
  const activeClient: boolean | null = proId !== null && checked.id === proId ? checked.active : null;
  useEffect(() => {
    if (!proId || isPreview) return;
    let cancelled = false;
    void isActiveClientOf(proId).then((yes) => {
      if (!cancelled) setChecked({ id: proId, active: yes });
    });
    return () => {
      cancelled = true;
    };
  }, [proId, isPreview]);
  const isConnected = activeClient === true;

  // ---- the CV (public views) ----
  const [cvState, setCvState] = useState<{ id: string | null; cv: PublicCv | null }>({ id: null, cv: null });
  const publicCv = proId !== null && cvState.id === proId ? cvState.cv : null;
  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    void fetchPublicCv(proId).then((r) => {
      if (!cancelled && r.ok) setCvState({ id: proId, cv: r.cv });
    });
    return () => {
      cancelled = true;
    };
  }, [proId]);

  // ---- "Client since" (the relationship's own start) ----
  const [since, setSince] = useState<{ id: string | null; at: string | null }>({ id: null, at: null });
  const clientSince = proId !== null && since.id === proId ? since.at : null;
  useEffect(() => {
    if (!proId || activeClient !== true) return;
    let cancelled = false;
    void fetchClientSince(proId).then((at) => {
      if (!cancelled) setSince({ id: proId, at });
    });
    return () => {
      cancelled = true;
    };
  }, [proId, activeClient]);

  // ---- D-27: social handles, for a connected client only ----
  const [socialState, setSocialState] = useState<{ id: string; s: Awaited<ReturnType<typeof fetchConnectedSocials>> } | null>(null);
  useEffect(() => {
    if (!proId || activeClient !== true || isPreview) return;
    let cancelled = false;
    void fetchConnectedSocials(proId).then((s) => {
      if (!cancelled) setSocialState({ id: proId, s });
    });
    return () => {
      cancelled = true;
    };
  }, [proId, activeClient, isPreview]);
  const socials = isConnected && socialState && socialState.id === proId ? socialLinks(socialState.s) : [];

  // ---- the caller's hires (my_hires) ----
  const [hiresState, setHiresState] = useState<{ id: string | null; hires: MyHire[] }>({ id: null, hires: [] });
  const liveHire = proId !== null && hiresState.id === proId ? liveHireWith(hiresState.hires, proId) : null;
  const [cancelNoteState, setCancelNote] = useState<{ id: string | null; note: string } | null>(null);
  const cancelNote = cancelNoteState && cancelNoteState.id === proId ? cancelNoteState.note : null;
  const loadHires = useCallback(async (forId: string) => {
    const r = await fetchMyHires();
    if (r.ok) setHiresState({ id: forId, hires: r.hires });
  }, []);
  useEffect(() => {
    if (!proId || !authUserId || isPreview) return;
    let cancelled = false;
    void fetchMyHires().then((r) => {
      if (!cancelled && r.ok) setHiresState({ id: proId, hires: r.hires });
    });
    return () => {
      cancelled = true;
    };
  }, [proId, authUserId, isPreview]);

  // ---- the free request (pending_client_requests) and the decline note ----
  const [requestState, setRequestState] = useState<{ id: string | null; state: HireRequestState; request?: HireRequest | null }>({ id: null, state: "none" });
  const hireRequestState: HireRequestState = proId !== null && requestState.id === proId ? requestState.state : "none";
  const [requestSending, setRequestSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [decline, setDecline] = useState<{ id: string; text: string; at: string | null } | null>(null);
  useEffect(() => {
    if (!proId || !authUserId || isPreview) return;
    let cancelled = false;
    void fetchMyHireRequest(proId).then(async (res) => {
      if (cancelled || res.status !== "ok") return;
      setRequestState({ id: proId, state: res.state, request: res.request });
      const r = res.request;
      if (r && r.status === "rejected" && declineIsFinal(r.resolvedAt)) {
        const label = !r.declineMessage?.trim() && r.declineReason ? await fetchDeclineReasonLabel(r.declineReason) : null;
        const text = declineText(label, r.declineMessage ?? null);
        if (!cancelled && text) setDecline({ id: proId, text, at: r.resolvedAt });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [proId, authUserId, isPreview]);
  const requestDecline = decline && decline.id === proId ? decline : null;
  const hireDeclined = proId !== null && hiresState.id === proId ? hireDecline(hiresState.hires, proId) : null;
  const hireDeclineLine = hireDeclined ? declineText(hireDeclined.label, hireDeclined.message) : null;
  const hireIsNewer = !!hireDeclineLine && (!requestDecline || new Date(hireDeclined?.at ?? 0).getTime() >= new Date(requestDecline.at ?? 0).getTime());
  const declineLine = hireRequestState === "pending" ? null : hireIsNewer ? hireDeclineLine : requestDecline?.text ?? null;
  const sendRequest = async (extras?: HireRequestExtras) => {
    if (!proId || !authUserId || requestSending) return;
    setRequestSending(true);
    setRequestError(null);
    const res = await sendHireRequest(proId, authUserId, extras);
    setRequestSending(false);
    if (res.status === "ok" || res.status === "already_pending") {
      setRequestState({ id: proId, state: "pending" });
      return;
    }
    if (res.status === "cooling_down") {
      setRequestState({ id: proId, state: "cooling_down" });
      return;
    }
    setRequestError(res.message);
  };

  // ---- the hire sheet and the ?hire=<planId> deep link ----
  const hireParam = searchParams.has("hire");
  const deepLinkPlan = searchParams.get("hire") || null;
  const [hireOpen, setHireOpen] = useState(false);
  const [hirePlan, setHirePlan] = useState<string | null>(null);
  const hireSheetOpen = hireOpen || (hireParam && isReal);
  const closeHire = () => {
    setHireOpen(false);
    setHirePlan(null);
    if (hireParam) {
      const next = new URLSearchParams(searchParams);
      next.delete("hire");
      setSearchParams(next, { replace: true });
    }
  };

  const [reviewOpen, setReviewOpen] = useState(false);
  const { open: openThread, busy: threadBusy, error: threadError } = useOpenThread(proId ?? "");
  const { mine: myReview, myStatus, others: otherReviews, error: reviewError, canReview, signedOut, loading: reviewsLoading, save: saveReview, withdraw: withdrawReview, reload: reloadReviews } = useProfessionalReviews(preview ? null : proId);

  // ---- data requests ("{first} asks to see {n} things") ----
  const [asks, setAsks] = useState<{ id: string | null; list: AccessRequest[] }>({ id: null, list: [] });
  const [sharingOpen, setSharingOpen] = useState(false);
  const loadAsks = async (forId: string) => {
    const r = await getMyAccessRequests();
    if (r.ok) setAsks({ id: forId, list: r.requests.filter((q) => q.professionalId === forId) });
  };
  useEffect(() => {
    if (!proId || isPreview || activeClient !== true) return;
    let cancelled = false;
    void getMyAccessRequests().then((r) => {
      if (!cancelled && r.ok) setAsks({ id: proId, list: r.requests.filter((q) => q.professionalId === proId) });
    });
    return () => {
      cancelled = true;
    };
  }, [proId, isPreview, activeClient]);
  const pendingAsks = asks.id === proId ? asks.list : [];

  // ---- DB10: professional_public_profile (DB2 for the offers) ----
  const [pub, setPub] = useState<{ id: string; r: MarketResult<PublicProfile | null> } | null>(null);
  const [pubReload, setPubReload] = useState(0);
  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    // awaiting DB stage DB10 (and DB2 for the point offers it carries)
    void fetchPublicProfile(proId).then((r) => {
      if (!cancelled) setPub({ id: proId, r });
    });
    return () => {
      cancelled = true;
    };
  }, [proId, pubReload]);
  const pubResult = pub && pub.id === proId ? pub.r : null;
  const profile = pubResult && pubResult.ok ? pubResult.value : null;

  // ---- Services, Where and Availability (live readers) ----
  const [svc, setSvc] = useState<{ id: string; data: ServicesData | null; error: boolean } | null>(null);
  const [svcReload, setSvcReload] = useState(0);
  useEffect(() => {
    if (!proId) return;
    let live = true;
    void (async () => {
      const [allowed, plans] = await Promise.all([bookingAllowed(proId), fetchPlansFor(proId)]);
      const sessions = allowed.ok && allowed.data ? await fetchBookableSessions(proId) : null;
      if (!live) return;
      if (!allowed.ok || (sessions && !sessions.ok)) {
        setSvc({ id: proId, data: null, error: true });
        return;
      }
      const list = sessions && sessions.ok ? sessions.data : [];
      let week: number[] | null = null;
      if (allowed.data && list.length > 0) {
        const days = weekDays(mondayOf(new Date()));
        const slots = await fetchOpenSlots(proId, localDay(days[0]), localDay(days[6]), list[0].id);
        if (slots.ok) {
          const by = slotsByDay(slots.slots);
          week = days.map((d) => sessionsThatFit(by.get(localDay(d)) ?? []));
        }
      }
      if (live) setSvc({ id: proId, data: { allowed: allowed.data, sessions: list, plans: plans.ok ? plans.plans : [], week }, error: false });
    })();
    return () => {
      live = false;
    };
  }, [proId, svcReload]);
  const services = svc && svc.id === proId ? svc : null;

  // ---- tabs, sheets, the strip ----
  const [tab, setTab] = useState<Tab>("about");
  const [bookFor, setBookFor] = useState<string | null>(null);
  const [booked, setBooked] = useState<BookedResult | null>(null);
  const [strip, showStrip] = useStrip();

  const offers = profile?.offers ?? [];
  const offersKnown = offers.length > 0;
  const balanceKnown = !!pointsSummary;
  useEffect(() => {
    if (offersKnown && !balanceKnown) refreshAchievements();
  }, [offersKnown, balanceKnown, refreshAchievements]);

  const refreshAggregate = async () => {
    if (!proId) return;
    const found = await fetchListing(proId);
    if (found) setListing(found);
  };
  const submitReview = async (rating: number, body: string, nameVisible: boolean) => {
    const message = await saveReview(rating, body, nameVisible);
    if (!message) await refreshAggregate();
    return message;
  };
  const withdrawMyReview = async () => {
    const message = await withdrawReview();
    if (!message) await refreshAggregate();
    return message;
  };

  const lines = useMemo(() => reviewLines([...otherReviews, ...(myReview && myStatus !== "withdrawn" ? [myReview] : [])], profile?.reviews ?? [], myReview?.id ?? null), [otherReviews, myReview, myStatus, profile]);

  // ---------------------------------------------------------------- render

  if (!listing) {
    if (listingLoading) {
      return (
        <div aria-busy="true" style={{ lineHeight: "normal" }}>
          <span className="sr-only">Loading…</span>
          <BackRow eyebrow="PROFESSIONAL" />
          <div aria-hidden style={{ marginTop: 8, display: "flex", gap: 14, alignItems: "center" }}>
            <span className="animate-skeleton-pulse" style={{ width: 72, height: 72, borderRadius: 999, background: m.soft }} />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="animate-skeleton-pulse" style={{ height: 22, width: "60%", borderRadius: 8, background: m.soft }} />
              <span className="animate-skeleton-pulse" style={{ height: 14, width: "45%", borderRadius: 8, background: m.soft }} />
            </span>
          </div>
          <span aria-hidden className="animate-skeleton-pulse" style={{ display: "block", marginTop: 26, height: 46, borderRadius: 14, background: m.soft }} />
          <span aria-hidden className="animate-skeleton-pulse" style={{ display: "block", marginTop: 14, height: 44, borderRadius: 16, background: m.soft }} />
        </div>
      );
    }
    return (
      <div style={{ lineHeight: "normal" }}>
        <BackRow eyebrow="PROFESSIONAL" />
        <EmptyBlock title="Professional not found." body={null}>
          <PressButton onClick={() => navigate("/app/professionals")} style={{ height: 44, padding: "0 18px", borderRadius: 14, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(14), fontWeight: 800, cursor: "pointer" }}>
            Back
          </PressButton>
        </EmptyBlock>
      </div>
    );
  }

  const name = listing.name || profile?.card.name || "Professional";
  const first = name.split(" ")[0];
  const specialty = profile?.card.specialty || professionalRole({ specialty: listing.specialty, subtype: listing.subtype }) || typeLabel(listing.subtype);
  const area = listing.location ?? profile?.card.area ?? null;
  // The rating: DB10's (client and class reviews) once it answers, else the
  // live aggregate (professional_rating_summary through the directory view).
  const avg = profile ? profile.card.rating : listing.averageRating;
  const count = profile ? profile.card.reviewCount : listing.reviewCount;
  const isOwnProfile = proId !== null && proId === authUserId;
  const showActions = !isPreview && activeClient !== null;
  const inert = isPreview || isOwnProfile;

  const sv = services?.data ?? null;
  const rows = sv
    ? serviceRows(
        sv.allowed ? sv.sessions.map((s) => ({ id: s.id, name: s.name, meta: sessionLine(s.durationMin, s.locationKind), price: priceLabel(s.price, s.currency) })) : [],
        sv.plans.map((p) => ({ id: p.id, name: p.name, meta: p.features[0] ?? null, price: planPriceLabel(p.price, p.billing) })),
      )
    : null;
  const kinds = new Set((sv?.sessions ?? []).map((s) => s.locationKind));
  const where: WhereRow[] | null = sv
    ? [
        ...(listing.location?.trim() ? [{ icon: "place" as const, title: listing.location.trim(), line: "In person" }] : []),
        ...(kinds.has("online") || kinds.has(null) ? [{ icon: "online" as const, title: "Online", line: "Video sessions" }] : []),
        ...(kinds.has("home_visit") ? [{ icon: "home" as const, title: "Home visits", line: "At your place" }] : []),
        ...(kinds.has("phone") ? [{ icon: "phone" as const, title: "Phone", line: "Phone sessions" }] : []),
      ]
    : null;
  const availability: Availability | null = sv
    ? !sv.allowed
      ? { state: "blocked", blockedLine: NOT_TAKING_BOOKINGS }
      : sv.sessions.length === 0
        ? { state: "none" }
        : sv.week
          ? { state: "ready", week: sv.week }
          : { state: "error" }
    : null;

  const specialtiesFromDb = (profile?.specialties ?? []).length > 0;
  const pills = specialtiesFromDb ? profile!.specialties : listing.skills;
  const bio = profile?.about ?? listing.bio;

  const workState: WorkState = !pubResult
    ? { kind: "loading" }
    : pubResult.ok
      ? { kind: "ready", entries: profile?.workHistory ?? [] }
      : pubResult.pending
        ? { kind: "pending" }
        : { kind: "error" };

  const classOnly = lines.length > 0 && lines.every((l) => l.context);
  const tabCount = profile ? count : lines.length > 0 ? Math.max(count, lines.length) : count;
  const tabAvg = profile ? avg : listing.averageRating ?? averageOf(lines.map((l) => l.rating));
  const figure = summaryFigure(tabAvg, tabCount);

  const bookSession = sv?.sessions.find((s) => s.id === bookFor) ?? null;
  const ownerLine = [name, typeLabel(listing.subtype)].filter(Boolean).join(" · ");

  const messageBtn = (full: boolean) => (
    <PressButton
      onClick={() => void openThread()}
      inert={threadBusy}
      aria-busy={threadBusy || undefined}
      style={{ gridColumn: full ? "1 / -1" : undefined, height: 46, borderRadius: 14, background: "transparent", border: `1px solid ${m.border}`, color: m.pdark, font: "inherit", fontSize: textPx(14), fontWeight: 800, cursor: "pointer", opacity: threadBusy ? 0.6 : 1 }}
    >
      Message
    </PressButton>
  );

  // The kept relationship blocks at the end of About.
  const aboutFooter = (
    <>
      {isConnected && (
        <p style={{ margin: "18px 0 0", display: "flex", alignItems: "center", gap: 6, fontSize: textPx(11.5), color: m.faint }}>
          <Lock size={12} strokeWidth={1.75} aria-hidden style={{ flexShrink: 0, ...NO_ICON_SCALE }} /> Manage what your professionals can see under Profile › Connected professionals.
        </p>
      )}
      {!isPreview && activeClient === false && (
        <div style={{ marginTop: 18, borderRadius: 18, background: m.pale, padding: 16 }}>
          <p style={{ margin: 0, fontSize: textPx(13.5), fontWeight: 700, color: m.pdark }}>Ask {first} for a client code</p>
          <p style={{ margin: "4px 0 0", fontSize: textPx(12), lineHeight: linePx(20), color: m.ink2 }}>{first} can generate a code for you. Redeem it from your profile to connect and start sharing data.</p>
          <PressButton
            onClick={() => void openThread()}
            inert={threadBusy}
            style={{ marginTop: 14, width: "100%", height: 40, borderRadius: 12, background: m.card, border: `1px solid ${m.border}`, color: m.pdark, font: "inherit", fontSize: textPx(13), fontWeight: 700, cursor: "pointer", opacity: threadBusy ? 0.6 : 1 }}
          >
            Message {first}
          </PressButton>
        </div>
      )}
    </>
  );

  const servicesTop =
    liveHire || cancelNote || (declineLine && !isConnected) ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 4 }}>
        {liveHire && (
          <YourHireCard
            hire={liveHire}
            onChanged={(note) => {
              if (note) setCancelNote({ id: proId, note });
              if (proId) void loadHires(proId);
            }}
          />
        )}
        {cancelNote && !liveHire && (
          <p role="status" style={{ margin: 0, fontSize: textPx(12), color: m.ink2 }}>
            {cancelNote}
          </p>
        )}
        {declineLine && !cancelNote && !liveHire && !isConnected && (
          <p role="status" style={{ margin: 0, padding: "2px 4px", fontSize: textPx(12), lineHeight: 1.5, color: m.ink2 }}>
            <b style={{ color: m.ink }}>{first} couldn't take you on:</b> {declineLine}
          </p>
        )}
      </div>
    ) : null;

  const myReviewBlock =
    !preview && (canReview === true || myReview) ? (
      <section aria-label="My review">
        <Caps>My review</Caps>
        <div style={{ marginTop: 8 }}>
          <MyReviewCard className="!rounded-[18px] !p-4" hideLabel firstName={first} review={myReview} status={myStatus} onOpen={() => setReviewOpen(true)} onWithdraw={withdrawMyReview} />
        </div>
      </section>
    ) : null;

  return (
    <div className={preview?.pinned ? "pb-[228px]" : ""} style={{ lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      {strip}
      {inviteCode && activeClient === false && (
        <div role="note" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, background: m.pale, padding: "10px 12px", marginBottom: 8 }}>
          <Link2 size={15} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: m.accent, ...NO_ICON_SCALE }} />
          <p style={{ margin: 0, flex: 1, fontSize: textPx(12.5), lineHeight: 1.45, color: m.ink }}>
            <b>{first} invited you.</b> Hire a plan below or send a message first.
          </p>
        </div>
      )}

      <BackRow eyebrow="PROFESSIONAL" aside={preview?.headerRight} />
      {preview?.above}

      {/* The identity. */}
      <div style={{ marginTop: 8, display: "flex", gap: 14, alignItems: "center" }}>
        <MarketAvatar id={listing.profileId} name={name} photoUrl={listing.avatarUrl} size={72} fontSize={22} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: textPx(22), fontWeight: 800, lineHeight: linePx(28), color: m.ink }}>
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{name}</span>
            {listing.hasVerifiedLicence && <VerifiedCheck size={18} strokeWidth={1.75} />}
          </h1>
          <div style={{ fontSize: textPx(13), color: m.ink2 }}>{specialty}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: textPx(12), color: m.faint, marginTop: 2 }}>
            <Star size={12} />
            <span>{profileRatingLine(avg, count, area)}</span>
          </div>
        </div>
      </div>

      {/* The hired chip (DB10 only: omitted while unknown) and the kept
          "Client since" pill in the same chip style. */}
      {(profile || (isConnected && clientSince)) && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {profile && <HiredBadge roles={profile.card.hiredViaCentiumCount} variant="chip" />}
          {isConnected && clientSince && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, background: m.pale, padding: "6px 10px", fontSize: textPx(12), fontWeight: 700, color: m.pdark }}>
              <Handshake size={14} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} />
              Client since {new Date(clientSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          )}
        </div>
      )}

      {/* Hire / Message (waits for the connection check, so nothing flashes). */}
      {showActions && isReal && (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {isOwnProfile ? (
            messageBtn(true)
          ) : (
            <>
              <PressButton
                inert={!authUserId}
                onClick={() => {
                  setHirePlan(null);
                  setHireOpen(true);
                }}
                aria-label={authUserId ? `Hire ${first}` : `Hire ${first}. Sign in to hire`}
                style={{ height: 46, borderRadius: 14, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(14), fontWeight: 800, cursor: authUserId ? "pointer" : "default", opacity: authUserId ? 1 : 0.4 }}
              >
                Hire
              </PressButton>
              {messageBtn(false)}
            </>
          )}
        </div>
      )}
      {threadError && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
          {threadError}
        </p>
      )}

      {isConnected && pendingAsks.length > 0 && (
        <AccessRequestNotice variant="summary" requests={pendingAsks} firstName={first} onChoose={() => setSharingOpen(true)} className="mt-3.5" />
      )}

      <SegmentedTicketStrip items={TABS} active={tab} onChange={setTab} label={`${first}'s profile`} idPrefix="pro" style={{ marginTop: 14 }} />

      <div role="tabpanel" id={`pro-panel-${tab}`} aria-labelledby={`pro-tab-${tab}`}>
        {tab === "about" && (
          <AboutTab
            bio={bio}
            specialties={pills}
            socials={socials}
            cv={publicCv}
            skills={specialtiesFromDb ? listing.skills : []}
            firstName={first}
            where={isPreview || sv ? where : null}
            availability={availability}
            offers={offers}
            balance={pointsSummary?.balance ?? 0}
            teaches={profile?.teachesAt ?? []}
            today={today}
            footer={aboutFooter}
          />
        )}
        {tab === "services" && (
          <ServicesTab
            rows={rows}
            error={!!services?.error}
            onRetry={() => setSvcReload((n) => n + 1)}
            onBook={(sid) => setBookFor(sid)}
            onHire={(pid) => {
              if (!authUserId) return;
              setHirePlan(pid);
              setHireOpen(true);
            }}
            inert={inert}
            firstName={first}
            top={servicesTop}
          />
        )}
        {tab === "work" && <WorkTab state={workState} firstName={first} today={today} onRetry={() => setPubReload((n) => n + 1)} />}
        {tab === "reviews" && (
          <ReviewsTab
            signedOut={!preview && signedOut}
            loading={!preview && reviewsLoading && lines.length === 0}
            error={reviewError}
            onRetry={() => void reloadReviews()}
            lines={lines}
            figure={figure}
            stars={figure === "New" ? 0 : Math.round(Number(figure))}
            countLine={tabCount > 0 ? summaryLine(tabCount, classOnly) : "No reviews yet"}
            firstName={first}
            onSeeAll={otherReviews.length > 0 || myReview ? () => navigate(preview?.reviewsHref ?? `/app/professionals/${listing.profileId}/reviews`) : undefined}
            mine={myReviewBlock}
          />
        )}
      </div>

      {preview?.pinned && <PinnedSlot>{preview.pinned}</PinnedSlot>}

      {isReal && !preview && (
        <HireSheet
          open={hireSheetOpen}
          onClose={closeHire}
          pro={{ id: listing.profileId, name, first, role: specialty, avatarUrl: listing.avatarUrl }}
          initialPlanId={deepLinkPlan ?? hirePlan}
          onHired={(hires, hire) => {
            setCancelNote(null);
            if (hires) setHiresState({ id: listing.profileId, hires });
            else void loadHires(listing.profileId);
            closeHire();
            showStrip(`Hired ${first} · ${hireStatusLabel(hire)}`, "success", { label: "View", onPress: () => setTab("services") });
          }}
          onMessage={() => void openThread()}
          messageBusy={threadBusy}
          request={isConnected ? undefined : { state: hireRequestState, busy: requestSending, error: requestError, onSend: (extras) => void sendRequest(extras) }}
        />
      )}

      {!preview && isReal && (
        <>
          <BottomSheet
            open={sharingOpen}
            onClose={() => {
              setSharingOpen(false);
              void loadAsks(listing.profileId);
            }}
            title={name}
          >
            {sharingOpen && <DataSharingSection professionalId={listing.profileId} />}
          </BottomSheet>
          <BookSheet
            open={!!bookSession}
            onClose={() => setBookFor(null)}
            session={bookSession}
            firstName={first}
            ownerLine={ownerLine}
            professionalId={listing.profileId}
            signedIn={!!authUserId}
            onBooked={(r) => {
              setBookFor(null);
              setBooked(r);
              setSvcReload((n) => n + 1);
            }}
          />
          <BookingDone
            open={!!booked}
            title={booked?.status === "requested" ? "Request sent" : "You're booked"}
            body={
              booked?.status === "requested"
                ? `${first} will confirm your session. You can follow it in My bookings.`
                : `Your session with ${first} is in My bookings. You can message ${first} there if you need to change it.`
            }
            rows={
              booked
                ? [
                    { k: "Session", v: booked.session.name },
                    { k: "With", v: name },
                    { k: "When", v: sessionWhen(booked.startsAt, ", ") },
                    { k: "Payment", v: booked.session.price > 0 ? `${priceLabel(booked.session.price, booked.session.currency)} · Cash` : "Free" },
                  ]
                : []
            }
            bookingsTab="upcoming"
            onDone={() => setBooked(null)}
          />
        </>
      )}

      <ReviewFormSheet open={reviewOpen} onClose={() => setReviewOpen(false)} firstName={first} existing={myReview} onSave={submitReview} onWithdraw={withdrawMyReview} />
    </div>
  );
}
