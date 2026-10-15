// Release 3 · W7 (CU3, CU4, CU13 to CU15): the client's side of what a
// professional adds to Food. Pure logic only (no Supabase), so it is unit
// tested: the allergen list, the conflict-kind -> badge mapping (DECISIONS
// DB-5 and DECISIONS_PROFESSIONAL Safety), the professional-set targets
// overlay and the meal plan card's summary.

import type { MacroSplit, NutritionGoal, WeightGoalType } from "../../types";

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
  { value: "tree_nuts", label: "Tree nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "milk", label: "Milk" },
  { value: "eggs", label: "Eggs" },
  { value: "cereals_gluten", label: "Gluten (cereals)" },
  { value: "soya", label: "Soya" },
  { value: "fish", label: "Fish" },
  { value: "crustaceans", label: "Crustaceans" },
  { value: "molluscs", label: "Molluscs" },
  { value: "sesame", label: "Sesame" },
  { value: "celery", label: "Celery" },
  { value: "mustard", label: "Mustard" },
  { value: "lupin", label: "Lupin" },
  { value: "sulphites", label: "Sulphites" },
];

export const SEVERITIES: { value: AllergySeverity; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
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
export function allergyLine(allergies: MyAllergy[], sharedWith: string[]): string | null {
  if (allergies.length === 0) return null;
  const order = (a: Allergen) => ALLERGENS.findIndex((x) => x.value === a);
  const list = [...allergies]
    .sort((x, y) => order(x.allergen) - order(y.allergen))
    .map((a) => `${allergenLabel(a.allergen)} (${a.severity})`)
    .join(", ");
  const head = `${allergies.length === 1 ? "Allergy" : "Allergies"}: ${list}.`;
  if (sharedWith.length === 0) return head;
  return `${head} Shared with ${joinNames(sharedWith)}.`;
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---------------------------------------------------------------------------
// food_conflicts -> what the client sees
// ---------------------------------------------------------------------------

export type ConflictKind = "allergy_confirmed" | "allergy_check" | "restriction" | "preference" | "allergies_unknown";

export interface ConflictRow {
  kind: ConflictKind | string;
  allergen: string | null;
  severity: string | null;
  restriction: string | null;
  detail: string | null;
}

export interface FoodBadge {
  kind: ConflictKind;
  /** red: a confirmed allergy (structured data). amber: check this / a restriction. soft: a preference. */
  tone: "red" | "amber" | "soft";
  text: string;
  /** Only a confirmed allergy blocks adding the food. */
  blocks: boolean;
  /** Only a confirmed allergy carries a severity, and only from the client's own row. */
  severity: AllergySeverity | null;
  /** The allergen, for a confirmed allergy (never named for a keyword match's severity). */
  allergen: Allergen | null;
  restriction: string | null;
}

const RANK: Record<ConflictKind, number> = { allergy_confirmed: 0, allergy_check: 1, restriction: 2, preference: 3, allergies_unknown: 9 };

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
      const sev = (["mild", "moderate", "severe"] as const).find((s) => s === row.severity) ?? null;
      return {
        kind: "allergy_confirmed",
        tone: "red",
        text: `Allergy: ${allergenLabel(row.allergen).toLowerCase()}`,
        blocks: true,
        severity: sev,
        allergen: (row.allergen as Allergen) ?? null,
        restriction: null,
      };
    }
    case "allergy_check":
      return { kind: "allergy_check", tone: "amber", text: "Check this", blocks: false, severity: null, allergen: null, restriction: null };
    case "restriction": {
      const label = row.restriction ? restrictionLabel(row.restriction) : "";
      return { kind: "restriction", tone: "amber", text: label ? `Not ${label.toLowerCase()}` : "Not compatible", blocks: false, severity: null, allergen: null, restriction: row.restriction };
    }
    case "preference": {
      const label = row.restriction ? restrictionLabel(row.restriction) : "Preference";
      return { kind: "preference", tone: "soft", text: label, blocks: false, severity: null, allergen: null, restriction: row.restriction };
    }
    default:
      return null;
  }
}

/** Every row's badge, most serious first (a confirmed allergy, then check this, a restriction, a preference). */
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
 * a keyword match only asks them to check.
 */
export function addNotice(
  foodName: string,
  rows: ConflictRow[],
  restrictionLabel?: (r: string) => string
): { tone: "red" | "amber" | "soft"; title: string; body: string; blocks: boolean; addAnyway: boolean } | null {
  const all = badgesFor(rows, restrictionLabel);
  const b = all[0];
  if (!b) return null;
  if (b.kind === "allergy_confirmed") {
    const what = allergenLabel(b.allergen).toLowerCase();
    return {
      tone: "red",
      title: `${foodName} contains ${what}`,
      body: `You're allergic to ${what}${b.severity ? ` (${b.severity})` : ""}. Foods with an allergen you have can't be added. To add it, update your allergies first.`,
      blocks: true,
      addAnyway: false,
    };
  }
  if (b.kind === "allergy_check") {
    return {
      tone: "amber",
      title: "Check this",
      body: `The name suggests ${foodName} may contain something you're allergic to. Check the ingredients before you eat it.`,
      blocks: false,
      addAnyway: false,
    };
  }
  if (b.kind === "restriction") {
    return { tone: "amber", title: `${foodName} isn't ${b.text.replace(/^Not /, "")}`, body: "You can still add it.", blocks: false, addAnyway: true };
  }
  return { tone: "soft", title: b.text, body: `${foodName} isn't in line with a dietary preference you set.`, blocks: false, addAnyway: false };
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
export const TARGETS_LOCKED_MESSAGE = "Your targets are set by your professional.";

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

const SHORT = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const WEEKDAY = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

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
  if (!d.started) return { title: p.name, sub: `Starts ${SHORT(p.startsOn)}` };
  const n = mealsOnDay(rows, d.dayIndex);
  const meals = `${n} meal${n === 1 ? "" : "s"} on ${WEEKDAY(today)}`;
  return { title: `${p.name}, week ${d.week}`, sub: p.endsOn ? `Ends ${SHORT(p.endsOn)} · ${meals}` : meals };
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
export const REACTION_TEXT: Record<Reaction, string> = { like: "Great choice.", love: "Love this.", strong: "Strong choice.", question: "Question." };

/** What the line says after the professional's name: their note, else their reaction's words. */
export function feedbackText(f: { body: string | null; reaction: string | null }): string {
  const body = f.body?.trim();
  if (body) return body;
  return (f.reaction && REACTION_TEXT[f.reaction as Reaction]) || "";
}

export const REPLY_MAX = 1000;

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
