import { useState } from "react";
import { useLocation } from "react-router-dom";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { StarRating } from "../ui/StarRating";
import { useApp } from "../../context/AppContext";
import { MAX_REVIEW_TEXT, submitReview } from "../../services/app-reviews";
import { Check } from "lucide-react";

/** What each rating is called, so the number is not the only feedback. */
const RATING_LABELS = ["", "Not good", "Poor", "Okay", "Good", "Great"];

/**
 * Rating the app.
 *
 * THE COPY MATCHES WHAT THE SYSTEM CAN ACTUALLY DO, exactly as the bug-report
 * sheet's does. Nothing here notifies anyone — no mail provider, no queue, no
 * webhook — so a review waits until someone queries the table. The confirmed
 * state says it was received and is read, never that anyone will respond.
 *
 * THE RATING IS THE SUBMIT GATE, NOT THE TEXT. Five stars and nothing typed is
 * a complete review; requiring a sentence is how a form collects the word
 * "good" from people trying to get past it. So Submit needs a star and never
 * needs words.
 */
export const RateAppSheet: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { authUserId } = useApp();
  const location = useLocation();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Captured once at mount, and Settings keys this component on `open` so a
  // mount IS an open. That keying is also what resets it: a rating left over
  // from a previous visit is worse here than stale text would be in a bug
  // report, because a stars-already-chosen control invites submitting a number
  // the user never picked this time.
  const [route] = useState<string | null>(() => `${location.pathname}${location.search}`);

  const send = async () => {
    if (!authUserId) {
      setError("You need to be signed in to leave a review.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await submitReview({
      userId: authUserId,
      rating,
      reviewText,
      route,
      userAgent: typeof navigator === "undefined" ? null : navigator.userAgent,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "That review couldn't be sent.");
      return;
    }
    setSent(true);
    setTimeout(onClose, 1200);
  };

  const tooLong = reviewText.length > MAX_REVIEW_TEXT;

  return (
    <BottomSheet open={open} onClose={onClose} title="Rate this app">
      {sent ? (
        <div className="py-8 flex flex-col items-center text-center animate-fade-slide-up">
          <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center mb-3">
            <Check size={22} className="text-primary-dark" />
          </div>
          <p className="text-sm font-semibold text-charcoal">Review sent</p>
          <p className="text-xs text-charcoal-faint mt-1 max-w-xs">
            Thank you — the team reads these when reviewing feedback. You won&rsquo;t get a
            reply here.
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-slide-up">
          <p className="text-xs text-charcoal-soft">
            How has Centium been for you? A rating on its own is enough — the words are
            optional.
          </p>

          <div className="py-1">
            <StarRating value={rating} onChange={setRating} disabled={busy} />
            {/* Reserved rather than conditional, so choosing a star does not
                shift the textarea down under the user's thumb. */}
            <p className="text-[11px] text-charcoal-faint text-center mt-2 h-4">
              {rating > 0 ? RATING_LABELS[rating] : ""}
            </p>
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            placeholder="What works well, and what doesn't? (optional)"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />

          {/* Only once it is close to mattering. A counter sitting at 0 / 4000
              under an empty box reads as a demand for length — doubly wrong
              here, where text is optional. */}
          {reviewText.length > MAX_REVIEW_TEXT * 0.75 && (
            <p className={`text-[11px] text-right ${tooLong ? "text-status-high" : "text-charcoal-faint"}`}>
              {reviewText.length} / {MAX_REVIEW_TEXT}
            </p>
          )}

          {/* Stated rather than silently collected, matching the bug-report
              sheet. A reviewer is entitled to know what rides along. */}
          <p className="text-[11px] text-charcoal-faint">
            Sent with this review: the page you were on{route ? ` (${route})` : ""} and your
            browser version. Nothing from your health records is included.
          </p>

          {error && (
            <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{error}</p>
          )}

          <Button fullWidth size="lg" disabled={busy || rating < 1 || tooLong} onClick={() => void send()}>
            {busy ? "Sending…" : "Send review"}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};
