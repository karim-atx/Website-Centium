import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { MessageProfessionalButton } from "../../components/messages/MessageProfessionalButton";
import { mockProfessionals } from "../../data/mockProfessionals";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { isActiveClientOf } from "../../services/connected-professional";
import {
  fetchMyHireRequest,
  sendHireRequest,
  type HireRequestState,
} from "../../services/hire-request";
import type { ProfessionalType } from "../../types";
import { useApp } from "../../context/AppContext";
import { useProfessionalReviews } from "../../hooks/useProfessionalReviews";
import { ReviewItem } from "../../components/professionals/ReviewItem";
import { ChevronLeft, Star, Lock, Pencil, Trash2 } from "lucide-react";
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
  const { dismissedMockProfessionalIds, dismissMockProfessional, authUserId } = useApp();
  const [removeConfirm, setRemoveConfirm] = useState(false);

  // Real listings arrive from public_professional_directory keyed by account
  // uuid; the seeded mockProfessionals entries are keyed "pr1". Both routes
  // land here, so both have to resolve — before this, a real listing's
  // "View Profile" hit the mock lookup, missed, and rendered "Professional
  // not found."
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [listingLoading, setListingLoading] = useState(true);
  const mockProfessional = mockProfessionals.find((p) => p.id === id);

  useEffect(() => {
    if (!id || mockProfessional) {
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
  }, [id, mockProfessional]);

  // One shape for the page, whichever source it came from. `isReal` gates the
  // things only a real account can do.
  const professional = mockProfessional
    ? mockProfessional
    : listing
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
        connected: undefined as boolean | undefined,
      }
    : undefined;
  const isReal = !mockProfessional && !!listing;

  // Null for a mock entry, whose id ("pr1") is not an account and so can never
  // appear in professional_clients. One value to depend on, rather than two.
  const realProfessionalId = isReal ? professional?.id ?? null : null;

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
  const isConnected: boolean = isReal
    ? activeClient === true
    : !!professional?.connected && !dismissedMockProfessionalIds.includes(professional.id);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [confirmDeleteReview, setConfirmDeleteReview] = useState(false);

  // REAL ROWS. This was a localStorage array keyed on the directory id, so a
  // client's review lived on their own device and the professional it was
  // about never saw it.
  const {
    mine: myReview,
    others: otherReviews,
    error: reviewError,
    canReview,
    save: saveReview,
    remove: removeReview,
  } = useProfessionalReviews(realProfessionalId);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  // The sheet opens on what is stored, not on whatever was typed last time.
  const openReviewSheet = () => {
    setReviewRating(myReview?.rating ?? 5);
    setReviewText(myReview?.body ?? "");
    setConfirmDeleteReview(false);
    setReviewOpen(true);
  };

  /**
   * Re-reads the listing so the headline average moves with the write.
   *
   * THE AGGREGATE IS NOT THIS SCREEN'S TO COMPUTE. average_rating comes from a
   * view over every unredacted row, so the only honest way to show the new
   * number is to ask for it again — adding the new rating into the old average
   * locally would be a guess that drifts the moment anyone else reviews.
   */
  const refreshAggregate = async () => {
    if (!realProfessionalId) return;
    const found = await fetchListing(realProfessionalId);
    if (found) setListing(found);
  };

  const submitReview = async () => {
    if (savingReview) return;
    setSavingReview(true);
    const ok = await saveReview(reviewRating, reviewText);
    setSavingReview(false);
    if (!ok) return;
    await refreshAggregate();
    setReviewOpen(false);
  };

  const deleteMyReview = async () => {
    if (!confirmDeleteReview) {
      setConfirmDeleteReview(true);
      setTimeout(() => setConfirmDeleteReview(false), 3000);
      return;
    }
    setSavingReview(true);
    const ok = await removeReview();
    setSavingReview(false);
    if (!ok) return;
    await refreshAggregate();
    setReviewOpen(false);
  };

  // V7 (QA 7.0): "Your rating should influence the professional's overall
  // rating based on the total rating by all people."
  // IT DOES NOW, WITHOUT ARITHMETIC HERE. The old code blended the local
  // review into the mock aggregate by hand, because there was no shared total
  // to belong to. professional_rating_summary already counts every unredacted
  // row including this user's, so the number below IS the blend — and
  // re-adding the own review on top would double-count it.
  const aggregateCount = professional?.reviews ?? 0;
  const displayRating = professional && aggregateCount > 0 ? professional.rating.toFixed(1) : null;

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
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">{professional.name}</h1>
          <p className="text-sm text-primary-dark font-medium">{professional.specialty}</p>
          <p className="text-xs text-charcoal-faint">{professional.location}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 animate-fade-slide-up">
        {/* REAL LISTINGS HAVE REAL RATINGS NOW. This used to be hidden for
            them entirely, because there was no review schema behind a real
            account and a 0.0 would have looked like a verdict. There is one
            now — so the number shows when somebody has actually left one, and
            stays hidden when nobody has, which is still not a verdict. */}
        {displayRating !== null && (
          <>
            <span className="flex items-center gap-1 text-sm font-bold text-gold">
              <Star size={14} className="fill-gold" /> {displayRating}
            </span>
            <button onClick={() => setAllReviewsOpen(true)} className="tap text-xs text-charcoal-faint underline">
              {aggregateCount} {aggregateCount === 1 ? "review" : "reviews"}
            </button>
          </>
        )}
        {isReal && professional.location && (
          <span className="text-xs text-charcoal-faint">{professional.location}</span>
        )}
        {isConnected && (
          <span className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1">
            Client since August 2026
          </span>
        )}
      </div>

      <Card className="mb-6 animate-fade-slide-up">
        <p className="text-sm text-charcoal-soft leading-relaxed">{professional.bio}</p>
      </Card>

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
        <Card className="mb-6 animate-fade-slide-up">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">My Review</p>
            <Button size="sm" variant="outline" onClick={openReviewSheet}>
              <Pencil size={13} /> {myReview ? "Edit" : "Rate & Review"}
            </Button>
          </div>
          {myReview ? (
            <ReviewItem review={myReview} showName={false} starSize={14} />
          ) : (
            <p className="text-sm text-charcoal-faint">You haven't reviewed {professional.name.split(" ")[0]} yet</p>
          )}
        </Card>
      )}

      {/* Why the review card is absent, said once rather than left as silence.
          Shown only once the gate has actually answered — `canReview` is null
          while the check is in flight, and telling somebody they can't review
          before asking would be a guess. */}
      {isReal && canReview === false && !myReview && (
        <Card className="mb-6 animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1.5">Reviews</p>
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
          {/* V10 (QA 10.0): "a hired professional should have a remove
              professional button under message... prompt you to make sure
              you want to remove" — tap-again-to-confirm, same pattern used
              for other destructive actions in this app.

              MOCK ONLY, NOW THAT REAL CONNECTION COMES FROM THE DATABASE.
              dismissMockProfessional edits a local list and nothing else, so
              on a real listing this button ended a relationship only in this
              browser's opinion of it: the professional_clients row stayed
              active, the roster still listed the client, and reopening the
              page would have shown them connected again the moment the page
              read the database instead of localStorage.
              Hidden rather than shown-and-explained, because a disabled
              control still advertises an action this page cannot perform.
              Ending a real relationship belongs on a write path
              (disconnect_client_relationship), which is deliberately out of
              scope here — see the commit message. */}
          {!isReal && (
          <Button
            fullWidth
            variant="outline"
            className="!border-teal/30 !text-teal-dark mt-2.5"
            onClick={() => {
              if (removeConfirm) {
                // ADDS to the dismissed list. isConnected reads this as a
                // subtraction from the seed flag, so adding the id is what
                // turns the connected layout off — and, unlike the old
                // filter-it-out version, it survives a reload.
                dismissMockProfessional(professional.id);
                navigate("/app/professionals");
              } else {
                setRemoveConfirm(true);
                setTimeout(() => setRemoveConfirm(false), 3000);
              }
            }}
          >
            <Trash2 size={14} /> {removeConfirm ? "Tap again to confirm" : "Remove professional"}
          </Button>
          )}
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

      <BottomSheet open={reviewOpen} onClose={() => setReviewOpen(false)} title={`Rate ${professional.name.split(" ")[0]}`}>
        <div className="space-y-5 animate-fade-slide-up">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }, (_, i) => {
              const filled = i < reviewRating;
              return (
                <button
                  key={i}
                  onClick={() => setReviewRating(i + 1)}
                  aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
                  className="tap"
                >
                  <Star size={30} className={filled ? "fill-gold text-gold" : "text-charcoal/15"} />
                </button>
              );
            })}
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Your review</span>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={`How has your experience with ${professional.name.split(" ")[0]} been?`}
              rows={4}
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </label>
          {reviewError && <p className="text-xs font-semibold text-status-high">{reviewError}</p>}
          <Button fullWidth size="lg" onClick={() => void submitReview()} disabled={savingReview}>
            {savingReview ? "Saving…" : myReview ? "Save changes" : "Submit review"}
          </Button>
          {/* Delete is only offered once there is something to delete, and
              asks twice — the same two-tap confirm the rest of the app uses
              for destructive actions. */}
          {myReview && (
            <button
              onClick={() => void deleteMyReview()}
              disabled={savingReview}
              className="tap w-full text-center text-xs font-semibold text-status-high py-2"
            >
              {confirmDeleteReview ? "Tap again to delete your review" : "Delete review"}
            </button>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={allReviewsOpen}
        onClose={() => setAllReviewsOpen(false)}
        title={`${aggregateCount} ${aggregateCount === 1 ? "Review" : "Reviews"}`}
      >
        <div className="space-y-3 animate-fade-slide-up">
          {myReview && (
            <Card className="!bg-primary-pale">
              <p className="text-sm font-semibold text-charcoal mb-1.5">You</p>
              <ReviewItem review={myReview} showName={false} starSize={12} />
            </Card>
          )}
          {/* REAL ROWS, NOT mockReviewsFor(). That helper generated plausible
              names and sentences from a hash of the professional's id — fine
              as scaffolding for seeded entries, indistinguishable from real
              testimony once a real account had a listing. It is gone. */}
          {otherReviews.map((r) => (
            <Card key={r.id}>
              <ReviewItem review={r} starSize={12} />
            </Card>
          ))}
          {aggregateCount === 0 && (
            <Card className="text-center py-8">
              <p className="text-sm text-charcoal-faint">No reviews yet.</p>
            </Card>
          )}
          {/* The count comes from the aggregate, which anon can read; the
              bodies come from a table anon holds no grant on. Signed out,
              those two disagree — and saying so beats an empty list under a
              headline promising several. */}
          {aggregateCount > 0 && otherReviews.length === 0 && !myReview && (
            <Card className="text-center py-6">
              <p className="text-sm text-charcoal-faint">
                {authUserId
                  ? "No review text to show yet."
                  : "Sign in to read what clients wrote."}
              </p>
            </Card>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
