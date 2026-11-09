// R21 / D15 Larger text for sizes written inline: the same rule the build
// applies to stylesheet sizes (scripts/postcss/larger-text.js). With Larger
// text off --text-boost is unset, so each value computes to exactly `px`;
// on, `px` + 2 (never above 34 unless it already was). On a form field at
// phone width it is also never under --field-min (16px, index.css), so iOS
// doesn't zoom in on focus; elsewhere --field-min is unset and has no effect.

/** An inline font size in px that follows Larger text. */
export const textPx = (px: number): string =>
  `max(var(--field-min, 0px), min(calc(${px}px + var(--text-boost, 0px)), max(${px}px, 34px)))`;

/**
 * An inline font size in px for a form field's own text that doesn't follow
 * Larger text: exactly `px`, but never under 16px on a phone (--field-min).
 */
export const fieldPx = (px: number): string => `max(var(--field-min, 0px), ${px}px)`;

/**
 * For a form field styled inline with `font: "inherit"` (which outranks the
 * stylesheet floor): put `fontSize: FIELD_FONT_INHERIT` after it. The parent's
 * size, as `inherit` gives, but never under 16px on a phone.
 */
export const FIELD_FONT_INHERIT = "max(var(--field-min, 0px), 100%)";

/** An inline fixed line height in px that grows with Larger text. */
export const linePx = (px: number): string => `calc(${px}px + var(--text-boost, 0px))`;
