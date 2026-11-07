import type { MealPlan, PlanItem } from "../../../services/pro/nutrition";
import { gramsInServingLabel } from "../../../services/nutrition";
import { gramsAllowed, macroGrams, type Macros } from "../nutrition/nutritionModel";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));

/** The plan's targets as grams (null without a kcal target and a full split). */
export function planTargets(plan: Pick<MealPlan, "kcalTarget" | "proteinPct" | "carbsPct" | "fatPct">): Macros | null {
  if (!plan.kcalTarget || plan.kcalTarget <= 0) return null;
  const g = plan.proteinPct != null && plan.carbsPct != null && plan.fatPct != null ? macroGrams(plan.kcalTarget, { proteinPct: plan.proteinPct, carbsPct: plan.carbsPct, fatPct: plan.fatPct }) : null;
  return { kcal: plan.kcalTarget, p: g?.p ?? 0, c: g?.c ?? 0, f: g?.f ?? 0 };
}

/** "2,600 kcal · C 293 g · P 195 g · F 72 g" (the header's targets line). */
export function targetsLine(tg: Macros | null): string | null {
  if (!tg) return null;
  const parts = [t("{n} kcal", { n: fmt(tg.kcal) })];
  if (tg.c || tg.p || tg.f) parts.push(`C ${t("{n} g", { n: fmt(tg.c) })}`, `P ${t("{n} g", { n: fmt(tg.p) })}`, `F ${t("{n} g", { n: fmt(tg.f) })}`);
  return parts.join(" · ");
}

/** The units a plan item can be counted in: a food with a gram weight offers grams and servings. */
export function unitOptions(item: Pick<PlanItem, "kind" | "facts">): ("g" | "serving")[] {
  const food = item.kind === "food" || item.kind === "custom_food";
  return food && gramsAllowed(item.facts?.servingLabel) ? ["g", "serving"] : ["serving"];
}

/** The same portion in the other unit: servings × the serving's grams, or grams ÷ them (2 decimals). */
export function convertUnit(item: Pick<PlanItem, "grams" | "servings" | "facts">, to: "g" | "serving"): { grams: number | null; servings: number | null } {
  const per = item.facts?.servingLabel ? gramsInServingLabel(item.facts.servingLabel) : null;
  if (to === "g") {
    if (item.grams != null) return { grams: item.grams, servings: null };
    return { grams: per ? Math.round((item.servings ?? 1) * per) : null, servings: per ? null : item.servings ?? 1 };
  }
  if (item.grams == null) return { grams: null, servings: item.servings ?? 1 };
  return { grams: null, servings: per ? Math.round((item.grams / per) * 100) / 100 : 1 };
}
