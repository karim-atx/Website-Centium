import React from "react";
import { Clock } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { marketPalette } from "../../theme/marketTokens";
import { linePx, textPx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { reviewWaitLine } from "../../services/safety/model";

/**
 * Round F (AB7): what shows in place of a review button while the account is
 * younger than 7 days: "You can write reviews 7 days after joining Centium
 * (from {date})." Not drawn: the offer page's locked line (12 / 600, ink2,
 * centred) with a 14 clock, in the screen's palette. `boxed` sets it in a
 * soft card where a button row stood.
 */
export const ReviewWaitNote: React.FC<{ opensAt: Date; boxed?: boolean; style?: React.CSSProperties }> = ({ opensAt, boxed = false, style }) => {
  const m = marketPalette(useIsDark());
  return (
    <p
      role="note"
      style={{
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        textAlign: "center",
        fontSize: textPx(12),
        lineHeight: linePx(17),
        fontWeight: 600,
        color: m.ink2,
        ...(boxed ? { background: m.soft, borderRadius: 14, padding: "12px 14px" } : {}),
        ...style,
      }}
    >
      <Clock size={14} strokeWidth={2} aria-hidden style={{ ...NO_ICON_SCALE, flexShrink: 0 }} />
      <span>{reviewWaitLine(opensAt)}</span>
    </p>
  );
};
