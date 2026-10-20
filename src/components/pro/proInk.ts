// Release 3 · the board's colour names (source/gen/lib.js, design-tokens.json)
// as the app's tokens, for inline styles in the professional components. Each
// is a CSS colour that follows light, dark, high contrast and the colour theme.

export const INK = {
  ch: "rgb(var(--c-charcoal))",
  chS: "rgb(var(--c-charcoal-soft))",
  chF: "rgb(var(--c-charcoal-faint))",
  chT: "rgb(var(--c-charcoal-tertiary))",
  card: "rgb(var(--c-cream-card))",
  cream: "rgb(var(--c-cream))",
  soft: "rgb(var(--c-cream-soft))",
  raised: "rgb(var(--c-surface-raised))",
  bCard: "var(--c-pro-card-border)",
  b06: "rgb(var(--c-charcoal) / 0.06)",
  b10: "rgb(var(--c-charcoal) / 0.1)",
  ringTrack: "var(--c-pro-ring-track)",
  pr: "rgb(var(--c-primary))",
  prPale: "rgb(var(--c-primary-pale))",
  prDeep: "rgb(var(--c-primary-deep-text))",
  prAccent: "rgb(var(--c-primary-accent))",
  fill: "rgb(var(--c-primary-fill))",
  onFill: "rgb(var(--c-on-primary-fill))",
  good: "rgb(var(--c-status-good))",
  goodBg: "rgb(var(--c-status-good-bg))",
  gold: "rgb(var(--c-gold))",
  goldPale: "rgb(var(--c-gold-pale))",
  goldInk: "rgb(var(--c-team-gold-ink))",
  hi: "rgb(var(--c-status-high))",
  hiBg: "rgb(var(--c-status-high-bg))",
  teal: "rgb(var(--c-teal))",
  tealPale: "rgb(var(--c-teal-pale))",
  tealDark: "rgb(var(--c-teal-dark))",
  sky: "rgb(var(--c-sky))",
  skyPale: "rgb(var(--c-sky-pale))",
  doneLeaf: "var(--c-pro-done-leaf)",
} as const;

/** Tiles behind an icon (EmptyState, ComingSoon): #F0EDF9, dark lavender at 15%. */
export const ICON_TILE_LIGHT = "#F0EDF9";
export const ICON_TILE_DARK = "rgba(174,161,220,0.15)";

/** SVGs sized here are exact; Larger text's icon scale (.larger-icons) must not apply. */
export const NO_ICON_SCALE: { transform: string } = { transform: "none" };
