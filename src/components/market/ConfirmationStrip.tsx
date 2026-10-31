import React from "react";
import { Check, Minus, X } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { MARKET_MOTION, marketPalette } from "../../theme/marketTokens";

// Market + Share 3.0 · ConfirmationStrip (HANDOVER §4 Shared chrome, §5): a
// ticket stub. Literal values from the screen files (Client Sharing line 35,
// Business Marketplace line 304, Client Explore line 541, Professional
// Calendar line 30):
// - radius 16, overflow hidden, enters with cmSlideUp (420ms
//   cubic-bezier(0.22,1,0.36,1)); Reduce motion cuts it to its end state;
// - body: padding 13 14, gap 10; a 22 dot with a 12 / 3 glyph in white;
//   text 13 / 18 700;
// - the stub: 72 wide, border-left 1.5px dashed in the dot colour, the
//   action 13 / 800;
// - two 14 notches cut at the perforation (right: stub - 7), top and bottom,
//   in the colour of the surface behind the strip.
// Tones: success #E3F3E9 / #6F9993 / #2F5F58 (the default), teal (Client
// Explore's #E4F0EE), error #FBE7E4 / #C0392B / #9A2E22 and neutral
// #F5F5F6 / #8C8378 / #5B5349 (P-CA). `compact` is P-CA's: padding 12 14,
// 12.5 / 17, stub 64.

export type StripTone = "success" | "teal" | "error" | "neutral";

export interface ConfirmationStripProps {
  text: string;
  /** The stub's word ("Done", "View", "Undo", "OK"). No action: a plain stub is not drawn. */
  action?: string;
  onAction?: () => void;
  tone?: StripTone;
  compact?: boolean;
  /** The colour of the surface the strip sits on (the notches). Defaults to the page. */
  notchBg?: string;
  /** Turns off the entrance (a strip already on screen when the page mounts). */
  still?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ConfirmationStrip: React.FC<ConfirmationStripProps> = ({ text, action, onAction, tone = "success", compact, notchBg, still, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const [bg, dot, ink] =
    tone === "error"
      ? [m.highbg, m.high, m.highink]
      : tone === "neutral"
        ? [m.soft, m.faint, m.ink2]
        : [tone === "teal" ? m.tealbg : m.goodbg, m.teal, m.tealink];
  const Glyph = tone === "error" ? X : tone === "neutral" ? Minus : Check;
  const stub = compact ? 64 : 72;
  const size = compact ? 12.5 : 13;
  const notch = notchBg ?? m.page;
  return (
    <div
      role="status"
      aria-live="polite"
      className={className}
      style={{ position: "relative", display: "flex", borderRadius: 16, background: bg, overflow: "hidden", animation: still ? undefined : MARKET_MOTION.slideUp, ...style }}
    >
      <div className="flex items-center" style={{ flex: 1, minWidth: 0, gap: 10, padding: compact ? "12px 14px" : "13px 14px" }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: 999, background: dot, color: dark ? "#0D0B1A" : "#FFFFFF" }}>
          <Glyph size={12} strokeWidth={3} aria-hidden style={NO_ICON_SCALE} />
        </span>
        <span style={{ fontSize: textPx(size), lineHeight: linePx(compact ? 17 : 18), fontWeight: 700, color: ink, minWidth: 0 }}>{text}</span>
      </div>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="tap flex items-center justify-center shrink-0"
          style={{ width: stub, boxSizing: "content-box", minHeight: 44, borderInlineStart: `1.5px dashed ${dot}`, fontSize: textPx(size), fontWeight: 800, color: ink }}
        >
          {action}
        </button>
      ) : null}
      {action ? (
        <>
          <span aria-hidden style={{ position: "absolute", right: stub - 7, top: -7, width: 14, height: 14, borderRadius: 999, background: notch }} />
          <span aria-hidden style={{ position: "absolute", right: stub - 7, bottom: -7, width: 14, height: 14, borderRadius: 999, background: notch }} />
        </>
      ) : null}
    </div>
  );
};
