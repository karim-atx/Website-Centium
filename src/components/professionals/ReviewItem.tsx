import React from "react";
import { Star } from "lucide-react";
import type { ReviewRow } from "../../services/professional-reviews";

// One review, rendered the same way everywhere it appears: the listing's
// reviews sheet, the reviewer's own card, and the professional's Profile.
//
// A REDACTED REVIEW IS A RATING WITH NO WORDS. Redaction moves the text into
// redacted_body, which no client role can read, so `body` comes back null.
// Only the reviewer and the professional ever see one, and they are told
// rather than shown a blank card.
//
// THE REPLY SITS UNDER THE REVIEW it answers, set in from the left, and is
// labelled with whose it is. A reply a moderator removed reaches only the
// professional, as "(removed)" in body; it is said in words instead.

const stars = (rating: number, size: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={size} aria-hidden className={i < rating ? "fill-gold text-gold" : "text-charcoal/15"} />
  ));

export const ReviewItem: React.FC<{
  review: ReviewRow;
  /** Shown above the stars. Falls back to "A client" — see services/professional-reviews. */
  showName?: boolean;
  starSize?: number;
  /** "Reply from Sarah", or "Your reply" on the professional's own Profile. */
  replyLabel?: string;
  /** Report, reply and the like, under the review. */
  actions?: React.ReactNode;
}> = ({ review, showName = true, starSize = 13, replyLabel = "Reply from the professional", actions }) => {
  const redacted = !!review.redactedAt;
  const reply = review.reply;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1" role="img" aria-label={`${review.rating} out of 5 stars`}>
          {stars(review.rating, starSize)}
        </div>
        {/* edited_at is stamped by a trigger only when the rating or body
            actually changed, so this means a real edit. */}
        {review.editedAt && !redacted && (
          <span className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide">Edited</span>
        )}
      </div>
      {showName && <p className="text-xs font-semibold text-charcoal-soft mb-0.5">{review.reviewerName ?? "A client"}</p>}
      {redacted ? (
        // Not counted anywhere: professional_rating_summary leaves redacted
        // reviews out of the average and the count.
        <p className="text-sm text-charcoal-faint italic">A moderator removed this review. It no longer counts toward the rating.</p>
      ) : (
        review.body && <p className="text-sm text-charcoal-soft leading-relaxed whitespace-pre-line break-words">{review.body}</p>
      )}
      {reply && (
        <div className="mt-2.5 ml-1 pl-3 border-l-2 border-primary/30">
          <p className="flex items-center gap-2 text-[11px] font-bold text-charcoal-soft">
            {replyLabel}
            {reply.editedAt && !reply.redactedAt && (
              <span className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide">Edited</span>
            )}
          </p>
          {reply.redactedAt ? (
            <p className="text-[13px] text-charcoal-faint italic">A moderator removed this reply. Only you can see that it was here.</p>
          ) : (
            <p className="text-[13px] text-charcoal-soft leading-relaxed whitespace-pre-line break-words">{reply.body}</p>
          )}
        </div>
      )}
      {actions && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">{actions}</div>}
    </div>
  );
};
