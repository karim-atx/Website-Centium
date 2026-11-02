// Release 3 · W5 Meal plans: the pure rules behind the NU screens (no React,
// no Supabase, so the node tests load it). Every number follows HANDOVER i:
// - item and day totals: the per-serving facts × the portion
//   (servingMultiplier, the same math the client diary logs with);
// - Day total ring (NU2): logged kcal ÷ target, bars for protein, carbs, fat;
// - macro grams: target kcal × split% ÷ 4 (protein, carbs) or ÷ 9 (fat);
// - reach date: today + |current − goal| ÷ weekly rate weeks;
// - target calories: TDEE ∓ weekly rate × 7700 ÷ 7.
// Conflicts come from food_conflicts only (DB-5); nothing here matches
// keywords or decides a severity.

import { calculateTDEEFromParts, servingMultiplier, gramsInServingLabel } from "../../../services/nutrition";
import type { ConflictKind } from "../proRules";
import { mondayIndex } from "../../../utils/week";
import { appLocale } from "../../../i18n/format";
import { getLanguage, t, tk, tn } from "../../../i18n/core";
import { weekdayLong, weekdayShort } from "../proDates";

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";
/** The builder's meal order (frame NU2: Breakfast, Lunch, Snacks, Dinner). */
export const SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
/** The add-food Meal chips (frame NU4: Breakfast, Snacks, Lunch, Dinner). */
export const SLOT_CHIP_ORDER: MealSlot[] = ["breakfast", "snack", "lunch", "dinner"];
/** English keys (tk); show them with t(). */
export const SLOT_LABEL: Record<MealSlot, string> = { breakfast: tk("Breakfast"), lunch: tk("Lunch"), snack: tk("Snacks"), dinner: tk("Dinner") };

export type ItemKind = "food" | "custom_food" | "recipe" | "custom_meal";

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

export const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0 };

export function addMacros(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f };
}

export function scaleMacros(m: Macros, k: number): Macros {
  return { kcal: m.kcal * k, p: m.p * k, c: m.c * k, f: m.f * k };
}

/** A food's per-serving facts (foods / custom_foods rows). */
export interface ServingFacts {
  servingLabel: string;
  per: Macros;
}

/**
 * How many servings a plan item stands for. Servings win; grams convert
 * through the serving label's own gram weight (servingMultiplier); an item
 * with neither is one serving.
 */
export function portionMultiplier(facts: ServingFacts | null, grams: number | null, servings: number | null): number {
  if (servings != null && servings > 0) return servings;
  if (grams != null && grams > 0 && facts) return servingMultiplier(facts.servingLabel, grams, "g");
  return 1;
}

/** Grams can be offered only when the serving label states its gram weight. */
export function gramsAllowed(servingLabel: string | null | undefined): boolean {
  return !!servingLabel && gramsInServingLabel(servingLabel) !== null;
}

export function sumMacros(list: (Macros | null)[]): Macros {
  return list.reduce<Macros>((acc, m) => (m ? addMacros(acc, m) : acc), ZERO);
}

/** HANDOVER i, Macro grams. */
export function macroGrams(kcal: number, pct: { proteinPct: number; carbsPct: number; fatPct: number }) {
  return {
    p: Math.round((kcal * pct.proteinPct) / 100 / 4),
    c: Math.round((kcal * pct.carbsPct) / 100 / 4),
    f: Math.round((kcal * pct.fatPct) / 100 / 9),
  };
}

export interface DayTotalView {
  kcal: number;
  target: number | null;
  /** 0 to 1 for the ring (capped); null with no target. */
  fraction: number | null;
  /** Target − kcal (positive = left, negative = over); null with no target. */
  left: number | null;
  macros: { key: "p" | "c" | "f"; label: string; value: number; target: number | null; over: boolean; fraction: number | null }[];
}

/**
 * NU2 day total (gen r13 dayTotal13): a macro reads "over" above 103% of its
 * target (the board's `p > 1.03`).
 */
