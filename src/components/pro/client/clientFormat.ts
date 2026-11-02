// Release 3 · W3 client page: the pure helpers behind the kit (apart from
// the components so Fast refresh keeps working).

import { INK } from "../proInk";
import { appLocale } from "../../../i18n/format";
import { tk } from "../../../i18n/core";

export type Tone = "req" | "onb" | "act" | "att" | "pau" | "done" | "pr";

export function toneOf(tone: Tone): { bg: string; ink: string; bar: string } {
  switch (tone) {
    case "req":
      return { bg: INK.goldPale, ink: INK.goldInk, bar: INK.gold };
    case "onb":
      return { bg: INK.skyPale, ink: INK.sky, bar: INK.sky };
    case "act":
      return { bg: INK.goodBg, ink: INK.good, bar: INK.good };
    case "att":
      return { bg: INK.hiBg, ink: INK.hi, bar: INK.hi };
    case "pau":
      return { bg: INK.soft, ink: INK.chF, bar: INK.chT };
    case "done":
      return { bg: INK.tealPale, ink: "rgb(var(--th-3c6b65))", bar: INK.teal };
    default:
      return { bg: INK.prPale, ink: INK.prDeep, bar: INK.pr };
  }
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "Oct 3, 2026" / "Oct 3" (the board's dates). */
export function fmtDay(iso: string | null | undefined, withYear = false): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString(appLocale("en-US"), withYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
}

export const ALLERGEN_LABEL: Record<string, string> = {
  celery: tk("Celery"),
  cereals_gluten: tk("Gluten (cereals)"),
  crustaceans: tk("Crustaceans"),
  eggs: tk("Eggs"),
  fish: tk("Fish"),
  lupin: tk("Lupin"),
  milk: tk("Milk"),
  molluscs: tk("Molluscs"),
  mustard: tk("Mustard"),
  tree_nuts: tk("Tree nuts"),
  peanuts: tk("Peanuts"),
  sesame: tk("Sesame"),
  soya: tk("Soya"),
  sulphites: tk("Sulphites"),
};

