import React from "react";

// v6 (TK 4.1, 4.2, 4.8; decision O3): the in-app Centium mark as one vector.
// Paths copied byte for byte from the handovers' own files
// (Part B svg/illustrations/brand/centium-mark.svg = Business UI
// handoff/icons/centium-mark.svg; the 50 leaf copies across both packages are
// the same string). Colours: C = --c-brand-c, leaf = --c-brand-leaf, so the
// other four themes draw the mark in their own pair (theme rule 4, D10) and
// Centium draws #8F68F6 / #8AC4BA (BU ASSETS "C fill #8F68F6"). The fallback
// triplets are those Centium values, for as long as :root does not define the
// two vars itself. #9C7FF8 stays only in the favicon, PWA icons and the
// marketing site (src/marketing has its own copy).
//
// Replaces: public/centium-mark.png, centium-mark-trimmed.png,
// centium-mark-dark.png, centium-logo-c.png, centium-logo-leaf.png (in-app
// uses) and centium-lockup.png, plus ThemedMark's PNG masks.

export const MARK_C_PATH =
  "M 890.36 308.7 L 813.4 386.69 C 801.2 374.93 790.43 362.13 777.32 351.26 C 746.72 325.89 709.28 307.73 670.12 300.59 C 590.62 286.08 504.97 318.03 454.03 380.86 C 421.96 420.4 403.64 468.42 398.16 518.81 C 396.29 535.99 397.7 553.69 399.73 570.74 C 408.03 640.66 447.28 705.12 502.1 748.51 C 516.39 759.82 531.54 770.39 547.68 778.92 C 556.04 783.34 564.58 787.57 573.25 791.36 C 576.75 792.89 580.51 793.92 583.89 795.7 C 582.91 799.2 580.49 802.32 578.52 805.32 C 574.07 812.09 569.16 818.58 563.98 824.81 C 547.79 844.27 527.53 863.18 504.4 873.91 C 495.84 871.9 487.25 867.17 479.49 863.11 C 468.68 857.45 458.02 851.52 447.88 844.71 C 398.64 811.63 357.51 767.6 329.33 715.28 C 274.16 612.83 269.77 488.67 320.79 383.61 C 350.07 323.31 395.72 270.92 452.96 235.76 C 531.62 187.45 629.66 173.36 718.61 197.96 C 768.79 211.85 814.51 236.71 853.78 270.8 C 862.68 278.52 871.13 286.81 879.12 295.47 C 882.92 299.59 887.6 303.81 890.36 308.7 Z";

export const MARK_LEAF_PATH =
  "M 924.4 540.2 C 926.11 544.37 926.54 548.91 927.36 553.32 C 928.8 561.08 929.64 568.79 930.21 576.66 C 932.57 609.13 928.13 641.02 919.55 672.37 C 900.23 742.92 853.48 804.05 791.15 841.94 C 762.82 859.17 731.28 870.42 699.1 877.86 C 671.76 884.17 643.4 886.13 615.4 885.89 C 599.01 885.74 582.63 884.09 566.25 883.7 C 566.74 879.3 573.64 875.44 576.68 872.48 C 585.82 863.59 595.64 855.43 605.29 847.11 C 629.02 826.66 654.39 808.89 681.66 793.45 C 701.82 782.04 723.43 773.62 742.6 760.39 C 763.68 745.83 782.03 727.79 798.39 708.19 C 806.05 699.02 812.91 689.21 819.35 679.16 C 821.27 676.16 827.01 670.04 826.4 666.35 C 798.14 691.54 767.08 713.92 733.26 731.05 C 709.64 743.01 684.5 751.2 660.56 762.34 C 647.16 768.59 634.45 775.89 621.94 783.74 C 616.43 787.2 611.29 791.99 605.4 794.73 C 604.25 787.79 606.72 779.53 607.79 772.64 C 610.87 752.86 616.43 733.37 624.06 714.85 C 633.07 692.95 645.38 671.69 660.94 653.77 C 685.28 625.73 718.1 605.13 753.57 594.39 C 790.66 583.15 829.86 581.2 866.79 569.6 C 880.33 565.35 893.47 559.72 905.7 552.51 C 911.91 548.86 917.8 542.94 924.4 540.2 Z";

/** C of the mark (#8F68F6 in Centium, the theme primary of the pair elsewhere). */
export const BRAND_C = "rgb(var(--c-brand-c, 143 104 246))";
/** Leaf of the mark (#8AC4BA in Centium). */
export const BRAND_LEAF = "rgb(var(--c-brand-leaf, 138 196 186))";

/**
 * Where the artwork sits in the box:
 * - "handover": the handover files' own viewBox, 270 180 690 730.
 * - "png": public/centium-mark.png's 687 x 713 canvas (artwork at 6,6), so a
 *   `<img src="/centium-mark.png">` at width x height can be swapped 1:1.
 * - "ink": the artwork's own bounds (645.6 x 699.7), about the
 *   centium-logo-c.png / -leaf.png 648 x 701 canvas.
 */
export type MarkFraming = "handover" | "png" | "ink";
const VIEWBOX: Record<MarkFraming, [number, number, number, number]> = {
  handover: [270, 180, 690, 730],
  png: [279.1, 180.1, 687, 713],
  ink: [285.1, 186.1, 645.6, 699.7],
};

