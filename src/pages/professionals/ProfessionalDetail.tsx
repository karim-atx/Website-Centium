import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { MessageProfessionalButton } from "../../components/messages/MessageProfessionalButton";
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
import { ReviewItem } from "../../components/professionals/ReviewItem";
import { RatingBadge } from "../../components/professionals/RatingBadge";
import { MyReviewCard, ReviewFormSheet, ReviewReportForm } from "../../components/professionals/ReviewForms";
import { reportReview } from "../../services/professional-reviews";
import { reviewCountLabel } from "../../services/professional-reviews/rules";
import { ChevronLeft, Lock } from "lucide-react";
import { professionalTypeIcon } from "../../utils/icons";
import { UserCheck } from "lucide-react";

// professional_subtype has five values; professionalTypeIcon has four. A real
// listing can hold 'other', and indexing the map with it yields undefined —
// which React renders as "Element type is invalid" and blanks the whole page.
const iconFor = (t: string) => (t in professionalTypeIcon ? professionalTypeIcon[t as ProfessionalType] : UserCheck);

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
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);
  /** The review being reported; the reviews sheet shows the form in its place. */
  const [reportingId, setReportingId] = useState<string | null>(null);

  // REAL ROWS, read as this caller. Signed out nothing is read — review text
  // has no anon grant — and the sheet asks them to sign in instead.
  const {
    mine: myReview,
    myStatus,
    others: otherReviews,
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

  const closeAllReviews = () => {
    setAllReviewsOpen(false);
    setReportingId(null);
  };

  // V7 (QA 7.0): "Your rating should influence the professional's overall
  // rating based on the total rating by all people."
  // IT DOES NOW, WITHOUT ARITHMETIC HERE. The old code blended the local
  // review into the mock aggregate by hand, because there was no shared total
  // to belong to. professional_rating_summary already counts every unredacted
  // row including this user's, so the number below IS the blend — and
  // re-adding the own review on top would double-count it.
  const aggregateCount = professional?.reviews ?? 0;

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

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="tap w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft mb-3"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex items-center gap-4 mb-5 animate-fade-slide-up">
        <span className="w-16 h-16 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
          {(() => {
            const Icon = iconFor(professional.type);
            return <Icon size={28} className="text-primary-dark" />;
          })()}
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 font-display text-[22px] leading-tight font-bold text-charcoal">
            <span className="min-w-0 break-words">{professional.name}</span>
            {professional.verified && <VerifiedCheck size={18} />}
          </h1>
          {professional.headline && (
            <p className="text-[13px] font-semibold text-primary-deep-text break-words">{professional.headline}</p>
          )}
          <p className="text-[12.5px] text-charcoal-soft">
            {[professionalRole({ specialty: professional.specialty, subtype: listing?.subtype ?? null }), professional.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 animate-fade-slide-up">
        {/* REAL LISTINGS HAVE REAL RATINGS NOW. This used to be hidden for
            them entirely, because there was no review schema behind a real
            account and a 0.0 would have looked like a verdict. There is one
            now — so the number shows when somebody has actually left one, and
            stays hidden when nobody has, which is still not a verdict. */}
        {/* The average only from three reviews; "New" below that. */}
        <RatingBadge average={listing?.averageRating ?? null} count={aggregateCount} withCount={false} />
        {aggregateCount > 0 && (
          <button onClick={() => setAllReviewsOpen(true)} className="tap min-h-[44px] text-xs text-charcoal-faint underline">
            {reviewCountLabel(aggregateCount)}
          </button>
        )}
        {isConnected && clientSince && (
          <span className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1">
            Client since {new Date(clientSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
        )}
      </div>

      {/* About IS the existing bio; the CV follows it. */}
      {professional.bio && (
        <Card className="mb-3.5 animate-fade-slide-up">
          <p className="section-label mb-2">About</p>
          <p className="text-sm text-charcoal-soft leading-relaxed whitespace-pre-line">{professional.bio}</p>
        </Card>
      )}

      {publicCv && (
        <div className="mb-6">
          <CvView cv={publicCv} skills={professional.skills} />
        </div>
      )}

      {/* V5 (QA 5.0): rating/reviewing is restricted to professionals you've
          actually hired — for anyone else, this section doesn't appear.
          V6 (QA 6.0): merged into a single box — the same card displays
          "My Review" and swaps its content between the empty prompt and
          the submitted review, instead of a separate rate-box + reviews list. */}
      {/* GATED ON THE DATABASE'S ANSWER, not on the connection check beside
          it. can_review_professional admits anyone with a professional_clients
          row and deliberately does NOT filter disconnected_at, so somebody who
          has since left this professional can still review the work they did
          together — which `isConnected` would have hidden. The card also shows
          for an existing review regardless, so a past client can still edit or
          remove what they wrote. */}
      {(canReview === true || myReview) && (
        <MyReviewCard
          className="mb-6 animate-fade-slide-up"
          firstName={professional.name.split(" ")[0]}
          review={myReview}
          status={myStatus}
          onOpen={() => setReviewOpen(true)}
          onWithdraw={withdrawMyReview}
        />
      )}

      {/* Why the review card is absent, said once rather than left as silence.
          Shown only once the gate has actually answered — `canReview` is null
          while the check is in flight, and telling somebody they can't review
          before asking would be a guess. */}
      {isReal && !signedOut && canReview === false && !myReview && (
        <Card className="mb-6 animate-fade-slide-up">
          <p className="section-label mb-1.5">Reviews</p>
          <p className="text-sm text-charcoal-faint">
            You can only review a professional you've worked with.
          </p>
        </Card>
      )}

      {reviewError && (
        <p className="mb-6 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">
          {reviewError}
        </p>
      )}

      {isConnected ? (
        <>
          {/* The data-sharing toggles that used to live here have moved to
              the Professionals page (DataSharingSection). They were keyed by
              this page's mock directory id ("pr1"), which is not a real
              account and can never hold a grant — so nothing set here was
              ever written, or ever visible to a professional. Real consent
              hangs off real relationships. */}
          <p className="flex items-center gap-1.5 text-xs text-charcoal-faint mb-6">
            <Lock size={12} /> Manage what your professionals can see under Professionals › Data
            sharing.
          </p>

          {/* Only for a real account. This branch is also reachable for a
              seeded mockProfessionals entry, whose id ("pr1") is not a uuid
              and could never hold a thread — offering Message there would
              fail on the RPC rather than at the button. */}
          {isReal && (
            <MessageProfessionalButton
              professionalId={professional.id}
              firstName={professional.name.split(" ")[0]}
            />
          )}
          {/* NO "REMOVE PROFESSIONAL" BUTTON HERE. It only ever applied to
              the seeded mockProfessionals entries, and it worked by adding an
              id to a local "dismissed" list — which ended the relationship in
              this browser's opinion and nowhere else. Both the entries and the
              list are gone. Ending a real relationship is a write
              (disconnect_client_relationship) and belongs on a path that makes
              it, not on a profile page that would only appear to. */}
        </>
      ) : (
        isReal ? (
          <>
          {/* ASKING DIRECTLY, THE OTHER REAL ROUTE ONTO A ROSTER. The card
              below still explains client codes, which the professional starts;
              this one is the request the CLIENT can start. Both are real and
              both end in a professional_clients row — by redeem_client_code
              and accept_client_request respectively — so neither replaces the
              other and they sit together.

              THREE STATES, AND ALL THREE ARE FACTS RATHER THAN GUESSES. The
              row is read on mount from pending_client_requests, which RLS
              scopes to this caller. There is no cancel, because the client has
              no UPDATE or DELETE grant on that table — offering one would be a
              button that cannot work. */}
          {hireState === "pending" ? (
            <div className="rounded-2xl bg-primary-pale border border-primary/20 px-4 py-3.5 text-center mb-2.5">
              <p className="text-sm font-semibold text-primary-dark">Request sent</p>
              <p className="text-[11.5px] text-charcoal-soft mt-1 leading-relaxed">
                Waiting for {professional.name.split(" ")[0]} to respond. You'll see them in your
                professionals once they accept.
              </p>
            </div>
          ) : hireState === "cooling_down" ? (
            /* DELIBERATELY VAGUE, AND THE VAGUENESS IS THE POINT. The
               mechanism is a rejection plus a 24-hour cooldown, and saying
               either out loud would tell someone they were turned down and
               invite them to count the hours. Neither helps them. This says
               the professional is not taking people on, which is true, and
               leaves the door open without naming a date. */
            <div className="rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-center mb-2.5">
              <p className="text-sm font-semibold text-charcoal">Not taking new clients</p>
              <p className="text-[11.5px] text-charcoal-soft mt-1 leading-relaxed">
                {professional.name.split(" ")[0]} isn't accepting new clients at the moment. You can
                still message them, or ask for a client code.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-center mb-2.5">
              <p className="text-sm font-semibold text-charcoal">
                Ask {professional.name.split(" ")[0]} to take you on
              </p>
              <p className="text-[11.5px] text-charcoal-soft mt-1 leading-relaxed">
                They'll see your request and can accept it from their dashboard.
              </p>
              {requestError && (
                <p className="text-[11.5px] text-status-high mt-2">{requestError}</p>
              )}
              <Button
                fullWidth
                className="mt-3.5"
                disabled={sending || !authUserId}
                onClick={() => void requestHire()}
              >
                {sending ? "Sending…" : "Request to hire"}
              </Button>
            </div>
          )}
          {/* No Hire on a real listing. Hiring here is local-only state -- a
             real relationship can still only come from a redeemed client
             code -- so the button would take a payment method, say "Hired",
             and connect nothing. A button that silently does nothing is the
             same lie as a figure that was never measured; say what actually
             works instead. */}
          <div className="rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-center">
            <p className="text-sm font-semibold text-charcoal">Ask them for a client code</p>
            <p className="text-[11.5px] text-charcoal-soft mt-1 leading-relaxed">
              {professional.name.split(" ")[0]} can generate a code for you. Redeem it from your
              profile to connect and start sharing data.
            </p>
            {/* THE PRE-HIRE ENTRY POINT, and the reason it belongs here.
                start_message_thread requires no relationship precisely so a
                client can ask a question before committing money, and this
                card is that moment — someone reading a listing, deciding.
                Until now the card said "ask them for a code" and offered no
                way to ask them anything. */}
            <MessageProfessionalButton
              professionalId={professional.id}
              firstName={professional.name.split(" ")[0]}
              className="mt-3.5"
            />
          </div>
          </>
        ) : (
        // A SEEDED SAMPLE, AND IT SAYS SO. There is no account behind a
        // mockProfessionals entry, so every action this page could offer is a
        // dead end: Message has no thread to open ("pr1" is not a uuid), and
        // the Hire button that used to sit here took a payment method, said
        // "Hired", and connected nothing. A note is the honest thing to put in
        // the space a call-to-action cannot fill.
        <div className="rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3.5 text-center">
          <p className="text-sm font-semibold text-charcoal">Sample listing</p>
          <p className="text-[11.5px] text-charcoal-soft mt-1 leading-relaxed">
            There's no real account behind this profile, so it can't be hired or
            messaged. Browse professionals to find one you can work with.
          </p>
        </div>
        )
      )}

      <ReviewFormSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        firstName={professional.name.split(" ")[0]}
        existing={myReview}
        onSave={submitReview}
        onWithdraw={withdrawMyReview}
      />

      <BottomSheet
        open={allReviewsOpen}
        onClose={closeAllReviews}
        onBack={reportingId ? () => setReportingId(null) : undefined}
        title={reportingId ? "Report this review" : `${aggregateCount} ${aggregateCount === 1 ? "Review" : "Reviews"}`}
      >
        {reportingId ? (
          <ReviewReportForm
            onSend={async (reason, detail) => {
              const r = await reportReview(reportingId, reason, detail);
              return r.ok ? null : r.message;
            }}
          />
        ) : signedOut ? (
          // The count is public; the words are for members. A prompt, not
          // the read's refusal dressed up as "Couldn't load reviews".
          <Card className="text-center py-8 animate-fade-slide-up">
            <p className="text-sm font-semibold text-charcoal">Sign in to read reviews</p>
            <p className="text-xs text-charcoal-faint mt-1 leading-relaxed">
              Reviews are from {professional.name.split(" ")[0]}'s clients, and members can read them.
            </p>
            <Button size="sm" className="mt-3" onClick={() => navigate("/app/onboarding")}>
              Sign in
            </Button>
          </Card>
        ) : (
          <div className="space-y-3 animate-fade-slide-up">
            {myReview && myStatus !== "withdrawn" && (
              <Card className="!bg-primary-pale">
                <p className="text-sm font-semibold text-charcoal mb-1.5">You</p>
                <ReviewItem
                  review={myReview}
                  showName={false}
                  starSize={12}
                  replyLabel={`Reply from ${professional.name.split(" ")[0]}`}
                />
              </Card>
            )}
            {otherReviews.map((r) => (
              <Card key={r.id}>
                <ReviewItem
                  review={r}
                  starSize={12}
                  replyLabel={`Reply from ${professional.name.split(" ")[0]}`}
                  actions={
                    <button
                      type="button"
                      onClick={() => setReportingId(r.id)}
                      className="tap min-h-[44px] text-xs font-semibold text-charcoal-faint"
                    >
                      Report
                    </button>
                  }
                />
              </Card>
            ))}
            {reviewError && <p className="text-xs font-semibold text-status-high text-center">{reviewError}</p>}
            {!reviewError && aggregateCount === 0 && otherReviews.length === 0 && (
              <Card className="text-center py-8">
                <p className="text-sm text-charcoal-faint">No reviews yet.</p>
              </Card>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
