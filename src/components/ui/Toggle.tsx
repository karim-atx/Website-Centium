import React from "react";
import clsx from "clsx";

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /**
   * Renders the switch present but unusable. Added for settings that exist
   * for the user but are not theirs to change right now — the public-listing
   * switch when a business owns the listing. Hiding such a control makes the
   * setting look absent; showing it disabled, next to a sentence explaining
   * who does control it, is the honest version.
   */
  disabled?: boolean;
}> = ({ checked, onChange, label, disabled }) => {
  // Mobile v5.1 handover, Foundations 2.5 "Toggle" (R2, D6: every toggle): a
  // 44 x 26 track with 3 px padding and a 20 px white knob with shadow.knob;
  // on is primary, off is rgba(36,31,27,0.12) light and rgba(238,239,242,0.16)
  // dark; disabled is 40%. Was 44 x 24 with a 2 px inset.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "tap w-11 h-[26px] px-[3px] rounded-full flex items-center transition-colors duration-150 ease-out shrink-0",
        checked ? "bg-primary justify-end" : "bg-charcoal/[0.12] dark:bg-[rgba(238,239,242,0.16)] justify-start",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <div className="w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]" />
    </button>
  );
};