export function dayTotalView(total: Macros, plan: { kcalTarget: number | null; proteinPct: number | null; carbsPct: number | null; fatPct: number | null }): DayTotalView {
  const target = plan.kcalTarget && plan.kcalTarget > 0 ? plan.kcalTarget : null;
  const grams = target && plan.proteinPct != null && plan.carbsPct != null && plan.fatPct != null ? macroGrams(target, { proteinPct: plan.proteinPct, carbsPct: plan.carbsPct, fatPct: plan.fatPct }) : null;
  const one = (key: "p" | "c" | "f", label: string) => {
    const value = Math.round(total[key]);
    const tg = grams ? grams[key] : null;
    const frac = tg ? value / tg : null;
    return { key, label, value, target: tg, over: frac !== null && frac > 1.03, fraction: frac === null ? null : Math.min(1, frac) };
  };
  const kcal = Math.round(total.kcal);
  return {
    kcal,
    target,
    fraction: target ? Math.min(1, kcal / target) : null,
    left: target ? Math.round(target - kcal) : null,
    macros: [one("p", t("Protein")), one("c", t("Carbs")), one("f", t("Fat"))],
  };
}

/** "{n} days · {n} to {n} kcal" (NU1). Day totals of days that have items; one value collapses. */
export function templateLine(daysCount: number, dayTotals: number[], kcalTarget: number | null): string {
  const days = tn(daysCount, "{n} day", "{n} days");
  const filled = dayTotals.filter((k) => k > 0).map((k) => Math.round(k));
  const fmt = (n: number) => n.toLocaleString(appLocale("en-GB"));
  if (filled.length) {
    const lo = Math.min(...filled);
    const hi = Math.max(...filled);
    return lo === hi ? `${days} · ${t("{n} kcal", { n: fmt(lo) })}` : `${days} · ${t("{lo} to {hi} kcal", { lo: fmt(lo), hi: fmt(hi) })}`;
  }
  return kcalTarget ? `${days} · ${t("{n} kcal", { n: fmt(Math.round(kcalTarget)) })}` : days;
}

