import React from "react";
import type { LucideIcon } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";

/**
 * Release 3 · the hub's small action button (gen/ui.js cta(…, 'sm'), as HO7
 * draws Decline and Accept): 36 high, r12, padding 0 16, gap 7, 13 / 700,
 * line height 1, no wrap, icon 15 / 2; primary on fill, secondary on
 * lavender pale. The 44 px target extends 4 px above and below.
 * A label never wraps: each button is at least its own width, and a row of
 * them (HubCtaRow) wraps onto two lines when they don't fit side by side.
 */
export const HubCta: React.FC<{
  label: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}> = ({ label, icon: Icon, variant = "primary", onClick, disabled, ariaLabel }) => {
  const primary = variant === "primary";
  const col = primary ? INK.onFill : INK.prDeep;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="tap relative inline-flex items-center justify-center disabled:opacity-40 before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']"
      style={{
        flex: "1 1 0%",
        minWidth: "max-content",
        height: 36,
        borderRadius: 12,
        background: primary ? INK.fill : INK.prPale,
        color: col,
        gap: 7,
        padding: "0 16px",
        fontSize: textPx(13),
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={15} strokeWidth={2} aria-hidden style={{ color: col }} />}
      <span>{label}</span>
    </button>
  );
};

/** HO7's button row: gap 8, 10 below the text. */
export const HubCtaRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-wrap" style={{ gap: 8, marginTop: 10 }}>
    {children}
  </div>
);
