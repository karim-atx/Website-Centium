import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { MessageProfessionalButton } from "../../components/messages/MessageProfessionalButton";
import { mockProfessionals } from "../../data/mockProfessionals";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { isActiveClientOf } from "../../services/connected-professional";
import type { ProfessionalType } from "../../types";
import { useApp } from "../../context/AppContext";
import {
  ChevronLeft,
  Star,
  Lock,
  Pencil,
  CreditCard,
  Wallet,
  Banknote,
  Check,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { professionalTypeIcon } from "../../utils/icons";
import { UserCheck } from "lucide-react";

// professional_subtype has five values; professionalTypeIcon has four. A real
// listing can hold 'other', and indexing the map with it yields undefined —
// which React renders as "Element type is invalid" and blanks the whole page.
const iconFor = (t: string) => (t in professionalTypeIcon ? professionalTypeIcon[t as ProfessionalType] : UserCheck);

// V8 (QA 8.0): "pressing on the grey review text would open to all the
// reviews written by the clients" — this app only ever stores the current
// user's own review per professional, so a deterministic (id-seeded) set of
// plausible reviewer names/ratings/comments fills out the rest of the list,
// same spirit as this prototype's other seeded-but-fake demo data.
const reviewerNames = [
  "Nadine K.", "Sami R.", "Yara B.", "Elie S.", "Rana F.", "Tony K.", "Layal C.", "Karim A.",
];
const reviewComments = [
  "Really helped me stay consistent with my plan.",
  "Professional, punctual, and knows their stuff.",
  "Great communication between sessions.",
  "Made a noticeable difference in a few weeks.",
  "Would recommend to anyone starting out.",
  "Explains things clearly and adjusts the plan when needed.",
];
function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function mockReviewsFor(professionalId: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const h = hashSeed(`${professionalId}-review-${i}`);
    return {
      name: reviewerNames[h % reviewerNames.length],
      rating: 3 + (h % 3),
      text: reviewComments[h % reviewComments.length],
    };
  });
}

// V9 (QA 9.0): "connect should be replaced with hire that when pressed
// shows you how much they charge alongside methods of payment"
const paymentMethods = [
  { value: "card", label: "Card", icon: CreditCard },
  { value: "whish", label: "Whish Money", icon: Wallet },
  { value: "cash", label: "Cash", icon: Banknote },
];

// V9 (QA 9.0): "The client can only hire one professional from each
// specialty at a particular time" — trainer/physiotherapist/dietitian, per
// the QA text; doctor isn't mentioned so stays unrestricted.
const specialtyLimited = new Set(["trainer", "physiotherapist", "dietitian"]);
const specialtyLabel: Record<string, string> = {
  trainer: "Personal Trainer",
  physiotherapist: "Physiotherapist",
  dietitian: "Dietitian",
};

