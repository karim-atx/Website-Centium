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
   * The larger lead switch of a page's lead card (MO1.8.3 "Allow
   * notifications", measured on the 2x board: track 56 × 30, padding 3, knob
   * 24, on #9A8CD6). Off and disabled as the default switch. Opt-in; the
   * default stays the Foundations 44 × 26.
   */
  lead?: boolean;
}> = ({ checked, onChange, label, disabled, lead }) => {
  // Mobile v5.1 Foundations 2.5 "Toggle" (decision 20, supersedes 17): a
  // 44 x 26 track with 3 px padding and a 20 px white knob with shadow.knob.
  // On is primary. Off keeps today's colours (decision 19): rgba(36,31,27,0.15)
  // light, rgba(238,239,242,0.16) dark; high contrast strengthens it to the 30%
  // ink its hairlines use (.toggle-off in index.css). Disabled is 40%.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "tap px-[3px] rounded-full flex items-center transition-colors duration-150 ease-out shrink-0",
        lead ? "w-14 h-[30px]" : "w-11 h-[26px]",
        checked
          ? clsx(lead ? "bg-th-9a8cd6 dark:bg-primary" : "bg-primary", "justify-end")
          : "toggle-off bg-charcoal/15 dark:bg-[rgba(238,239,242,0.16)] justify-start",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <div className={clsx(lead ? "w-6 h-6" : "w-5 h-5", "rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]")} />
    </button>
  );
};
