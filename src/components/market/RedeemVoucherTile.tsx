import React from "react";
import { textPx, linePx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { MARKET_MOTION } from "../../theme/marketTokens";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { FOCUS_CSS, usePress } from "./usePress";

// Market + Share 3.0 · RedeemVoucherTile (HANDOVER §4 B-MA.1 item 1, P-MA.1;
// tokens.json redeemVoucherTile; Business Marketplace Screens lines 54–63 and
// the `rv` script, Professional Marketplace Screens lines 63–73):
// - one <button>, the whole tile the target, aria-label "Redeem voucher. Scan
//   or enter code"; transform scale(0.97) while pressed (`rv.down` / `rv.up` /
//   `rv.leave`), transition transform 140ms ease; focus outline 2px solid
//   #AEA1DC, offset 2;
// - a wrapper carrying the shadow as filter drop-shadow(0 8px 20px
//   rgba(125,103,217,0.25)) so it follows the notched shape; pressed
//   drop-shadow(0 3px 8px rgba(125,103,217,0.25)); transition filter 140ms
//   ease;
// - the ticket: 96 tall, radius 20, linear-gradient(90deg,#7D67D9 0%,#4F8F8A
//   100%), a flex row centred, gap 6, padding 0 10 0 12, the notch mask
//   (12px semicircles at mid-height of the left and right edges);
// - the QR stub 72 × 72 radius 14 rgba(255,255,255,0.18), an inner dashed
//   1.5px rgba(255,255,255,0.6) ring inset 4 radius 10, the lucide qr-code
//   glyph 50 × 50 white stroke 1.2;
// - the divider 72 tall, border-left 1.5px dashed rgba(255,255,255,0.4);
// - "Redeem voucher" 17 / 22 700 white nowrap, "Scan or enter code" 13 / 18
//   rgba(255,255,255,0.8) nowrap; the arrow-right 20 white stroke 2. Both
//   lines are nowrap on the board, where they fit (142 of 142 px at 390);
//   here they wrap only when they would not (360 wide, Larger text).
// The gradient is the same in dark (white on it reads in both themes).

const MASK =
  "radial-gradient(circle at 0 50%,transparent 6px,#000 6.5px) left/51% 100% no-repeat,radial-gradient(circle at 100% 50%,transparent 6px,#000 6.5px) right/51% 100% no-repeat";
const SHADOW = "drop-shadow(0 8px 20px rgba(125,103,217,0.25))";
const SHADOW_PRESSED = "drop-shadow(0 3px 8px rgba(125,103,217,0.25))";

export interface RedeemVoucherTileProps {
  onPress: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const RedeemVoucherTile: React.FC<RedeemVoucherTileProps> = ({ onPress, className, style }) => {
  const reduce = useReducedMotion();
  const press = usePress();
  const ms = MARKET_MOTION.pressedMs;
  return (
    <>
    <style>{FOCUS_CSS}</style>
    <button
      type="button"
      aria-label="Redeem voucher. Scan or enter code"
      onClick={onPress}
      {...press.handlers}
      className={`market-focus ${className ?? ""}`}
      style={{
        display: "block",
        width: "100%",
        minWidth: 0,
        border: 0,
        background: "transparent",
        padding: 0,
        margin: 0,
        font: "inherit",
        cursor: "pointer",
        borderRadius: 20,
        textAlign: "start",
        ...press.style,
        ...style,
      }}
    >
      <span style={{ display: "block", filter: press.pressed ? SHADOW_PRESSED : SHADOW, transition: reduce ? undefined : `filter ${ms}ms ease` }}>
        <span
          style={{
            height: 96,
            borderRadius: 20,
            background: "linear-gradient(90deg,#7D67D9 0%,#4F8F8A 100%)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingBlock: "0", paddingInline: "12px 10px",
            boxSizing: "border-box",
            WebkitMask: MASK,
            mask: MASK,
          }}
        >
          <span style={{ position: "relative", width: 72, height: 72, flex: "none", borderRadius: 14, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ position: "absolute", inset: 4, borderRadius: 10, border: "1.5px dashed rgba(255,255,255,0.6)" }} />
            <svg width={50} height={50} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ position: "relative", display: "block", ...NO_ICON_SCALE }}>
              <rect width="5" height="5" x="3" y="3" rx="1" />
              <rect width="5" height="5" x="16" y="3" rx="1" />
              <rect width="5" height="5" x="3" y="16" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
              <path d="M21 21v.01" />
              <path d="M12 7v3a2 2 0 0 1-2 2H7" />
              <path d="M3 12h.01" />
              <path d="M12 3h.01" />
              <path d="M12 16v.01" />
              <path d="M16 12h1" />
              <path d="M21 12v.01" />
              <path d="M12 21v-1" />
            </svg>
          </span>
          <span style={{ width: 0, height: 72, flex: "none", borderInlineStart: "1.5px dashed rgba(255,255,255,0.4)" }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: textPx(17), lineHeight: linePx(22), fontWeight: 700, color: "#FFFFFF" }}>Redeem voucher</span>
            <span style={{ fontSize: textPx(13), lineHeight: linePx(18), fontWeight: 400, color: "rgba(255,255,255,0.8)" }}>Scan or enter code</span>
          </span>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", display: "block", ...NO_ICON_SCALE }}>
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </span>
    </button>
    </>
  );
};
