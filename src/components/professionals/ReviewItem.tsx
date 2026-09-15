import React from "react";
import { Star } from "lucide-react";
import type { ReviewRow } from "../../services/professional-reviews";

// One review, rendered the same way everywhere it appears.
//
// THREE SCREENS SHOW THESE — the listing, the client's own "My Review" card,
// and the professional's "Ratings & Reviews" — and the two details most easily
// got wrong are exactly the ones that would drift between three copies: the
// edited label, and what a redacted review looks like.
//
// A REDACTED REVIEW IS A RATING WITH NO WORDS, and rendering it that way is
// deliberate. Redaction moves the text into redacted_body, which no client
// role holds a SELECT grant on, so `body` simply comes back null — there is no
// "hidden text" to reveal and nothing broken about its absence. The public
// listing never reaches this case at all (the SELECT policy drops redacted
// rows for everyone but the reviewer and the professional), so the people who
// do see it are the two entitled to know it happened, and they are told rather
// than shown a blank card.

const stars = (rating: number, size: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={size} className={i < rating ? "fill-gold text-gold" : "text-charcoal/15"} />
  ));

export const ReviewItem: React.FC<{
  review: ReviewRow;
  /** Shown above the stars. Falls back to "A client" — see services/professional-reviews. */
  showName?: boolean;
  starSize?: number;
}> = ({ review, showName = true, starSize = 13 }) => {
  const redacted = !!review.redactedAt;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1">{stars(review.rating, starSize)}</div>
        {/* edited_at is stamped by a trigger only when the rating or body
            actually changed, so this label means a real edit rather than a
            save that touched nothing. */}
        {review.editedAt && !redacted && (
          <span className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide">
            Edited
          </span>
        )}
      </div>
      {showName && (
        <p className="text-xs font-semibold text-charcoal-soft mb-0.5">
          {review.reviewerName ?? "A client"}
        </p>
      )}
      {redacted ? (
        // The rating is shown because the row still holds it, but it is NOT
        // counted anywhere: professional_rating_summary is
        // `where redacted_at is null`, so a redacted review leaves the average
        // and the count entirely. Saying it still counted would be wrong —
        // checked against the view rather than assumed from the row.
        <p className="text-sm text-charcoal-faint italic">
          A moderator removed this review. It no longer counts toward the rating.
        </p>
      ) : (
        review.body && <p className="text-sm text-charcoal-soft leading-relaxed">{review.body}</p>
      )}
    </div>
  );
};
