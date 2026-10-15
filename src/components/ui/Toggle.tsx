import React from "react";
import clsx from "clsx";

/**
 * Sizes, as [track width, track height, knob]. Padding is 3 in every size.
 * - default: Part B and client switches, 44 × 26, knob 20 (X-15; MO1.8 #10-#11).
 * - lead: MO1.8.3's "Allow notifications" lead switch, 56 × 30, knob 24.
 * - business: Business UI row switches (opening-hours days, offer cards, a
 *   class's "Show on Explore"), 42 × 26, knob 20.
 * - business-lg: Business UI listing visibility ("Show on Explore",
 *   "Visible on Explore"), 46 × 28, knob 22.
 * - onboarding: BizOnboardingV10 rows (Payments, Essentials), 44 × 24,
 *   padding 2, knob 20 with 0 1px 2px rgba(0,0,0,0.12); off the BU track.
 */
export type ToggleSize = "default" | "lead" | "business" | "business-lg" | "onboarding";

const SIZES: Record<ToggleSize, [number, number, number]> = {
  default: [44, 26, 20],
  lead: [56, 30, 24],
  business: [42, 26, 20],
  "business-lg": [46, 28, 22],
  onboarding: [44, 24, 20],
};

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
   * 24, on #9A8CD6). Same as `size="lead"`; kept for existing callers.
   */
  lead?: boolean;
  /** Track size (see ToggleSize). `lead` wins when both are set. */
  size?: ToggleSize;
  /**
   * The ON track colour when a business frame draws other than primary
   * (BU3 "Visible on Explore": #7D6BB5 light, #A991FE dark). A CSS colour.
   */
  onColor?: string;
  /**
   * The knob's shadow on business switches: true draws 0 1px 3px
   * rgba(36,31,27,0.25) (the frames' default); false for the rows that draw
   * none (MA1 opening-hours days). Ignored on client sizes.
   */
  knobShadow?: boolean;
}> = ({ checked, onChange, label, disabled, lead, size = "default", onColor, knobShadow = true }) => {
  const kind: ToggleSize = lead ? "lead" : size;
  const [w, h, knob] = SIZES[kind];
  const business = kind === "business" || kind === "business-lg" || kind === "onboarding";
  const pad = kind === "onboarding" ? 2 : 3;
  // Part B and client (X-15, MO1.8 #10-#11): on is primary (#AEA1DC / #A991FE),
  // the lead switch on fill.pinned #9A8CD6 / #A991FE (#5B48B8 under High
  // contrast, V6-01); off #241F1B@12% / #F5F3FA@12%, and
  // 30% of ink under High contrast (.toggle-off in index.css). The knob is
  // white with shadow.knob in light, #1C1F28 without a shadow in dark.
  //
  // Business (X-15, BU3 / BU2 frames): on primary (#AEA1DC / #A991FE) unless a
  // frame draws its own; off the BU track #D9D6E3 / #3A3D48; white knob in both
  // modes with 0 1px 3px rgba(36,31,27,0.25). Hit box 44 via .tap.
  //
  // Disabled is 40% in every size.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "tap rounded-full flex items-center transition-colors duration-150 ease-out shrink-0",
        checked
          ? clsx(
              !onColor && (kind === "lead" ? "bg-fill-pinned" : "bg-primary"),
              "justify-end"
            )
          : clsx(
              "toggle-off justify-start",
              // charcoal is #241F1B light and #F5F3FA dark.
              business ? "bg-track" : "bg-charcoal/[0.12]"
            ),
        disabled && "opacity-40 cursor-not-allowed"
      )}
      style={{ width: w, height: h, paddingLeft: pad, paddingRight: pad, ...(checked && onColor ? { background: onColor } : null) }}
    >
      <span
        aria-hidden
        className={clsx(
          "block rounded-full shrink-0",
          business ? "bg-white" : "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-cream-card dark:shadow-none"
        )}
        style={{
          width: knob,
          height: knob,
          ...(business && knobShadow
            ? { boxShadow: kind === "onboarding" ? "0 1px 2px rgba(0,0,0,0.12)" : "0 1px 3px rgba(36,31,27,0.25)" }
            : null),
        }}
      />
    </button>
  );
};
