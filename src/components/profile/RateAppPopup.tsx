import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Star } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { StarRating } from "../ui/StarRating";
import { useApp } from "../../context/AppContext";
import { MAX_REVIEW_TEXT, submitReview } from "../../services/app-reviews";

/** What each rating is called, so the number is not the only feedback. */
const RATING_LABELS = ["", "Not good", "Poor", "Okay", "Good", "Great"];

/**
 * MO1.8.11 Rate this app, as a centred popup (no ×; outside tap and Escape
 * close it). Writes app_reviews exactly as the old sheet did; the button is
 * the board's "Send".
 *
 * NO STORE HAND-OFF (C34). The board passes high ratings to the App Store or
 * Play rating prompt after Send; that is a native API, and the web has no
 * sensible equivalent, so nothing follows Send here.
 *
 * THE RATING IS THE SUBMIT GATE, NOT THE TEXT: five stars and nothing typed
 * is a complete review. Settings keys this popup on `open`, so every opening
 * starts with no stars chosen.
 */
export const RateAppPopup: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { authUserId } = useApp();
  const location = useLocation();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
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

  if (sent) {
    return (
      <CentredPopup
        open={open}
        onClose={onClose}
        title="Review sent"
        icon={<Check size={22} />}
        body="Thank you. The team reads these when reviewing feedback. You won’t get a reply here."
      />
    );
  }

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title="Rate this app"
      // MO1.8.11: Star 22 / 1.75; the card 346 wide (overlay padded 0 22).
      icon={<Star size={22} strokeWidth={1.75} />}
      maxWidth={346}
      cta={{
        label: busy ? "Sending…" : "Send",
        disabled: busy || rating < 1 || tooLong,
        onClick: () => void send(),
      }}
    >
      <StarRating value={rating} onChange={setRating} disabled={busy} />
      {/* Reserved rather than conditional, so choosing a star does not shift
          the box down under the user's thumb. */}
      <p className="text-[11px] text-charcoal-faint text-center mt-1.5 h-4">{rating > 0 ? RATING_LABELS[rating] : ""}</p>

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={3}
        aria-label="Your review (optional)"
        placeholder="What works well, and what doesn't? (optional)"
        // 96 tall on the board (186 to 281.5 on the 2x crop).
        className="mt-2 h-24 w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-[13px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
      />

      {reviewText.length > MAX_REVIEW_TEXT * 0.75 && (
        <p className={`mt-1.5 text-[11px] text-right ${tooLong ? "text-status-high" : "text-charcoal-faint"}`}>
          {reviewText.length} / {MAX_REVIEW_TEXT}
        </p>
      )}

      <p className="mt-3 text-[11px] text-charcoal-faint">
        Sent with this review: the page you were on{route ? ` (${route})` : ""} and your browser
        version. Nothing from your health records is included.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      )}
    </CentredPopup>
  );
};
