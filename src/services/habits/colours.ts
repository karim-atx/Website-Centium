import type { HabitColour } from "../../types";
import { FOLDER_FAMILIES, TEAL, contrastRatio, liftTo, mixHex, partBFamily } from "../../data/folderColors";

export type { HabitColour };

// habit_items.colour (Database B3, PB-O-01): an enum, default lavender.
//
// THE CYCLE ORDER IS THE HANDOVER'S (mind-handover.md 316): lavender → teal →
// gold → rose → sky → lavender. An unknown value (a later enum member this
// build does not know) reads as lavender rather than breaking the row.
export const HABIT_COLOURS: readonly HabitColour[] = ["lavender", "teal", "gold", "rose", "sky"];

export function toHabitColour(value: unknown): HabitColour {
  return HABIT_COLOURS.includes(value as HabitColour) ? (value as HabitColour) : "lavender";
}

/** The next colour in the cycle (MO1.1.1 S3). */
export function nextHabitColour(colour: HabitColour | undefined): HabitColour {
  const i = HABIT_COLOURS.indexOf(colour ?? "lavender");
  return HABIT_COLOURS[(i + 1) % HABIT_COLOURS.length];
}

/** A tile's fill and its icon ink. */
export interface HabitShade {
  tile: string;
  ink: string;
}

// LIGHT, literal where the handover gives it:
// - fills measured on MO1.1.1's 2x PNG: teal #E8F2F0, gold #F8F0DC, rose
//   #F6E5ED; sky #EBF2FA derived (V6-143, the Blue folder row);
// - ink = the family's dark shade (V6-143 "icon ink per colour"): teal
//   #4B786F (mind-handover.md 317), sky #3072B3 (V6-143), gold and rose the
//   repo folder palette's dark shade of Gold (#8D6925) and Berry (#A45383),
//   the families the prose says to match.
// Lavender is NOT here: it is the theme's own primary-pale / primary-dark
// (#F0EDF9 / #7D6BB5, MO1.1.1 #13-#14 measured), so it follows the colour
// theme exactly as before.
const FAMILY = {
  teal: TEAL,
  gold: FOLDER_FAMILIES["#D9A441"],
  rose: FOLDER_FAMILIES["#9C4F7C"],
  sky: FOLDER_FAMILIES["#4C8FD1"],
} as const;

const LIGHT: Record<Exclude<HabitColour, "lavender">, HabitShade> = {
  teal: { tile: "#E8F2F0", ink: FAMILY.teal.tile },
  gold: { tile: "#F8F0DC", ink: FAMILY.gold.tile },
  rose: { tile: "#F6E5ED", ink: FAMILY.rose.tile },
  sky: { tile: "#EBF2FA", ink: "#3072B3" },
};

/** The hue moved toward black until it reads at `ratio` on `bg` (High contrast). */
function darkenTo(hue: string, bg: string, ratio: number): string {
  for (let t = 0; t <= 1; t += 0.01) {
    const c = mixHex(hue, "#000000", t);
    if (contrastRatio(c, bg) >= ratio) return c;
  }
  return "#000000";
}

/**
 * The tile and icon colours of a habit, or null for lavender (the caller keeps
 * the theme classes bg-primary-pale / text-primary-dark, which already carry
 * dark and High contrast).
 *
 * DARK (OURS, MO1.1.1 O6): the same derivation the Routines tab uses for its
 * folder families (partBFamily): the tile is the family at 14% on the dark
 * card, which reproduces the lavender #303141 and teal #293339 the handover
 * draws, and the icon is the family's lifted shade (teal #93C1B9 literal),
 * lifted further only if it falls under 4.5:1 on that tile.
 * HIGH CONTRAST (light): the fill keeps its hue and the ink is taken darker
 * until it reaches 7:1 (O9: "tile fills keep hue, icon ink to the family's
 * darkest shade").
 */
export function habitShade(colour: HabitColour | undefined, dark: boolean, highContrast = false): HabitShade | null {
  const c = colour ?? "lavender";
  if (c === "lavender") return null;
  if (dark) {
    const f = partBFamily(FAMILY[c], true);
    return { tile: f.row, ink: liftTo(f.tile, f.row, 4.5) };
  }
  const s = LIGHT[c];
  return highContrast ? { tile: s.tile, ink: darkenTo(s.ink, s.tile, 7) } : s;
}
