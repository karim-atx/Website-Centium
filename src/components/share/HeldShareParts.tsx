import React, { useId } from "react";
import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { INK, NO_ICON_SCALE } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { t } from "../../i18n/core";
import { HELD_TITLE, heldNoteLine, PAUSED_LINK_LABEL } from "./heldShareModel";

/**
 * Round D · DV D-S21: the owner's amber note on a held card (the forum
 * HeldNote's look, on the gold tokens so it follows light and dark):
 * "Held for review." then the short reason and who can see it, then the
 * Community guidelines link. Never the matched word (the database never
 * sends it).
 */
export const HeldShareNote: React.FC<{ reason: unknown; onNavigate?: () => void }> = ({ reason, onNavigate }) => (
  <p role="status" style={{ borderRadius: 12, background: INK.goldPale, color: INK.goldInk, padding: "10px 12px", fontSize: textPx(12), lineHeight: 1.5 }}>
    <span style={{ fontWeight: 700 }}>{t(HELD_TITLE)}</span> <span style={{ fontWeight: 600 }}>{heldNoteLine(reason)}</span>{" "}
    <Link to="/legal/community-guidelines" onClick={onNavigate} className="underline" style={{ fontWeight: 700, color: "inherit" }}>
      {t("Community guidelines")}
    </Link>
  </p>
);

/** D-S21: the link and QR buttons replaced by one disabled "Copy link (works once approved)", and why. */
export const PausedLink: React.FC<{ line: string; label?: string }> = ({ line, label = PAUSED_LINK_LABEL }) => {
  const id = useId();
  return (
    <div>
      <button
        type="button"
        disabled
        aria-describedby={id}
        className="w-full flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
        style={{ minHeight: 48, gap: 8, borderRadius: 14, border: "1px solid rgb(var(--c-charcoal) / 0.11)", background: INK.card, fontSize: textPx(13), fontWeight: 700, color: INK.ch }}
      >
        <Link2 size={16} strokeWidth={2} aria-hidden style={{ ...NO_ICON_SCALE, color: INK.prDeep, flex: "none" }} />
        {t(label)}
      </button>
      <p id={id} className="text-center" style={{ fontSize: textPx(12), lineHeight: 1.45, color: INK.chS, marginTop: 6 }}>
        {t(line)}
      </p>
    </div>
  );
};
