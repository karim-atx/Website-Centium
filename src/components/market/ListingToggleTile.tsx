import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { FOCUS_CSS } from "./usePress";

// Market + Share 3.0 · ListingToggleTile (HANDOVER §4 B-MA.1 item 1, P-MA.1;
// tokens.json listingToggle; Business Marketplace Screens lines 64–68 and
// `lt`, Professional Marketplace Screens lines 75–79 and `lt`):
// - the tile: 96 tall, radius 20, --card, border 1px --border, a centred
//   column (gap 4, text centred), padding 0 6, border-box, min-width 0,
//   overflow hidden;
// - the toggle 46 × 28 radius 999: on --good #3F9165, off --high #C0392B; the
//   thumb 22 × 22 #FFFFFF, shadow 0 1px 3px rgba(0,0,0,0.18), top 3, left 21
//   (on) or 3 (off);
// - the label 14 / 18 600 --ink: "Listing active" / "Listing paused"
//   (business) or "Listing" (professional); the status 12 / 16 600 in the
//   track colour: "Visible" / "Hidden".
// The whole tile is the switch (role switch, aria-checked): the drawn toggle
// is 46 × 28, the tile gives it the 44 target. The thumb slides in 140 ms
// (the handover's pressed timing; the board draws no transition), cut by
// Reduce motion.

export interface ListingToggleTileProps {
  on: boolean;
  onChange: (on: boolean) => void;
  /** "biz": "Listing active / paused"; "pro": "Listing". */
  variant: "biz" | "pro";
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ListingToggleTile: React.FC<ListingToggleTileProps> = ({ on, onChange, variant, disabled, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const reduced = useReducedMotion();
  const track = on ? m.good : m.high;
  const label = variant === "pro" ? "Listing" : on ? "Listing active" : "Listing paused";
  const status = on ? "Visible" : "Hidden";
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label}. ${status}`}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`market-focus ${className ?? ""}`}
        style={{
          height: 96,
          borderRadius: 20,
          background: m.card,
          border: `1px solid ${m.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          textAlign: "center",
          padding: "0 6px",
          boxSizing: "border-box",
          minWidth: 0,
          width: "100%",
          overflow: "hidden",
          font: "inherit",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.4 : 1,
          ...style,
        }}
      >
        <span aria-hidden style={{ width: 46, height: 28, borderRadius: 999, background: track, position: "relative", flexShrink: 0 }}>
          <span style={{ position: "absolute", left: on ? 21 : 3, top: 3, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: reduced ? "none" : "left 140ms ease" }} />
        </span>
        <span aria-hidden style={{ fontSize: textPx(14), lineHeight: linePx(18), fontWeight: 600, color: m.ink }}>{label}</span>
        <span aria-hidden style={{ fontSize: textPx(12), lineHeight: linePx(16), fontWeight: 600, color: track }}>{status}</span>
      </button>
    </>
  );
};
