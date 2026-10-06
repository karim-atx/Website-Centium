import React from "react";
import { Star, User } from "lucide-react";
import type { ReviewRow } from "../../services/professional-reviews";
import { textPx } from "../../theme/textSize";

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

/** The words, any moderator note, the professional's reply and the actions: shared by both layouts. */
const Body: React.FC<{
  review: ReviewRow;
  redacted: boolean;
  replyLabel: string;
  actions?: React.ReactNode;
  size: number;
}> = ({ review, redacted, replyLabel, actions, size }) => {
  const reply = review.reply;
  return (
    <>
        {redacted ? (
          // Not counted anywhere: professional_rating_summary leaves redacted
          // reviews out of the average and the count.
          <p className="text-charcoal-faint italic" style={{ fontSize: textPx(size) }}>A moderator removed this review. It no longer counts toward the rating.</p>
        ) : (
          review.body && <p className="text-charcoal-soft leading-relaxed whitespace-pre-line break-words" style={{ fontSize: textPx(size) }}>{review.body}</p>
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
    </>
  );
};

export const ReviewItem: React.FC<{
  review: ReviewRow;
  /** Shown above the stars. Falls back to "A client" — see services/professional-reviews. */
  showName?: boolean;
  starSize?: number;
  /** "Reply from Sarah", or "Your reply" on the professional's own Profile. */
  replyLabel?: string;
  /** Report, reply and the like, under the review. */
  actions?: React.ReactNode;
  /**
   * "row" (MO1.2.1.1, the reviews page): an avatar, the name, then stars and
   * the date on one line. The name stays the shipped rule (B10): a first name
   * only when the reviewer opted in, else "A client" with a plain person icon.
   */
  layout?: "default" | "row";
  /**
   * "row" only: a trailing control on the name line, e.g. MO1.2.1.1's ⋮ menu
   * holding Report (decision 23, kept-list 190), which clears the row under
   * the review.
   */
  menu?: React.ReactNode;
}> = ({ review, showName = true, starSize = 13, replyLabel = "Reply from the professional", actions, layout = "default", menu }) => {
  const redacted = !!review.redactedAt;
  if (layout === "row") {
    const named = !!review.reviewerName;
    // MO1.2.1.1: the body starts at the row's left edge, under the avatar.
    // Measured on the frame at 2x: name 10 right of the 32 avatar on a 16
    // line (cap top 3.5 under the avatar's top), date 6 after the stars, body
    // 6 under the name column (its first cap 47 under the avatar's top).
    return (
      <div>
        <div className="flex gap-2.5">
          <span
            className="w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center shrink-0 text-[12px] font-bold text-charcoal-soft"
            aria-hidden
          >
            {named ? review.reviewerName!.trim().charAt(0).toUpperCase() : <User size={15} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] leading-4 font-bold text-charcoal truncate">{showName ? review.reviewerName ?? "A client" : "You"}</p>
              {(review.editedAt && !redacted) || menu ? (
                <span className="flex items-center gap-1 shrink-0">
                  {review.editedAt && !redacted && (
                    <span className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide">Edited</span>
                  )}
                  {menu}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex items-center gap-0.5" role="img" aria-label={`${review.rating} out of 5 stars`}>
                {stars(review.rating, 11)}
              </span>
              <span className="text-[11px] text-charcoal-faint">
                {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-1.5">
          <Body review={review} redacted={redacted} replyLabel={replyLabel} actions={actions} size={13} />
        </div>
      </div>
    );
  }
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
      <Body review={review} redacted={redacted} replyLabel={replyLabel} actions={actions} size={14} />
    </div>
  );
};
