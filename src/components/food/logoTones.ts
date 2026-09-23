// The six logo tones a custom food's icon steps through on Create Custom
// Food ("Tap the selected icon again to change its colour."), in the master
// handover's order (CentiumFrame LOGO_TONES). custom_foods.logo_tone stores
// the index.
export const LOGO_TONES: { bg: string; fg: string }[] = [
  { bg: "#A299DE", fg: "#FFFFFF" },
  { bg: "#A2C8C2", fg: "#2F5A54" },
  { bg: "#E8C877", fg: "#5A4410" },
  { bg: "#E0A9C6", fg: "#6E2B4B" },
  { bg: "#5F5093", fg: "#FFFFFF" },
  { bg: "#4F7F78", fg: "#FFFFFF" },
];

/** A stored tone, or null for the default (uncoloured) tile. */
export const logoTone = (index: number | null | undefined) =>
  index === null || index === undefined ? null : LOGO_TONES[index % LOGO_TONES.length] ?? null;
