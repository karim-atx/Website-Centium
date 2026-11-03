import { CALC_KEYS, type NutrientRow } from "../../../data/nutrientSchema";
import { appLocale } from "../../../i18n/format";
import { sumNutrientMaps } from "../../../services/nutrition";
import type { FoodLogEntry } from "../../../types";

// Website viewport v1 · WC-FO: the row model behind the web Nutrient Summary
// cards. A copy of the mobile NutrientSections' private helpers (resolver,
// formatter, row view), kept here so the mobile file is untouched: same
// rules, same figures, only the web cards draw them larger.

export type NutrientFilter = "all" | "logged";

export interface NutrientData {
  totals: Record<string, number>;
  present: Record<string, number>;
  itemCount: number;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  bodyWeightKg: number | null;
  filter: NutrientFilter;
}

export interface RowView {
  row: NutrientRow;
  amount: number | undefined;
  hasAmount: boolean;
  target: number | null;
  percent: number | null;
  isOverLimit: boolean;
  partial: { shown: number; of: number } | null;
}

function sumPresent(totals: Record<string, number>, keys: readonly string[]): number | undefined {
  const values = keys.map((k) => totals[k]).filter((v): v is number => v !== undefined);
  if (values.length === 0) return undefined;
  return values.reduce((s, v) => s + v, 0);
}

function computeCalcAmount(key: string, totals: Record<string, number>): number | undefined {
  if (key === CALC_KEYS.netCarbs.key) {
    const [carbsKey, fiberKey] = CALC_KEYS.netCarbs.from;
    const carbs = totals[carbsKey];
    const fiber = totals[fiberKey];
    if (carbs === undefined || fiber === undefined) return undefined;
    return Math.max(0, carbs - fiber);
  }
  if (key === CALC_KEYS.totalMcts.key) return sumPresent(totals, CALC_KEYS.totalMcts.from);
  if (key === CALC_KEYS.omega6to3.key) {
    const n6 = sumPresent(totals, CALC_KEYS.omega6to3.n6);
    const n3 = sumPresent(totals, CALC_KEYS.omega6to3.n3);
    if (n6 === undefined || n3 === undefined) return undefined;
    if (!n3) return undefined;
    return n6 / n3;
  }
  return undefined;
}

function calcPresentCount(key: string, totals: Record<string, number>, present: Record<string, number>): number | undefined {
  const components =
    key === CALC_KEYS.netCarbs.key
      ? CALC_KEYS.netCarbs.from
      : key === CALC_KEYS.totalMcts.key
        ? CALC_KEYS.totalMcts.from
        : key === CALC_KEYS.omega6to3.key
          ? [...CALC_KEYS.omega6to3.n6, ...CALC_KEYS.omega6to3.n3]
          : [];
  const counts = components.filter((k) => totals[k] !== undefined).map((k) => present[k] ?? 0);
  return counts.length ? Math.min(...counts) : undefined;
}

const FROM_GOALS: Record<string, "calorieTarget" | "proteinTarget" | "carbTarget" | "fatTarget"> = {
  Calories: "calorieTarget",
  Protein: "proteinTarget",
  "Total fat": "fatTarget",
  "Total carbohydrates": "carbTarget",
};

function resolveTarget(row: NutrientRow, d: NutrientData): number | null {
  if (row.fromGoals) {
    const k = FROM_GOALS[row.name];
    return k ? d[k] : null;
  }
  if (row.mgPerKgBodyWeight) {
    if (d.bodyWeightKg == null) return null;
    return (row.mgPerKgBodyWeight * d.bodyWeightKg) / 1000;
  }
  return row.target;
}

/** The design's fmt(): 2 decimals below 10, 1 below 100, none from 100 up. */
export function formatAmount(v: number): string {
  const a = Math.abs(v);
  const dp = a >= 100 ? 0 : a >= 10 ? 1 : 2;
  const s = v.toFixed(dp).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
  return Number(s).toLocaleString(appLocale(), { maximumFractionDigits: dp });
}

export function buildRowView(row: NutrientRow, d: NutrientData): RowView {
  const { totals, present, itemCount } = d;
  const amount = row.kind === "calc" ? computeCalcAmount(row.key, totals) : totals[row.key];
  const hasAmount = amount !== undefined;
  const target = row.kind === "none" || row.kind === "calc" ? null : resolveTarget(row, d);
  let percent: number | null = null;
  let isOverLimit = false;
  if (hasAmount && target !== null && target > 0 && (row.kind === "goal" || row.kind === "limit")) {
    percent = (amount / target) * 100;
    isOverLimit = row.kind === "limit" && amount > target;
  }
  const presentCount = row.kind === "calc" ? calcPresentCount(row.key, totals, present) : present[row.key];
  const partial = hasAmount && itemCount > 0 && presentCount !== undefined && presentCount < itemCount ? { shown: presentCount, of: itemCount } : null;
  return { row, amount, hasAmount, target, percent, isOverLimit, partial };
}

/** A Daily Value exists for these, but food data never reports them: always a dash. */
export const ALWAYS_DASH_NAMES = new Set(["Chromium", "Chloride"]);

export function rowHasData(view: RowView): boolean {
  return view.hasAmount && !ALWAYS_DASH_NAMES.has(view.row.name);
}

/**
 * What the Nutrient Summary sums for a set of entries (the day, or one item):
 * the per-nutrient snapshots, with calories and macros from each entry's own
 * totals (every entry has them, so they are never partial). The mobile page's
 * reduction, unchanged.
 */
export function entryTotals(entries: FoodLogEntry[]): { totals: Record<string, number>; present: Record<string, number>; itemCount: number } {
  const summed = sumNutrientMaps(entries.map((e) => e.nutrients));
  if (entries.length === 0) return summed;
  const macros: Record<string, number> = {
    calories: entries.reduce((s, e) => s + e.calories, 0),
    protein: entries.reduce((s, e) => s + e.protein, 0),
    total_fat: entries.reduce((s, e) => s + e.fat, 0),
    total_carbohydrates: entries.reduce((s, e) => s + e.carbs, 0),
  };
  const complete = Object.fromEntries(Object.keys(macros).map((k) => [k, entries.length]));
  return { totals: { ...summed.totals, ...macros }, present: { ...summed.present, ...complete }, itemCount: summed.itemCount };
}
