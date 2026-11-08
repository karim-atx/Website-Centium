import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BadgeCheck, Building2, Handshake, House, Link2, Lock, MapPin, Phone, Video } from "lucide-react";
import { PinnedSlot } from "../../components/ui/PinnedCta";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useOpenThread } from "../../components/messages/useOpenThread";
import { useIsDark } from "../../hooks/useIsDark";
import { useApp } from "../../context/AppContext";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { fetchClientRelationship, isActiveClientOf, professionalRole } from "../../services/connected-professional";
import { EndRelationship } from "../../components/professionals/EndRelationship";
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
  fetchProfessionalWorkplaces,
  localDay,
  mondayOf,
  previewInviteLink,
  professionalByHandle,
  sessionsThatFit,
  slotsByDay,
  weekDays,
  type BookableSession,
  type Workplace,
} from "../../services/public-pro";
import { ROLE_LABEL, roleLabel } from "../business-team/teamLogic";
import type { BusinessRole } from "../../services/business-team/types";
import { recordProfessionalEvent } from "../../services/marketplace/listingEvents";
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
import { appLocale } from "../../i18n/format";
import { t, tk, tn, tx } from "../../i18n/core";

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
// identity, about and CV from directory_professionals / the public CV
// views (or the invite's own readers); Services from appointment_services
// (Book), without the session types the professional hid from their Showcase
// (DB3 `visible`: a hidden one stays bookable by its link, so only this list
// drops it), and professional_plans_for (Hire), which leaves hidden plans out
// itself (Database PR #40); Reviews from
// professional_reviews. professional_public_profile (DB10) adds the hired
// count and Work history; public_offers the point offers. Opening a real
// profile (not a preview, not one's own) records profile_view
// (record_professional_event, once per session; DB5).
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
  /**
   * Website viewport (Professional handover v1, WP-MO.13; WP-MO Public Profile
   * Web): from 1024px the preview in the More pane: the header card (cover
   * band, the 96 avatar straddling it, name 24/32, the type and rating 15/24,
   * Hire / Book a session 44 in the card), the note under it, the equal tab
   * track 40 and the About tab in two columns (About and Specialties | Where;
   * one column on the rail). Set only on web by PublicProfile, whose pane
   * header carries Preview as client, Edit and Share.
   */
  web?: { note: ReactNode; onHire: () => void; onBook: () => void; rail: boolean };
}

const WHERE_WEB_ICONS: Record<WhereRow["icon"], React.FC<{ size?: number; style?: React.CSSProperties; "aria-hidden"?: boolean }>> = {
  place: MapPin,
  business: Building2,
  online: Video,
  home: House,
  phone: Phone,
};

