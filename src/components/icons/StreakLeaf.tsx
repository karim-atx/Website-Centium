// The habit streak leaf (decision 9 superseded, 7 October 2026). The path is the
// handover package's own "logo leaf outline with the base slit", copied byte for
// byte from assets/icons/custom/MO1_01_community-forum-discussions_30.svg (the
// same path draws the Community, Explore and Referral leaf icons in
// MoreLeafIcons.tsx). Only its scale, fill and stroke change here: never redraw it.
import React from "react";

/** The handover's leaf path, verbatim. Its coordinates span about 20–490 × 0–915. */
export const STREAK_LEAF_PATH =
  "M217 0C215.8 10.0 219.5 30.0 210 60C200.5 90.0 180.0 143.3 160 180C140.0 216.7 110.0 246.7 90 280C70.0 313.3 51.7 345.0 40 380C28.3 415.0 20.8 455.0 20 490C19.2 525.0 25.0 556.7 35 590C45.0 623.3 62.2 657.2 80 690C97.8 722.8 131.7 770.8 142 787C145.0 774.2 150.3 736.2 160 710C169.7 683.8 185.0 660.0 200 630C215.0 600.0 238.3 563.3 250 530C261.7 496.7 265.3 465.0 270 430C274.7 395.0 276.7 338.3 278 320C283.3 333.3 303.0 368.3 310 400C317.0 431.7 321.7 475.0 320 510C318.3 545.0 310.0 576.7 300 610C290.0 643.3 270.0 676.7 260 710C250.0 743.3 245.0 775.8 240 810C235.0 844.2 231.7 897.5 230 915C243.3 907.5 283.3 890.8 310 870C336.7 849.2 365.0 823.3 390 790C415.0 756.7 443.3 710.0 460 670C476.7 630.0 486.7 593.3 490 550C493.3 506.7 490.0 458.3 480 410C470.0 361.7 451.7 306.7 430 260C408.3 213.3 385.5 173.3 350 130C314.5 86.7 239.2 21.7 217 0Z";

const VIEW_W = 510;
const VIEW_H = 915;

export interface StreakLeafProps {
  /** Rendered height in px; the width follows the leaf's own proportions. */
  height: number;
  /**
   * "filled": a solid leaf with the base slit showing (MO1.1 Today rows).
   * "outline": the leaf stroked, its inside on the card colour (MO1.1.1 chips).
   */
  variant: "filled" | "outline";
  /** Outline stroke in px at the rendered size (outline only). */
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const StreakLeaf: React.FC<StreakLeafProps> = ({ height, variant, strokeWidth = 1, className, style }) => {
  const width = (height * VIEW_W) / VIEW_H;
  // The stroke is given in rendered px, so convert it to path units.
  const sw = (strokeWidth * VIEW_H) / height;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      overflow="visible"
      aria-hidden
      className={className}
      style={{ display: "block", flex: "none", ...style }}
    >
      {variant === "filled" ? (
        <path d={STREAK_LEAF_PATH} fill="currentColor" />
      ) : (
        <path
          d={STREAK_LEAF_PATH}
          fill="rgb(var(--c-cream-card))"
          stroke="currentColor"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};
