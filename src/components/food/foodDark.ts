/**
 * Mobile v5.1 R3, dark mode (no light islands): dark values for the food
 * sheets' recurring light literals that have no exact-match token. Call
 * sites keep their light literal: `dark ? FOOD_DARK.x : "#light"`.
 * - box: the grey #F4F4F6 container is surface.soft dark; its #E2E3E7 rule
 *   and the #E4E4E9 / #E7E7EC outlines are border.option dark.
 * - label: the #575863 field label is text.secondary dark.
 * - protein / carbs / fat: the macro trio's type colours (#7D6BB5 / #8175C2 /
 *   #4274D7) lifted toward white until each reads at 4.5:1 on the dark box
 *   (liftTo, src/data/folderColors.ts): 4.58 / 4.57 / 4.55.
 * - danger*: the delete button (#FCEDEC / #F2CFCC / #B4372C) is danger.tint,
 *   the danger hue at 38% on the card for its border, and danger dark (4.80:1).
 * - iconTile / lavInk: the lavender icon tile (#EEEBFB / #EFECFB / #F0EDF9
 *   behind #6B4BE0 / #7D6BB5) and lavender text are primary.tint with
 *   primary.deep dark (6.03:1); lavDeep (#5F5093 text) is primary.deeper dark.
 * - tealInk: #4F7F78 as text or an outline is secondary.deep dark (6.99:1).
 */
export const FOOD_DARK = {
  box: "#242730",
  rule: "rgba(238,239,242,0.10)",
  outline: "rgba(238,239,242,0.10)",
  label: "#B8B3C7",
  protein: "rgb(var(--th-9486c2))",
  carbs: "rgb(var(--th-9086c9))",
  fat: "#648DDE",
  dangerBg: "#3C2A30",
  dangerBorder: "#723C3D",
  danger: "#FF6B5E",
  iconTile: "rgb(var(--th-303141))",
  lavInk: "rgb(var(--th-b7abde))",
  lavDeep: "rgb(var(--th-c8bfe9))",
  tealInk: "rgb(var(--th-7fb3a9))",
} as const;

// The ink on those fills: white, except that dark mode's primary-fill is the
// light lavender, which carries on-primary-fill's near-black (8.27:1); that
// token is white in light mode, so light is unchanged. White on #4F7F78: 4.53:1.
export const PREP_ON_PRIMARY = { meals: "#FFFFFF", recipes: "rgb(var(--c-on-primary-fill))" } as const;
