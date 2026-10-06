import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
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
import {
  fetchMyHireRequest,
  sendHireRequest,
  type HireRequestState,
} from "../../services/hire-request";
import type { ProfessionalType } from "../../types";
import { useApp } from "../../context/AppContext";
import { useProfessionalReviews } from "../../hooks/useProfessionalReviews";
import { MyReviewCard, ReviewFormSheet } from "../../components/professionals/ReviewForms";
import { ratingLabel, reviewCountLabel } from "../../services/professional-reviews/rules";
import { ChevronLeft, Handshake, Lock, MessageCircle, Star, Wallet } from "lucide-react";
import { textPx } from "../../theme/textSize";

// MO1.2.1 / MO1.2.1.4 (R11): a centred hero in the professional's type
// colours, the price and client-since pills, the gold reviews pill (which
// opens the reviews page, MO1.2.1.1), section labels, and a pinned row:
// Message for a connected client, Message and "Request to hire" otherwise.
// The reviews sheet that lived here is now that page.

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
   * Whether this client already has a hire request with this professional.
   *
   * Stamped by professional id for the same reason the connection check is —
   * so switching between two listings cannot show the previous one's answer.
   * On-demand, because pending_client_requests is not in the realtime
   * publication; an acceptance therefore appears on the next visit rather than
   * live, which is the same trade the pin banner made before it got a
   * subscription.
   */
  const [requestState, setRequestState] = useState<{
    id: string | null;
    state: HireRequestState;
  }>({ id: null, state: "none" });
  const hireState: HireRequestState =
    realProfessionalId !== null && requestState.id === realProfessionalId
      ? requestState.state
      : "none";
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!realProfessionalId) return;
    let cancelled = false;
    void fetchMyHireRequest(realProfessionalId).then((res) => {
      if (cancelled || res.status !== "ok") return;
      setRequestState({ id: realProfessionalId, state: res.state });
    });
    return () => {
      cancelled = true;
    };
  }, [realProfessionalId]);

  const requestHire = async () => {
    if (!realProfessionalId || !authUserId || sending) return;
    setSending(true);
    const res = await sendHireRequest(realProfessionalId, authUserId);
    setSending(false);
    // Both refusals are states rather than errors, so each moves the card to
    // the state it describes rather than surfacing a code. 23505 means a
    // request is already open — reachable from a stale page or a double tap —
    // and landing on "pending" is exactly right, because one is.
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
    signedOut,
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
    return (
      <div className="text-center py-20 text-charcoal-soft">
        {listingLoading ? "Loading…" : "Professional not found."}
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
  const pill = "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold";
  // The pinned row waits for the connection check, so a client is never
  // shown "Request to hire" for a professional they already work with.
  const showPinned = isReal && activeClient !== null;

  return (
    <div className={showPinned ? "pb-[172px]" : ""}>
      <button
        onClick={() => navigate(-1)}
        aria-label="Back"
        className="tap w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft mb-1"
      >
        {/* MO1.2.1 / MO1.2.1.4: ChevronLeft 18. */}
        <ChevronLeft size={18} />
      </button>

      {/* MO1.2.1: the centred hero, in the professional's type colours (B3).
          Avatar 96 (measured on the frame). */}
      <div className="flex flex-col items-center text-center gap-1.5 mb-6 animate-fade-slide-up">
        <span
          className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden text-[26px] font-bold mb-1.5"
          style={{ background: t.pill, color: t.deep }}
        >
          {listing?.avatarUrl ? <img src={listing.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials(professional.name)}
        </span>
        <h1 className="flex items-center justify-center gap-1.5 text-[22px] font-bold leading-tight" style={{ color: t.deep }}>
          <span className="min-w-0 break-words">{professional.name}</span>
          {professional.verified && <VerifiedCheck size={18} />}
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
              <Handshake size={12} strokeWidth={1.75} aria-hidden />
              Client since {new Date(clientSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          )}
          {/* New on the profile (MO1.2.1); none when no rate is set (B5). */}
          {listing?.monthlyRate != null && (
            <span className={pill} style={{ background: t.pill, color: t.deep }}>
              <Wallet size={12} strokeWidth={1.75} aria-hidden />${listing.monthlyRate}/mo
            </span>
          )}
        </div>
        {/* The gold reviews pill opens the reviews page (B7, B9). "New" until
            three reviews count toward an average. */}
        <button
          type="button"
          onClick={() => navigate(`/app/professionals/${professional.id}/reviews`)}
          className="tap mt-1 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12px] font-bold"
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
            className="!rounded-[20px]"
            hideLabel
            firstName={first}
            review={myReview}
            status={myStatus}
            onOpen={() => setReviewOpen(true)}
            onWithdraw={withdrawMyReview}
          />
        </section>
      )}

      {/* Why the review card is absent, said once rather than left as silence.
          Shown only once the gate has actually answered — `canReview` is null
          while the check is in flight, and telling somebody they can't review
          before asking would be a guess. */}
      {isReal && !signedOut && canReview === false && !myReview && (
        <Card className="mb-5 animate-fade-slide-up">
          <p className="section-label text-charcoal-faint mb-1.5">Reviews</p>
          <p className="text-sm text-charcoal-faint">You can only review a professional you've worked with.</p>
        </Card>
      )}

      {reviewError && (
        <p className="mb-5 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">{reviewError}</p>
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
          {/* THE REQUEST'S OTHER TWO STATES, said in words above the pinned
              row. Both are facts, read on mount from pending_client_requests,
              which RLS scopes to this caller. There is no cancel, because the
              client has no UPDATE or DELETE grant on that table. */}
          {hireState === "pending" && (
            <div className="rounded-2xl bg-primary-pale border border-primary/20 px-4 py-3.5 text-center mb-3">
              <p className="text-sm font-semibold text-primary-dark">Request sent</p>
              <p className="text-[11.5px] text-charcoal-soft mt-1 leading-relaxed">
                Waiting for {first} to respond. You'll see them in your professionals once they accept.
              </p>
            </div>
          )}
          {hireState === "cooling_down" && (
            /* DELIBERATELY VAGUE: the mechanism is a rejection plus a 24-hour
               cooldown, and saying either would tell someone they were turned
               down and invite them to count the hours. */
            <div className="rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-center mb-3">
              <p className="text-sm font-semibold text-charcoal">Not taking new clients</p>
              <p className="text-[11.5px] text-charcoal-soft mt-1 leading-relaxed">
                {first} isn't accepting new clients at the moment. You can still message them, or ask for a client code.
              </p>
            </div>
          )}
          {requestError && <p className="text-[11.5px] text-status-high mb-3 px-1">{requestError}</p>}
          {/* MO1.2.1.4: the client-code route stays as a secondary card, in
              the type's pill colour. */}
          <div className="rounded-[18px] px-4 py-4" style={{ background: t.pill }}>
            <p className="text-[13.5px] font-bold" style={{ color: t.deep }}>
              Ask {first} for a client code
            </p>
            <p className="text-[12px] text-charcoal-soft mt-1 leading-relaxed">
              {first} can generate a code for you. Redeem it from your profile to connect and start sharing data.
            </p>
          </div>
        </>
      )}

      {threadError && (
        <p className="mt-3 text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{threadError}</p>
      )}

      {/* MO1.2.1 / MO1.2.1.4's pinned row (B6). Connected: Message only (the
          frame's own rule). Not connected: Message and "Request to hire" —
          the frame's Hire, which needs offers and payments (decision 4) — in
          its sent and cooldown states when there is one. */}
      {/* Labels 13.5/700 (MO1.2.1 #9, MO1.2.1.4 #8). MO1.2.1.4's Message
          carries a 1 px outline in the type's deep colour on the pill fill. */}
      {showPinned &&
        (isConnected ? (
          <PinnedCta
            primary={{
              label: `Message ${first}`,
              icon: <MessageCircle size={15} />,
              loading: threadBusy,
              onClick: () => void openThread(),
              style: { background: t.main, color: t.onMain, fontSize: textPx(13.5) },
            }}
          />
        ) : (
          <PinnedCta
            secondary={{
              label: "Message",
              icon: <MessageCircle size={15} />,
              loading: threadBusy,
              onClick: () => void openThread(),
              style: { background: t.pill, color: t.deep, border: `1px solid ${t.deep}`, fontSize: textPx(13.5) },
            }}
            primary={{
              label: hireState === "pending" ? "Request sent" : hireState === "cooling_down" ? "Not taking clients" : "Request to hire",
              icon: <Handshake size={15} />,
              loading: sending,
              disabled: hireState !== "none" || !authUserId,
              onClick: () => void requestHire(),
              style: { background: t.main, color: t.onMain, fontSize: textPx(13.5) },
            }}
          />
        ))}

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
