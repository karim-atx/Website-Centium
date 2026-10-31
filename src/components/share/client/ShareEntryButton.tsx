import React, { useEffect, useId, useState } from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../pro/proInk";

// Market + Share 3.0 · C-SH.1 entry points (Client Sharing lines 30, 54, 70,
// 96 and 222): the share icon button, a 34 circle in #F0EDF9 with the 15 / 2
// share glyph in #7D6BB5 on a 44 target, ringed 0 0 0 2px #AEA1DC as drawn
// on the headers and the Streaks card; `size={28}` is the PR tile's (13
// glyph). Disabled (e9Disabled): the target at opacity 0.4, the circle
// #F5F5F6 with a #8C8378 glyph, and a tap or focus shows the dark tooltip
// (220 wide, r12, #241F1B, 12 / 17 600 white, padding 10 12, the 12 arrow
// 22 from its right) with the reason.

export const SHARE_GLYPH = (
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
  </>
);

export const ShareGlyph: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
    {SHARE_GLYPH}
  </svg>
);

export interface ShareEntryButtonProps {
  onPress: () => void;
  /** Accessible name ("Share your workout"). */
  label: string;
  /** Unavailable: shows the reason instead of opening the sheet. */
  disabledHint?: string | null;
  /** The drawn ring (headers, Streaks); off on the PR tile. */
  ring?: boolean;
  /** 34 (headers, Streaks) or 28 (the PR tile). */
  size?: 34 | 28;
  /** The circle's fill when it sits on a coloured card (Streaks: #FFFFFF). */
  fill?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ShareEntryButton: React.FC<ShareEntryButtonProps> = ({ onPress, label, disabledHint, ring = true, size = 34, fill, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const disabled = !!disabledHint;
  const [tip, setTip] = useState(false);
  const tipId = useId();
  useEffect(() => {
    if (!tip) return;
    const id = window.setTimeout(() => setTip(false), 3200);
    return () => window.clearTimeout(id);
  }, [tip]);
  const hit = size === 34 ? 44 : 36;
  return (
    <span className={className} style={{ position: "relative", display: "inline-flex", flex: "none", ...style }}>
      <button
        type="button"
        aria-label={label}
        aria-disabled={disabled || undefined}
        aria-describedby={disabled && tip ? tipId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) setTip((t) => !t);
          else onPress();
        }}
        onFocus={() => disabled && setTip(true)}
        onBlur={() => setTip(false)}
        className="tap relative flex items-center justify-center before:absolute before:-inset-[4px] before:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ width: hit, height: hit, opacity: disabled ? 0.4 : 1, outlineColor: m.fill }}
      >
        <span
          className="flex items-center justify-center"
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            background: disabled ? m.soft : (fill ?? m.pale),
            boxShadow: ring && !disabled ? `0 0 0 2px ${m.fill}` : "none",
          }}
        >
          <ShareGlyph size={size === 34 ? 15 : 13} color={disabled ? m.faint : m.pdark} />
        </span>
      </button>
      {disabled && tip && (
        <span
          id={tipId}
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            insetInlineEnd: -2,
            width: 220,
            zIndex: 30,
            borderRadius: 12,
            background: dark ? "rgb(48 49 65)" : "#241F1B",
            color: "#FFFFFF",
            padding: "10px 12px",
            fontSize: textPx(12),
            lineHeight: linePx(17),
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            textAlign: "start",
          }}
        >
          {disabledHint}
          <span aria-hidden style={{ position: "absolute", top: -6, insetInlineEnd: 22, width: 12, height: 12, background: dark ? "rgb(48 49 65)" : "#241F1B", transform: "rotate(45deg)" }} />
        </span>
      )}
    </span>
  );
};
