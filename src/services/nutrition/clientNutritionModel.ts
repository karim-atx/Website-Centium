// Release 3 · W7 (CU3, CU4, CU13 to CU15): the client's side of what a
// professional adds to Food. Pure logic only (no Supabase), so it is unit
// tested: the allergen list, the conflict-kind -> badge mapping (DECISIONS
// DB-5 and DECISIONS_PROFESSIONAL Safety), the professional-set targets
// overlay and the meal plan card's summary.

import type { MacroSplit, NutritionGoal, WeightGoalType } from "../../types";
import { appLocale } from "../../i18n/format";
import { getLanguage, t, tk, tn } from "../../i18n/core";
import { isolate } from "./otherAllergies";

// ---------------------------------------------------------------------------
// Allergens (the 14 regulated allergens, enum `allergen`)
// ---------------------------------------------------------------------------

export type Allergen =
  | "celery"
  | "cereals_gluten"
  | "crustaceans"
  | "eggs"
  | "fish"
  | "lupin"
  | "milk"
  | "molluscs"
  | "mustard"
  | "tree_nuts"
  | "peanuts"
  | "sesame"
  | "soya"
  | "sulphites";

export type AllergySeverity = "mild" | "moderate" | "severe";

/**
 * The sheet's order: the CU15 frame's rows first (Tree nuts, Peanuts, Milk,
 * Eggs, Gluten, Soy, Fish, Shellfish, Sesame), then the rest of the 14. The
 * labels are the ones the professional's screens already show for the same
 * enum (components/pro/client/clientFormat ALLERGEN_LABEL), so both sides
 * name an allergen the same way.
 */
export const ALLERGENS: { value: Allergen; label: string }[] = [
  { value: "tree_nuts", label: tk("Tree nuts") },
  { value: "peanuts", label: tk("Peanuts") },
  { value: "milk", label: tk("Milk") },
  { value: "eggs", label: tk("Eggs") },
  { value: "cereals_gluten", label: tk("Gluten (cereals)") },
  { value: "soya", label: tk("Soya") },
  { value: "fish", label: tk("Fish") },
  { value: "crustaceans", label: tk("Crustaceans") },
  { value: "molluscs", label: tk("Molluscs") },
  { value: "sesame", label: tk("Sesame") },
  { value: "celery", label: tk("Celery") },
  { value: "mustard", label: tk("Mustard") },
  { value: "lupin", label: tk("Lupin") },
  { value: "sulphites", label: tk("Sulphites") },
];

export const SEVERITIES: { value: AllergySeverity; label: string }[] = [
  { value: "mild", label: tk("Mild") },
  { value: "moderate", label: tk("Moderate") },
  { value: "severe", label: tk("Severe") },
];

export const allergenLabel = (a: string | null | undefined): string => ALLERGENS.find((x) => x.value === a)?.label ?? (a ?? "");
export const severityLabel = (s: string | null | undefined): string => SEVERITIES.find((x) => x.value === s)?.label ?? (s ?? "");

export interface MyAllergy {
  allergen: Allergen;
  severity: AllergySeverity;
}

/** What Save allergies writes: rows to add, severities to change, allergens to remove. */
export function allergyDiff(
  before: MyAllergy[],
  after: MyAllergy[]
): { insert: MyAllergy[]; update: MyAllergy[]; remove: Allergen[] } {
  const was = new Map(before.map((a) => [a.allergen, a.severity]));
  const now = new Map(after.map((a) => [a.allergen, a.severity]));
  return {
    insert: after.filter((a) => !was.has(a.allergen)),
    update: after.filter((a) => was.has(a.allergen) && was.get(a.allergen) !== a.severity),
    remove: before.filter((a) => !now.has(a.allergen)).map((a) => a.allergen),
  };
}

/**
 * The line under the Plan chips (CU13): "Allergy: Tree nuts (severe). Shared
 * with Dana." Several allergies are listed in the sheet's order. Severity
 * comes only from the client's own structured rows.
 */
