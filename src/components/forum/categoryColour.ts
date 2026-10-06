import { liftTo, tintOn } from "../../data/folderColors";
import { fv } from "./forumColor";

// Mobile v5.1 MO1.3 / MO1.3.3: each forum category has a colour (A20). Light
// mode uses the handover's values as drawn: `label` is the category pill's
// text on the forum list (MO1.3), `strong` the post header card and the card's
// edge (MO1.3.3). Dark mode tints the pill on the dark card and lifts every ink
// to 4.5:1 (a bar or header text to the same, since white sits on it).
//
// General's list label is not drawn (it is never a filter); it is its header
// colour darkened to the same weight as the others' labels (flagged).

const CATEGORY: Record<string, { label: string; strong: string }> = {
  workouts: { label: "#5F5093", strong: "#6E5BB0" },
  nutrition: { label: "#8A6A1F", strong: "#B07F22" },
  progress: { label: "#2C6A4A", strong: "#4E8B6A" },
  motivation: { label: "#7A3A60", strong: "#8E4670" },
  general: { label: "#2E5E8E", strong: "#3C78B5" },
};

/**
 * The category dot in the New post dropdown (MO1.3.2 / MO1.3.2.1 §9): fixed
 * hexes in every theme and mode (D9), except Workouts, drawn #7D6BB5, which
 * swaps to the theme primary (the forum accent).
 */
const DOT: Record<string, string> = {
  general: "#4C8FD1",
  nutrition: "#D9A441",
  workouts: fv("accent"),
  progress: "#3F9165",
  motivation: "#9C4F7C",
};

export const categoryDot = (key: string): string => DOT[key] ?? DOT.general;

/** The design's chip order: All · Nutrition · Workouts · Progress · Motivation. */
export const CATEGORY_ORDER = ["nutrition", "workouts", "progress", "motivation", "general"];

export const orderCategories = <T extends { key: string; sortOrder: number }>(cats: readonly T[]): T[] =>
  [...cats].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.key);
    const ib = CATEGORY_ORDER.indexOf(b.key);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.sortOrder - b.sortOrder;
  });

export interface CategoryColours {
  /** Pill text and the dot. */
  ink: string;
  /** Pill fill. */
  pill: string;
  /** The card's left edge and the post header's fill. */
  strong: string;
  /** Text on `strong`. */
  onStrong: string;
}

const DARK_CARD = "#1C1F28";

export function categoryColours(key: string, dark: boolean): CategoryColours {
  const c = CATEGORY[key] ?? CATEGORY.general;
  if (!dark) {
    return { ink: c.label, pill: tintOn(c.strong, 0.12, "#FFFFFF"), strong: c.strong, onStrong: "#FFFFFF" };
  }
  const pill = tintOn(c.strong, 0.2, DARK_CARD);
  // White on the header: darken the header in dark mode until white reaches
  // 4.5:1 rather than lightening the white.
  let strong = c.strong;
  for (let t = 0; t <= 1; t += 0.02) {
    const s = tintOn(c.strong, 1 - t, "#000000");
    if (contrast(s, "#FFFFFF") >= 4.5) {
      strong = s;
      break;
    }
  }
  return { ink: liftTo(c.strong, pill), pill, strong, onStrong: "#FFFFFF" };
}

function lum(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contrast(a: string, b: string): number {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
