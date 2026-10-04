import React from "react";
import clsx from "clsx";

/** The Centium mark's geometry: two filled outlines in one coordinate space, matching public/favicon.svg and
 *  every generated icon exactly. Both are single closed paths with smooth Bézier edges (no strokes, masks or
 *  holes). The leaf's vein is not a separate shape: it is a notch in the leaf's own outline, open at the stem
 *  end, so there is nothing to composite and nothing that can spill outside the leaf. Viewbox: "270 180 690 730". */
export const CENTIUM_MARK_C_PATH =
  "M 890.36 308.7 L 813.4 386.69 C 801.2 374.93 790.43 362.13 777.32 351.26 C 746.72 325.89 709.28 307.73 670.12 300.59 C 590.62 286.08 504.97 318.03 454.03 380.86 C 421.96 420.4 403.64 468.42 398.16 518.81 C 396.29 535.99 397.7 553.69 399.73 570.74 C 408.03 640.66 447.28 705.12 502.1 748.51 C 516.39 759.82 531.54 770.39 547.68 778.92 C 556.04 783.34 564.58 787.57 573.25 791.36 C 576.75 792.89 580.51 793.92 583.89 795.7 C 582.91 799.2 580.49 802.32 578.52 805.32 C 574.07 812.09 569.16 818.58 563.98 824.81 C 547.79 844.27 527.53 863.18 504.4 873.91 C 495.84 871.9 487.25 867.17 479.49 863.11 C 468.68 857.45 458.02 851.52 447.88 844.71 C 398.64 811.63 357.51 767.6 329.33 715.28 C 274.16 612.83 269.77 488.67 320.79 383.61 C 350.07 323.31 395.72 270.92 452.96 235.76 C 531.62 187.45 629.66 173.36 718.61 197.96 C 768.79 211.85 814.51 236.71 853.78 270.8 C 862.68 278.52 871.13 286.81 879.12 295.47 C 882.92 299.59 887.6 303.81 890.36 308.7 Z";
export const CENTIUM_MARK_LEAF_PATH =
  "M 924.4 540.2 C 926.11 544.37 926.54 548.91 927.36 553.32 C 928.8 561.08 929.64 568.79 930.21 576.66 C 932.57 609.13 928.13 641.02 919.55 672.37 C 900.23 742.92 853.48 804.05 791.15 841.94 C 762.82 859.17 731.28 870.42 699.1 877.86 C 671.76 884.17 643.4 886.13 615.4 885.89 C 599.01 885.74 582.63 884.09 566.25 883.7 C 566.74 879.3 573.64 875.44 576.68 872.48 C 585.82 863.59 595.64 855.43 605.29 847.11 C 629.02 826.66 654.39 808.89 681.66 793.45 C 701.82 782.04 723.43 773.62 742.6 760.39 C 763.68 745.83 782.03 727.79 798.39 708.19 C 806.05 699.02 812.91 689.21 819.35 679.16 C 821.27 676.16 827.01 670.04 826.4 666.35 C 798.14 691.54 767.08 713.92 733.26 731.05 C 709.64 743.01 684.5 751.2 660.56 762.34 C 647.16 768.59 634.45 775.89 621.94 783.74 C 616.43 787.2 611.29 791.99 605.4 794.73 C 604.25 787.79 606.72 779.53 607.79 772.64 C 610.87 752.86 616.43 733.37 624.06 714.85 C 633.07 692.95 645.38 671.69 660.94 653.77 C 685.28 625.73 718.1 605.13 753.57 594.39 C 790.66 583.15 829.86 581.2 866.79 569.6 C 880.33 565.35 893.47 559.72 905.7 552.51 C 911.91 548.86 917.8 542.94 924.4 540.2 Z";

/** Marketing-site-only redraw of the Centium mark, per the "Centium marketing
 *  site" Claude Design handoff. Deliberately NOT src/components/ui/CentiumLogo.tsx —
 *  that component is shared with the app/portal, which this handoff doesn't cover;
 *  keeping this scoped to src/marketing/ leaves the portal's branding untouched.
 *
 *  Mark (ring) and wordmark share `currentColor` so a single `color` class on the
 *  wrapping link flips both for the transparent nav's light/dark adaptive text.
 *  The leaf is its own layer with a fixed fill (not currentColor) since it keeps
 *  its teal/white identity independent of the ring's color swap. Hovering the
 *  leaf or its wrapper (`.group`) swings it 7.5deg from its base at the ring —
 *  see the `transform-origin` below, which must stay pinned there or the swing
 *  reads as sliding instead of rotating. */