export function allergyLine(allergies: MyAllergy[], sharedWith: string[], others: { label: string; severity: AllergySeverity }[] = []): string | null {
  const n = allergies.length + others.length;
  if (n === 0) return null;
  const order = (a: Allergen) => ALLERGENS.findIndex((x) => x.value === a);
  const sev = (s: AllergySeverity) => t(severityLabel(s)).toLowerCase();
  const list = [
    ...[...allergies].sort((x, y) => order(x.allergen) - order(y.allergen)).map((a) => `${t(allergenLabel(a.allergen))} (${sev(a.severity)})`),
    // FQ: the member's own "Other" allergies after the 14, in their words (isolated, never translated).
    ...others.map((o) => `${isolate(o.label)} (${sev(o.severity)})`),
  ].join(listSep());
  const head = n === 1 ? t("Allergy: {list}.", { list }) : t("Allergies: {list}.", { list });
  if (sharedWith.length === 0) return head;
  return `${head} ${t("Shared with {names}.", { names: joinNames(sharedWith) })}`;
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return t("{a} and {b}", { a: names.slice(0, -1).join(listSep()), b: names[names.length - 1] });
}

/** ", " in English, the Arabic comma in Arabic. */
const listSep = () => (getLanguage() === "ar" ? "، " : ", ");

// ---------------------------------------------------------------------------
// food_conflicts -> what the client sees
// ---------------------------------------------------------------------------

/**
 * Batch D GI (20261227110000) adds two: `may_contain` (one of the member's
 * allergens is a "may contain" trace on the label, with their severity) and
 * `food_allergens_unknown` (an online food with no allergen data, said once to
 * someone with allergies). Neither blocks.
 */
export type ConflictKind =
  | "allergy_confirmed"
  | "may_contain"
  | "allergy_check"
  | "restriction"
  | "preference"
  | "food_allergens_unknown"
  | "allergies_unknown";

export interface ConflictRow {
  kind: ConflictKind | string;
  allergen: string | null;
  severity: string | null;
  restriction: string | null;
  detail: string | null;
  /**
   * FQ (20261227020000): on an "Other" allergy's row (kind allergy_check,
   * allergen null) the member's own label. Absent on today's database, so
   * optional: a row without it reads exactly as before.
   */
  customAllergy?: string | null;
}

export interface FoodBadge {
  kind: ConflictKind;
  /**
   * red: a confirmed allergy (structured data). amber: may contain / check
   * this / a restriction. soft: a preference. grey: allergens unknown (GI).
   */
  tone: "red" | "amber" | "soft" | "grey";
  text: string;
  /** Only a confirmed allergy blocks adding the food. */
  blocks: boolean;
  /** Only a confirmed allergy or a "may contain" trace (GI) carries a severity, and only from the client's own row. */
  severity: AllergySeverity | null;
  /** The allergen, for a confirmed allergy or a "may contain" trace (never named for a keyword match). */
  allergen: Allergen | null;
  restriction: string | null;
  /** FQ: an "Other" allergy's label (the member's own words, never translated), on a check-this row. */
  customAllergy: string | null;
}

/**
 * food_conflicts / found_food_conflicts (GI) rows as the app reads them.
 * custom_allergy (FQ, 20261227020000): an "Other" allergy's label on its
 * allergy_check rows; absent on today's database.
 */
export function conflictRowsFrom(data: unknown): ConflictRow[] {
  type R = { kind: string; allergen: string | null; severity: string | null; restriction: string | null; detail: string | null; custom_allergy?: string | null };
  return (Array.isArray(data) ? (data as R[]) : []).map((r) => ({ kind: r.kind, allergen: r.allergen, severity: r.severity, restriction: r.restriction, detail: r.detail, customAllergy: r.custom_allergy ?? null }));
}

/** The member's own label on a conflict row, trimmed, or null (a standard row, or today's database). */
export const customLabelOf = (row: Pick<ConflictRow, "customAllergy">): string | null => {
  const l = typeof row.customAllergy === "string" ? row.customAllergy.trim() : "";
  return l ? l : null;
};

// GI: a listed allergen, then a "may contain" trace, then a word match (the
// server's own order for one allergy); "allergens unknown" sits after a
// restriction (it never blocks or asks to add anyway) and before a preference.
const RANK: Record<ConflictKind, number> = {
  allergy_confirmed: 0,
  may_contain: 1,
  allergy_check: 2,
  restriction: 3,
  food_allergens_unknown: 4,
  preference: 5,
  allergies_unknown: 9,
};

const severityOf = (s: string | null): AllergySeverity | null => (["mild", "moderate", "severe"] as const).find((x) => x === s) ?? null;

