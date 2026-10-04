import React from "react";
import { Star } from "lucide-react";
import { ratingLabel, reviewCountLabel } from "../../services/professional-reviews/rules";

/**
 * A professional's rating: "★ 4.6 · 12 reviews", or "New" until three reviews
 * count towards it. The figures are the directory view's
 * (professional_rating_summary), or the Profile's own count of the same rows.
 */
export const RatingBadge: React.FC<{
  average: number | null;
  count: number;
  /** Shows the count too ("· 12 reviews"); otherwise the average alone. */
  withCount?: boolean;
  className?: string;
}> = ({ average, count, withCount = true, className = "" }) => {
  const label = ratingLabel(average, count);
  if (label.kind === "new") {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-primary-pale px-2 py-[2px] text-[11px] font-bold text-primary-deep-text ${className}`}
        aria-label={count > 0 ? `New, ${reviewCountLabel(count)}` : "New, no rating yet"}
      >
        New
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold text-charcoal ${className}`}>
      <Star size={13} aria-hidden className="fill-gold text-gold shrink-0" />
      <span>{label.value}</span>
      {withCount && <span className="font-semibold text-charcoal-faint">· {reviewCountLabel(label.count)}</span>}
    </span>
  );
};
