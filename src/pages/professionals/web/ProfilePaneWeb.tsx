import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, Handshake, Link2, MessageCircle, Pencil, Star, TicketCheck, UserCheck, Video, Wallet } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOpenThread } from "../../../components/messages/useOpenThread";
import { fetchListing, type DirectoryListing } from "../../../services/directory";
import { fetchClientRelationship, isActiveClientOf } from "../../../services/connected-professional";
import { EndRelationship } from "../../../components/professionals/EndRelationship";
import { fetchPublicCv, type PublicCv } from "../../../services/professional-cv";
import { byRecency, formatRange } from "../../../services/professional-cv/cvDates";
import { HireSheet } from "../../../components/hire/HireSheet";
import { YourHireCard } from "../../../components/hire/YourHireCard";
import { fetchMyHires, fetchPlansFor, hireDecline, hireStatusLabel, liveHireWith, planPriceLabel, type MyHire, type Plan } from "../../../services/hires";
import { fetchDeclineReasonLabel, fetchMyHireRequest, sendHireRequest, type HireRequestExtras, type HireRequestState } from "../../../services/hire-request";
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
} from "../../../services/public-pro";
import { ROLE_LABEL, roleLabel } from "../../business-team/teamLogic";
import type { BusinessRole } from "../../../services/business-team/types";
import { recordProfessionalEvent } from "../../../services/marketplace/listingEvents";
import { getMyAccessRequests, type AccessRequest } from "../../../services/access-requests";
import { AccessRequestNotice } from "../../../components/professionals/AccessRequestNotice";
import { useProfessionalReviews } from "../../../hooks/useProfessionalReviews";
import { useReviewOpensAt } from "../../../hooks/useReviewOpensAt";
import { ReviewWaitNote } from "../../../components/reviews/ReviewWaitNote";
import { ReviewFormSheet } from "../../../components/professionals/ReviewForms";
import { GuidelinesLink } from "../../../components/moderation/GuidelinesLink";
import { priceLabel, sessionLine } from "../../../components/pro/profile/profileModel";
import { fetchPublicProfile, type PublicProfile } from "../../../services/pro-profile";
import type { MarketResult } from "../../../services/market/rpc";
import { hiredText } from "../../../components/market/peopleModel";
import { MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { useStrip } from "../../business-market/listingParts";
import { BookingDone } from "../../marketplace/PurchaseSheet";
import { AboutTab, type Availability, type WhereRow } from "../profile/AboutTab";
import { WorkTab, type WorkState } from "../profile/WorkTab";
import { BookSheet, type BookedResult } from "../profile/BookSheet";
import { fetchConnectedSocials } from "../profile/connectedSocials";
import { serviceRows, sessionWhen, socialLinks, typeLabel } from "../profile/profileModel";
import { DataSharingWeb } from "./DataSharingWeb";
import { GoldStar, PrAvatar, PrEmpty, PrPill, PrStars } from "./WebParts";
import { famOf, GOLD, HAIR, monthYear, prCaps, pricePill, prPrimary, prSecondary, ratingText, RULE, workModeLabel } from "./prWebStyles";
import { appLocale } from "../../../i18n/format";
import { t, tk, tx } from "../../../i18n/core";

type ServicesData = { allowed: boolean; sessions: BookableSession[]; plans: Plan[]; week: number[] | null };

const capsP: React.CSSProperties = { ...prCaps, color: "#7D6BB5" };

/**
 * Website viewport v1, WC-PR / WC-PR.1, the profile pane (WC-PR Professionals
 * Web v3, `showProfile`): a r20 card with a 0.5px border; its body scrolls
 * (padding 24, blocks 20 apart): the 80 avatar, the name 24/32 700 with the
 * 20 check, the headline 15/22 600 and the type · area 13/20, the 28 chips
 * (rating, price, how they work), About, the Experience / Skills pair
 * (#F0EDF9 r16 cards), the reviews preview (or "My review" for someone who
 * may review) with See all reviews, and Data sharing for the connected
 * professional (WC-PR.1); the Message / Hire pair (44) is pinned under it
 * ("Book a session" for the connected professional).
 *
 * The data and every behaviour are the mobile profile's (ProfessionalDetail):
 * the listing, the connection check, the CV, "Client since", the hires and the
 * free request with its decline note, the hire sheet and the ?hire= link, the
 * data requests, professional_public_profile (rating, specialties, offers,
 * work history, how they work), Services (Book / Hire), Where, Availability,
 * the social links for a connected client, the ?invite= banner and
 * profile_view. The parts the web frame does not draw keep their mobile
 * sections, after the drawn ones.
 */
export const ProfilePaneWeb: React.FC<{
  id: string;
  /** The row from the loaded directory, when it is there (saves a counted read). */
  known: DirectoryListing | null;
  onListingChanged: (l: DirectoryListing) => void;
}> = ({ id, known, onListingChanged }) => {
  const navigate = useNavigate();
  const { authUserId, pointsSummary, refreshAchievements } = useApp();
  const today = localDay(new Date());
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const sharingRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

  // ---- the listing (the directory's row, else one read), with the invite link's own readers ----
  const [fetched, setFetched] = useState<DirectoryListing | null>(null);
  const [fetchedDone, setFetchedDone] = useState(false);
  // The directory's row wins once it is loaded (it is also what a review's new aggregate patches).
  const listing = known ?? fetched;
  const listingLoading = !known && !fetchedDone;
  useEffect(() => {
    if (known) return;
    let cancelled = false;
    void (async () => {
      const found = await fetchListing(id);
      if (cancelled) return;
      let invited: DirectoryListing | null = null;
      if (!found && inviteCode) {
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
      setFetched(found && found.profileId === id ? found : invited);
      setFetchedDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, known, inviteCode]);
  const isReal = !!listing;
  const proId = listing?.profileId ?? null;

  // DB5: a profile seen (not one's own).
  useEffect(() => {
    if (!proId || proId === authUserId) return;
    recordProfessionalEvent({ professionalId: proId, kind: "profile_view", source: "direct" });
  }, [proId, authUserId]);

  // ---- whether the caller is this professional's client (null = not answered) ----
  const [activeClient, setActiveClient] = useState<boolean | null>(null);
  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    void isActiveClientOf(proId).then((yes) => {
      if (!cancelled) setActiveClient(yes);
    });
    return () => {
      cancelled = true;
    };
  }, [proId]);
  const isConnected = activeClient === true;

  // ---- the CV, "Client since", the social handles (connected only, D-27) ----
  const [publicCv, setPublicCv] = useState<PublicCv | null>(null);
  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    void fetchPublicCv(proId).then((r) => {
      if (!cancelled && r.ok) setPublicCv(r.cv);
    });
    return () => {
      cancelled = true;
    };
  }, [proId]);
  // Keyed by professional, so End never holds the last one's relationship.
  const [relState, setRelState] = useState<{ id: string | null; rel: { id: string; joinedAt: string } | null }>({ id: null, rel: null });
  const relationship = proId && relState.id === proId ? relState.rel : null;
  const clientSince = relationship?.joinedAt ?? null;
  // Round I: the note after End, for the professional it was ended with.
  const [endedFor, setEndedFor] = useState<string | null>(null);
  const [socialState, setSocialState] = useState<Awaited<ReturnType<typeof fetchConnectedSocials>> | null>(null);
  useEffect(() => {
    if (!proId || activeClient !== true) return;
    let cancelled = false;
    void fetchClientRelationship(proId).then((rel) => {
      if (!cancelled) setRelState({ id: proId, rel });
    });
    void fetchConnectedSocials(proId).then((s) => {
      if (!cancelled) setSocialState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [proId, activeClient]);
  const socials = isConnected && socialState ? socialLinks(socialState) : [];

  // ---- the caller's hires, the free request and the decline note ----
  const [hires, setHires] = useState<MyHire[] | null>(null);
  const liveHire = proId && hires ? liveHireWith(hires, proId) : null;
  const [cancelNote, setCancelNote] = useState<string | null>(null);
  const loadHires = useCallback(async () => {
    const r = await fetchMyHires();
    if (r.ok) setHires(r.hires);
  }, []);
  useEffect(() => {
    if (!proId || !authUserId) return;
    let cancelled = false;
    void fetchMyHires().then((r) => {
      if (!cancelled && r.ok) setHires(r.hires);
    });
    return () => {
      cancelled = true;
    };
  }, [proId, authUserId]);
  const [hireRequestState, setHireRequestState] = useState<HireRequestState>("none");
  const [requestSending, setRequestSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestDecline, setRequestDecline] = useState<{ text: string; at: string | null } | null>(null);
  useEffect(() => {
    if (!proId || !authUserId) return;
    let cancelled = false;
    void fetchMyHireRequest(proId).then(async (res) => {
      if (cancelled || res.status !== "ok") return;
      setHireRequestState(res.state);
      const r = res.request;
      if (r && r.status === "rejected" && declineIsFinal(r.resolvedAt)) {
        const label = !r.declineMessage?.trim() && r.declineReason ? await fetchDeclineReasonLabel(r.declineReason) : null;
        const text = declineText(label, r.declineMessage ?? null);
        if (!cancelled && text) setRequestDecline({ text, at: r.resolvedAt });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [proId, authUserId]);
  const hireDeclined = proId && hires ? hireDecline(hires, proId) : null;
  const hireDeclineLine = hireDeclined ? declineText(hireDeclined.label, hireDeclined.message) : null;
  const hireIsNewer = !!hireDeclineLine && (!requestDecline || new Date(hireDeclined?.at ?? 0).getTime() >= new Date(requestDecline.at ?? 0).getTime());
  const declineLine = hireRequestState === "pending" ? null : hireIsNewer ? hireDeclineLine : requestDecline?.text ?? null;
  const sendRequest = async (extras?: HireRequestExtras) => {
    if (!proId || !authUserId || requestSending) return;
    setRequestSending(true);
    setRequestError(null);
    const res = await sendHireRequest(proId, authUserId, extras);
    setRequestSending(false);
    if (res.status === "ok" || res.status === "already_pending") return setHireRequestState("pending");
    if (res.status === "cooling_down") return setHireRequestState("cooling_down");
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
  const { mine: myReview, myStatus, others, error: reviewError, canReview, signedOut, loading: reviewsLoading, save: saveReview, withdraw: withdrawReview, reload: reloadReviews } = useProfessionalReviews(proId);
  const opensAt = useReviewOpensAt();

  // ---- data requests ("{first} asks to see {n} things") ----
  const [asks, setAsks] = useState<AccessRequest[]>([]);
  const loadAsks = useCallback(async (forId: string) => {
    const r = await getMyAccessRequests();
    if (r.ok) setAsks(r.requests.filter((q) => q.professionalId === forId));
  }, []);
  useEffect(() => {
    if (!proId || activeClient !== true) return;
    let cancelled = false;
    void getMyAccessRequests().then((r) => {
      if (!cancelled && r.ok) setAsks(r.requests.filter((q) => q.professionalId === proId));
    });
    return () => {
      cancelled = true;
    };
  }, [proId, activeClient]);

  // ---- DB10: professional_public_profile ----
  const [pubResult, setPubResult] = useState<MarketResult<PublicProfile | null> | null>(null);
  const [pubReload, setPubReload] = useState(0);
  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    void fetchPublicProfile(proId).then((r) => {
      if (!cancelled) setPubResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [proId, pubReload]);
  const profile = pubResult && pubResult.ok ? pubResult.value : null;

  // ---- Services, Where and Availability (live readers) ----
  const [svc, setSvc] = useState<{ data: ServicesData | null; error: boolean } | null>(null);
  const [svcReload, setSvcReload] = useState(0);
  useEffect(() => {
    if (!proId) return;
    let live = true;
    void (async () => {
      const [allowed, plans] = await Promise.all([bookingAllowed(proId), fetchPlansFor(proId)]);
      const sessions = allowed.ok && allowed.data ? await fetchBookableSessions(proId) : null;
      if (!live) return;
      if (!allowed.ok || (sessions && !sessions.ok)) {
        setSvc({ data: null, error: true });
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
      if (live) setSvc({ data: { allowed: allowed.data, sessions: list, plans: plans.ok ? plans.plans : [], week }, error: false });
    })();
    return () => {
      live = false;
    };
  }, [proId, svcReload]);

  // ---- W7-9: where they work ----
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  useEffect(() => {
    if (!proId) return;
    let live = true;
    void fetchProfessionalWorkplaces(proId).then((r) => {
      if (live && r.ok) setWorkplaces(r.data);
    });
    return () => {
      live = false;
    };
  }, [proId]);

  const [bookFor, setBookFor] = useState<string | null>(null);
  const [booked, setBooked] = useState<BookedResult | null>(null);
  const [strip, showStrip] = useStrip();

  const offersKnown = (profile?.offers ?? []).length > 0;
  const balanceKnown = !!pointsSummary;
  useEffect(() => {
    if (offersKnown && !balanceKnown) refreshAchievements();
  }, [offersKnown, balanceKnown, refreshAchievements]);

  const refreshAggregate = async () => {
    if (!proId) return;
    const found = await fetchListing(proId);
    if (found && found.profileId === proId) {
      setFetched(found);
      onListingChanged(found);
    }
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

  const previewRows = useMemo(() => [...others].filter((r) => !r.redactedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2), [others]);

  // ---------------------------------------------------------------- render

  if (!listing) {
    return (
      <div data-pr-pane className="flex flex-col" style={{ flex: 1, minHeight: 0, borderRadius: 20, border: HAIR, overflow: "hidden" }}>
        {listingLoading ? (
          <div aria-busy="true" style={{ padding: 24 }}>
            <span className="sr-only">{t("Loading…")}</span>
            <div aria-hidden className="flex items-center" style={{ gap: 16 }}>
              <span className="animate-skeleton-pulse bg-cream-soft" style={{ width: 80, height: 80, borderRadius: 999 }} />
              <span className="flex flex-col" style={{ flex: 1, gap: 8 }}>
                <span className="animate-skeleton-pulse bg-cream-soft" style={{ height: 24, width: "50%", borderRadius: 8 }} />
                <span className="animate-skeleton-pulse bg-cream-soft" style={{ height: 14, width: "40%", borderRadius: 8 }} />
              </span>
            </div>
            <MarketSkeleton radius={18} rows={3} height={120} label={tk("Loading")} style={{ marginTop: 24 }} />
          </div>
        ) : (
          <div style={{ padding: 24 }}>
            <PrEmpty icon={<UserCheck size={26} strokeWidth={1.5} color="#7D6BB5" aria-hidden />} title={t("Professional not found.")} bg="transparent">
              <button type="button" onClick={() => navigate("/app/professionals")} className="pr-web-press" style={{ ...prPrimary, height: 40, padding: "0 16px", marginTop: 12 }}>
                {t("Back")}
              </button>
            </PrEmpty>
          </div>
        )}
      </div>
    );
  }

  const fam = famOf(listing.subtype);
  const name = listing.name || profile?.card.name || t("Professional");
  const first = name.split(" ")[0];
  const role = typeLabel(listing.subtype);
  const area = listing.location ?? profile?.card.area ?? null;
  const headline = listing.headline?.trim() || listing.specialty?.trim() || profile?.card.specialty || null;
  const avg = profile ? profile.card.rating : listing.averageRating;
  const count = profile ? profile.card.reviewCount : listing.reviewCount;
  const isOwnProfile = proId === authUserId;
  const showActions = activeClient !== null;
  const price = pricePill(listing.monthlyRate, listing.consultationRate);
  const mode = workModeLabel(profile?.workMode ?? null);
  const pills = (profile?.specialties ?? []).length > 0 ? profile!.specialties : listing.skills;
  const bio = profile?.about ?? listing.bio;

  const sv = svc?.data ?? null;
  const rows = sv
    ? serviceRows(
        sv.allowed ? sv.sessions.filter((s) => s.visible).map((s) => ({ id: s.id, name: s.name, meta: sessionLine(s.durationMin, s.locationKind), price: priceLabel(s.price, s.currency) })) : [],
        sv.plans.map((p) => ({ id: p.id, name: p.name, meta: p.features[0] ?? null, price: planPriceLabel(p.price, p.billing) })),
      )
    : null;
  const kinds = new Set((sv?.sessions ?? []).map((s) => s.locationKind));
  const workMode = profile?.workMode ?? null;
  const radiusKm = profile?.serviceRadiusKm ?? null;
  const inPersonLine = radiusKm != null && radiusKm > 0 ? t("In person · within {km} km", { km: Math.round(radiusKm * 10) / 10 }) : t("In person");
  const whereBase: WhereRow[] | null = sv
    ? [
        ...(listing.location?.trim() && workMode !== "online" ? [{ icon: "place" as const, title: listing.location.trim(), line: inPersonLine }] : []),
        ...(kinds.has("online") || workMode === "online" || workMode === "both" ? [{ icon: "online" as const, title: tx("Online", "session format"), line: t("Video sessions") }] : []),
        ...(kinds.has("home_visit") ? [{ icon: "home" as const, title: t("Home visits"), line: t("At your place") }] : []),
        ...(kinds.has("phone") ? [{ icon: "phone" as const, title: t("Phone"), line: t("Phone sessions") }] : []),
      ]
    : null;
  const where = withWorkplaces(whereBase, workplaces);
  const availability: Availability | null = sv
    ? !sv.allowed
      ? { state: "blocked", blockedLine: t(NOT_TAKING_BOOKINGS) }
      : sv.sessions.length === 0
        ? { state: "none" }
        : sv.week
          ? { state: "ready", week: sv.week }
          : { state: "error" }
    : null;
  const workState: WorkState = !pubResult ? { kind: "loading" } : pubResult.ok ? { kind: "ready", entries: profile?.workHistory ?? [] } : pubResult.pending ? { kind: "pending" } : { kind: "error" };

  // The Experience card: the most recent role and the first licence (the rest of the CV follows under the drawn sections).
  const exp = publicCv ? byRecency(publicCv.experience, true)[0] ?? null : null;
  const licence = publicCv?.licences[0] ?? null;
  const restCv: PublicCv | null = publicCv ? { ...publicCv, experience: publicCv.experience.filter((e) => e.id !== exp?.id), licences: publicCv.licences.filter((l) => l.id !== licence?.id) } : null;
  const restCvEmpty = !restCv || Object.values(restCv).every((rows) => (rows as unknown[]).length === 0);

  const bookSession = sv?.sessions.find((s) => s.id === bookFor) ?? null;
  const ownerLine = [name, role].filter(Boolean).join(" · ");
  const myReviewShown = canReview === true || !!myReview;
  const canSeeAll = others.length > 0 || !!myReview || count > 0;
  const reviewsHref = `/app/professionals/${encodeURIComponent(listing.profileId)}/reviews`;
  const editable = !!myReview && myStatus === "editable";

  const scrollTo = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: "smooth", block: "start" });

  const hireLabel = isConnected ? t("Book a session") : t("Hire");
  const onPrimary = () => {
    if (isConnected) {
      const bookable = (sv?.allowed ? sv.sessions.filter((s) => s.visible) : []);
      if (bookable.length === 1) setBookFor(bookable[0].id);
      else scrollTo(servicesRef.current);
      return;
    }
    setHirePlan(null);
    setHireOpen(true);
  };

  const reviewCard = (who: string, rating: number, at: string, body: string | null, extra?: React.ReactNode) => (
    <div style={{ borderRadius: 16, border: HAIR, padding: "14px 16px", marginBottom: 8 }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <span className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#241F1B", minWidth: 0 }}>
          {who}
        </span>
        <PrStars n={rating} />
        <span style={{ marginInlineStart: "auto", fontSize: 13, color: "#71685E", whiteSpace: "nowrap" }}>{monthYear(at, appLocale("en-US") ?? "en-US")}</span>
      </div>
      {body ? <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: "22px", color: "#5B5349", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{body}</p> : null}
      {extra}
    </div>
  );

  return (
    <div data-pr-pane className="flex flex-col" style={{ flex: 1, minHeight: 0, borderRadius: 20, border: HAIR, overflow: "hidden", background: "#FFFFFF" }}>
      {strip}
      <div data-pr-pane-body className="pr-web-noscroll flex flex-col" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 24, gap: 20 }}>
        {inviteCode && activeClient === false && (
          <div role="note" className="flex items-center" style={{ gap: 10, borderRadius: 16, background: "#F0EDF9", padding: "10px 12px" }}>
            <Link2 size={16} color="#7D6BB5" aria-hidden style={{ flex: "none" }} />
            <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: "20px", color: "#241F1B" }}>
              <b>{t("{name} invited you.", { name: first })}</b> {t("Hire a plan below or send a message first.")}
            </p>
          </div>
        )}

        {/* The identity. */}
        <div data-pr-identity className="flex items-center" style={{ gap: 16 }}>
          <PrAvatar name={name} photoUrl={listing.avatarUrl} fam={fam} size={80} fontSize={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="flex items-center" style={{ margin: 0, gap: 6, minWidth: 0 }}>
              <span data-pr-name className="truncate" title={name} style={{ fontSize: 24, lineHeight: "32px", fontWeight: 700, color: fam.deep, minWidth: 0 }}>
                {name}
              </span>
              {listing.hasVerifiedLicence && <VerifiedMark size={20} color={fam.main} />}
            </p>
            {headline ? <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 600, color: fam.main }}>{headline}</p> : null}
            <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: fam.main }}>{[role, area].filter(Boolean).join(" · ")}</p>
          </div>
        </div>

        {/* The chips: rating (to Reviews), price, how they work; then the kept hired count and "Client since". */}
        <div data-pr-chips className="flex flex-wrap" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(reviewsHref)}
            className="pr-web-press inline-flex items-center whitespace-nowrap"
            aria-label={t("Reviews: {rating}", { rating: ratingText(avg, count) })}
            style={{ height: 28, padding: "0 12px", borderRadius: 999, boxSizing: "border-box", gap: 5, fontSize: 13, fontWeight: 700, background: GOLD.bg, border: `1px solid ${GOLD.border}`, color: GOLD.ink, cursor: "pointer" }}
          >
            <GoldStar />
            {ratingText(avg, count)}
          </button>
          {price && (
            <PrPill height={28} bg={fam.pill} ink={fam.deep} icon={<Wallet size={13} color={fam.main} aria-hidden style={{ flex: "none" }} />}>
              {price}
            </PrPill>
          )}
          {mode && (
            <PrPill height={28} bg={fam.pill} ink={fam.deep} icon={<Video size={13} color={fam.main} aria-hidden style={{ flex: "none" }} />}>
              {mode}
            </PrPill>
          )}
          {profile && (
            <PrPill height={28} bg={profile.card.hiredViaCentiumCount > 0 ? "#E7F2F0" : "#F5F5F6"} ink={profile.card.hiredViaCentiumCount > 0 ? "#3C6B65" : "#71685E"} icon={<TicketCheck size={13} aria-hidden style={{ flex: "none" }} />}>
              {hiredText(profile.card.hiredViaCentiumCount)}
            </PrPill>
          )}
          {isConnected && clientSince && (
            <PrPill height={28} bg={fam.pill} ink={fam.deep} icon={<Handshake size={13} color={fam.main} aria-hidden style={{ flex: "none" }} />}>
              {t("Client since {date}", { date: new Date(clientSince).toLocaleDateString(appLocale("en-US"), { month: "long", year: "numeric" }) })}
            </PrPill>
          )}
          {/* Round I: the client's End, an outlined pill of the same height. */}
          {isConnected && relationship && (
            <EndRelationship
              relationshipId={relationship.id}
              firstName={first}
              hasPlan={!!liveHire}
              className="pr-web-press inline-flex items-center whitespace-nowrap"
              style={{ height: 28, padding: "0 12px", borderRadius: 999, boxSizing: "border-box", fontSize: 13, fontWeight: 700, background: "transparent", border: "1px solid #E4E4E9", color: "#C0392B" }}
              onEnded={() => {
                setActiveClient(false);
                setRelState({ id: null, rel: null });
                setEndedFor(proId);
              }}
            />
          )}
        </div>
        {endedFor === proId && activeClient === false && (
          <p role="status" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#6B635A" }}>
            {t("You've ended working with {name}. They no longer see your shared information.", { name: first })}
          </p>
        )}

        {isConnected && asks.length > 0 && <AccessRequestNotice variant="summary" requests={asks} firstName={first} onChoose={() => scrollTo(sharingRef.current)} />}

        {bio ? (
          <section aria-label={t("About")}>
            <p style={{ ...capsP, margin: "0 0 6px" }}>{t("About")}</p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#241F1B", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{bio}</p>
          </section>
        ) : null}

        {(exp || licence || pills.length > 0) && (
          <div data-pr-exp style={{ display: "grid", gridTemplateColumns: `repeat(${(exp || licence ? 1 : 0) + (pills.length > 0 ? 1 : 0)},minmax(0,1fr))`, gap: 12 }}>
            {(exp || licence) && (
              <div style={{ borderRadius: 16, background: "#F0EDF9", padding: "14px 16px" }}>
                <p style={capsP}>{t("Experience")}</p>
                {exp && (
                  <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B", overflowWrap: "anywhere" }}>
                    {[[exp.title, exp.organisation].filter(Boolean).join(", "), formatRange(exp.start, exp.end, true)].filter(Boolean).join(" · ")}
                  </p>
                )}
                {licence && <p style={{ margin: "2px 0 0", fontSize: 13, color: "#5B5349", overflowWrap: "anywhere" }}>{licence.name}</p>}
              </div>
            )}
            {pills.length > 0 && (
              <div style={{ borderRadius: 16, background: "#F0EDF9", padding: "14px 16px" }}>
                <p style={capsP}>{t("Skills")}</p>
                <ul className="flex flex-wrap" style={{ gap: 6, margin: "8px 0 0", padding: 0, listStyle: "none" }}>
                  {pills.map((k) => (
                    <li key={k} style={{ borderRadius: 999, padding: "3px 10px", background: "#FFFFFF", color: "#5F5093", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Kept (not drawn): the hire card, the cancel and decline notes, and Services with Book / Hire. */}
        {(liveHire || cancelNote || (declineLine && !isConnected)) && (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {liveHire && (
              <YourHireCard
                hire={liveHire}
                onChanged={(note) => {
                  if (note) setCancelNote(note);
                  void loadHires();
                }}
              />
            )}
            {cancelNote && !liveHire && (
              <p role="status" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                {cancelNote}
              </p>
            )}
            {declineLine && !cancelNote && !liveHire && !isConnected && (
              <p role="status" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                <b style={{ color: "#241F1B" }}>{t("{name} couldn't take you on:", { name: first })}</b> {declineLine}
              </p>
            )}
          </div>
        )}
        <section ref={servicesRef} aria-label={t("Services")} data-pr-services style={{ scrollMarginTop: 8 }}>
          <p style={{ ...capsP, margin: "0 0 8px" }}>{t("Services")}</p>
          {rows === null ? (
            svc?.error ? (
              <MarketError thing={tk("services")} onRetry={() => setSvcReload((n) => n + 1)} />
            ) : (
              <MarketSkeleton radius={18} rows={2} height={64} count={2} label={tk("Loading services")} />
            )
          ) : rows.length === 0 ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("{name} hasn't added a session to book or a plan to hire.", { name: first || t("This professional") })}</p>
          ) : (
            rows.map((r) => (
              <div key={r.key} className="flex items-center" style={{ borderRadius: 16, border: HAIR, paddingBlock: 10, paddingInlineStart: 16, paddingInlineEnd: 12, gap: 12, minHeight: 64, boxSizing: "border-box", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B", overflowWrap: "anywhere" }}>{r.name}</p>
                  {r.meta ? <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E", overflowWrap: "anywhere" }}>{r.meta}</p> : null}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#241F1B", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.price}</span>
                <button
                  type="button"
                  disabled={isOwnProfile || (r.kind === "hire" && !authUserId)}
                  onClick={() => {
                    if (r.kind === "book") setBookFor(r.id);
                    else if (authUserId) {
                      setHirePlan(r.id);
                      setHireOpen(true);
                    }
                  }}
                  aria-label={r.kind === "book" ? t("Book {name}", { name: r.name }) : t("Hire {name}", { name: r.name })}
                  className="pr-web-press"
                  style={{ ...prSecondary, height: 36, padding: "0 14px", flex: "none", opacity: isOwnProfile ? 0.5 : 1 }}
                >
                  {r.kind === "book" ? t("Book") : t("Hire")}
                </button>
              </div>
            ))
          )}
        </section>

        {/* Reviews: "My review" for someone who may review (or has), else the two latest. */}
        <section aria-label={myReviewShown ? t("My review") : t("Reviews")} data-pr-reviews>
          <div className="flex items-center justify-between" style={{ marginBottom: 8, gap: 12 }}>
            <p style={capsP}>{myReviewShown ? t("My review") : t("Reviews")}</p>
            {canSeeAll && (
              <button type="button" onClick={() => navigate(reviewsHref)} className="pr-web-link whitespace-nowrap" style={{ fontSize: 15, fontWeight: 700, color: "#7D6BB5", borderRadius: 6 }}>
                {t("See all reviews")}
              </button>
            )}
          </div>
          {myReviewShown ? (
            <MyReviewWeb
              first={first}
              review={myReview}
              status={myStatus}
              opensAt={opensAt}
              editable={editable}
              onOpen={() => setReviewOpen(true)}
              onWithdraw={withdrawMyReview}
              card={reviewCard}
            />
          ) : signedOut ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("Sign in to read reviews")}</p>
          ) : reviewsLoading && previewRows.length === 0 ? (
            <MarketSkeleton radius={18} rows={2} height={80} count={2} label={tk("Loading reviews")} />
          ) : reviewError && previewRows.length === 0 ? (
            <MarketError thing={tk("reviews")} onRetry={() => void reloadReviews()} />
          ) : previewRows.length === 0 ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("No reviews yet")}</p>
          ) : (
            previewRows.map((r) => <React.Fragment key={r.id}>{reviewCard(r.reviewerName ?? t("A client"), r.rating, r.createdAt, r.body)}</React.Fragment>)
          )}
        </section>

        {/* WC-PR.1: Data sharing, for the connected professional. */}
        {isConnected && (
          <div ref={sharingRef} style={{ scrollMarginTop: 8 }}>
            <DataSharingWeb professionalId={listing.profileId} onRequestsChanged={() => void loadAsks(listing.profileId)} />
          </div>
        )}

        {/* Kept (not drawn): the social links (connected only), the rest of the CV, Where, Availability, point offers, Teaches at, the playlist and the client-code card. */}
        <AboutTab
          bio={null}
          specialties={[]}
          socials={socials}
          cv={restCvEmpty ? null : restCv}
          skills={[]}
          firstName={first}
          where={where}
          availability={availability}
          offers={profile?.offers ?? []}
          balance={pointsSummary?.balance ?? 0}
          teaches={profile?.teachesAt ?? []}
          today={today}
          playlistUrl={listing.playlistUrl}
          footer={
            activeClient === false && !isOwnProfile ? (
              <div style={{ marginTop: 18, borderRadius: 16, background: "#F0EDF9", padding: 16 }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#5F5093" }}>{t("Ask {name} for a client code", { name: first })}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{t("{name} can generate a code for you. Redeem it from your profile to connect and start sharing data.", { name: first })}</p>
              </div>
            ) : null
          }
        />
        <section aria-label={t("Work history")}>
          <p style={capsP}>{t("Work history")}</p>
          <WorkTab state={workState} firstName={first} today={today} onRetry={() => setPubReload((n) => n + 1)} />
        </section>
      </div>

      {/* The pinned pair (waits for the connection check, so nothing flashes). */}
      {showActions && (
        <div data-pr-actions className="flex flex-col" style={{ flex: "none", padding: "16px 24px", borderTop: RULE, gap: 8 }}>
          <div className="flex" style={{ gap: 10 }}>
            <button type="button" onClick={() => void openThread()} disabled={threadBusy} aria-busy={threadBusy || undefined} className="pr-web-press" style={{ ...prSecondary, flex: 1, opacity: threadBusy ? 0.6 : 1 }}>
              <MessageCircle size={16} color="#5F5093" aria-hidden />
              {t("Message")}
            </button>
            {!isOwnProfile && (
              <button
                type="button"
                onClick={onPrimary}
                disabled={!authUserId}
                aria-label={isConnected ? undefined : authUserId ? t("Hire {name}", { name: first }) : t("Hire {name}. Sign in to hire", { name: first })}
                className="pr-web-press"
                style={{ ...prPrimary, flex: 1, opacity: authUserId ? 1 : 0.4 }}
              >
                {hireLabel}
              </button>
            )}
          </div>
          {threadError && (
            <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#C0392B" }}>
              {threadError}
            </p>
          )}
        </div>
      )}

      <HireSheet
        open={hireSheetOpen}
        onClose={closeHire}
        pro={{ id: listing.profileId, name, first, role: headline ?? role, avatarUrl: listing.avatarUrl }}
        initialPlanId={deepLinkPlan ?? hirePlan}
        onHired={(next, hire) => {
          setCancelNote(null);
          if (next) setHires(next);
          else void loadHires();
          closeHire();
          showStrip(t("Hired {name} · {status}", { name: first, status: t(hireStatusLabel(hire)) }), "success", { label: t("View"), onPress: () => scrollTo(servicesRef.current) });
        }}
        onMessage={() => void openThread()}
        messageBusy={threadBusy}
        request={isConnected ? undefined : { state: hireRequestState, busy: requestSending, error: requestError, onSend: (extras) => void sendRequest(extras) }}
      />
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
      <ReviewFormSheet open={reviewOpen} onClose={() => setReviewOpen(false)} firstName={first} existing={myReview} onSave={submitReview} onWithdraw={withdrawMyReview} />
    </div>
  );
};

/** The check by a verified professional's name (badgeCheck in the family's main), with the mobile check's meaning. */
const VerifiedMark: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <BadgeCheck size={size} color={color} strokeWidth={2} role="img" aria-label={t("Verified credentials")} style={{ flex: "none" }}>
    <title>{t("Verified: at least one credential checked by the Centium team")}</title>
  </BadgeCheck>
);

/** "My review" on the web (the mobile MyReviewCard's behaviour in the reference's review card). */
const MyReviewWeb: React.FC<{
  first: string;
  review: ReturnType<typeof useProfessionalReviews>["mine"];
  status: ReturnType<typeof useProfessionalReviews>["myStatus"];
  opensAt: Date | null;
  editable: boolean;
  onOpen: () => void;
  onWithdraw: () => Promise<string | null>;
  card: (who: string, rating: number, at: string, body: string | null, extra?: React.ReactNode) => React.ReactNode;
}> = ({ first, review, status, opensAt, editable, onOpen, onWithdraw, card }) => {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Two clicks for a destructive action; the first arms it for three seconds (as on mobile).
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(id);
  }, [armed]);
  const withdraw = async () => {
    if (busy) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    setError(await onWithdraw());
    setBusy(false);
  };
  const action = (label: string, onClick: () => void, danger?: boolean) => (
    <button type="button" onClick={onClick} disabled={busy} className="pr-web-link inline-flex items-center" style={{ gap: 6, minHeight: 32, fontSize: 13, fontWeight: 700, color: danger ? "#C0392B" : "#7D6BB5", borderRadius: 6 }}>
      {!danger && <Pencil size={13} aria-hidden />}
      {label}
    </button>
  );

  if (!review) {
    if (opensAt) return <ReviewWaitNote opensAt={opensAt} boxed />;
    return (
      <div className="flex items-center justify-between" style={{ borderRadius: 16, border: HAIR, padding: "14px 16px", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", color: "#71685E" }}>{t("You haven't reviewed {name} yet", { name: first })}</p>
        <button type="button" onClick={onOpen} className="pr-web-press" style={{ ...prSecondary, height: 36, padding: "0 14px", flex: "none" }}>
          <Star size={15} aria-hidden />
          {t("Rate & Review")}
        </button>
      </div>
    );
  }
  const withdrawn = status === "withdrawn";
  const extra = (
    <>
      {review.reply && !withdrawn && (
        <div style={{ marginTop: 10, borderRadius: 12, background: "#F0EDF9", padding: "10px 12px" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#5F5093" }}>{t("Reply from {name}", { name: first })}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349", whiteSpace: "pre-line" }}>
            {review.reply.redactedAt ? t("A moderator removed this reply. Only you can see that it was here.") : review.reply.body}
          </p>
        </div>
      )}
      {withdrawn && (
        <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
          {t("You withdrew this review. Only you can see it, and it doesn't count toward {name}'s rating.", { name: first })}
        </p>
      )}
      {review.redactedAt && <p style={{ margin: "6px 0 0", fontSize: 13, fontStyle: "italic", color: "#71685E" }}>{t("A moderator removed this review. It no longer counts toward the rating.")}</p>}
      {!withdrawn && (
        <div className="flex items-center" style={{ marginTop: 6, gap: 16 }}>
          {editable ? action(t("Edit"), onOpen) : action(armed ? t("Click again to withdraw your review") : t("Withdraw review"), () => void withdraw(), true)}
        </div>
      )}
      {error && (
        <p role="alert" style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: "#C0392B" }}>
          {t(error)}
          <GuidelinesLink message={error} />
        </p>
      )}
    </>
  );
  return <>{card(t("You"), review.rating, review.createdAt, review.redactedAt ? null : review.body, extra)}</>;
};

/** W7-9: MO3's Where with professional_workplaces, after their own place and before online, home and phone (as on mobile). */
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