/**
 * One food_conflicts row as a badge. The safety rule (DECISIONS DB-5,
 * DECISIONS_PROFESSIONAL Safety): only `allergy_confirmed` (an allergen tag
 * the client has, from structured data) shows a severity or blocks. A
 * keyword-only match (`allergy_check`) is "Check this", amber, with no
 * severity, whatever the row carries. A restriction is amber ("Add anyway"),
 * a preference is shown only, and `allergies_unknown` shows nothing.
 */
export function badgeFor(row: ConflictRow, restrictionLabel: (r: string) => string = (r) => r): FoodBadge | null {
  switch (row.kind) {
    case "allergy_confirmed": {
      const sev = severityOf(row.severity);
      return {
        kind: "allergy_confirmed",
        tone: "red",
        text: t("Allergy: {name}", { name: t(allergenLabel(row.allergen)).toLowerCase() }),
        blocks: true,
        severity: sev,
        allergen: (row.allergen as Allergen) ?? null,
        restriction: null,
        customAllergy: null,
      };
    }
    case "may_contain": {
      // GI: the label's "may contain" trace of an allergen the member has.
      // Amber (never blocks); like a confirmed allergy it names the allergen
      // and carries the member's own severity (read out, not printed).
      return {
        kind: "may_contain",
        tone: "amber",
        text: t("May contain {name}", { name: t(allergenLabel(row.allergen)).toLowerCase() }),
        blocks: false,
        severity: severityOf(row.severity),
        allergen: (row.allergen as Allergen) ?? null,
        restriction: null,
        customAllergy: null,
      };
    }
    case "food_allergens_unknown":
      // GI: an online food nobody knows the allergens of. Grey, never blocks.
      return { kind: "food_allergens_unknown", tone: "grey", text: t("Allergens unknown"), blocks: false, severity: null, allergen: null, restriction: null, customAllergy: null };
    case "allergy_check": {
      // FQ (decision 20): an "Other" allergy is amber "check this" only, named
      // with the member's own label (isolated, never translated).
      const custom = customLabelOf(row);
      return { kind: "allergy_check", tone: "amber", text: custom ? t("Check: {label}", { label: isolate(custom) }) : t("Check this"), blocks: false, severity: null, allergen: null, restriction: null, customAllergy: custom };
    }
    case "restriction": {
      const label = row.restriction ? t(restrictionLabel(row.restriction)) : "";
      return { kind: "restriction", tone: "amber", text: label ? t("Not {restriction}", { restriction: label.toLowerCase() }) : t("Not compatible"), blocks: false, severity: null, allergen: null, restriction: row.restriction, customAllergy: null };
    }
    case "preference": {
      const label = row.restriction ? t(restrictionLabel(row.restriction)) : t("Preference");
      return { kind: "preference", tone: "soft", text: label, blocks: false, severity: null, allergen: null, restriction: row.restriction, customAllergy: null };
    }
    default:
      return null;
  }
}

/** Every row's badge, most serious first (a confirmed allergy, may contain, check this, a restriction, allergens unknown, a preference). */
export function badgesFor(rows: ConflictRow[], restrictionLabel?: (r: string) => string): FoodBadge[] {
  return rows
    .map((r) => badgeFor(r, restrictionLabel))
    .filter((b): b is FoodBadge => !!b)
    .sort((a, b) => RANK[a.kind] - RANK[b.kind]);
}

/** The one badge a diary row shows: the most serious. */
export function worstBadge(rows: ConflictRow[], restrictionLabel?: (r: string) => string): FoodBadge | null {
  return badgesFor(rows, restrictionLabel)[0] ?? null;
}

/**
 * The Add Food notice for a picked food (null when nothing applies).
 * A confirmed allergy blocks; a restriction lets the client "Add anyway";
 * a keyword match only asks them to check. GI: "may contain" asks them to
 * check, with their severity; "allergens unknown" says so, grey. `words`
 * "ingredients" is for an online food, whose ingredients are matched too, so
 * the check-this line doesn't say it was the name alone.
 */
