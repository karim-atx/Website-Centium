import React from "react";
import { FLAG_LABEL, FLAG_TEXT, HAEMATOCRIT_SOON_EXTRA, type FlagLevel } from "../../services/health-checks/guidance";
import type { Flag } from "../../services/health-checks/flags";

/**
 * One hue per level, a darker shade on the light palette and a lighter one on
 * the dark, so the words keep at least 4.5:1 against the card in both. The
 * tint behind them is the same hue, faint.
 */
const INK: Record<FlagLevel, string> = {
  discuss: "text-[#8F5C12] dark:text-[#E3A851]",
  soon: "text-[#A9481B] dark:text-[#F29466]",
  urgent: "text-[#B3261E] dark:text-[#F28B82]",
};
const TINT: Record<FlagLevel, string> = {
  discuss: "bg-[#B7791F]/[0.10] border-[#B7791F]",
  soon: "bg-[#D9622B]/[0.10] border-[#D9622B]",
  urgent: "bg-[#D64545]/[0.10] border-[#D64545]",
};

/** The level in words, as a small chip beside a reading. */
export const CheckFlagChip: React.FC<{ flag: Flag }> = ({ flag }) => (
  <span className={`text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap ${INK[flag.level]} ${TINT[flag.level]}`}>
    {FLAG_LABEL[flag.level]}
  </span>
);

/** The level, its sentence, and for a high haematocrit the extra line. */
export const CheckFlagNote: React.FC<{ flag: Flag; className?: string }> = ({ flag, className }) => (
  <div
    role={flag.level === "urgent" ? "alert" : undefined}
    className={`rounded-xl px-3 py-2.5 border-l-[3px] ${TINT[flag.level]} ${className ?? ""}`}
  >
    <p className={`text-[11px] font-bold ${INK[flag.level]}`}>{FLAG_LABEL[flag.level]}</p>
    <p className="mt-0.5 text-[11.5px] leading-[1.45] text-charcoal-soft">{FLAG_TEXT[flag.level]}</p>
    {flag.haematocrit && flag.level === "soon" && (
      <p className="mt-1 text-[11.5px] leading-[1.45] text-charcoal-soft">{HAEMATOCRIT_SOON_EXTRA}</p>
    )}
  </div>
);