export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : many ?? `${one}s`}`;
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Week n of an assignment (week 1 from its start); null before it starts. */
export function weekOfPlan(startsOn: string | null, today: string): number | null {
  if (!startsOn) return null;
  const d = daysBetween(startsOn, today);
  return d < 0 ? null : Math.floor(d / 7) + 1;
}

/** The plan day (1-based) that a date falls on, cycling through the plan's days. */
export function planDayFor(startsOn: string, daysCount: number, date: string): number | null {
  const d = daysBetween(startsOn, date);
  if (d < 0 || daysCount < 1) return null;
  return (d % daysCount) + 1;
}


/**
 * A plan day's tab label and total heading. A client's copy starts on a real
 * date, so its days are weekdays ("Thu", "Thursday total", FINAL_PLAN 3
 * "{weekday} total"); a template has no start, so its days are "Day n".
 */
export function dayLabels(dayIndex: number, startsOn: string | null): { tab: string; total: string; short: string } {
  if (!startsOn) return { tab: t("Day {n}", { n: dayIndex }), total: t("Day {n} total", { n: dayIndex }), short: t("Day {n}", { n: dayIndex }) };
  const d = new Date(`${shiftDate(startsOn, dayIndex - 1)}T00:00:00`).getDay();
  return { tab: weekdayShort(mondayIndex(d)), total: t("{day} total", { day: weekdayLong(mondayIndex(d)) }), short: weekdayShort(mondayIndex(d)) };
}

/** "Mon, Oct 5" (FINAL_PLAN 3 {day_date}: weekday and date from one value). */
export function dayDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" });
}

/** "Oct 5" and "Oct 5 to 7" / "Sep 30 to Oct 2" (NU5). */
export function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
}
export function dayRange(first: string, last: string): string {
  if (first === last) return shortDay(first);
  const a = new Date(`${first}T00:00:00`);
  const b = new Date(`${last}T00:00:00`);
  return a.getMonth() === b.getMonth() ? t("{from} to {to}", { from: shortDay(first), to: b.getDate() }) : t("{from} to {to}", { from: shortDay(first), to: shortDay(last) });
}

/** "Today", "Yesterday", "{n} days ago" (NU5 corner). */
export function daysAgo(iso: string, today: string): string {
  const d = daysBetween(iso, today);
  if (d <= 0) return t("Today");
  if (d === 1) return t("Yesterday");
  return tn(d, "{n} day ago", "{n} days ago");
}

// ---------------------------------------------------------------------------
// Conflicts (food_conflicts rows)
// ---------------------------------------------------------------------------

export interface ConflictRow {
  kind: ConflictKind;
  allergen: string | null;
  severity: "mild" | "moderate" | "severe" | null;
  restriction: string | null;
  detail: string | null;
}

/** The strongest conflict decides the row's flag: confirmed allergy, then the rest in order. */
export function worstConflict(rows: ConflictRow[]): ConflictRow | null {
  const order: ConflictKind[] = ["allergy_confirmed", "restriction", "allergy_check", "preference"];
  for (const k of order) {
    const hit = rows.find((r) => r.kind === k);
    if (hit) return hit;
  }
  return null;
}

/** Whether the client's allergies could be checked at all (allergies_unknown = the switch is off). */
export function allergiesUnknown(rows: ConflictRow[]): boolean {
  return rows.some((r) => r.kind === "allergies_unknown");
}

export interface ClientConflictLine {
  blocked: boolean;
  /** "att" (red, blocked), "req" (amber), "check", "unknown", "none". */
  tone: "att" | "req" | "none" | "unknown";
  text: string;
}

/**
 * NU13, per client: "{n} conflicts: {food} ({allergen} allergy, blocked),
 * {food} ({restriction})." (FINAL_PLAN 3 template, no invented swaps).
 * Confirmed allergies block the assignment (assign_meal_plan raises ATXG7);
 * "Check this" and restrictions don't. Allergies not shared: said so, never
 * implied safe.
 */
export function clientConflictLine(
  perItem: { name: string; rows: ConflictRow[] }[],
  label: { allergen: (a: string) => string; restriction: (r: string) => string }
): ClientConflictLine {
  const parts: string[] = [];
  let blocked = false;
  let amber = false;
  let unknown = false;
  const seen = new Set<string>();
  for (const it of perItem) {
    if (allergiesUnknown(it.rows)) unknown = true;
    for (const r of it.rows) {
      if (r.kind === "allergies_unknown") continue;
      const key = `${it.name}|${r.kind}|${r.allergen ?? r.restriction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (r.kind === "allergy_confirmed" && r.allergen) {
        blocked = true;
        parts.push(t("{food} ({allergen} allergy, blocked)", { food: it.name, allergen: label.allergen(r.allergen).toLowerCase() }));
      } else if (r.kind === "allergy_check" && r.allergen) {
        amber = true;
        parts.push(t("{food} (check for {allergen})", { food: it.name, allergen: label.allergen(r.allergen).toLowerCase() }));
      } else if (r.kind === "restriction" && r.restriction) {
        amber = true;
        parts.push(`${it.name} (${label.restriction(r.restriction)})`);
      } else if (r.kind === "preference" && r.restriction) {
        parts.push(t("{food} (prefers {restriction})", { food: it.name, restriction: label.restriction(r.restriction) }));
      }
    }
  }
  const unknownLine = t("Allergies aren't shared, so they can't be checked.");
  if (!parts.length) return unknown ? { blocked: false, tone: "unknown", text: unknownLine } : { blocked: false, tone: "none", text: t("No conflicts") };
  const head = tn(parts.length, "{n} conflict: {list}.", "{n} conflicts: {list}.", { list: parts.join(getLanguage() === "ar" ? "، " : ", ") });
  return { blocked, tone: blocked ? "att" : amber ? "req" : "none", text: unknown ? `${head} ${unknownLine}` : head };
}