export function addNotice(
  foodName: string,
  rows: ConflictRow[],
  restrictionLabel?: (r: string) => string,
  words: "name" | "ingredients" = "name"
): { tone: FoodBadge["tone"]; title: string; body: string; blocks: boolean; addAnyway: boolean } | null {
  const all = badgesFor(rows, restrictionLabel);
  const nameOf = restrictionLabel ?? ((r: string) => r);
  const b = all[0];
  if (!b) return null;
  if (b.kind === "allergy_confirmed") {
    const what = t(allergenLabel(b.allergen)).toLowerCase();
    return {
      tone: "red",
      title: t("{food} contains {allergen}", { food: foodName, allergen: what }),
      body: b.severity
        ? t("You're allergic to {allergen} ({severity}). Foods with an allergen you've recorded can't be added. To add it, update your allergies first.", { allergen: what, severity: t(severityLabel(b.severity)).toLowerCase() })
        : t("You're allergic to {allergen}. Foods with an allergen you've recorded can't be added. To add it, update your allergies first.", { allergen: what }),
      blocks: true,
      addAnyway: false,
    };
  }
  if (b.kind === "may_contain") {
    const what = t(allergenLabel(b.allergen)).toLowerCase();
    return {
      tone: "amber",
      title: t("{food} may contain {allergen}", { food: foodName, allergen: what }),
      body: b.severity
        ? t("You're allergic to {allergen} ({severity}). The label says it may contain traces. Check before you eat it.", { allergen: what, severity: t(severityLabel(b.severity)).toLowerCase() })
        : t("You're allergic to {allergen}. The label says it may contain traces. Check before you eat it.", { allergen: what }),
      blocks: false,
      addAnyway: false,
    };
  }
  if (b.kind === "allergy_check") {
    const label = b.customAllergy ? isolate(b.customAllergy) : null;
    let body: string;
    if (words === "ingredients")
      body = label
        ? t("The name or ingredients suggest {food} may contain {label}. Check the label before you eat it.", { food: foodName, label })
        : t("The name or ingredients suggest {food} may contain something you're allergic to. Check the label before you eat it.", { food: foodName });
    else
      body = label
        ? t("The name suggests {food} may contain {label}. Check the ingredients before you eat it.", { food: foodName, label })
        : t("The name suggests {food} may contain something you're allergic to. Check the ingredients before you eat it.", { food: foodName });
    return { tone: "amber", title: t("Check this"), body, blocks: false, addAnyway: false };
  }
  if (b.kind === "restriction") {
    const label = b.restriction ? t(nameOf(b.restriction)) : "";
    const title = label ? t("{food} isn't {restriction}", { food: foodName, restriction: label.toLowerCase() }) : t("{food} isn't compatible", { food: foodName });
    return { tone: "amber", title, body: t("You can still add it."), blocks: false, addAnyway: true };
  }
  if (b.kind === "food_allergens_unknown") {
    return { tone: "grey", title: t("Allergens unknown"), body: t("There's no allergen information for {food}. Check the label before you eat it.", { food: foodName }), blocks: false, addAnyway: false };
  }
  return { tone: "soft", title: b.text, body: t("{food} isn't in line with a dietary preference you set.", { food: foodName }), blocks: false, addAnyway: false };
}

// ---------------------------------------------------------------------------
// Targets a professional set (nutrition_goals.set_by_professional_id / locked)
// ---------------------------------------------------------------------------

export interface ProfessionalTargets {
  goalId: string;
  professionalId: string;
  professionalName: string | null;
  weightGoal: WeightGoalType;
  weeklyRateKg: number;
  targetCalories: number;
  macroSplit: MacroSplit;
  desiredWeightKg: number | null;
  /** nutrition_targets_locked(me): locked by a professional the client is still connected to. */
  locked: boolean;
}

/**
 * The client's goal with the professional's targets in it. Locked, the plan
 * reads as an Existing plan (the client's own locked state, CU3 audit:
 * "Existing plan uses the client's own locked state"). Unlocked, the targets
 * are the client's starting point and stay a Custom plan they can change.
 * The desired weight stays the client's own unless the row carries one.
 */
export function withProfessionalTargets(goal: NutritionGoal, t: ProfessionalTargets): NutritionGoal {
  return {
    ...goal,
    planType: t.locked ? "existing" : goal.planType,
    weightGoal: t.weightGoal,
    weeklyRateKg: t.weeklyRateKg,
    targetCalories: t.targetCalories,
    macroSplit: t.macroSplit,
    desiredWeightKg: t.desiredWeightKg ?? goal.desiredWeightKg,
    desiredWeightConfirmed: t.desiredWeightKg != null ? true : goal.desiredWeightConfirmed,
  };
}

