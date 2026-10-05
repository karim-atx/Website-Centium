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
  /**
   * "sm" is today's 44 x 24 switch, and stays the default so nothing moves.
   * "md" is the mobile v5.1 handover's (Foundations 2.5 "Toggle"): a 44 x 26
   * track with 3 px padding and a 20 px knob with shadow.knob; off is
   * rgba(36,31,27,0.12) light and rgba(238,239,242,0.16) dark.
   */
  size?: "sm" | "md";
}> = ({ checked, onChange, label, disabled, size = "sm" }) => {
  const md = size === "md";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "tap w-11 rounded-full flex items-center transition-colors shrink-0",
        md ? "h-[26px] px-[3px] duration-150 ease-out" : "h-6 px-0.5",
        checked
          ? "bg-primary justify-end"
          : md
            ? "bg-charcoal/[0.12] dark:bg-[rgba(238,239,242,0.16)] justify-start"
            : "bg-charcoal/15 justify-start",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <div
        className={clsx(
          "w-5 h-5 rounded-full",
          md ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-cream-card shadow-sm"
        )}
      />
    </button>
  );
};
