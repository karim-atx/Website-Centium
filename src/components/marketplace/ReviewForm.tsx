import { useState } from "react";
import { Star } from "lucide-react";
import { CtaButton } from "../ui/PinnedCta";

// MO1.2.1.2's review flow (34 pt stars on a 44 pitch, the text, Submit),
// shared by the gym page's "Write a review" (GymReviews), a venue-less
// business's review (write_business_review) and Rate your class from a
// booking (write_class_review, B14 RP-04). Each caller does its own write and
// answers with an error line or null.

export const REVIEW_BODY_MAX = 2000;

export function ReviewForm({
  initialRating = 5,
  initialText = "",
  placeholder,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  initialRating?: number;
  initialText?: string;
  placeholder: string;
  submitLabel: string;
  /** Resolves to an error line, or null when written. */
  onSubmit: (rating: number, text: string) => Promise<string | null>;
  /** Own review only: "Delete review", tapped twice. */
  onDelete?: () => Promise<string | null>;
}) {
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const over = text.length > REVIEW_BODY_MAX;
  const empty = !text.trim();

  const submit = async () => {
    if (busy || over || empty) return;
    setBusy(true);
    const e = await onSubmit(rating, text);
    setBusy(false);
    setError(e);
  };

  const remove = async () => {
    if (!onDelete || busy) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const e = await onDelete();
    setBusy(false);
    setError(e);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-2.5" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i + 1} onClick={() => setRating(i + 1)} aria-label={`${i + 1} star${i === 0 ? "" : "s"}`} className="tap">
            <Star size={34} strokeWidth={1.5} className={i < rating ? "fill-gold text-gold" : "text-charcoal/15"} />
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-faint mb-2.5 block">Your review</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={5}
          aria-invalid={over || undefined}
          className="w-full h-[209px] rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </label>
      {over && <p className="m-0 text-xs font-semibold text-status-high">A review can be up to {REVIEW_BODY_MAX.toLocaleString("en")} characters.</p>}
      {error && (
        <p role="alert" className="m-0 text-xs font-semibold text-status-high">
          {error}
        </p>
      )}
      <CtaButton size="page" label={submitLabel} loading={busy} disabled={over || empty} onClick={() => void submit()} className="!bg-fill-pinned !text-on-primary-fill" />
      {onDelete && (
        <button type="button" onClick={() => void remove()} disabled={busy} className="tap min-h-[44px] w-full text-xs font-semibold text-status-high">
          {confirmDelete ? "Tap again to delete your review" : "Delete review"}
        </button>
      )}
    </div>
  );
}
