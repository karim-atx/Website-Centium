// R21 / D15 Larger text for sizes written inline: the same rule the build
// applies to stylesheet sizes (scripts/postcss/larger-text.js). With Larger
// text off --text-boost is unset, so each value computes to exactly `px`;
// on, `px` + 2 (never above 34 unless it already was).

/** An inline font size in px that follows Larger text. */
export const textPx = (px: number): string =>
  `min(calc(${px}px + var(--text-boost, 0px)), max(${px}px, 34px))`;

/** An inline fixed line height in px that grows with Larger text. */
export const linePx = (px: number): string => `calc(${px}px + var(--text-boost, 0px))`;
