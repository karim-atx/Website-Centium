import React, { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { Toggle } from "../ui/Toggle";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { answerCareReferral, connectFromReferral } from "../../services/client-forms";
import { ACCESS_CATEGORIES, type AccessCategory } from "../../services/consent";
import { connectBody, connectTitle, referralBody, referralTitle, type ConnectReferral, type PendingReferral } from "../../services/client-forms/logic";
import { t } from "../../i18n/core";

/**
 * Release 3 · W7 CU23: the client's answer to a care referral
 * (answer_care_referral(p_referral_id, p_agree)). The receiving professional
 * sees nothing until the client agrees (DECISIONS DB-6 "Care network").
 * "Agree and share" / Decline; closing is "Not now" and the referral stays
 * on Home. The caller keys it by referral, so each one starts fresh.
 * Agreeing sends the referral only; nothing is shared and nobody is
 * connected until the client connects themselves (ConnectReferralSheet).
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
      title={t("Referral")}
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
            <CtaButton variant="secondary" label={t("Decline")} loading={busy === "decline"} disabled={!!busy && busy !== "decline"} onClick={() => void answer(false)} style={{ flex: "1 1 0" }} />
            <CtaButton
              label={t("Agree and share")}
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
        <p style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.chF }}>{t("Reason")}</p>
        <p style={{ fontSize: textPx(13), color: INK.ch, lineHeight: 1.5, marginTop: 2, whiteSpace: "pre-wrap" }}>{referral.reason}</p>
      </div>
    </BottomSheet>
  );
};

/**
 * Release A (20261216060000, CU23 · not drawn): the client's second decision.
 * The receiving professional accepted, and accepting connects nobody; here
 * the client connects themselves (connect_from_referral) and picks what that
 * professional can see, as the sharing screen's switches (ACCESS_CATEGORIES,
 * labels and lines as written there). Every switch starts off: an empty list
 * is a real answer ("connect us, share nothing yet"), and the database's own
 * default shares nothing. "Not now" keeps it on Home.
 */
export const ConnectReferralSheet: React.FC<{
  referral: ConnectReferral | null;
  onClose: () => void;
  onConnected: (shared: number) => void;
}> = ({ referral, onClose, onConnected }) => {
  const [picked, setPicked] = useState<Set<AccessCategory>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!referral) return null;


  const connect = async () => {
    setBusy(true);
    setError(null);
    // In the sharing screen's order, so the request reads the same every time.
    const list = ACCESS_CATEGORIES.map((c) => c.category).filter((c) => picked.has(c));
    const res = await connectFromReferral(referral.id, list);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onConnected(list.length);
  };

  return (
    <BottomSheet
      open={!!referral}
      onClose={onClose}
      title={t("Referral")}
      footer={
        <div>
          {error && (
            <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 10, lineHeight: 1.45 }}>
              {error}
            </p>
          )}
          <div className="flex" style={{ gap: 9 }}>
            <CtaButton variant="secondary" label={t("Not now")} disabled={busy} onClick={onClose} style={{ flex: "1 1 0" }} />
            <CtaButton label={t("Connect")} icon={<UserPlus size={15} strokeWidth={2} aria-hidden />} loading={busy} onClick={() => void connect()} style={{ flex: "1 1 0", minWidth: "max-content" }} />
          </div>
        </div>
      }
    >
      <p style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch, lineHeight: 1.35 }}>{connectTitle(referral)}</p>
      <p style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.5, marginTop: 6 }}>{connectBody(referral)}</p>
      <p style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.chF, marginTop: 14 }}>{referral.toName ? t("What {name} can see", { name: referral.toName }) : t("What they can see")}</p>
      <div data-connect-categories>
        {ACCESS_CATEGORIES.map((c, i) => (
          <div key={c.category} className="flex items-center justify-between" style={{ gap: 12, minHeight: 52, padding: "8px 0", borderBottom: i < ACCESS_CATEGORIES.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
            <span className="min-w-0">
              <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>{t(c.label)}</span>
              <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.4 }}>{t(c.description)}</span>
            </span>
            <Toggle
              checked={picked.has(c.category)}
              label={t(c.label)}
              onChange={(on) =>
                setPicked((s) => {
                  const next = new Set(s);
                  if (on) next.add(c.category);
                  else next.delete(c.category);
                  return next;
                })
              }
            />
          </div>
        ))}
      </div>
      <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 10 }}>{t("You can change these any time from your professional's sharing settings.")}</p>
    </BottomSheet>
  );
};
