import React from "react";

/** How serious a flag is: the hue and, for "urgent", an alert role. */
export type FlagTone = "discuss" | "soon" | "urgent";

/**
 * One hue per level, a darker shade on the light palette and a lighter one on
 * the dark, so the words keep at least 4.5:1 against the card in both. The
 * tint behind them is the same hue, faint.
 */
const INK: Record<FlagTone, string> = {
  discuss: "text-[#7A4E0E] dark:text-[#E3A851]",
  soon: "text-[#A9481B] dark:text-[#F29466]",
  urgent: "text-[#B3261E] dark:text-[#F28B82]",
};
const TINT: Record<FlagTone, string> = {
  discuss: "bg-[#B7791F]/[0.10] border-[#B7791F]",
  soon: "bg-[#D9622B]/[0.10] border-[#D9622B]",
  urgent: "bg-[#D64545]/[0.10] border-[#D64545]",
};

/** A flag's label in words, as a small chip beside a reading. */
export const FlagChip: React.FC<{ tone: FlagTone; label: string }> = ({ tone, label }) => (
  <span className={`text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap ${INK[tone]} ${TINT[tone]}`}>
    {label}
  </span>
);

/** A flag's label and what it means, as a note under a reading. */
export const FlagNote: React.FC<{ tone: FlagTone; label: string; className?: string; children: React.ReactNode }> = ({
  tone,
  label,
  className,
  children,
}) => (
  <div
    role={tone === "urgent" ? "alert" : undefined}
    className={`rounded-xl px-3 py-2.5 border-l-[3px] ${TINT[tone]} ${className ?? ""}`}
  >
    <p className={`text-[11px] font-bold ${INK[tone]}`}>{label}</p>
    {children}
  </div>
);
