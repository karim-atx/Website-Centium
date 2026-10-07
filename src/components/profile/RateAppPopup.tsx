import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Star } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { StarRating } from "../ui/StarRating";
import { useApp } from "../../context/AppContext";
import { MAX_REVIEW_TEXT, submitReview } from "../../services/app-reviews";

/**
 * MO1.8.11 Rate this app, as a centred popup (no ×; outside tap and Escape
 * close it). Writes app_reviews exactly as the old sheet did; the button is
 * the board's "Send". Measured from the 2x frame: the card padded 22 on top
 * and 18 at the sides and bottom; five Star 30 / 1.5 stars 8 apart; 14 under
 * them a 96 pt field (13 / 400); 14 under it, Send.
 *
 * NO STORE HAND-OFF (C34). The board passes high ratings to the App Store or
 * Play rating prompt after Send; that is a native API, and the web has no
 * sensible equivalent, so nothing follows Send here.
 *
 * THE RATING IS THE SUBMIT GATE, NOT THE TEXT: five stars and nothing typed
 * is a complete review. Settings keys this popup on `open`, so every opening
 * starts with no stars chosen.
 *
 * Handover-complete pass: the rating word under the stars and the character
 * counter are gone (not drawn; each star still names its value to screen
 * readers). Going over the limit is the Foundations input error instead.
 * The "Sent with this review" line stays: it is a privacy disclosure of what
 * is collected (exception 1). The sent state and errors are the Foundations
 * popup and error line (the board draws neither).
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
  // MO1.8.11 measured: 22 top, 18 sides and bottom (the Foundations card is 24 × 20).
  const pad = "!px-[18px] !pt-[22px] !pb-[18px]";

  if (sent) {
    return (
      <CentredPopup
        open={open}
        onClose={onClose}
        className={pad}
        title="Review sent"
        icon={<Check size={22} strokeWidth={1.75} />}
        body="Thank you. The team reads these when reviewing feedback. You won’t get a reply here."
      />
    );
  }

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      className={pad}
      title="Rate this app"
      // MO1.8.11: Star 22 / 1.75; the card the Foundations 342 wide (decision 23 flag).
      icon={<Star size={22} strokeWidth={1.75} />}
      cta={{
        label: "Send",
        loading: busy,
        disabled: rating < 1 || tooLong,
        onClick: () => void send(),
        className: "!mt-3.5",
      }}
    >
      <StarRating value={rating} onChange={setRating} disabled={busy} />

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={3}
        aria-label="Your review (optional)"
        aria-invalid={tooLong || undefined}
        placeholder="What works well, and what doesn't? (optional)"
        // 96 tall on the board (186 to 281.5 on the 2x crop), 14 under the stars.
        className={`mt-3.5 h-24 w-full rounded-2xl bg-cream-soft border px-3.5 py-3 text-[13px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${
          tooLong ? "border-status-high" : "border-charcoal/10"
        }`}
      />
      {tooLong && (
        <p role="alert" className="mt-1.5 text-[12px] font-semibold text-status-high">
          Too long: {reviewText.length.toLocaleString("en-GB")} of {MAX_REVIEW_TEXT.toLocaleString("en-GB")} characters.
        </p>
      )}

      {/* Stated rather than silently collected (privacy, exception 1). */}
      <p className="mt-2 text-[11px] text-charcoal-faint">
        Sent with this review: the page you were on{route ? ` (${route})` : ""} and your browser
        version. Nothing from your health records is included.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}
    </CentredPopup>
  );
};
