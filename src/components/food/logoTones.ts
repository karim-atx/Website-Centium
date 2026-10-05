// The six logo tones a custom food's icon steps through on Create Custom
// Food ("Tap the selected icon again to change its colour."), in the master
// handover's order (CentiumFrame LOGO_TONES). custom_foods.logo_tone stores
// the index.
export const LOGO_TONES: { bg: string; fg: string }[] = [
  // Decision 7: #A299DE carried the white glyph at 2.58:1; primary.deep
  // #7D6BB5 is the closest brand shade at 4.5:1 (fixed, not the theme's).
  { bg: "#7D6BB5", fg: "#FFFFFF" },
  { bg: "#A2C8C2", fg: "#2F5A54" },
  { bg: "#E8C877", fg: "#5A4410" },
  { bg: "#E0A9C6", fg: "#6E2B4B" },
  { bg: "#5F5093", fg: "#FFFFFF" },
  { bg: "#4F7F78", fg: "#FFFFFF" },
];

/**
 * Mobile v5.1 R3, dark mode (no light islands). The three filled tones (white
 * glyph on a coloured fill) stay as they are. The three pastel tones have no
 * board dark value, so each is its hue as a tint on the dark card (20%,
 * tintOn in src/data/folderColors.ts) with the hue itself as the glyph, which
 * already reads on it: #A2C8C2 5.76:1, #E8C877 6.27:1, #E0A9C6 5.44:1.
 */
const LOGO_TONES_DARK: { bg: string; fg: string }[] = [
  LOGO_TONES[0],
  { bg: "#374147", fg: "#A2C8C2" },
  { bg: "#454138", fg: "#E8C877" },
  { bg: "#433B48", fg: "#E0A9C6" },
  LOGO_TONES[4],
  LOGO_TONES[5],
];

/** The tone list for the current mode. */
export const logoTones = (dark: boolean) => (dark ? LOGO_TONES_DARK : LOGO_TONES);

/** A stored tone, or null for the default (uncoloured) tile. */
export const logoTone = (index: number | null | undefined, dark = false) => {
  const tones = logoTones(dark);
  return index === null || index === undefined ? null : tones[index % tones.length] ?? null;
};
