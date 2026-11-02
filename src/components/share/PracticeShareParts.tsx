import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";
import { toneSet } from "../client-forms/tone";
import { useReviewsAboutMe } from "../../hooks/useProfessionalReviews";
import { reviewerLabel } from "../pro/profile/profileModel";
import { SHARE_ICONS, ShareIconButton, ToneTile } from "./shareKit";
import { ShareFlow } from "./ShareFlow";
import { useSharePro } from "./useSharePro";
import { clipQuote, fmtInt, milestoneCard, shareDate, reachedMilestone, reviewCard, type CardSpec } from "./shareCardModel";
import type { PracticeTotals } from "../../services/pro/practiceInsights";
import type { ItemKind } from "../../services/share";
import { t, tn } from "../../i18n/core";

/**
 * Release 3 · W8 SH4 "Practice insights · milestone and reviews"
 * (source/gen/r31.js insights31), added to MO19:
 * - the Milestone card: r20 primary-pale (tone21 pr), padding 16;
 *   "Milestone" 11 / 700 0.12em capitals in the tone's ink; "{n} sessions"
 *   26 / 800 -0.03em / 1.1, 4 above; "delivered on Centium" 12.5 text.soft;
 *   Share (36 high, padding 0 14, r12, fill, share-2 14, 13 / 700) at the
 *   right. Shown once a session milestone is reached (shareCardModel
 *   SESSION_MILESTONES);
 * - "Latest reviews": card r18, label 11 / 700 0.12em capitals, the two
 *   newest written reviews as win rows (gold star tile) with the share icon.
 */
export const MilestoneShareCard: React.FC<{ totals: PracticeTotals | null | undefined }> = ({ totals }) => {
  const dark = useIsDark();
  const pro = useSharePro();
  const [open, setOpen] = useState(false);
  const m = totals ? reachedMilestone(totals.sessionsDelivered) : null;
  if (!totals || m == null) return null;
  const tone = toneSet("pr", dark);
  return (
    <>
      <div style={{ borderRadius: 20, background: tone.bg, padding: 16, marginBottom: 12 }}>
        <div className="flex items-start justify-between" style={{ gap: 10 }}>
          <div className="min-w-0">
            <p style={{ fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: tone.ink }}>{t("Milestone")}</p>
            <p style={{ fontSize: textPx(26), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: INK.ch, marginTop: 4 }}>{tn(m, "{n} sessions", "{n} sessions", { n: fmtInt(m) })}</p>
            <p style={{ fontSize: textPx(12.5), color: INK.chS }}>{t("delivered on Centium")}</p>
          </div>
          <button
            type="button"
            disabled={!pro}
            onClick={() => setOpen(true)}
            className="tap relative inline-flex items-center shrink-0 disabled:opacity-40 before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']"
            style={{ height: 36, padding: "0 14px", borderRadius: 12, background: INK.fill, color: INK.onFill, gap: 7, fontSize: textPx(13), fontWeight: 700 }}
          >
            <Share2 size={14} strokeWidth={2} aria-hidden />
            {t("Share")}
          </button>
        </div>
      </div>
      {open && pro && <ShareFlow open onClose={() => setOpen(false)} spec={milestoneCard({ ...totals, sessionsDelivered: m })} pro={pro} kind="milestone" />}
    </>
  );
};

export const LatestReviewsShare: React.FC = () => {
  const { reviews } = useReviewsAboutMe();
  const pro = useSharePro();
  const [flow, setFlow] = useState<{ spec: CardSpec; kind: ItemKind } | null>(null);
  const latest = reviews
    .filter((r) => !r.redactedAt && (r.body ?? "").trim())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);
  if (!latest.length) return null;
  return (
    <>
      <div style={{ borderRadius: 18, background: INK.card, border: `1px solid ${INK.bCard}`, overflow: "hidden", marginBottom: 12 }}>
        <p style={{ fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: INK.chF, padding: "12px 14px 10px" }}>{t("Latest reviews")}</p>
        {latest.map((r) => {
          const by = reviewerLabel(r.reviewerName);
          return (
            <div key={r.id} className="flex items-center" style={{ gap: 12, padding: "12px 14px", borderTop: `1px solid ${INK.b06}` }}>
              <ToneTile icon={SHARE_ICONS.star} tone="gold" size={36} radius={11} iconSize={17} />
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 700, lineHeight: "18px", color: INK.ch }}>{`"${clipQuote(r.body ?? "", 34)}"`}</span>
                <span className="block" style={{ fontSize: textPx(11.5), lineHeight: "16px", color: INK.chF, marginTop: 1 }}>{`${by} · ${tn(r.rating, "{n} star", "{n} stars")} · ${shareDate(r.createdAt)}`}</span>
              </span>
              <ShareIconButton label={t("Share the review from {name}", { name: by })} disabled={!pro} onClick={() => setFlow({ spec: reviewCard({ rating: r.rating, body: clipQuote(r.body ?? ""), reviewer: by }), kind: "review" })} />
            </div>
          );
        })}
      </div>
      {flow && pro && <ShareFlow open onClose={() => setFlow(null)} spec={flow.spec} pro={pro} kind={flow.kind} />}
    </>
  );
};
