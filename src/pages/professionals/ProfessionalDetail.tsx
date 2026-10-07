import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { useOpenThread } from "../../components/messages/useOpenThread";
import { goldPill, initials, typeColours } from "../../components/professionals/typeColour";
import { useIsDark } from "../../hooks/useIsDark";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { fetchClientSince, isActiveClientOf, professionalRole } from "../../services/connected-professional";
import { fetchPublicCv, type PublicCv } from "../../services/professional-cv";
import { CvView } from "../../components/cv/CvView";
import { VerifiedCheck } from "../../components/cv/CvBadges";
import { HireSheet } from "../../components/hire/HireSheet";
import { YourHireCard } from "../../components/hire/YourHireCard";
import { fetchMyHires, liveHireWith, type MyHire } from "../../services/hires";
import { fetchMyHireRequest, sendHireRequest, type HireRequestState } from "../../services/hire-request";
import type { ProfessionalType } from "../../types";
import { useApp } from "../../context/AppContext";
import { useProfessionalReviews } from "../../hooks/useProfessionalReviews";
import { MyReviewCard, ReviewFormSheet } from "../../components/professionals/ReviewForms";
import { ratingLabel, reviewCountLabel } from "../../services/professional-reviews/rules";
import { ChevronLeft, Handshake, Lock, MessageCircle, Star, Wallet } from "lucide-react";
import { textPx } from "../../theme/textSize";
import { useBack } from "../../hooks/useBack";

// MO1.2.1 / MO1.2.1.4 (R11): a centred hero in the professional's type
// colours, the price and client-since pills, the gold reviews pill (which
// opens the reviews page, MO1.2.1.1), section labels, and a 44 pinned row:
// Message and Hire (A3: Hire opens the hire sheet, MO1.2.1.5). The reviews
// sheet that lived here is now that page.

// V8 (QA 8.0): "pressing on the grey review text would open to all the
// reviews written by the clients."
// THE GENERATED REVIEWS THAT USED TO LIVE HERE ARE GONE. The app could only
// store the current user's own review per professional, so a hash of the
// professional's id produced plausible reviewer names, ratings and comments to
// fill out the rest of the list. That was defensible scaffolding for seeded
// entries and indefensible the moment a real account had a listing: invented
// testimony, rendered identically to the real thing, about a real person.
// The list reads professional_reviews now and shows what is there.

