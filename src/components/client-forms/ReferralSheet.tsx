import React, { useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { answerCareReferral } from "../../services/client-forms";
import { referralBody, referralTitle, type PendingReferral } from "../../services/client-forms/logic";

/**
 * Release 3 · W7 CU23: the client's answer to a care referral
 * (answer_care_referral(p_referral_id, p_agree)). The receiving professional
 * sees nothing until the client agrees (DECISIONS DB-6 "Care network").
 * "Agree and share" / Decline; closing is "Not now" and the referral stays
 * on Home. The caller keys it by referral, so each one starts fresh.
 */
export const ReferralSheet: React.FC<{
  referral: PendingReferral | null;
  onClose: () => void;
  onAnswered: (agree: boolean) => void;
}> = ({ referral, onClose, onAnswered }) => {
  const [busy, setBusy] = useState<"agree" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!referral) return null;

  const answer = async (agree: boolean) => {
    setBusy(agree ? "agree" : "decline");
    setError(null);
    const res = await answerCareReferral(referral.id, agree);
    setBusy(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onAnswered(agree);
  };

  return (
    <BottomSheet
      open={!!referral}
      onClose={onClose}
      title="Referral"
      footer={
        <div>
          {error && (
            <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 10, lineHeight: 1.45 }}>
              {error}
            </p>
          )}
          {/* CU23: two equal buttons (flex 1); "Agree and share" never narrows below its
              label (360 with Larger text), Decline gives up the room instead. */}
          <div className="flex" style={{ gap: 9 }}>
            <CtaButton variant="secondary" label="Decline" loading={busy === "decline"} disabled={!!busy && busy !== "decline"} onClick={() => void answer(false)} style={{ flex: "1 1 0" }} />
            <CtaButton
              label="Agree and share"
              icon={<Check size={15} strokeWidth={2} aria-hidden />}
              loading={busy === "agree"}
              disabled={!!busy && busy !== "agree"}
              onClick={() => void answer(true)}
              style={{ flex: "1 1 0", minWidth: "max-content" }}
            />
          </div>
        </div>
      }
    >
      <p style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch, lineHeight: 1.35 }}>{referralTitle(referral)}</p>
      <p style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.5, marginTop: 6 }}>{referralBody(referral)}</p>
      <div style={{ borderRadius: 14, background: INK.soft, padding: "10px 12px", marginTop: 14 }}>
        <p style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.chF }}>Reason</p>
        <p style={{ fontSize: textPx(13), color: INK.ch, lineHeight: 1.5, marginTop: 2, whiteSpace: "pre-wrap" }}>{referral.reason}</p>
      </div>
    </BottomSheet>
  );
};