interface MarkProps {
  /** Rendered height in px; the width follows the framing's proportions. */
  height: number;
  framing?: MarkFraming;
  /** "brand": C + leaf in the theme's brand pair. "white": both #FFFFFF (Mind Habits header, Hire confirmed). */
  variant?: "brand" | "white";
  /** Accessible name; without it the mark is decorative (aria-hidden). */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

const box = (framing: MarkFraming, height: number) => {
  const [x, y, w, h] = VIEWBOX[framing];
  return { viewBox: `${x} ${y} ${w} ${h}`, width: (height * w) / h, height };
};

const a11y = (label?: string) =>
  label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

/** The full mark: C and leaf. */
export const CentiumMark: React.FC<MarkProps> = ({ height, framing = "handover", variant = "brand", label, className, style }) => (
  <svg {...box(framing, height)} {...a11y(label)} className={className} style={{ display: "block", flex: "none", ...style }}>
    <path d={MARK_C_PATH} fill={variant === "white" ? "#FFFFFF" : BRAND_C} />
    <path d={MARK_LEAF_PATH} fill={variant === "white" ? "#FFFFFF" : BRAND_LEAF} />
  </svg>
);

/** The C alone (Part B centium-mark-c.svg; the achievement pill's centium-logo-c.png). currentColor unless `color` is given. */
export const CentiumC: React.FC<Omit<MarkProps, "variant"> & { color?: string }> = ({
  height,
  framing = "handover",
  color = BRAND_C,
  label,
  className,
  style,
}) => (
  <svg {...box(framing, height)} {...a11y(label)} className={className} style={{ display: "block", flex: "none", ...style }}>
    <path d={MARK_C_PATH} fill={color} />
  </svg>
);

// ---------------------------------------------------------------------------
// Wordmarks. Part B svg/illustrations/brand/entium-wordmark.svg (the cropped
// "entium" that follows the mark; replaces centium-entium-white.png in the
// Mind Habits header, 91.6 x 10 pt) and the full "CENTIUM" of the lockup (the
// same strokes plus the repo's C stroke, src/marketing CentiumWordmark).
// Both draw in currentColor.

const ENTIUM_STROKES = [
  "M 213 58.5 H 272",
  "M 221.5 82 V 129 M 221.5 89.5 H 267 M 221.5 121.5 H 272",
  "M 376.5 51 V 129 M 429.5 51 V 129 M 376.5 51 L 429.5 129",
  "M 532 59.5 H 596 M 564 51 V 129",
  "M 700 51 V 129",
  "M 814.5 51 V 95.5 A 26 26 0 0 0 866.5 95.5 V 51",
  "M 980 129 V 51 L 1012 111 L 1044 51 V 129",
];

/** "entium", viewBox 204 44 849 93 exactly as the handover file. */
export const EntiumWordmark: React.FC<{ height: number; className?: string; style?: React.CSSProperties }> = ({ height, className, style }) => (
  <svg
    viewBox="204 44 849 93"
    width={(height * 849) / 93}
    height={height}
    role="img"
    aria-label="entium"
    className={className}
    style={{ display: "block", flex: "none", ...style }}
  >
    <g stroke="currentColor" strokeWidth="17" strokeLinecap="butt" strokeLinejoin="miter" fill="none">
      {ENTIUM_STROKES.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  </svg>
);

/** The lockup's "CENTIUM" strokes (C + entium), in wordmark units. */
const WordmarkStrokes: React.FC<{ clipId: string }> = ({ clipId }) => (
  <g stroke="currentColor" strokeWidth="17" strokeLinecap="butt" strokeLinejoin="miter" fill="none">
    <path d="M 113.4 69.9 A 32 32 0 1 0 113.4 110.1" />
    {ENTIUM_STROKES.map((d, i) => (
      // N and M are trimmed to the cap band, as the brand artwork draws them.
      <path key={d} d={d} clipPath={i === 2 || i === 6 ? `url(#${clipId})` : undefined} />
    ))}
  </g>
);

/**
 * In place of public/centium-lockup.png (687 x 842: the mark over a
 * letter-spaced CENTIUM). Same canvas, so `<img src="/centium-lockup.png">`
 * sizes carry over; the mark and wordmark take the brand C colour.
 */
export const CentiumLockup: React.FC<{ width: number; label?: string; className?: string; style?: React.CSSProperties }> = ({
  width,
  label = "Centium",
  className,
  style,
}) => {
  const clipId = `centium-lockup-cap-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="279.1 180.1 687 842"
      width={width}
      height={(width * 842) / 687}
      role="img"
      aria-label={label}
      className={className}
      style={{ display: "block", flex: "none", color: BRAND_C, ...style }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="40" y="51" width="1030" height="78" />
        </clipPath>
      </defs>
      <path d={MARK_C_PATH} fill={BRAND_C} />
      <path d={MARK_LEAF_PATH} fill={BRAND_LEAF} />
      {/* Measured on the PNG: wordmark ink 17,783 to 681,836 on the 687 x 842
          canvas = 664 x 53; the strokes' ink is 48,50 to 1053,130 (alpha IoU
          against the PNG: 97.3% overall, 90.4% on the thin wordmark). */}
      <g transform="translate(296.6 963.1) scale(0.6611) translate(-48 -49.5)">
        <WordmarkStrokes clipId={clipId} />
      </g>
    </svg>
  );
};