// ---------------------------------------------------------------------------
// Journal (NU5 / NU6)
// ---------------------------------------------------------------------------

export interface JournalEntryLite {
  id: string;
  clientId: string;
  date: string;
  kcal: number;
  protein: number;
}

export interface QueueRow {
  clientId: string;
  /** Logged days with no feedback from you yet (Waiting) or with some (Reviewed), oldest first. */
  days: string[];
  lastDay: string;
  /** Days of those under the protein target, when a target is known. */
  proteinUnder: number | null;
}

/**
 * NU5: a logged day is "reviewed" once you've left feedback on any entry of
 * it (comment_on_food_entry); otherwise it's waiting. There's no separate
 * review state in the database (Mark reviewed: backend gap).
 */
export function buildQueue(
  entries: JournalEntryLite[],
  feedbackEntryIds: Set<string>,
  proteinTargetFor: (clientId: string) => number | null
): { waiting: QueueRow[]; reviewed: QueueRow[] } {
  const byClientDay = new Map<string, Map<string, JournalEntryLite[]>>();
  for (const e of entries) {
    const days = byClientDay.get(e.clientId) ?? new Map<string, JournalEntryLite[]>();
    days.set(e.date, [...(days.get(e.date) ?? []), e]);
    byClientDay.set(e.clientId, days);
  }
  const waiting: QueueRow[] = [];
  const reviewed: QueueRow[] = [];
  for (const [clientId, days] of byClientDay) {
    const w: string[] = [];
    const r: string[] = [];
    for (const [day, list] of days) (list.some((x) => feedbackEntryIds.has(x.id)) ? r : w).push(day);
    const target = proteinTargetFor(clientId);
    const row = (ds: string[]): QueueRow => {
      const sorted = [...ds].sort();
      const under = target ? sorted.filter((d) => (days.get(d) ?? []).reduce((s, x) => s + x.protein, 0) < target).length : null;
      return { clientId, days: sorted, lastDay: sorted[sorted.length - 1], proteinUnder: under };
    };
    if (w.length) waiting.push(row(w));
    if (r.length) reviewed.push(row(r));
  }
  const newestFirst = (a: QueueRow, b: QueueRow) => (a.lastDay < b.lastDay ? 1 : a.lastDay > b.lastDay ? -1 : 0);
  return { waiting: waiting.sort(newestFirst), reviewed: reviewed.sort(newestFirst) };
}

/** NU6 box: fill toward the target and what is left ("{n} to go") or over ("{n} over"). */
export function journalBox(value: number, target: number | null): { pct: number; over: boolean; left: string | null } {
  if (!target || target <= 0) return { pct: 0, over: false, left: null };
  const v = Math.round(value);
  const tg = Math.round(target);
  const over = v > tg;
  return { pct: Math.min(100, (v / tg) * 100), over, left: over ? t("{n} over", { n: (v - tg).toLocaleString(appLocale("en-GB")) }) : t("{n} to go", { n: (tg - v).toLocaleString(appLocale("en-GB")) }) };
}

// ---------------------------------------------------------------------------
// Targets (NU8)
// ---------------------------------------------------------------------------

/** HANDOVER i, Target calories: TDEE − rate × 7700 ÷ 7 to lose, + to gain. */
export function targetFromTdee(tdee: number, goal: "lose" | "gain" | "maintain", weeklyRateKg: number): number {
  const delta = (weeklyRateKg * 7700) / 7;
  return Math.round(goal === "lose" ? tdee - delta : goal === "gain" ? tdee + delta : tdee);
}

