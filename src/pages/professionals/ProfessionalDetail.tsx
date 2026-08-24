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
  const { professionalReviews, submitProfessionalReview } = useApp();
  const professional = mockProfessionals.find((p) => p.id === id);
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
  const myReview = professionalReviews.find((r) => r.professionalId === id);
  const [reviewRating, setReviewRating] = useState(myReview?.rating ?? 5);
  const [reviewText, setReviewText] = useState(myReview?.text ?? "");

  if (!professional) {
    return (
      <div className="text-center py-20 text-charcoal-soft">
        Professional not found.
        <div className="mt-4">
          <Button onClick={() => navigate("/professionals")}>Back</Button>
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
        <span className="w-16 h-16 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
          {(() => {
            const Icon = professionalTypeIcon[professional.type];
            return <Icon size={28} className="text-sohati-dark" />;
          })()}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">{professional.name}</h1>
          <p className="text-sm text-sohati-dark font-medium">{professional.specialty}</p>
          <p className="text-xs text-charcoal-faint">{professional.location}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 animate-fade-slide-up">
        <span className="flex items-center gap-1 text-sm font-bold text-gold">
          <Star size={14} className="fill-gold" /> {professional.rating}
        </span>
        <span className="text-xs text-charcoal-faint">{professional.reviews} reviews</span>
        {professional.connected && (
          <span className="text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-2.5 py-1">
            Client since August 2026
          </span>
        )}
      </div>

      <Card className="mb-6 animate-fade-slide-up">
        <p className="text-sm text-charcoal-soft leading-relaxed">{professional.bio}</p>
      </Card>

      {/* V5 (QA 5.0): rating/reviewing is restricted to professionals you've
          actually hired — for anyone else, this section (and its reviews
          list) simply doesn't appear. */}
      {professional.connected && (
        <>
          <Card className="mb-3 animate-fade-slide-up flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
                Your rating
              </p>
              {myReview ? (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={14} className={i < myReview.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-charcoal-faint">You haven't reviewed {professional.name.split(" ")[0]} yet</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
              <Pencil size={13} /> {myReview ? "Edit review" : "Rate & Review"}
            </Button>
          </Card>

          {myReview && (
            <div className="mb-6 animate-fade-slide-up">
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
                Reviews
              </p>
              <Card>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-charcoal">You</p>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={11} className={i < myReview.rating ? "fill-gold text-gold" : "text-charcoal/15"} />
                    ))}
                  </div>
                </div>
                {myReview.text && <p className="text-sm text-charcoal-soft leading-relaxed">{myReview.text}</p>}
              </Card>
            </div>
          )}
        </>
      )}

      {professional.connected ? (
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
                    access[item.label] ? "bg-sohati justify-end" : "bg-charcoal/10 justify-start"
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
          <Button>Connect</Button>
        </div>
      )}

      {messageOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setMessageOpen(false)} />
          <div className="relative w-full sm:max-w-md h-[70vh] sm:h-[60vh] bg-cream rounded-t-4xl sm:rounded-4xl shadow-lift flex flex-col animate-sheet-up">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-charcoal/5">
              <span className="w-9 h-9 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = professionalTypeIcon[professional.type];
                  return <Icon size={16} className="text-sohati-dark" />;
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
                      m.from === "me" ? "bg-sohati text-white" : "bg-cream-card text-charcoal"
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
                className="flex-1 rounded-full bg-cream-card border border-charcoal/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sohati/15"
              />
              <button
                onClick={sendMessage}
                className="tap w-10 h-10 rounded-full bg-sohati text-white flex items-center justify-center shrink-0"
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
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20 resize-none"
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
    </div>
  );
}
