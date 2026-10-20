// Release 3 · W5 the nutrition of a meal-plan item. Foods and custom foods
// carry their per-serving facts (read with the plan); recipes and custom
// meals are the professional's own (AppContext recipes / customMeals, the
// same lists Food › Meal Prep uses), summed with the client Meal Prep's own
// math (mealPrepShared sumItems / divideTotals), never estimated.

import type { CustomMeal, Recipe } from "../../../types";
import { divideTotals, sumItems, type PrepItem } from "../../food/mealPrepShared";
import { portionMultiplier, scaleMacros, type ItemKind, type Macros, type ServingFacts } from "./nutritionModel";

export interface FactSources {
  recipes: Recipe[];
  customMeals: CustomMeal[];
}

const fromPrep = (t: { kcal: number; p: number; c: number; f: number }): Macros => ({ kcal: t.kcal, p: t.p, c: t.c, f: t.f });

/** Per ONE serving: a food's facts, a recipe's per-serving share, a whole custom meal. */
export function perServing(kind: ItemKind | null, refId: string | null, facts: ServingFacts | null, src: FactSources): { per: Macros; servingLabel: string | null } | null {
  if ((kind === "food" || kind === "custom_food") && facts) return { per: facts.per, servingLabel: facts.servingLabel };
  if (kind === "recipe") {
    const r = src.recipes.find((x) => x.id === refId);
    if (!r) return null;
    return { per: fromPrep(divideTotals(sumItems(r.items as PrepItem[]), r.servings)), servingLabel: null };
  }
  if (kind === "custom_meal") {
    const m = src.customMeals.find((x) => x.id === refId);
    if (!m) return null;
    return { per: fromPrep(sumItems(m.items as PrepItem[])), servingLabel: null };
  }
  return null;
}

/** The item's portion: grams (foods with a gram weight) or servings. */
export function itemMacros(item: { kind: ItemKind | null; refId: string | null; facts: ServingFacts | null; grams: number | null; servings: number | null }, src: FactSources): Macros | null {
  const base = perServing(item.kind, item.refId, item.facts, src);
  if (!base) return null;
  const k = item.kind === "food" || item.kind === "custom_food" ? portionMultiplier(item.facts, item.grams, item.servings) : item.servings ?? 1;
  return scaleMacros(base.per, k);
}

/** NU2 row line: "200 g · 146 kcal", "1 medium · 95 kcal", "Recipe · 1 serving · 540 kcal". */
export function itemLine(item: { kind: ItemKind | null; facts: ServingFacts | null; grams: number | null; servings: number | null }, m: Macros | null): string {
  const kcal = m ? `${Math.round(m.kcal).toLocaleString("en-GB")} kcal` : "No nutrition data";
  const n = item.servings ?? 1;
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  if (item.kind === "recipe") return `Recipe · ${fmt(n)} ${n === 1 ? "serving" : "servings"} · ${kcal}`;
  if (item.kind === "custom_meal") return `Meal · ${fmt(n)} ${n === 1 ? "serving" : "servings"} · ${kcal}`;
  if (item.grams != null) return `${fmt(item.grams)} g · ${kcal}`;
  const label = item.facts?.servingLabel ?? "serving";
  return `${n === 1 ? label : `${fmt(n)} × ${label}`} · ${kcal}`;
}
