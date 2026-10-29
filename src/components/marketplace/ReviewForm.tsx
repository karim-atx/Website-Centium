import { useState } from "react";
import { Star } from "lucide-react";
import { FOCUS_CSS, usePress } from "../market/usePress";
import { useIsDark } from "../../hooks/useIsDark";
import { marketPalette } from "../../theme/marketTokens";
import { linePx, textPx } from "../../theme/textSize";
import { GuidelinesLink } from "../moderation/GuidelinesLink";

// MO1.2.1.2's review flow (34 pt stars on a 44 pitch, the text, Submit),
// shared by the gym page's "Write a review" (GymReviews), a venue-less
// business's review (write_business_review) and Rate your class from a
// booking (write_class_review, B14 RP-04). Each caller does its own write and
// answers with an error line or null. Market + Share 3.0 W2: restyled in the
// MasterBottomSheet body's chrome (--sgrey box, --sfield field, the 50 --fill
// CTA), the stars --gold / --swoff.

export const REVIEW_BODY_MAX = 2000;

export function ReviewForm({
  initialRating = 5,
  initialText = "",
  placeholder,
  submitLabel,
  onSubmit,
  onDelete,
  textOptional = false,
}: {
  initialRating?: number;
  initialText?: string;
  placeholder: string;
  submitLabel: string;
  /** Resolves to an error line, or null when written. */
  onSubmit: (rating: number, text: string) => Promise<string | null>;
  /** Own review only: "Delete review", tapped twice. */
  onDelete?: () => Promise<string | null>;
  /** Optional: stars alone can be sent (write_class_review, write_gym_review and write_business_review since Database #38); the text is required by default. */
  textOptional?: boolean;
}) {
  const m = marketPalette(useIsDark());
  const press = usePress();
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const over = text.length > REVIEW_BODY_MAX;
  const empty = !textOptional && !text.trim();

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

  const off = busy || over || empty;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }, (_, i) => {
          const c = i < rating ? m.gold : m.swoff;
          return (
            <button key={i} type="button" role="radio" aria-checked={rating === i + 1} onClick={() => setRating(i + 1)} aria-label={`${i + 1} star${i === 0 ? "" : "s"}`} className="hit market-focus" style={{ padding: 0, border: 0, background: "none", cursor: "pointer", borderRadius: 8 }}>
              <Star size={34} strokeWidth={1.5} fill={c} color={c} aria-hidden />
            </button>
          );
        })}
      </div>
      {/* The sheet's --sgrey box (radius 14, padding 12 14, the label 13 / 500 --slabel) with a --sfield text area (radius 10). */}
      <label style={{ display: "block", background: m.sgrey, borderRadius: 14, padding: "12px 14px" }}>
        <span style={{ display: "block", marginBottom: 8, fontSize: textPx(13), fontWeight: 500, color: m.slabel }}>Your review</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={5}
          aria-invalid={over || undefined}
          className="market-focus placeholder:text-charcoal-faint"
          style={{ display: "block", width: "100%", height: 180, boxSizing: "border-box", resize: "none", borderRadius: 10, border: 0, background: m.card, padding: "11px 13px", font: "inherit", fontSize: textPx(14), lineHeight: linePx(20), color: m.ink, outlineOffset: 0 }}
        />
      </label>
      {over && <p style={{ margin: 0, fontSize: textPx(12), fontWeight: 600, color: m.high }}>A review can be up to {REVIEW_BODY_MAX.toLocaleString("en")} characters.</p>}
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: textPx(12), fontWeight: 600, color: m.high }}>
          {error}
          <GuidelinesLink message={error} />
        </p>
      )}
      {/* The sheet CTA: 50 radius 16 --fill / --onfill 15 / 700; 40% when it can't be sent. */}
      <button
        type="button"
        onClick={() => void submit()}
        aria-disabled={off || undefined}
        aria-busy={busy || undefined}
        className="market-focus"
        {...press.handlers}
        style={{ width: "100%", height: 50, borderRadius: 16, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(15), fontWeight: 700, cursor: off ? "default" : "pointer", opacity: over || empty ? 0.4 : 1, ...(off ? {} : press.style) }}
      >
        {busy ? "One moment…" : submitLabel}
      </button>
      {onDelete && (
        <button type="button" onClick={() => void remove()} disabled={busy} className="market-focus" style={{ minHeight: 44, width: "100%", border: 0, background: "none", font: "inherit", fontSize: textPx(12.5), fontWeight: 700, color: m.high, cursor: "pointer" }}>
          {confirmDelete ? "Tap again to delete your review" : "Delete review"}
        </button>
      )}
    </div>
  );
}