type Tab = "about" | "services" | "work" | "reviews";
const TABS: { key: Tab; label: string }[] = [
  { key: "about", label: tk("About") },
  { key: "services", label: tk("Services") },
  { key: "work", label: tk("Work history") },
  { key: "reviews", label: tk("Reviews") },
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

  // DB5: a profile seen (not a preview, not one's own; the server also ignores the owner's look and an unlisted professional).
  useEffect(() => {
    if (!proId || isPreview || proId === authUserId) return;
    recordProfessionalEvent({ professionalId: proId, kind: "profile_view", source: "direct" });
  }, [proId, isPreview, authUserId]);

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

  // ---- "Client since" and End (the relationship's own start and id) ----
  const [since, setSince] = useState<{ id: string | null; rel: { id: string; joinedAt: string } | null }>({ id: null, rel: null });
  const relationship = proId !== null && since.id === proId ? since.rel : null;
  const clientSince = relationship?.joinedAt ?? null;
  // Round I: what's left after End, until another professional is opened.
  const [endedFor, setEndedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!proId || activeClient !== true) return;
    let cancelled = false;
    void fetchClientRelationship(proId).then((rel) => {
      if (!cancelled) setSince({ id: proId, rel });
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

  // ---- DB10: professional_public_profile (+ public_offers for the offers) ----
  const [pub, setPub] = useState<{ id: string; r: MarketResult<PublicProfile | null> } | null>(null);
  const [pubReload, setPubReload] = useState(0);
  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    // professional_public_profile + work_history (Database Release 2) + public_offers (Database PR #39):
    // the header's rating is professional_rating() (client and class reviews). Class-context reviews and
    // Teaches at have no reader in the contract (Database gap): those parts keep their live sources.
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

  // ---- W7-9: where they work (professional_workplaces) ----
  const [workplaces, setWorkplaces] = useState<{ id: string; list: Workplace[] } | null>(null);
  useEffect(() => {
    if (!proId) return;
    let live = true;
    void fetchProfessionalWorkplaces(proId).then((r) => {
      if (live && r.ok) setWorkplaces({ id: proId, list: r.data });
    });
    return () => {
      live = false;
    };
  }, [proId]);

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
          <span className="sr-only">{t("Loading…")}</span>
          <BackRow eyebrow={t("PROFESSIONAL")} />
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
        <BackRow eyebrow={t("PROFESSIONAL")} />
        <EmptyBlock title={t("Professional not found.")} body={null}>
          <PressButton onClick={() => navigate("/app/professionals")} style={{ height: 44, padding: "0 18px", borderRadius: 14, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(14), fontWeight: 800, cursor: "pointer" }}>
            {t("Back")}
          </PressButton>
        </EmptyBlock>
      </div>
    );
  }

  const name = listing.name || profile?.card.name || t("Professional");
  const first = name.split(" ")[0];
  // professionalRole's subtype label is an English key (the specialty itself is the professional's own text).
  const specialty = profile?.card.specialty || t(professionalRole({ specialty: listing.specialty, subtype: listing.subtype }) ?? "") || typeLabel(listing.subtype);
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
        sv.allowed ? sv.sessions.filter((s) => s.visible).map((s) => ({ id: s.id, name: s.name, meta: sessionLine(s.durationMin, s.locationKind), price: priceLabel(s.price, s.currency) })) : [],
        sv.plans.map((p) => ({ id: p.id, name: p.name, meta: p.features[0] ?? null, price: planPriceLabel(p.price, p.billing) })),
      )
    : null;
  const kinds = new Set((sv?.sessions ?? []).map((s) => s.locationKind));
  // Release B (20261217010000; MO3 v3, PLAN S1): how they work, from
  // professional_public_profile. The in-person row reads "In person · within
  // {n} km" once the service radius is known, and isn't shown for one who
  // works only online; online or both modes give the "Online" row without an
  // online session type.
  const workMode = profile?.workMode ?? null;
  const radiusKm = profile?.serviceRadiusKm ?? null;
  const inPersonLine = radiusKm != null && radiusKm > 0 ? t("In person · within {km} km", { km: Math.round(radiusKm * 10) / 10 }) : t("In person");
  const where: WhereRow[] | null = sv
    ? [
        ...(listing.location?.trim() && workMode !== "online" ? [{ icon: "place" as const, title: listing.location.trim(), line: inPersonLine }] : []),
        // A session type with no location_kind says nothing about where (DJ,
        // Karim 2026-10-27): it no longer reads as "Online".
        ...(kinds.has("online") || workMode === "online" || workMode === "both" ? [{ icon: "online" as const, title: tx("Online", "session format"), line: t("Video sessions") }] : []),
        ...(kinds.has("home_visit") ? [{ icon: "home" as const, title: t("Home visits"), line: t("At your place") }] : []),
        ...(kinds.has("phone") ? [{ icon: "phone" as const, title: t("Phone"), line: t("Phone sessions") }] : []),
      ]
    : null;
  const availability: Availability | null = sv
    ? !sv.allowed
      ? { state: "blocked", blockedLine: t(NOT_TAKING_BOOKINGS) }
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
      {t("Message")}
    </PressButton>
  );

  // The kept relationship blocks at the end of About.
  const aboutFooter = (
    <>
      {isConnected && (
        <p style={{ margin: "18px 0 0", display: "flex", alignItems: "center", gap: 6, fontSize: textPx(11.5), color: m.faint }}>
          <Lock size={12} strokeWidth={1.75} aria-hidden style={{ flexShrink: 0, ...NO_ICON_SCALE }} /> {t("Manage what your professionals can see under Profile › Connected professionals.")}
        </p>
      )}
      {!isPreview && activeClient === false && (
        <div style={{ marginTop: 18, borderRadius: 18, background: m.pale, padding: 16 }}>
          <p style={{ margin: 0, fontSize: textPx(13.5), fontWeight: 700, color: m.pdark }}>{t("Ask {name} for a client code", { name: first })}</p>
          <p style={{ margin: "4px 0 0", fontSize: textPx(12), lineHeight: linePx(20), color: m.ink2 }}>{t("{name} can generate a code for you. Redeem it from your profile to connect and start sharing data.", { name: first })}</p>
          <PressButton
            onClick={() => void openThread()}
            inert={threadBusy}
            style={{ marginTop: 14, width: "100%", height: 40, borderRadius: 12, background: m.card, border: `1px solid ${m.border}`, color: m.pdark, font: "inherit", fontSize: textPx(13), fontWeight: 700, cursor: "pointer", opacity: threadBusy ? 0.6 : 1 }}
          >
            {t("Message {name}", { name: first })}
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
            <b style={{ color: m.ink }}>{t("{name} couldn't take you on:", { name: first })}</b> {declineLine}
          </p>
        )}
      </div>
    ) : null;

  const myReviewBlock =
    !preview && (canReview === true || myReview) ? (
      <section aria-label={t("My review")}>
        <Caps>{t("My review")}</Caps>
        <div style={{ marginTop: 8 }}>
          <MyReviewCard className="!rounded-[18px] !p-4" hideLabel firstName={first} review={myReview} status={myStatus} onOpen={() => setReviewOpen(true)} onWithdraw={withdrawMyReview} />
        </div>
      </section>
    ) : null;

  if (preview?.web) {
    const pw = preview.web;
    const whereRows = withWorkplaces(where ?? [], workplaces && workplaces.id === proId ? workplaces.list : []) ?? [];
    const caps: React.CSSProperties = { margin: "0 0 8px", paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7D67D9" };
    return (
      <div className="flex flex-col" style={{ gap: 24, lineHeight: "normal" }}>
        {preview.above}
        <section style={{ border: "1px solid rgba(36,31,27,0.08)", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ height: 96, background: "linear-gradient(120deg,#EEEAFB,#D8D0F3)" }} />
          <div className="flex items-start" style={{ padding: "16px 24px 20px", gap: 20 }}>
            <span className="shrink-0 flex" style={{ marginTop: -56, borderRadius: 999, border: "4px solid #FFFFFF" }}>
              <MarketAvatar id={listing.profileId} name={name} photoUrl={listing.avatarUrl} size={88} fontSize={34} />
            </span>
            <div className="flex-1 min-w-0 flex items-center flex-wrap" style={{ gap: "12px 20px" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <h1 className="flex items-center" style={{ margin: 0, gap: 8, fontSize: 24, lineHeight: "32px", fontWeight: 800, letterSpacing: "-0.02em", color: "#241F1B" }}>
                  <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{name}</span>
                  {listing.hasVerifiedLicence && (
                    <span className="inline-flex items-center" style={{ gap: 3, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#1D744A" }}>
                      <BadgeCheck size={16} aria-hidden />
                      {t("Verified")}
                    </span>
                  )}
                </h1>
                <p className="flex flex-wrap" style={{ margin: 0, gap: "4px 12px", fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>
                  <span>{[specialty, area].filter(Boolean).join(" · ")}</span>
                  {avg != null && count > 0 && (
                    <span className="inline-flex items-center" style={{ gap: 4, fontWeight: 700, color: "#241F1B" }}>
                      <Star size={15} />
                      {avg.toFixed(1)}
                      <span style={{ fontWeight: 500, color: "#71685E" }}>· {tn(count, "{n} review", "{n} reviews")}</span>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0" style={{ gap: 8, marginInlineStart: "auto" }}>
                <button type="button" onClick={pw.onHire} className="flex items-center hover:bg-[#E7E2F7]" style={{ height: 44, padding: "0 20px", boxSizing: "border-box", borderRadius: 14, background: "#F0EDF9", color: "#5F5093", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
                  {t("Hire {name}", { name: first })}
                </button>
                <button type="button" onClick={pw.onBook} className="flex items-center hover:bg-[#8E7FD0]" style={{ height: 44, padding: "0 20px", boxSizing: "border-box", borderRadius: 14, background: "#9A8CD6", color: "#241F1B", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
                  {t("Book a session")}
                </button>
              </div>
            </div>
          </div>
          {pw.note}
        </section>
        <div role="tablist" aria-label={t("{name}'s profile", { name: first })} className="grid" style={{ height: 40, boxSizing: "border-box", gridTemplateColumns: `repeat(${TABS.length},minmax(0,1fr))`, gap: 4, padding: 4, borderRadius: 12, background: "#F5F5F6" }}>
          {TABS.map((x, i) => {
            const on = x.key === tab;
            return (
              <button
                key={x.key}
                type="button"
                role="tab"
                id={`pro-tab-${x.key}`}
                aria-selected={on}
                aria-controls={`pro-panel-${x.key}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(x.key)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const rtl = document.documentElement.dir === "rtl";
                  const step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
                  const next = TABS[(i + step + TABS.length) % TABS.length];
                  setTab(next.key);
                  (e.currentTarget.parentElement?.children[TABS.indexOf(next)] as HTMLElement | undefined)?.focus();
                }}
                className="flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                style={{ borderRadius: 9, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#FFFFFF" : "transparent", color: on ? "#5F5093" : "#5B5349", boxShadow: on ? "0 1px 3px rgba(36,31,27,0.10)" : "none" }}
              >
                {t(x.label)}
              </button>
            );
          })}
        </div>
        <div role="tabpanel" id={`pro-panel-${tab}`} aria-labelledby={`pro-tab-${tab}`}>
          {tab === "about" ? (
            <div className="grid" style={{ gridTemplateColumns: pw.rail ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(0,1fr)", gap: 24, alignItems: "start" }}>
              <div className="flex flex-col" style={{ gap: 24, minWidth: 0 }}>
                <div>
                  <h2 style={caps}>{t("About")}</h2>
                  {listing.headline && <p style={{ margin: 0, fontSize: 17, lineHeight: "26px", fontWeight: 700, color: "#241F1B" }}>{listing.headline}</p>}
                  {bio && <p style={{ margin: "6px 0 0", maxWidth: 720, fontSize: 15, lineHeight: "24px", color: "#5B5349", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{bio}</p>}
                </div>
                {pills.length > 0 && (
                  <div>
                    <h2 style={{ ...caps, margin: "0 0 12px" }}>{t("Specialties")}</h2>
                    <ul className="flex flex-wrap" style={{ margin: 0, padding: 0, listStyle: "none", gap: 8 }}>
                      {pills.map((p) => (
                        <li key={p} className="flex items-center" style={{ height: 36, padding: "0 14px", boxSizing: "border-box", borderRadius: 999, background: "#F0EDF9", color: "#5F5093", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={caps}>{t("Where you'll see {name}", { name: first })}</h2>
                {whereRows.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("{name} hasn't said where they work yet.", { name: first })}</p>
                ) : (
                  <div style={{ border: "1px solid rgba(36,31,27,0.08)", borderRadius: 16, padding: "0 16px" }}>
                    {whereRows.map((w, i) => {
                      const Icon = WHERE_WEB_ICONS[w.icon];
                      return (
                        <div key={`${w.icon}${i}`} className="flex items-center" style={{ minHeight: 64, gap: 12, borderTop: i ? "1px solid rgba(36,31,27,0.06)" : "none" }}>
                          <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: "#F0EDF9" }}>
                            <Icon size={18} aria-hidden style={{ color: "#7D67D9" }} />
                          </span>
                          <span className="min-w-0">
                            <span className="block" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B", overflowWrap: "anywhere" }}>{w.title}</span>
                            <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{w.line}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : tab === "services" ? (
            <ServicesTab rows={rows} error={!!services?.error} onRetry={() => setSvcReload((n) => n + 1)} onBook={() => pw.onBook()} onHire={() => pw.onHire()} inert={inert} firstName={first} top={null} />
          ) : tab === "work" ? (
            <WorkTab state={workState} firstName={first} today={today} onRetry={() => setPubReload((n) => n + 1)} />
          ) : (
            <ReviewsTab
              signedOut={false}
              loading={false}
              error={reviewError}
              onRetry={() => void reloadReviews()}
              lines={lines}
              figure={figure}
              stars={figure === "New" ? 0 : Math.round(Number(figure))}
              countLine={tabCount > 0 ? summaryLine(tabCount, classOnly) : t("No reviews yet")}
              firstName={first}
              onSeeAll={otherReviews.length > 0 ? () => navigate(preview.reviewsHref ?? `/app/professionals/${listing.profileId}/reviews`) : undefined}
              mine={null}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={preview?.pinned ? "pb-[228px]" : ""} style={{ lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      {strip}
      {inviteCode && activeClient === false && (
        <div role="note" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, background: m.pale, padding: "10px 12px", marginBottom: 8 }}>
          <Link2 size={15} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: m.accent, ...NO_ICON_SCALE }} />
          <p style={{ margin: 0, flex: 1, fontSize: textPx(12.5), lineHeight: 1.45, color: m.ink }}>
            <b>{t("{name} invited you.", { name: first })}</b> {t("Hire a plan below or send a message first.")}
          </p>
        </div>
      )}

      <BackRow eyebrow={t("PROFESSIONAL")} aside={preview?.headerRight} />
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
          "Client since" pill in the same chip style; then the client's End
          (Round I), an outlined chip in the same box. */}
      {(profile || (isConnected && clientSince)) && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {profile && <HiredBadge roles={profile.card.hiredViaCentiumCount} variant="chip" />}
          {isConnected && clientSince && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, background: m.pale, padding: "6px 10px", fontSize: textPx(12), fontWeight: 700, color: m.pdark }}>
              <Handshake size={14} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} />
              {t("Client since {date}", { date: new Date(clientSince).toLocaleDateString(appLocale("en-US"), { month: "long", year: "numeric" }) })}
            </span>
          )}
          {isConnected && relationship && !isPreview && (
            <EndRelationship
              relationshipId={relationship.id}
              firstName={first}
              hasPlan={!!liveHire}
              className="tap"
              style={{ display: "inline-flex", alignItems: "center", borderRadius: 10, background: "transparent", border: `1px solid ${m.border}`, padding: "5px 12px", fontSize: textPx(12), fontWeight: 700, color: m.high }}
              onEnded={() => {
                setChecked({ id: proId, active: false });
                setSince({ id: null, rel: null });
                setEndedFor(proId);
              }}
            />
          )}
        </div>
      )}
      {endedFor === proId && activeClient === false && (
        <p role="status" style={{ margin: "10px 0 0", fontSize: textPx(12.5), lineHeight: 1.45, color: m.ink2 }}>
          {t("You've ended working with {name}. They no longer see your shared information.", { name: first })}
        </p>
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
                aria-label={authUserId ? t("Hire {name}", { name: first }) : t("Hire {name}. Sign in to hire", { name: first })}
                style={{ height: 46, borderRadius: 14, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(14), fontWeight: 800, cursor: authUserId ? "pointer" : "default", opacity: authUserId ? 1 : 0.4 }}
              >
                {t("Hire")}
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

      <SegmentedTicketStrip items={TABS.map((x) => ({ ...x, label: t(x.label) }))} active={tab} onChange={setTab} label={t("{name}'s profile", { name: first })} idPrefix="pro" style={{ marginTop: 14 }} />

      <div role="tabpanel" id={`pro-panel-${tab}`} aria-labelledby={`pro-tab-${tab}`}>
        {tab === "about" && (
          <AboutTab
            bio={bio}
            specialties={pills}
            socials={socials}
            cv={publicCv}
            skills={specialtiesFromDb ? listing.skills : []}
            firstName={first}
            where={isPreview || sv ? withWorkplaces(where, workplaces && workplaces.id === proId ? workplaces.list : []) : null}
            availability={availability}
            offers={offers}
            balance={pointsSummary?.balance ?? 0}
            teaches={profile?.teachesAt ?? []}
            today={today}
            footer={aboutFooter}
            playlistUrl={listing.playlistUrl}
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
            countLine={tabCount > 0 ? summaryLine(tabCount, classOnly) : t("No reviews yet")}
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
            showStrip(t("Hired {name} · {status}", { name: first, status: t(hireStatusLabel(hire)) }), "success", { label: t("View"), onPress: () => setTab("services") });
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
            title={booked?.status === "requested" ? t("Request sent") : t("You're booked")}
            body={
              booked?.status === "requested"
                ? t("{name} will confirm your session. You can follow it in My bookings.", { name: first })
                : t("Your session with {name} is in My bookings. You can message {name} there if you need to change it.", { name: first })
            }
            rows={
              booked
                ? [
                    { k: t("Session"), v: booked.session.name },
                    { k: t("With"), v: name },
                    { k: t("When"), v: sessionWhen(booked.startsAt, ", ") },
                    { k: tx("Payment", "how it is paid"), v: booked.session.price > 0 ? t("{price} · Cash", { price: priceLabel(booked.session.price, booked.session.currency) }) : t("Free") },
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

/**
 * W7-9: MO3's Where with professional_workplaces (a Centium hire, or a team
 * they chose to show; the business publicly visible either way), after
 * their own place and before online, home and phone.
 * "{Role} · {location}", either half alone.
 */
function withWorkplaces(where: WhereRow[] | null, list: Workplace[]): WhereRow[] | null {
  if (!where || list.length === 0) return where;
  const rows: WhereRow[] = list.map((w) => ({
    icon: "business",
    title: w.name,
    line: [w.role && ROLE_LABEL[w.role as BusinessRole] ? roleLabel(w.role as BusinessRole) : null, w.location].filter(Boolean).join(" · ") || t("Works here"),
  }));
  const places = where.filter((w) => w.icon === "place");
  return [...places, ...rows, ...where.filter((w) => w.icon !== "place")];
}