export default function ProfessionalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const back = useBack();
  const { authUserId } = useApp();

  // ONE SOURCE NOW: public_professional_directory, keyed by account uuid.
  // The seeded mockProfessionals entries — keyed "pr1" — are gone, and with
  // them the branch that resolved them. Nothing links to such an id any more;
  // a stale bookmark carrying one falls through to "Professional not found",
  // which is the truthful answer for a profile that never was an account.
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [listingLoading, setListingLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setListingLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const found = await fetchListing(id);
      if (cancelled) return;
      setListing(found);
      setListingLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // One shape for the page. `isReal` used to gate what only a real account
  // could do, back when a seeded entry could reach this screen; every listing
  // is a real account now, so it is simply whether one loaded.
  const professional = listing
    ? {
        id: listing.profileId,
        name: listing.name,
        type: (listing.subtype ?? "trainer") as ProfessionalType,
        specialty: listing.specialty ?? "",
        location: listing.location ?? "",
        // The real aggregate, from professional_rating_summary via the
        // directory view — the same numbers anon sees, computed over
        // unredacted rows only.
        rating: listing.averageRating ?? 0,
        reviews: listing.reviewCount,
        bio: listing.bio ?? "",
        monthlyRate: listing.monthlyRate ?? 0,
        headline: listing.headline,
        skills: listing.skills,
        verified: listing.hasVerifiedLicence,
        connected: undefined as boolean | undefined,
      }
    : undefined;
  const isReal = !!listing;
  const realProfessionalId = professional?.id ?? null;

  /**
   * Whether the caller is actually this professional's client.
   *
   * STAMPED WITH THE PROFESSIONAL IT DESCRIBES, and read back by comparison —
   * the same shape useThreadRealtime uses for its status, for the same two
   * reasons. Resetting to "unknown" inside the effect would be a synchronous
   * setState in an effect, and in the window before that effect runs it would
   * report the PREVIOUS professional's answer as though it were this one's.
   *
   * NULL MEANS NOT ANSWERED YET, and is distinct from false. Rendering the
   * unconnected layout while the check is in flight would flash a "Hire"
   * call-to-action at someone who is already a client, so the connected-only
   * sections wait rather than guess.
   */
  const [checked, setChecked] = useState<{ id: string | null; active: boolean }>({
    id: null,
    active: false,
  });
  const activeClient: boolean | null =
    realProfessionalId !== null && checked.id === realProfessionalId ? checked.active : null;

  useEffect(() => {
    if (!realProfessionalId) return;
    let cancelled = false;
    void isActiveClientOf(realProfessionalId).then((yes) => {
      if (!cancelled) setChecked({ id: realProfessionalId, active: yes });
    });
    return () => {
      cancelled = true;
    };
  }, [realProfessionalId]);

  // The CV, from the public views (listed professionals are readable by
  // anyone; a connected client can always read their own professional's).
  // Stamped with the professional it belongs to, like the checks above.
  const [cvState, setCvState] = useState<{ id: string | null; cv: PublicCv | null }>({ id: null, cv: null });
  const publicCv = realProfessionalId !== null && cvState.id === realProfessionalId ? cvState.cv : null;

  useEffect(() => {
    if (!realProfessionalId) return;
    let cancelled = false;
    void fetchPublicCv(realProfessionalId).then((r) => {
      if (!cancelled && r.ok) setCvState({ id: realProfessionalId, cv: r.cv });
    });
    return () => {
      cancelled = true;
    };
  }, [realProfessionalId]);

  // THE REAL START OF THE RELATIONSHIP, replacing a hardcoded "Client since
  // August 2026" that every client saw regardless of when they connected.
  const [since, setSince] = useState<{ id: string | null; at: string | null }>({ id: null, at: null });
  const clientSince = realProfessionalId !== null && since.id === realProfessionalId ? since.at : null;

  useEffect(() => {
    if (!realProfessionalId || activeClient !== true) return;
    let cancelled = false;
    void fetchClientSince(realProfessionalId).then((at) => {
      if (!cancelled) setSince({ id: realProfessionalId, at });
    });
    return () => {
      cancelled = true;
    };
  }, [realProfessionalId, activeClient]);

  /**
   * A3: the caller's hires, from my_hires() (professional_hires itself is
   * unreadable). Stamped with the professional like the checks above. Only
   * a LIVE hire with this professional is shown (pending or active); a
   * cancelled or expired one does not block hiring again.
   */
  const [hiresState, setHiresState] = useState<{ id: string | null; hires: MyHire[] }>({ id: null, hires: [] });
  const liveHire = realProfessionalId !== null && hiresState.id === realProfessionalId ? liveHireWith(hiresState.hires, realProfessionalId) : null;
  // Stamped with the professional it was written for, like the state above, so
  // a cancel note never follows the client onto another professional's page.
  const [cancelNoteState, setCancelNote] = useState<{ id: string | null; note: string } | null>(null);
  const cancelNote = cancelNoteState && cancelNoteState.id === realProfessionalId ? cancelNoteState.note : null;

  // THE FREE REQUEST (pending_client_requests), as before A3: kept for a
  // professional with no plans, where the hire sheet would otherwise offer
  // nothing but a message. Stamped with the professional like the state above.
  const [requestState, setRequestState] = useState<{ id: string | null; state: HireRequestState }>({ id: null, state: "none" });
  const hireRequestState: HireRequestState =
    realProfessionalId !== null && requestState.id === realProfessionalId ? requestState.state : "none";
  const [requestSending, setRequestSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  useEffect(() => {
    if (!realProfessionalId || !authUserId) return;
    let cancelled = false;
    void fetchMyHireRequest(realProfessionalId).then((res) => {
      if (cancelled || res.status !== "ok") return;
      setRequestState({ id: realProfessionalId, state: res.state });
    });
    return () => {
      cancelled = true;
    };
  }, [realProfessionalId, authUserId]);
  const sendRequest = async () => {
    if (!realProfessionalId || !authUserId || requestSending) return;
    setRequestSending(true);
    setRequestError(null);
    const res = await sendHireRequest(realProfessionalId, authUserId);
    setRequestSending(false);
    if (res.status === "ok" || res.status === "already_pending") {
      setRequestState({ id: realProfessionalId, state: "pending" });
      return;
    }
    if (res.status === "cooling_down") {
      setRequestState({ id: realProfessionalId, state: "cooling_down" });
      return;
    }
    setRequestError(res.message);
  };

  const loadHires = async (forId: string) => {
    const r = await fetchMyHires();
    if (r.ok) setHiresState({ id: forId, hires: r.hires });
  };

  useEffect(() => {
    if (!realProfessionalId || !authUserId) return;
    let cancelled = false;
    void fetchMyHires().then((r) => {
      if (!cancelled && r.ok) setHiresState({ id: realProfessionalId, hires: r.hires });
    });
    return () => {
      cancelled = true;
    };
  }, [realProfessionalId, authUserId]);

  // The hire sheet (MO1.2.1.5), and the ?hire=<planId> deep link from a chat
  // plans card's Hire: the sheet opens on that plan's checkout while it is
  // still offered, or on the plan list with a note. A bare ?hire (the chat
  // header's Hire) opens the plan list with no note. The parameter is dropped
  // when the sheet closes, so Back and a reload don't reopen it.
  const [searchParams, setSearchParams] = useSearchParams();
  const hireParam = searchParams.has("hire");
  const deepLinkPlan = searchParams.get("hire") || null;
  const [hireOpen, setHireOpen] = useState(false);
  const hireSheetOpen = hireOpen || (hireParam && isReal);
  const closeHire = () => {
    setHireOpen(false);
    if (hireParam) {
      const next = new URLSearchParams(searchParams);
      next.delete("hire");
      setSearchParams(next, { replace: true });
    }
  };

  /**
   * TWO SOURCES, BECAUSE THIS PAGE SERVES TWO KINDS OF PROFESSIONAL.
   *
   * A real listing asks the database: `professional_clients` with
   * `disconnected_at is null` is the only thing that decides whether someone
   * is a client, and it is the thing the roster and the consent screen already
   * read.
   *
   * A mock entry has only its seed flag to go on. Its ids are not accounts, so
   * no query could answer for them.
   *
   * THE LOCAL LIST NOW SUBTRACTS RATHER THAN ADDS. It used to be an "added"
   * list written by the mock hire flow, which is gone — so the only thing left
   * for it to record is which seeded entries the user has dismissed. That
   * inversion is what makes Remove work on `pr1`, the one entry shipped with
   * `connected: true`: filtering an id out of an added list could never clear a
   * flag that lives in the seed data, so the button used to navigate away and
   * leave the entry connected.
   *
   * REAL LISTINGS DO NOT CONSULT IT AT ALL. `activeClient` comes from
   * `professional_clients`, and this branch never runs for them.
   */
  // professional_clients with disconnected_at null is the only thing that
  // decides whether somebody is a client, and it is what the roster and the
  // consent screen already read. The local "dismissed" list that used to sit
  // beside it existed solely to switch off a seed flag on an entry that was
  // never an account; both are gone.
  const isConnected: boolean = activeClient === true;
  const [reviewOpen, setReviewOpen] = useState(false);
  const dark = useIsDark();
  const { open: openThread, busy: threadBusy, error: threadError } = useOpenThread(realProfessionalId ?? "");

  // REAL ROWS, read as this caller. Signed out nothing is read — review text
  // has no anon grant — and the sheet asks them to sign in instead.
  const {
    mine: myReview,
    myStatus,
    error: reviewError,
    canReview,
    save: saveReview,
    withdraw: withdrawReview,
  } = useProfessionalReviews(realProfessionalId);

  /**
   * Re-reads the listing so the headline average moves with the write.
   * average_rating comes from a view over every counted row, so the honest
   * way to show the new number is to ask for it again.
   */
  const refreshAggregate = async () => {
    if (!realProfessionalId) return;
    const found = await fetchListing(realProfessionalId);
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

  // V7 (QA 7.0): "Your rating should influence the professional's overall
  // rating based on the total rating by all people."
  // IT DOES NOW, WITHOUT ARITHMETIC HERE. The old code blended the local
  // review into the mock aggregate by hand, because there was no shared total
  // to belong to. professional_rating_summary already counts every unredacted
  // row including this user's, so the number below IS the blend — and
  // re-adding the own review on top would double-count it.
  const aggregateCount = professional?.reviews ?? 0;

  const t = typeColours(listing?.subtype ?? null, dark);
  const gold = goldPill(dark);

  if (!professional) {
    // MO1.2.1 States, Loading: skeleton blocks at the anatomy positions
    // (surface.soft, each block's radius): the 96 avatar, name, headline,
    // the pills, then the About and Experience cards.
    if (listingLoading) {
      return (
        <div aria-busy="true">
          <span className="sr-only">Loading…</span>
          <div aria-hidden className="flex flex-col items-center gap-1.5 pt-[46px] mb-5">
            <span className="w-24 h-24 rounded-full bg-cream-soft mb-1.5" />
            <span className="w-40 h-[22px] rounded-md bg-cream-soft" />
            <span className="w-56 h-[15px] rounded-md bg-cream-soft" />
            <span className="w-44 h-[14px] rounded-md bg-cream-soft" />
            <span className="w-48 h-[26px] rounded-full bg-cream-soft mt-1.5" />
            <span className="w-32 h-7 rounded-full bg-cream-soft mt-0.5" />
          </div>
          <div aria-hidden className="h-[98px] rounded-[20px] bg-cream-soft mb-5" />
          <div aria-hidden className="h-[141px] rounded-[20px] bg-cream-soft" />
        </div>
      );
    }
    return (
      <div className="text-center py-20 text-charcoal-soft">
        Professional not found.
        <div className="mt-4">
          <Button onClick={() => navigate("/app/professionals")}>Back</Button>
        </div>
      </div>
    );
  }

  const first = professional.name.split(" ")[0];
  const rating = ratingLabel(listing?.averageRating ?? null, aggregateCount);
  /** MO1.2.1's section label: 10.5/700 uppercase in the type colour. */
  const sectionLabel = (text: string) => (
    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] px-1 mb-2" style={{ color: t.main }}>
      {text}
    </p>
  );
  // MO1.2.1: pills 26 tall (measured), 10 either side; the icon in the type's
  // main colour, the text in its deep colour (both sampled from the frame).
  const pill = "inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[11px] font-semibold";
  // The pinned row waits for the connection check, so Message never flashes
  // the non-client outline at someone who is already a client.
  const showPinned = isReal && activeClient !== null;
  const isOwnProfile = realProfessionalId !== null && realProfessionalId === authUserId;

  return (
    <div className={showPinned ? "pb-[172px]" : ""}>
      <button
        onClick={back}
        aria-label="Back"
        className="tap w-9 h-9 mt-0.5 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft mb-2"
      >
        {/* MO1.2.1 / MO1.2.1.4: ChevronLeft 18, in a 36 button at x 17 (the
            chevron's vertex measured at x 31.5, as on MO1.2) with its centre
            at y 44; the avatar starts at y 70. */}
        <ChevronLeft size={18} />
      </button>

      {/* MO1.2.1: the centred hero, in the professional's type colours (B3).
          Avatar 96 (measured on the frame). */}
      <div className="flex flex-col items-center text-center gap-1.5 mb-5 animate-fade-slide-up">
        <span
          className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden text-[26px] font-bold mb-1.5"
          style={{ background: t.pill, color: t.deep }}
        >
          {listing?.avatarUrl ? <img src={listing.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials(professional.name)}
        </span>
        <h1 className="flex items-center justify-center gap-1.5 text-[22px] font-bold leading-tight" style={{ color: t.deep }}>
          <span className="min-w-0 break-words">{professional.name}</span>
          {professional.verified && <VerifiedCheck size={18} strokeWidth={1.75} />}
        </h1>
        {professional.headline && (
          <p className="text-[15px] font-bold break-words" style={{ color: t.main }}>
            {professional.headline}
          </p>
        )}
        <p className="text-[14px] font-medium text-charcoal-soft">
          {[professionalRole({ specialty: professional.specialty, subtype: listing?.subtype ?? null }), professional.location]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-1.5">
          {isConnected && clientSince && (
            <span className={pill} style={{ background: t.pill, color: t.deep }}>
              <Handshake size={12} strokeWidth={1.75} aria-hidden style={{ color: t.main }} />
              Client since {new Date(clientSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          )}
          {/* New on the profile (MO1.2.1); none when no rate is set (B5). */}
          {listing?.monthlyRate != null && (
            <span className={pill} style={{ background: t.pill, color: t.deep }}>
              <Wallet size={12} strokeWidth={1.75} aria-hidden style={{ color: t.main }} />${listing.monthlyRate}/mo
            </span>
          )}
        </div>
        {/* The gold reviews pill opens the reviews page (B7, B9). "New" until
            three reviews count toward an average. */}
        <button
          type="button"
          onClick={() => navigate(`/app/professionals/${professional.id}/reviews`)}
          // 28 tall, 8 under the pills (measured on MO1.2.1).
          className="tap mt-0.5 inline-flex items-center gap-1.5 h-7 px-3.5 rounded-full text-[12px] font-bold"
          style={{ background: gold.bg, border: `1px solid ${gold.border}`, color: gold.ink }}
        >
          <Star size={13} aria-hidden style={{ fill: gold.star, color: gold.star }} />
          {rating.kind === "average"
            ? `${rating.value} · ${reviewCountLabel(rating.count)}`
            : aggregateCount > 0
              ? `New · ${reviewCountLabel(aggregateCount)}`
              : "New · no reviews yet"}
        </button>
      </div>

      {/* About IS the existing bio; the CV follows it. */}
      {professional.bio && (
        <section className="mb-5 animate-fade-slide-up" aria-label="About">
          {sectionLabel("About")}
          <div className="rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-4">
            <p className="text-[13px] text-charcoal-soft leading-relaxed whitespace-pre-line">{professional.bio}</p>
          </div>
        </section>
      )}

      {publicCv && (
        <div className="mb-5">
          <CvView cv={publicCv} skills={professional.skills} accent={{ label: t.main, pillBg: t.pill, pillInk: t.deep }} />
        </div>
      )}

      {/* V5 (QA 5.0): rating/reviewing is restricted to professionals you've
          actually hired — for anyone else, this section doesn't appear.
          GATED ON THE DATABASE'S ANSWER, not on the connection check beside
          it. can_review_professional admits anyone with a professional_clients
          row and deliberately does NOT filter disconnected_at, so somebody who
          has since left this professional can still review the work they did
          together — which `isConnected` would have hidden. The card also shows
          for an existing review regardless, so a past client can still edit or
          remove what they wrote. */}
      {(canReview === true || myReview) && (
        <section className="mb-5 animate-fade-slide-up" aria-label="My review">
          {sectionLabel("My review")}
          <MyReviewCard
            // MO1.2.1 #7: radius 20, padding 16 (the text sits at x 33).
            className="!rounded-[20px] !p-4"
            hideLabel
            firstName={first}
            review={myReview}
            status={myStatus}
            onOpen={() => setReviewOpen(true)}
            onWithdraw={withdrawMyReview}
          />
        </section>
      )}

      {/* Handover-complete pass: the "You can only review a professional
          you've worked with" line is gone. MO1.2.1.4 (not a client) draws no
          My review section and no line in its place. */}

      {reviewError && (
        // States, Error: an inline line in danger (no tinted box).
        <p role="alert" className="mb-5 px-1 text-[12.5px] font-medium text-status-high">
          {reviewError}
        </p>
      )}

      {liveHire && (
        <YourHireCard
          hire={liveHire}
          t={t}
          sectionLabel={sectionLabel}
          onChanged={(note) => {
            if (note) setCancelNote({ id: realProfessionalId, note });
            if (realProfessionalId) void loadHires(realProfessionalId);
          }}
        />
      )}
      {cancelNote && !liveHire && (
        <p role="status" className="mb-5 px-1 text-[12px] text-charcoal-soft">
          {cancelNote}
        </p>
      )}

      {isConnected && (
        // The data-sharing toggles live on the Professionals page
        // (DataSharingSection), where real consent hangs off real relationships.
        <p className="flex items-center gap-1.5 px-1 text-[11.5px] text-charcoal-faint mb-5">
          <Lock size={12} strokeWidth={1.75} className="shrink-0" /> Manage what your professionals can see under Professionals › Data
          sharing.
        </p>
      )}

      {isReal && activeClient === false && (
        <>
          {/* MO1.2.1.4 #7: the client-code card (358, the type pill, r18,
              p16; title 13.5/700 deep, body 12/400 #5B5349 on a 20 line) with
              its own "Message {first}" outline button: white, 1 px type deep,
              13/700 deep, MessageCircle 14 (40 tall, r12, measured). */}
          <div className="rounded-[18px] p-4" style={{ background: t.pill }}>
            <p className="text-[13.5px] font-bold" style={{ color: t.deep }}>
              Ask {first} for a client code
            </p>
            <p className="text-[12px] leading-5 text-charcoal-soft mt-1">
              {first} can generate a code for you. Redeem it from your profile to connect and start sharing data.
            </p>
            <button
              type="button"
              onClick={() => void openThread()}
              disabled={threadBusy}
              className="tap mt-4 w-full h-10 rounded-xl bg-cream-card flex items-center justify-center gap-1.5 text-[13px] font-bold disabled:opacity-60"
              style={{ color: t.deep, border: `1px solid ${t.deep}`, fontSize: textPx(13) }}
            >
              <MessageCircle size={14} aria-hidden /> Message {first}
            </button>
          </div>
        </>
      )}

      {threadError && (
        <p role="alert" className="mt-3 px-1 text-[12.5px] font-medium text-status-high">
          {threadError}
        </p>
      )}

      {/* MO1.2.1 #9 / MO1.2.1.4 #8 / MO1.2.1.5 #9: the pinned row, 358 × 44,
          r12, gap 8, labels 13.5/700. Message (secondary): the type pill and
          deep ink, with a 1 px deep outline when not yet a client
          (MO1.2.1.4). Hire (primary): white on the type's CTA fill (#9A8CD6 /
          #6F9993), Handshake 15, for a client and a non-client alike, as
          MO1.2.1 draws it: it opens the hire sheet (MO1.2.1.5). A paid hire on
          top of an existing relationship is ordinary (the contract). */}
      {/* Your own profile (user decision, 7 October 2026): no Hire — you
          cannot hire yourself — so Message stands alone. */}
      {showPinned && isOwnProfile && <PinnedCta size="base" primary={{
            label: "Message",
            icon: <MessageCircle size={15} />,
            loading: threadBusy,
            onClick: () => void openThread(),
            style: isConnected
              ? { background: t.pill, color: t.deep, fontSize: textPx(13.5) }
              : { background: t.pill, color: t.deep, border: `1px solid ${t.deep}`, fontSize: textPx(13.5) },
          }} />}
      {showPinned && !isOwnProfile && (
        <PinnedCta
          size="base"
          secondary={{
            label: "Message",
            icon: <MessageCircle size={15} />,
            loading: threadBusy,
            onClick: () => void openThread(),
            style: isConnected
              ? { background: t.pill, color: t.deep, fontSize: textPx(13.5) }
              : { background: t.pill, color: t.deep, border: `1px solid ${t.deep}`, fontSize: textPx(13.5) },
          }}
          primary={{
            label: "Hire",
            icon: <Handshake size={15} />,
            disabled: !authUserId,
            onClick: () => setHireOpen(true),
            style: { background: t.cta, color: t.onMain, fontSize: textPx(13.5) },
          }}
        />
      )}

      {isReal && (
        <HireSheet
          open={hireSheetOpen}
          onClose={closeHire}
          pro={{
            id: professional.id,
            name: professional.name,
            first,
            role: professionalRole({ specialty: professional.specialty, subtype: listing?.subtype ?? null }) ?? "",
            avatarUrl: listing?.avatarUrl ?? null,
          }}
          t={t}
          initialPlanId={deepLinkPlan}
          onHired={(hires) => {
            setCancelNote(null);
            if (hires) setHiresState({ id: professional.id, hires });
            else void loadHires(professional.id);
          }}
          onMessage={() => void openThread()}
          messageBusy={threadBusy}
          // Not for someone already their client: there is nothing to ask for.
          request={
            isConnected
              ? undefined
              : { state: hireRequestState, busy: requestSending, error: requestError, onSend: () => void sendRequest() }
          }
        />
      )}

      <ReviewFormSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        firstName={first}
        existing={myReview}
        onSave={submitReview}
        onWithdraw={withdrawMyReview}
      />
    </div>
  );
}