/** Whether the device's goal already shows these targets (nothing to apply). */
export function showsTargets(goal: NutritionGoal, t: ProfessionalTargets): boolean {
  return (
    goal.weightGoal === t.weightGoal &&
    Math.abs((goal.weeklyRateKg || 0) - t.weeklyRateKg) < 0.001 &&
    Math.round(goal.targetCalories) === Math.round(t.targetCalories) &&
    Math.round(goal.macroSplit.proteinPct) === Math.round(t.macroSplit.proteinPct) &&
    Math.round(goal.macroSplit.carbsPct) === Math.round(t.macroSplit.carbsPct) &&
    Math.round(goal.macroSplit.fatPct) === Math.round(t.macroSplit.fatPct) &&
    (!t.locked || goal.planType === "existing")
  );
}

/** ATXG8 (HANDOVER_API): the client's targets are locked by their professional. */
export const TARGETS_LOCKED_MESSAGE = tk("Your targets are set by your professional.");

// ---------------------------------------------------------------------------
// Meal plan card (CU3 "Meal plan from {pro}")
// ---------------------------------------------------------------------------

export interface MealPlanDetailRow {
  dayIndex: number;
  dayLabel: string | null;
  slot: string;
  position: number;
  name: string;
  calories: number | null;
}

const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000);

/**
 * Which plan day today is (1-based, the plan repeating every daysCount days
 * from its start), the week of the plan, and whether it has started.
 */
export function planDay(startsOn: string, today: string, daysCount: number): { started: boolean; dayIndex: number; week: number } {
  const diff = dayNumber(today) - dayNumber(startsOn);
  if (diff < 0) return { started: false, dayIndex: 1, week: 1 };
  const n = Math.max(1, daysCount);
  return { started: true, dayIndex: (diff % n) + 1, week: Math.floor(diff / 7) + 1 };
}

/** The meals (distinct slots) the plan has on a day. */
export function mealsOnDay(rows: MealPlanDetailRow[], dayIndex: number): number {
  return new Set(rows.filter((r) => r.dayIndex === dayIndex).map((r) => r.slot)).size;
}

const SHORT = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", timeZone: "UTC" });
const WEEKDAY = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(appLocale("en-US"), { weekday: "long", timeZone: "UTC" });

/**
 * The card's two lines (CU3: "{meal_plan_name}, week {n}" and "Ends {date} ·
 * {n} meals on Thursday", the weekday being today's). Before the start date:
 * "Starts {date}". No end date: the meals part alone.
 */
export function mealPlanLines(
  p: { name: string; startsOn: string; endsOn: string | null; daysCount: number },
  rows: MealPlanDetailRow[],
  today: string
): { title: string; sub: string } {
  const d = planDay(p.startsOn, today, p.daysCount);
  if (!d.started) return { title: p.name, sub: t("Starts {date}", { date: SHORT(p.startsOn) }) };
  const n = mealsOnDay(rows, d.dayIndex);
  const meals = tn(n, "{n} meal on {day}", "{n} meals on {day}", { day: WEEKDAY(today) });
  return { title: t("{name}, week {n}", { name: p.name, n: d.week }), sub: p.endsOn ? `${t("Ends {date}", { date: SHORT(p.endsOn) })} · ${meals}` : meals };
}

/** Whether an assignment is current on `today` (not ended, not past its end date). */
export function assignmentIsCurrent(a: { endedAt: string | null; endsOn: string | null }, today: string): boolean {
  return !a.endedAt && (!a.endsOn || a.endsOn >= today);
}

// ---------------------------------------------------------------------------
// Feedback on a diary entry (CU4)
// ---------------------------------------------------------------------------

export type Reaction = "like" | "love" | "strong" | "question";

/** The words the professional's quick reactions stand for (the professional's own labels, Journals.tsx). */
export const REACTION_TEXT: Record<Reaction, string> = { like: tk("Great choice."), love: tk("Love this."), strong: tk("Strong choice."), question: tk("Question.") };

/** What the line says after the professional's name: their note, else their reaction's words. */
export function feedbackText(f: { body: string | null; reaction: string | null }): string {
  const body = f.body?.trim();
  if (body) return body;
  const reaction = f.reaction ? REACTION_TEXT[f.reaction as Reaction] : undefined;
  return reaction ? t(reaction) : "";
}

export const REPLY_MAX = 1000;

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
