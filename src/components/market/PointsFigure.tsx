import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { marketPalette, tierStyle } from "../../theme/marketTokens";
import { formatPoints, leafHeight, leafWidth } from "./pointsModel";
import { t } from "../../i18n/core";

// Market + Share 3.0 · PointsFigure (HANDOVER §4 "Points display rule", §5):
// balances are a bold figure + the tier icon; offer costs are a bold figure +
// the leaf mark (#6F9993). Never pills.
//
// Leaf (Client Explore Screens lines 365, 387, 428, 463; Business Marketplace
// 169, 228; Professional Marketplace 94, 500): an inline-flex row aligned to
// the baseline, gap 3 (4 at 28), the figure 700 tabular, the leaf
// `assets/points-leaf.svg` (viewBox 510 × 915) in --leaf at the drawn size
// for the figure (17 → 6.7 × 12, 15 → 6.1 × 11, 14 → 5.6 × 10, 28 → 11.1 × 20,
// 16 / 800 in StatLedger → 6.7 × 12, 26 / 800 in ChartCard → 8.4 × 15).
// Tier (C-MO.4.1 hero, C-MO.4.7 balance, lines 37–48 / 604–607): a row
// aligned to the centre, gap 8, the figure 44 / 52 700 tabular, the tier icon
// 30 × 30 stroke 1.75 in --tiericon, aria-label "{tier} tier".

/** The points leaf (handover-master/screens/assets/points-leaf.svg, inlined). */
export const LEAF_PATH =
  "M217 0C215.8 10.0 219.5 30.0 210 60C200.5 90.0 180.0 143.3 160 180C140.0 216.7 110.0 246.7 90 280C70.0 313.3 51.7 345.0 40 380C28.3 415.0 20.8 455.0 20 490C19.2 525.0 25.0 556.7 35 590C45.0 623.3 62.2 657.2 80 690C97.8 722.8 131.7 770.8 142 787C145.0 774.2 150.3 736.2 160 710C169.7 683.8 185.0 660.0 200 630C215.0 600.0 238.3 563.3 250 530C261.7 496.7 265.3 465.0 270 430C274.7 395.0 276.7 338.3 278 320C283.3 333.3 303.0 368.3 310 400C317.0 431.7 321.7 475.0 320 510C318.3 545.0 310.0 576.7 300 610C290.0 643.3 270.0 676.7 260 710C250.0 743.3 245.0 775.8 240 810C235.0 844.2 231.7 897.5 230 915C243.3 907.5 283.3 890.8 310 870C336.7 849.2 365.0 823.3 390 790C415.0 756.7 443.3 710.0 460 670C476.7 630.0 486.7 593.3 490 550C493.3 506.7 490.0 458.3 480 410C470.0 361.7 451.7 306.7 430 260C408.3 213.3 385.5 173.3 350 130C314.5 86.7 239.2 21.7 217 0Z";

/** The leaf mark alone, `height` tall (width from the 510 × 915 viewBox). */
export const PointsLeaf: React.FC<{ height: number; color?: string; label?: string | null; style?: React.CSSProperties }> = ({ height, color, label: given, style }) => {
  const dark = useIsDark();
  // undefined: the default name; null: decorative.
  const label = given === undefined ? t("points") : given;
  return (
    <svg
      width={leafWidth(height)}
      height={height}
      viewBox="0 0 510 915"
      role={label ? "img" : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
      style={{ display: "inline-block", flex: "none", color: color ?? marketPalette(dark).leaf, ...NO_ICON_SCALE, ...style }}
    >
      <path d={LEAF_PATH} fill="currentColor" />
    </svg>
  );
};

export interface PointsFigureProps {
  /** The points (a number is formatted "1,240"; a string is shown as is). */
  value: number | string;
  /** "leaf" for costs and points moved, "tier" for a balance. */
  mark: "leaf" | "tier";
  /** The tier's rank (1 to 5, point_tiers order) for mark "tier". */
  rank?: number;
  /** The tier's name from point_tiers, for the icon's label. */
  tierName?: string;
  /** The figure's font size: 14, 15, 16, 17, 26, 28 as drawn; 44 for a balance. */
  size?: number;
  /** 700 (offer costs, balances) or 800 (StatLedger, ChartCard). */
  weight?: 700 | 800;
  /** A fixed line height (the balance's 52). */
  lineHeight?: number;
  /** The figure's colour (defaults to --ink). */
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const PointsFigure: React.FC<PointsFigureProps> = ({ value, mark, rank = 1, tierName, size, weight = 700, lineHeight, color, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const text = typeof value === "number" ? formatPoints(value) : value;
  if (mark === "tier") {
    const tier = tierStyle(rank, dark);
    const fs = size ?? 44;
    const icon = Math.round((fs * 30) / 44);
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 8, ...style }}>
        <span style={{ fontSize: textPx(fs), lineHeight: linePx(lineHeight ?? (fs === 44 ? 52 : Math.round(fs * 1.2))), fontWeight: weight, fontVariantNumeric: "tabular-nums", color: color ?? m.ink }}>{text}</span>
        <tier.Icon size={icon} strokeWidth={1.75} color={tier.icon} role="img" aria-label={t("{tier} tier", { tier: tierName ?? tier.fallbackName })} style={{ display: "block", flex: "none", ...NO_ICON_SCALE }} />
      </span>
    );
  }
  const fs = size ?? 17;
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "baseline", gap: fs >= 28 ? 4 : 3, whiteSpace: "nowrap", lineHeight: "normal", ...style }}>
      <span style={{ fontSize: textPx(fs), fontWeight: weight, fontVariantNumeric: "tabular-nums", color: color ?? m.ink, ...(lineHeight ? { lineHeight: linePx(lineHeight) } : null) }}>{text}</span>
      <PointsLeaf height={leafHeight(fs)} />
    </span>
  );
};
