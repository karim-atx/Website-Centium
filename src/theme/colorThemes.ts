import type { ColorTheme } from "../types";
import type { PremiumDbTheme } from "../services/premium/g4";
import { tk } from "../i18n/core";

// R20 (batch D): the five colour themes of Foundations 2.1 "Theme pairs".
// The colours themselves live in CSS (index.css for Centium, the generated
// styles/theme-palette.css for the other four); this list is what the picker
// shows: each theme's light pair, primary then secondary, as MO1.8 draws the
// swatches.
export const COLOR_THEMES: { value: ColorTheme; label: string; primary: string; secondary: string }[] = [
  { value: "centium", label: "Centium", primary: "#AEA1DC", secondary: "#6F9993" },
  { value: "sky", label: "Sky", primary: "#4F7DFF", secondary: "#94A3B8" },
  { value: "rose", label: "Rose", primary: "#E24D7F", secondary: "#F0A7B8" },
  { value: "gold", label: "Gold", primary: "#F6C445", secondary: "#8B5A2B" },
  { value: "coral", label: "Coral", primary: "#FF7A45", secondary: "#B94A2E" },
];

// Round G4: the three Premium themes, shown on the member's picker only with
// the Premium switch on (my_color_themes(), with the lock). Their palettes
// are generated like the four above (scripts/themes/generate.mjs THEMES);
// the swatch here is each one's light pair. `db` is the color_theme value.
export const PREMIUM_COLOR_THEMES: { value: ColorTheme; db: PremiumDbTheme; label: string; primary: string; secondary: string }[] = [
  { value: "forest", db: "forest_sage", label: tk("Forest sage"), primary: "#2F7D5B", secondary: "#8FB59A" },
  { value: "midnight", db: "midnight_indigo", label: tk("Midnight indigo"), primary: "#4146C8", secondary: "#56607F" },
  { value: "plum", db: "plum_lilac", label: tk("Plum lilac"), primary: "#8C3A87", secondary: "#C7A6DE" },
];

/** Every theme this app can paint (the five, then the three Premium ones). */
export const ALL_COLOR_THEMES = [...COLOR_THEMES, ...PREMIUM_COLOR_THEMES];

/** A Premium theme (Round G4). */
export const isPremiumTheme = (t: ColorTheme): boolean => PREMIUM_COLOR_THEMES.some((p) => p.value === t);

// The four themes before R20, saved on the device by earlier versions (D2):
// each moves to its nearest new theme, once, without a notice.
const RETIRED: Record<string, ColorTheme> = { ocean: "sky", sunset: "coral", berry: "rose" };

/**
 * A saved theme value, as one of today's (anything unknown is Centium). A
 * Premium theme the member chose stays theirs (the Database keeps it when
 * Premium ends; it only refuses choosing another).
 */
export function normalizeColorTheme(saved: unknown): ColorTheme {
  if (typeof saved !== "string") return "centium";
  if (saved in RETIRED) return RETIRED[saved];
  return ALL_COLOR_THEMES.some((t) => t.value === saved) ? (saved as ColorTheme) : "centium";
}
