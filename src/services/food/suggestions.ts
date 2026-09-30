import type { FoodLogEntry, MealType } from "../../types";

// Handover 2026-09-29 FO7: Add Food opens with the user's own frequent and
// recent foods instead of the database, matched to the meal it was opened
// for. Computed from the food logs already in AppContext (the diary loads
// the last 90 days).
//
// SCORE: every log of a food counts, weighted toward recent use by halving
// every 30 days, so a food eaten daily a month ago and a food eaten twice
// this week can both rank. Meal-specific opens count only that meal's logs;
// the general opens (the floating + and Home) count every meal.
//
// ONLY FOODS THAT CAN BE LOGGED AGAIN: an entry pointing at a catalog food or
// a custom food. A food typed in by hand has no source row holding its
// per-serving values, so there is nothing to prefill it from.

export interface FoodSuggestion {
  /** The catalog or custom food id, what the sheet re-reads before the add step. */
  id: string;
  name: string;
  /** The quantity and unit last logged (at this meal, when meal-specific). */
  quantity: number;
  unit: FoodLogEntry["unit"];
  /** That last entry's kcal, which is already for that quantity. */
  kcal: number;
  /** "2 tbsp", "170 g", "1 pita", "3 × 1 large egg". */
  amount: string;
}

const HALF_LIFE_DAYS = 30;
export const SUGGESTION_LIMIT = 8;

const sourceId = (e: FoodLogEntry) => e.foodId ?? e.customFoodId;
const daysBetween = (a: string, b: string) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;

/** The amount as the diary states it, with a unit other than "serving" read as "170 g". */
export function amountLabel(e: Pick<FoodLogEntry, "quantity" | "unit" | "display">): string {
  if (e.unit && e.unit !== "serving") return `${e.quantity} ${e.unit}`;
  return e.quantity !== 1 ? `${e.quantity} × ${e.display.serving}` : e.display.serving;
}

export function foodSuggestions(log: FoodLogEntry[], meal: MealType | null, today: string): FoodSuggestion[] {
  const byFood = new Map<string, { score: number; last: FoodLogEntry }>();
  for (const e of log) {
    const id = sourceId(e);
    if (!id || (meal && e.meal !== meal) || e.date > today) continue;
    const weight = 0.5 ** (Math.max(0, daysBetween(e.date, today)) / HALF_LIFE_DAYS);
    const cur = byFood.get(id);
    if (!cur) byFood.set(id, { score: weight, last: e });
    else {
      cur.score += weight;
      if (e.date >= cur.last.date) cur.last = e;
    }
  }
  return [...byFood.entries()]
    .sort(([, a], [, b]) => b.score - a.score || b.last.date.localeCompare(a.last.date))
    .slice(0, SUGGESTION_LIMIT)
    .map(([id, { last }]) => ({
      id,
      name: last.name,
      quantity: last.quantity,
      unit: last.unit,
      kcal: Math.round(last.calories),
      amount: amountLabel(last),
    }));
}

/** Every food id in the user's history, so search can rank their own foods first. */
export function historyIds(log: FoodLogEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const e of log) {
    const id = sourceId(e);
    if (id) ids.add(id);
  }
  return ids;
}
