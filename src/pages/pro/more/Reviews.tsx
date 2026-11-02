import { useState } from "react";
import { Reply, Star, UserRound } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import { RemoveReplyButton, ReplySheet, ReviewReportForm } from "../../../components/professionals/ReviewForms";
import { Avatar } from "../../../components/pro/client/kit";
import { EmptyState } from "../../../components/pro/EmptyState";
import { SubPage } from "../../../components/pro/profile/kit";
import { averageOf, filterReviews, reviewerLabel, type ReviewTab } from "../../../components/pro/profile/profileModel";
import { ListSkeleton, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { INK } from "../../../components/pro/proInk";
import { useReviewsAboutMe } from "../../../hooks/useProfessionalReviews";
import { editReply, removeReply, replyToReview, reportReview } from "../../../services/professional-reviews";
import { ratingDistribution } from "../../../services/professional-reviews/rules";
import { textPx } from "../../../theme/textSize";
import { appLocale } from "../../../i18n/format";
import { t, tn } from "../../../i18n/core";

const GOLD = "#D9A441";
const EMPTY_STAR = "rgba(140,131,120,0.35)";

const Stars: React.FC<{ n: number; size: number; label?: string }> = ({ n, size, label }) => (
  <span className="inline-flex shrink-0" style={{ gap: 2 }} role="img" aria-label={label ?? t("{n} out of 5 stars", { n })}>
    {[0, 1, 2, 3, 4].map((i) => (
      <Star key={i} size={size} strokeWidth={1.5} aria-hidden style={{ color: i < Math.round(n) ? GOLD : EMPTY_STAR, fill: i < Math.round(n) ? GOLD : "none" }} />
    ))}
  </span>
);

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });

/**
 * Release 3 · W6 MO6 Reviews (/app/more/reviews; more.js reviews), the
 * reviews about the professional (the old reviews-about-me card's data) on its own page:
 * - summary (gap 18, pad 4 0 16): the average 40 / 800 -0.03em, stars 13,
 *   "{n} reviews" 11 text.faint; the 5 to 1 bars (10.5 text.faint, 6 high
 *   r9999 soft track, #D9A441 fill by share, count 14 wide right);
 * - tabs All / Needs reply / Replied (38 high, 12);
 * - cards (r20, card, pad 14, 10 apart): 32 avatar, name 13 / 700, date 11,
 *   stars 12; the review 13 / 1.5 text.soft 10 below; "Your reply" in a r12
 *   raised block (11 / 700 primary.deep over 12.5 text.soft), or Reply
 *   (12.5 / 700 primary.deep, Reply 13 / 2.2).
 * Kept from the card: edit and remove your reply, a moderator's removal shown
 * as removed, and Report (the review), through report_professional_review.
 */
