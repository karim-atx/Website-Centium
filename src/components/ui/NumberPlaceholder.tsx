import React from "react";

/**
 * A neutral stand-in for a card whose numbers are not shown yet.
 *
 * Task X follow-up: while the account's recovery-sensitive setting is still
 * loading on a browser that has no local copy (AppContext's
 * recoveryModePending), calories, macros, weight, BMI and streaks render as
 * this instead, so none of them can flash for someone with the mode on. It
 * says nothing and carries no figure: a soft block the size of the card.
 */
export const NumberPlaceholder: React.FC<{ height: number; className?: string; label?: string }> = ({
  height,
  className,
  label,
}) => (
  <div
    className={`rounded-[22px] bg-cream-card border border-charcoal/[0.06] px-[17px] py-4 ${className ?? ""}`}
    style={{ height }}
    aria-busy="true"
    aria-label={label ? `${label}, loading` : "Loading"}
  >
    {label && <p className="text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">{label}</p>}
    <div className="mt-3 h-4 w-24 rounded-full bg-charcoal/[0.07] animate-pulse" />
    <div className="mt-2.5 h-3 w-40 max-w-full rounded-full bg-charcoal/[0.05] animate-pulse" />
  </div>
);