/** HANDOVER i, Reach date; null when the rate is 0, there's no goal or no weigh-in. */
export function reachDate(today: string, current: number | null, goalKg: number | null, weeklyRateKg: number): string | null {
  if (current === null || goalKg === null || !(weeklyRateKg > 0)) return null;
  const weeks = Math.abs(current - goalKg) / weeklyRateKg;
  if (!(weeks > 0)) return null;
  return shiftDate(today, Math.round(weeks * 7));
}

/** client_body_basics (Release A, W5-3c), as the service returns it; null = no row (Weight and Progress both off). */
export interface TdeeBasics {
  ageYears: number | null;
  sex: "female" | "male" | "other" | null;
  heightCm: number | null;
  activityLevel: "sedentary" | "light" | "moderate" | "very_active" | "athlete" | null;
}

/** The client's own activity words (components/profile/ActivityLevelSheet.tsx). */
export const ACTIVITY_LABEL: Record<NonNullable<TdeeBasics["activityLevel"]>, string> = {
  sedentary: tk("Sedentary"),
  light: tk("Lightly active"),
  moderate: tk("Moderately active"),
  very_active: tk("Very active"),
  athlete: tk("Athlete"),
};
const SEX_LABEL: Record<NonNullable<TdeeBasics["sex"]>, string> = { female: tk("Female"), male: tk("Male"), other: tk("Other") };

export type TdeeView =
  | { tdee: number; basis: string }
  | { tdee: null; title: string; line: string };

/**
 * NU8 TDEE card (HANDOVER i: Mifflin-St Jeor via calculateTDEEFromParts ×
 * activity factor): the estimate only when all five numbers are there, the
 * four from client_body_basics and the latest weigh-in (Weight switch).
 * Never a stand-in body: each missing input is named instead. The basis row
 * is the frame's "82.4 kg · 180 cm · 34 · Male · Lightly active".
 */
export function tdeeView(basics: TdeeBasics | null, weightKg: number | null, weightShared: boolean, first: string): TdeeView {
  const who = first || t("Your client");
  const title = t("Needs height, age, sex and activity");
  if (!basics) return { tdee: null, title, line: t("{name} hasn't shared their height, age, sex and activity level with you, so no maintenance estimate is made.", { name: who }) };
  const { ageYears, sex, heightCm, activityLevel } = basics;
  const missing = [heightCm === null ? t("height") : null, ageYears === null ? t("date of birth") : null, sex === null ? t("sex") : null, activityLevel === null ? t("activity level") : null].filter((x): x is string => !!x);
  if (missing.length || ageYears === null || sex === null || heightCm === null || activityLevel === null) {
    const list = missing.length > 1 ? t("{list} and {last}", { list: missing.slice(0, -1).join(getLanguage() === "ar" ? "، " : ", "), last: missing[missing.length - 1] }) : missing[0];
    return { tdee: null, title, line: t("{name} hasn't added their {list} yet, so no maintenance estimate is made.", { name: who, list }) };
  }
  if (weightKg === null) {
    return {
      tdee: null,
      title: t("Needs a weigh-in"),
      line: weightShared ? t("{name} hasn't logged a weigh-in yet. Mifflin-St Jeor needs a current weight.", { name: who }) : t("{name}'s weigh-ins aren't shared with you. Mifflin-St Jeor needs a current weight.", { name: who }),
    };
  }
  const fmt = (n: number) => String(Math.round(n * 10) / 10);
  return {
    tdee: calculateTDEEFromParts(weightKg, heightCm, ageYears, sex, activityLevel),
    basis: [t("{n} kg", { n: fmt(weightKg) }), t("{n} cm", { n: fmt(heightCm) }), String(ageYears), t(SEX_LABEL[sex]), t(ACTIVITY_LABEL[activityLevel])].join(" · "),
  };
}

/** The split saved must total 100 (nutrition_goals checks 99 to 101). */
export function splitTotalOk(p: number, c: number, f: number): boolean {
  const t = p + c + f;
  return t >= 99 && t <= 101;
}
