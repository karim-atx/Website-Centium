import React, { useState } from "react";
import { Card } from "../ui/Card";
import { BottomSheet } from "../ui/BottomSheet";
import { ReviewItem } from "./ReviewItem";
import { RatingBadge } from "./RatingBadge";
import { RemoveReplyButton, ReplySheet, ReviewReportForm } from "./ReviewForms";
import { useReviewsAboutMe } from "../../hooks/useProfessionalReviews";
import { editReply, removeReply, replyToReview, reportReview } from "../../services/professional-reviews";

/**
 * "Ratings & Reviews" on the professional's own Profile: the average, every
 * review clients left, and the professional's one public reply under each.
 *
 * THE AVERAGE IS COUNTED FROM THESE ROWS, not read from the directory, so it
 * shows for an unlisted professional too. It is the same set the summary
 * view counts: the professional never sees withdrawn reviews, and redacted
 * ones are left out here as they are there.
 */
export const ReviewsAboutMeCard: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { reviews, loading, error, reload } = useReviewsAboutMe();
  const [replying, setReplying] = useState<{ reviewId: string; existing: string | null } | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const counted = reviews.filter((r) => !r.redactedAt);
  const average = counted.length ? counted.reduce((n, r) => n + r.rating, 0) / counted.length : null;

  const saveReply = async (body: string) => {
    if (!replying) return null;
    const r = replying.existing ? await editReply(replying.reviewId, body) : await replyToReview(replying.reviewId, body);
    if (!r.ok) return r.message;
    await reload();
    return null;
  };

  const linkClass = "tap min-h-[44px] text-xs font-semibold";

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-2 mb-2.5 pb-[7.5px] border-b-[1.5px] border-primary">
        <p className="section-label text-charcoal-faint !border-b-0 !pb-0">Ratings & Reviews</p>
        {!loading && !error && <RatingBadge average={average} count={counted.length} />}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-charcoal-faint">{error ?? (loading ? "Loading reviews…" : "No reviews from clients yet.")}</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const reply = r.reply;
            // A review a moderator took down cannot be replied to; a reply a
            // moderator took down cannot be edited, only seen as removed.
            const canReply = !r.redactedAt && !reply;
            const canEditReply = !!reply && !reply.redactedAt;
            return (
              <ReviewItem
                key={r.id}
                review={r}
                starSize={15}
                replyLabel="Your reply"
                actions={
                  <>
                    {canReply && (
                      <button
                        type="button"
                        onClick={() => setReplying({ reviewId: r.id, existing: null })}
                        className={`${linkClass} text-primary-deep-text`}
                      >
                        Reply
                      </button>
                    )}
                    {canEditReply && (
                      <>
                        <button
                          type="button"
                          onClick={() => setReplying({ reviewId: r.id, existing: reply.body })}
                          className={`${linkClass} text-primary-deep-text`}
                        >
                          Edit reply
                        </button>
                        <RemoveReplyButton
                          onRemove={async () => {
                            const res = await removeReply(r.id);
                            if (!res.ok) return res.message;
                            await reload();
                            return null;
                          }}
                        />
                      </>
                    )}
                    {!r.redactedAt && (
                      <button type="button" onClick={() => setReportingId(r.id)} className={`${linkClass} text-charcoal-faint`}>
                        Report
                      </button>
                    )}
                  </>
                }
              />
            );
          })}
          {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
        </div>
      )}

      <ReplySheet
        open={!!replying}
        onClose={() => setReplying(null)}
        existing={replying?.existing ?? null}
        onSave={saveReply}
      />
      <BottomSheet open={!!reportingId} onClose={() => setReportingId(null)} title="Report this review">
        <ReviewReportForm
          onSend={async (reason, detail) => {
            if (!reportingId) return null;
            const res = await reportReview(reportingId, reason, detail);
            return res.ok ? null : res.message;
          }}
        />
      </BottomSheet>
    </Card>
  );
};
