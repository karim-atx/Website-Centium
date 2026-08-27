import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { mockProfessionals } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import {
  ChevronLeft,
  Star,
  MessageCircle,
  Lock,
  UtensilsCrossed,
  Dumbbell,
  Scale,
  TrendingUp,
  HeartPulse,
  Send,
  Pencil,
} from "lucide-react";
import clsx from "clsx";
import { professionalTypeIcon } from "../../utils/icons";

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

const accessItems = [
  { icon: UtensilsCrossed, label: "Food diary" },
  { icon: Dumbbell, label: "Workout activity" },
  { icon: Scale, label: "Weight" },
  { icon: TrendingUp, label: "Progress" },
  { icon: HeartPulse, label: "Health metrics" },
];

export default function ProfessionalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { professionalReviews, submitProfessionalReview, connectedProfessionalIds, connectProfessional } = useApp();
  const professional = mockProfessionals.find((p) => p.id === id);
  const isConnected = !!professional && (professional.connected || connectedProfessionalIds.includes(professional.id));
  const [access, setAccess] = useState<Record<string, boolean>>({
    "Food diary": true,
    "Workout activity": true,
    Weight: true,
    Progress: true,
    "Health metrics": false,
  });
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<{ from: "me" | "them"; text: string }[]>([
    { from: "them", text: "Hi! How's the new meal plan working for you? 🥗" },
  ]);
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
        Professional not found.
        <div className="mt-4">
          <Button onClick={() => navigate("/app/professionals")}>Back</Button>
        </div>
      </div>
    );
  }

  const sendMessage = () => {
    if (!messageText.trim()) return;
    setMessages((m) => [...m, { from: "me", text: messageText }]);
    setMessageText("");
    setTimeout(() => {
      setMessages((m) => [...m, { from: "them", text: "Got it — thanks for the update! 👍" }]);
    }, 1000);
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
            const Icon = professionalTypeIcon[professional.type];
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
        <span className="flex items-center gap-1 text-sm font-bold text-gold">
          <Star size={14} className="fill-gold" /> {displayRating}
        </span>
        <button onClick={() => setAllReviewsOpen(true)} className="tap text-xs text-charcoal-faint underline">
          {totalReviews} reviews
        </button>
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
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            What {professional.name.split(" ")[0]} can see
          </p>
          <Card padded={false} className="mb-3 divide-y divide-charcoal/[0.04] animate-fade-slide-up">
            {accessItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <item.icon size={17} className="text-charcoal-soft" />
                  <span className="text-sm text-charcoal font-medium">{item.label}</span>
                </div>
                <button
                  onClick={() => setAccess((a) => ({ ...a, [item.label]: !a[item.label] }))}
                  className={clsx(
                    "tap w-11 h-6 rounded-full flex items-center px-0.5 transition-colors",
                    access[item.label] ? "bg-primary justify-end" : "bg-charcoal/10 justify-start"
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            ))}
          </Card>
          <p className="flex items-center gap-1.5 text-xs text-charcoal-faint mb-6">
            <Lock size={12} /> You control what your professional can access.
          </p>

          <Button fullWidth variant="outline" onClick={() => setMessageOpen(true)}>
            <MessageCircle size={15} /> Message
          </Button>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setMessageOpen(true)}>
            <MessageCircle size={15} /> Message
          </Button>
          <Button onClick={() => connectProfessional(professional.id)}>Connect</Button>
        </div>
      )}

      {messageOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setMessageOpen(false)} />
          <div className="relative w-full sm:max-w-md h-[70vh] sm:h-[60vh] bg-cream rounded-t-4xl sm:rounded-4xl shadow-lift flex flex-col animate-sheet-up">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-charcoal/5">
              <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = professionalTypeIcon[professional.type];
                  return <Icon size={16} className="text-primary-dark" />;
                })()}
              </span>
              <p className="font-semibold text-charcoal">{professional.name}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={clsx("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                  <div
                    className={clsx(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                      m.from === "me" ? "bg-primary text-white" : "bg-cream-card text-charcoal"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-charcoal/5">
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message…"
                className="flex-1 rounded-full bg-cream-card border border-charcoal/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <button
                onClick={sendMessage}
                className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
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
