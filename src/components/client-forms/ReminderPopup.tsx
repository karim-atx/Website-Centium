import React from "react";
import { CentredPopup } from "../ui/CentredPopup";
import { CtaButton } from "../ui/PinnedCta";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";
import type { ReminderTone } from "../../services/client-forms/logic";
import { ReminderIcon } from "./parts";
import { toneSet } from "./tone";
import { t } from "../../i18n/core";

/**
 * Release 3 · W7 CU23 v3: one pop-up of the queue (source/gen/r21.js
 * queuePop21): a 342 card, radius 20, padding 20 18 16, "1 of 2" at the top
 * right (11 / 700 text.faint), the reminder icon, title 17 / 800, body 13 /
 * 1.5 text.soft 6 below, two CTAs (primary, secondary) 8 apart 16 below, and
 * the queue's dots 12 below. Never more than one on screen; tapping outside
 * is "Not now".
 */
export const ReminderPopup: React.FC<{
  open: boolean;
  index: number;
  count: number;
  kind: string;
  tone: ReminderTone;
  proName: string;
  proAvatarUrl?: string | null;
  title: string;
  body: string;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
  onDismiss: () => void;
}> = ({ open, index, count, kind, tone, proName, proAvatarUrl, title, body, primary, secondary, onDismiss }) => {
  const dark = useIsDark();
  const tn = toneSet(tone, dark);
  return (
    <CentredPopup
      open={open}
      onClose={onDismiss}
      title={title}
      titleClass="text-[17px] leading-[1.3] -mt-0.5"
      body={<span style={{ display: "block", marginTop: 0, lineHeight: 1.5, fontWeight: 400 }}>{body}</span>}
      describeBody
      className="!px-[18px] !pt-5 !pb-4"
      iconBare
      iconWell={{ size: 38, radius: 12 }}
      icon={
        <ReminderIcon kind={kind} tone={tn} proName={proName} proAvatarUrl={proAvatarUrl} />
      }
      titleAside={
        <span style={{ position: "relative", top: -10, insetInlineEnd: -4, fontSize: textPx(11), fontWeight: 700, color: INK.chF }}>
          {t("{n} of {total}", { n: index + 1, total: count })}
        </span>
      }
    >
      <div className="grid" style={{ gap: 8, marginTop: 0 }}>
        <CtaButton size="page" label={primary.label} onClick={primary.onClick} />
        <CtaButton size="page" variant="secondary" label={secondary.label} onClick={secondary.onClick} />
      </div>
      <div className="flex justify-center" aria-hidden style={{ gap: 5, marginTop: 12 }}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 9999, background: i === index ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)" }} />
        ))}
      </div>
    </CentredPopup>
  );
};
