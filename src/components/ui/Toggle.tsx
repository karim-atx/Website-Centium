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
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "tap w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0",
        checked ? "bg-primary justify-end" : "bg-charcoal/15 justify-start",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <div className="w-5 h-5 rounded-full bg-cream-card shadow-sm" />
    </button>
  );
};