export const CentiumMark: React.FC<{ size?: number; leafFill?: string; className?: string }> = ({
  size = 28,
  leafFill = "#8AC4BA",
  className,
}) => (
  <span className={clsx("relative block shrink-0", className)} style={{ width: size, height: size }}>
    <svg viewBox="270 180 690 730" fill="none" aria-hidden="true" className="absolute inset-0 w-full h-full overflow-visible">
      <path d={CENTIUM_MARK_C_PATH} fill="currentColor" />
    </svg>
    <svg
      viewBox="270 180 690 730"
      fill="none"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full overflow-visible transition-transform duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)] origin-[43.32%_96.36%] group-hover:rotate-[7.5deg] hover:rotate-[7.5deg]"
    >
      <path d={CENTIUM_MARK_LEAF_PATH} fill={leafFill} />
    </svg>
  </span>
);

/** "CENTIUM" as vector strokes (stencil E, M with a short centre vertex) —
 *  traced from the brand artwork, not a text span, so it renders identically
 *  regardless of font availability. `currentColor` so it inherits the same
 *  adaptive color as CentiumMark when both sit inside the same colored wrapper.
 *
 *  Used as the full wordmark (with its own leading "C" stroke) only by the
 *  brand loader, which draws the C separately via CentiumMark first — see
 *  CentiumWordmarkCropped below for the nav/footer variant. */
export const CentiumWordmark: React.FC<{ height?: number; className?: string }> = ({ height = 11, className }) => {
  // The N and M are built from diagonal strokes whose butt caps and miter joins
  // poke above and below the cap height (the N ran ~10% taller than every other
  // letter, the M ~4%), where the brand artwork's N and M are flat-topped and
  // flat-bottomed like the T, I and E. Trimming just those two glyphs to the
  // cap-height band (y 51-129, the extent of every straight stem) fixes it; the
  // round C and U keep their slight overshoot, as in the artwork. One clip per
  // instance because the loader renders this component twice.
  const cap = `cent-wm-cap-${React.useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="48 44 1005 93"
      fill="none"
      role="img"
      aria-label="Centium"
      className={clsx("shrink-0 overflow-visible", className)}
      style={{ height, width: height * (1005 / 93) }}
    >
      <defs>
        <clipPath id={cap}>
          <rect x="40" y="51" width="1030" height="78" />
        </clipPath>
      </defs>
      <g stroke="currentColor" strokeWidth="17" strokeLinecap="butt" strokeLinejoin="miter" fill="none">
        <path d="M 113.4 69.9 A 32 32 0 1 0 113.4 110.1" />
        <path d="M 213 58.5 H 272" />
        <path d="M 221.5 82 V 129 M 221.5 89.5 H 267 M 221.5 121.5 H 272" />
        <path d="M 376.5 51 V 129 M 429.5 51 V 129 M 376.5 51 L 429.5 129" clipPath={`url(#${cap})`} />
        <path d="M 532 59.5 H 596 M 564 51 V 129" />
        <path d="M 700 51 V 129" />
        <path d="M 814.5 51 V 95.5 A 26 26 0 0 0 866.5 95.5 V 51" />
        <path d="M 980 129 V 51 L 1012 111 L 1044 51 V 129" clipPath={`url(#${cap})`} />
      </g>
    </svg>
  );
};

/** v3 landing handoff: nav/footer wordmark cropped to drop the standalone "C"
 *  glyph (the leaf mark itself already reads as the C there) — viewBox starts
 *  at the "E" ink edge instead of 48. Same paths as CentiumWordmark minus the
 *  first, just re-windowed. */
export const CentiumWordmarkCropped: React.FC<{ height?: number; className?: string }> = ({
  height = 11,
  className,
}) => (
  <svg
    viewBox="204 44 849 93"
    fill="none"
    role="img"
    aria-label="entium"
    className={clsx("shrink-0 overflow-visible", className)}
    style={{ height, width: height * (849 / 93) }}
  >
    <g stroke="currentColor" strokeWidth="17" strokeLinecap="butt" strokeLinejoin="miter" fill="none">
      <path d="M 213 58.5 H 272" />
      <path d="M 221.5 82 V 129 M 221.5 89.5 H 267 M 221.5 121.5 H 272" />
      <path d="M 376.5 51 V 129 M 429.5 51 V 129 M 376.5 51 L 429.5 129" />
      <path d="M 532 59.5 H 596 M 564 51 V 129" />
      <path d="M 700 51 V 129" />
      <path d="M 814.5 51 V 95.5 A 26 26 0 0 0 866.5 95.5 V 51" />
      <path d="M 980 129 V 51 L 1012 111 L 1044 51 V 129" />
    </g>
  </svg>
);
