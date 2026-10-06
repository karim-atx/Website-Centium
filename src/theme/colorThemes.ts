import type { ColorTheme } from "../types";

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

// The four themes before R20, saved on the device by earlier versions (D2):
// each moves to its nearest new theme, once, without a notice.
const RETIRED: Record<string, ColorTheme> = { ocean: "sky", sunset: "coral", berry: "rose" };

/** A saved theme value, as one of today's five (anything unknown is Centium). */
export function normalizeColorTheme(saved: unknown): ColorTheme {
  if (typeof saved !== "string") return "centium";
  if (saved in RETIRED) return RETIRED[saved];
  return COLOR_THEMES.some((t) => t.value === saved) ? (saved as ColorTheme) : "centium";
}