export default function ProfessionalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    professionalReviews,
    submitProfessionalReview,
    connectedProfessionalIds,
    connectProfessional,
    disconnectProfessional,
    user,
    submitClientRequest,
  } = useApp();
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
        rating: 0,
        reviews: 0,
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
   * TWO SOURCES, BECAUSE THIS PAGE SERVES TWO KINDS OF PROFESSIONAL.
   *
   * A real listing asks the database: `professional_clients` with
   * `disconnected_at is null` is the only thing that decides whether someone
   * is a client, and it is the thing the roster and the consent screen already
   * read.
   *
   * A mock entry keeps the local array, unchanged. Its ids are not accounts,
   * so no query could answer for them, and the seeded directory is prototype
   * behaviour that this fix deliberately leaves alone.
   *
   * WHAT THIS REPLACES, FOR REAL LISTINGS, IS A VALUE THE DATABASE NEVER SAW.
   * `connectedProfessionalIds` lives in this browser's localStorage and is
   * written only by this page's own hire and remove buttons. It went stale in
   * both directions: a relationship created through the real flow never
   * reached it, and one ended from the professional's roster never cleared it.
   * It is also per-device, so the same account disagreed with itself across
   * two browsers.
   */
  const isConnected = isReal
    ? activeClient === true
    : !!professional && (professional.connected || connectedProfessionalIds.includes(professional.id));
  const [hireOpen, setHireOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0].value);
  const [paid, setPaid] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);
  const myReview = professionalReviews.find((r) => r.professionalId === id);
  const [reviewRating, setReviewRating] = useState(myReview?.rating ?? 5);
  const [reviewText, setReviewText] = useState(myReview?.text ?? "");

  // V7 (QA 7.0): "Your rating should influence the professional's overall
  // rating based on the total rating by all people" — blend the user's own
  // submitted rating into the mock aggregate instead of showing it
  // separately with no effect on the headline number.
  const totalReviews = (professional?.reviews ?? 0) + (myReview ? 1 : 0);
  const displayRating =
    professional && totalReviews > 0
      ? ((professional.rating * professional.reviews + (myReview?.rating ?? 0)) / totalReviews).toFixed(1)
      : professional?.rating.toFixed(1);

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

  // V9 (QA 9.0): only one hired professional per specialty at a time.
  const conflictingProfessional = specialtyLimited.has(professional.type)
    ? mockProfessionals.find(
        (p) =>
          p.id !== professional.id &&
          p.type === professional.type &&
          (p.connected || connectedProfessionalIds.includes(p.id))
      )
    : undefined;

  /**
   * MOCK PROFESSIONALS ONLY. THIS CANNOT RUN FOR A REAL LISTING.
   *
   * The one `setHireOpen(true)` sits in the `isReal` FALSE branch below — a
   * real listing gets the "Ask them for a client code" card instead, and never
   * shows a Hire button. So there is no route from a real professional's page
   * into this function.
   *
   * Worth stating outright because a729f35's message claimed that "completing
   * that flow for a real listing correctly shows not-connected afterward".
   * That overstates it: the flow is not completable there at all. The change
   * that commit actually made — isConnected reading professional_clients for
   * real listings — is unaffected and correct; only that sentence was wrong.
   *
   * WHAT "PAYMENT" MEANS HERE IS A setTimeout AND A BOOLEAN. `paymentMethod`
   * is held in state and never read again: not sent, not stored, not passed on.
   * There is no payment provider in this repo — no dependency, no env var, no
   * stub. The payment-shaped vocabulary elsewhere (payment_modality, the
   * method lists) records what a professional ACCEPTS, not a transaction.
   *
   * Both real routes into professional_clients live in the database and
   * neither passes through here: redeem_client_code, and
   * accept_client_request against a pending_client_requests row. See the note
   * on acceptClientRequest in AppContext.
   */
  const confirmHire = () => {
    setPaid(true);
    setTimeout(() => {
      connectProfessional(professional.id);
      // QA 12.0: "Between the search and plus logo should be an inbox
      // logo that shows new clients that hire the professional upon
      // successful payment... The professional has the ability to accept
      // or reject the client." Simulated on this same account — see the
      // pendingClientRequests comment in AppContext for why.
      submitClientRequest(user.firstName || user.businessName || "New client");
      setHireOpen(false);
      setPaid(false);
    }, 900);
  };

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
        {/* Ratings exist only for the seeded mock entries. A real listing has
            no review schema behind it, so it shows none rather than a 0.0 that
            looks like a verdict. */}
        {!isReal && (
          <>
            <span className="flex items-center gap-1 text-sm font-bold text-gold">
              <Star size={14} className="fill-gold" /> {displayRating}
            </span>
            <button onClick={() => setAllReviewsOpen(true)} className="tap text-xs text-charcoal-faint underline">
              {totalReviews} reviews
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
      {isConnected && (
        <Card className="mb-6 animate-fade-slide-up">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">My Review</p>
            <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
              <Pencil size={13} /> {myReview ? "Edit" : "Rate & Review"}
            </Button>
          </div>
          {myReview ? (
            <>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} className={i < myReview.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
                ))}
              </div>
              {myReview.text && <p className="text-sm text-charcoal-soft leading-relaxed">{myReview.text}</p>}
            </>
          ) : (
            <p className="text-sm text-charcoal-faint">You haven't reviewed {professional.name.split(" ")[0]} yet</p>
          )}
        </Card>
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
              disconnectProfessional edits the local array and nothing else, so
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
                disconnectProfessional(professional.id);
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
          /* No Hire on a real listing. Hiring here is local-only state -- a
             real relationship can still only come from a redeemed client
             code -- so the button would take a payment method, say "Hired",
             and connect nothing. A button that silently does nothing is the
             same lie as a figure that was never measured; say what actually
             works instead. */
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
        ) : (
        // No Message on a seeded mock professional: there is no account behind
        // it to message, and the mock chat that used to sit here answered
        // itself rather than admitting that.
        <div>
          {/* V9 (QA 9.0): "connect should be replaced with hire" */}
          <Button fullWidth onClick={() => setHireOpen(true)}>Hire</Button>
        </div>
        )
      )}

      <BottomSheet open={hireOpen} onClose={() => setHireOpen(false)} title={`Hire ${professional.name.split(" ")[0]}`}>
        <div className="space-y-5 animate-fade-slide-up">
          {conflictingProfessional ? (
            <div className="text-center py-4">
              <p className="text-sm text-charcoal-soft mb-1">
                You already have a {specialtyLabel[professional.type]} —{" "}
                <strong>{conflictingProfessional.name}</strong>.
              </p>
              <p className="text-xs text-charcoal-faint">
                Remove that professional before hiring a new one in the same specialty.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">Rate</p>
                <p className="text-3xl font-bold text-charcoal">
                  ${professional.monthlyRate}
                  <span className="text-sm font-normal text-charcoal-faint">/month</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-charcoal-soft mb-2">Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={clsx(
                        "tap flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3.5 border-2 transition-colors",
                        paymentMethod === pm.value
                          ? "bg-primary-pale border-primary text-primary-dark"
                          : "bg-cream-soft border-transparent text-charcoal-soft"
                      )}
                    >
                      <pm.icon size={18} />
                      <span className="text-[11px] font-semibold">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button fullWidth size="lg" onClick={confirmHire} disabled={paid}>
                {paid ? <><Check size={16} /> Hired</> : `Pay $${professional.monthlyRate} & hire`}
              </Button>
              <p className="text-[11px] text-charcoal-faint text-center">
                Prototype checkout — no real payment is processed. You're only connected once payment
                completes.
              </p>
            </>
          )}
        </div>
      </BottomSheet>

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
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              if (!id) return;
              submitProfessionalReview(id, reviewRating, reviewText.trim());
              setReviewOpen(false);
            }}
          >
            Submit review
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={allReviewsOpen} onClose={() => setAllReviewsOpen(false)} title={`${totalReviews} Reviews`}>
        <div className="space-y-3 animate-fade-slide-up">
          {myReview && (
            <Card className="!bg-primary-pale">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-charcoal">You</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={12} className={i < myReview.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
                  ))}
                </div>
              </div>
              {myReview.text && <p className="text-sm text-charcoal-soft leading-relaxed">{myReview.text}</p>}
            </Card>
          )}
          {mockReviewsFor(professional.id, Math.min(professional.reviews, 8)).map((r, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-charcoal">{r.name}</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Star key={j} size={12} className={j < r.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-charcoal-soft leading-relaxed">{r.text}</p>
            </Card>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