export default function Reviews() {
  const { reviews, loading, error, reload } = useReviewsAboutMe();
  const [tab, setTab] = useState<ReviewTab>("all");
  const [replying, setReplying] = useState<{ reviewId: string; existing: string | null } | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const counted = reviews.filter((r) => !r.redactedAt);
  const avg = averageOf(reviews);
  const dist = ratingDistribution(reviews);
  const shown = filterReviews(reviews, tab);

  const saveReply = async (body: string) => {
    if (!replying) return null;
    const r = replying.existing ? await editReply(replying.reviewId, body) : await replyToReview(replying.reviewId, body);
    if (!r.ok) return r.message;
    await reload();
    return null;
  };

  const link = "tap relative inline-flex items-center before:absolute before:-inset-y-3 before:-inset-x-1 before:content-['']";

  return (
    <SubPage title={t("Reviews")} subtitle={t("From clients who worked with you")}>
      {error && reviews.length === 0 ? (
        <ProError onRetry={() => void reload()} />
      ) : loading && reviews.length === 0 ? (
        <div className="flex flex-col" style={{ gap: 12 }}>
          <ProCardSkeleton lines={3} height={110} />
          <ListSkeleton rows={2} />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title={t("No reviews yet")} line={t("Clients you've worked with can review you from your profile. Their reviews show here.")} />
      ) : (
        <>
          <div className="flex items-center" style={{ gap: 18, padding: "4px 0 16px" }}>
            <div className="text-center shrink-0">
              <p style={{ fontSize: textPx(40), fontWeight: 800, letterSpacing: "-0.03em", color: INK.ch, lineHeight: 1 }}>{avg !== null ? avg.toFixed(1) : "–"}</p>
              <div style={{ marginTop: 6 }}>
                <Stars n={avg ?? 0} size={13} label={avg !== null ? t("{v} out of 5", { v: avg.toFixed(1) }) : t("No average yet")} />
              </div>
              <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 4 }}>
                {tn(counted.length, "{n} review", "{n} reviews")}
              </p>
            </div>
            <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 5 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const n = dist[star - 1];
                return (
                  <div key={star} className="flex items-center" style={{ gap: 8, fontSize: textPx(10.5), color: INK.chF }}>
                    <span style={{ width: 8 }}>{star}</span>
                    <span className="flex-1 overflow-hidden" style={{ height: 6, borderRadius: 9999, background: INK.soft }} role="img" aria-label={`${star} stars: ${n}`}>
                      <span className="block h-full" style={{ width: `${counted.length ? (n / counted.length) * 100 : 0}%`, background: GOLD, borderRadius: 9999 }} />
                    </span>
                    <span className="text-end" style={{ width: 14 }}>
                      {n}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <SegmentedTabs
            items={[
              { key: "all", label: t("All") },
              { key: "needs", label: t("Needs reply") },
              { key: "replied", label: t("Replied") },
            ]}
            activeKey={tab}
            onChange={(k) => setTab(k as ReviewTab)}
            tabHeight={38}
            labelSize={12}
            className="mb-[13px]"
          />

          {shown.length === 0 && (
            <p style={{ padding: "12px 0", fontSize: textPx(12.5), color: INK.chF, textAlign: "center" }}>{tab === "needs" ? t("You've replied to every review.") : t("No replies yet.")}</p>
          )}
          {shown.map((r) => {
            const name = reviewerLabel(r.reviewerName);
            const reply = r.reply;
            return (
              <article key={r.id} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14, marginBottom: 10 }}>
                <div className="flex items-center" style={{ gap: 10 }}>
                  {r.reviewerName ? (
                    <Avatar name={r.reviewerName} size={32} />
                  ) : (
                    <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 9999, background: INK.prPale, color: INK.prDeep }}>
                      <UserRound size={15} strokeWidth={2} />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>
                      {name}
                    </p>
                    <p style={{ fontSize: textPx(11), color: INK.chF }}>{dayMonth(r.createdAt)}</p>
                  </div>
                  <Stars n={r.rating} size={12} />
                </div>
                <p style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.5, marginTop: 10, overflowWrap: "anywhere", fontStyle: r.redactedAt ? "italic" : undefined }}>
                  {r.redactedAt ? t("Removed by our team.") : r.body || t("No written review.")}
                </p>
                {reply ? (
                  <div style={{ marginTop: 10, borderRadius: 12, background: INK.raised, padding: "10px 12px" }}>
                    <p style={{ fontSize: textPx(11), fontWeight: 700, color: INK.prDeep }}>{t("Your reply")}</p>
                    <p style={{ fontSize: textPx(12.5), color: INK.chS, marginTop: 2, overflowWrap: "anywhere" }}>{reply.redactedAt ? t("(removed)") : reply.body}</p>
                    {!reply.redactedAt && (
                      <div className="flex items-center" style={{ gap: 16, marginTop: 6 }}>
                        <button type="button" onClick={() => setReplying({ reviewId: r.id, existing: reply.body })} className={link} style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>{t("Edit reply")}</button>
                        <RemoveReplyButton
                          onRemove={async () => {
                            const res = await removeReply(r.id);
                            if (!res.ok) return res.message;
                            await reload();
                            return null;
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : null}
                {!r.redactedAt && (
                  <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                    {!reply ? (
                      <button type="button" onClick={() => setReplying({ reviewId: r.id, existing: null })} className={link} style={{ gap: 5, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
                        <Reply size={13} strokeWidth={2.2} aria-hidden />{t("Reply")}</button>
                    ) : (
                      <span />
                    )}
                    <button type="button" onClick={() => setReportingId(r.id)} className={link} style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chF }} aria-label={t("Report the review from {name}", { name })}>{t("Report")}</button>
                  </div>
                )}
              </article>
            );
          })}
        </>
      )}

      <ReplySheet open={!!replying} onClose={() => setReplying(null)} existing={replying?.existing ?? null} onSave={saveReply} />
      <BottomSheet open={!!reportingId} onClose={() => setReportingId(null)} title={t("Report this review")}>
        <ReviewReportForm
          onSend={async (reason, detail) => {
            if (!reportingId) return null;
            const res = await reportReview(reportingId, reason, detail);
            return res.ok ? null : res.message;
          }}
        />
      </BottomSheet>
    </SubPage>
  );
}
