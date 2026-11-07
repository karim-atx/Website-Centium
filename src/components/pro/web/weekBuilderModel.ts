import type { MealPlan, PlanItem } from "../../../services/pro/nutrition";
import { gramsInServingLabel } from "../../../services/nutrition";
import { macroGrams, type Macros } from "../nutrition/nutritionModel";
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

/** The gram weight in a food's serving label ("1 cup (156 g)"), or null (the unit menu's grams). */
export function servingGrams(it: Pick<PlanItem, "facts">): number | null {
  return it.facts?.servingLabel ? gramsInServingLabel(it.facts.servingLabel) : null;
}
