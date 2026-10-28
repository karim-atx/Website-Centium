// Release 3 · W5 Meal plans and Nutrition (NU1 to NU13), on the Database
// HANDOVER_API.md "Release 3" contract, DB-5 and the follow-up "The targets
// you set":
// - meal_plans / meal_plan_days / meal_plan_items: templates (is_template,
//   client_id null) and each client's copy (made by assign_meal_plan). The
//   owner reads and writes them; writes need can_write_meal_plans() (Full
//   coaching and Nutrition), which RLS checks.
// - assign_meal_plan(p_template_id, p_client_id, p_starts_on, p_ends_on):
//   ATXG7 when the template holds an allergen the client has (only a
//   food_conflicts 'allergy_confirmed' blocks). end_meal_plan_assignment.
// - food_conflicts(client, food | custom food | recipe | custom meal, name):
//   the only source of conflict flags (decision Safety; never keyword
//   matching in the app).
// - food_log_entries (Food diary switch) and food_log_feedback with
//   comment_on_food_entry(p_entry_id, p_body, p_reaction).
// - set_client_nutrition_targets(...) and my_client_nutrition_targets(client)
//   (rows only when the caller set them and is still connected);
//   nutrition_goals itself needs the Progress switch (the client's own weight
//   goal and desired weight); health_metrics weight needs the Weight switch.
// - Release A: set_client_nutrition_targets(..., p_desired_weight_kg) (the
//   professional's own target weight, never inherited, 0 to 500 kg else
//   22023); my_client_nutrition_targets also returns weight_goal,
//   weekly_rate_kg and desired_weight_kg (20261216040000);
//   client_body_basics(client): age in years (never the date of birth), sex,
//   height and activity behind Weight or Progress, NO ROW when neither is
//   shared (20261216030000).
// Narrow casts at the boundary: the generated types (W1-owned) don't name
// every DB-5 table.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import type { Read, Write } from "./clients";
import { shiftIso } from "./home";
import type { ConflictRow, ItemKind, MealSlot, ServingFacts } from "../../components/pro/nutrition/nutritionModel";
import type { ConflictKind } from "../../components/pro/proRules";

const from = (table: string) => supabase.from(table as never);
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });
const failed = (error: unknown, fallback: string): { ok: false; message: string } => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export interface PlanItem {
  id: string;
  dayId: string;
  slot: MealSlot;
  position: number;
  kind: ItemKind | null;
  refId: string | null;
  name: string;
  grams: number | null;
  servings: number | null;
  note: string | null;
  /** Foods and custom foods: per-serving facts. Recipes and meals resolve from the professional's own lists. */
  facts: ServingFacts | null;
}

export interface PlanDay {
  id: string;
  dayIndex: number;
  label: string | null;
  items: PlanItem[];
}

export interface MealPlan {
  id: string;
  name: string;
  clientId: string | null;
  sourcePlanId: string | null;
  isTemplate: boolean;
  kcalTarget: number | null;
  proteinPct: number | null;
  carbsPct: number | null;
  fatPct: number | null;
  daysCount: number;
  notes: string | null;
  updatedAt: string;
  days: PlanDay[];
}

const FOOD_COLS = "name, serving_label, calories, protein_g, carbs_g, fat_g";
const PLAN_SELECT = `id, name, client_id, source_plan_id, is_template, kcal_target, protein_pct, carbs_pct, fat_pct, days_count, notes, updated_at, meal_plan_days(id, day_index, label, meal_plan_items(id, meal_slot, position, grams, servings, note, food_id, custom_food_id, recipe_id, custom_meal_id, foods(${FOOD_COLS}), custom_foods(${FOOD_COLS}), recipes(title), custom_meals(title)))`;

type FoodRow = { name: string; serving_label: string; calories: unknown; protein_g: unknown; carbs_g: unknown; fat_g: unknown } | null;
type ItemRow = {
  id: string;
  meal_slot: MealSlot;
  position: number;
  grams: unknown;
  servings: unknown;
  note: string | null;
  food_id: string | null;
  custom_food_id: string | null;
  recipe_id: string | null;
  custom_meal_id: string | null;
  foods: FoodRow;
  custom_foods: FoodRow;
  recipes: { title: string } | null;
  custom_meals: { title: string } | null;
};
type DayRow = { id: string; day_index: number; label: string | null; meal_plan_items: ItemRow[] | null };
type PlanRow = {
  id: string;
  name: string;
  client_id: string | null;
  source_plan_id: string | null;
  is_template: boolean;
  kcal_target: unknown;
  protein_pct: unknown;
  carbs_pct: unknown;
  fat_pct: unknown;
  days_count: number;
  notes: string | null;
  updated_at: string;
  meal_plan_days: DayRow[] | null;
};

const factsOf = (f: FoodRow): ServingFacts | null =>
  f ? { servingLabel: f.serving_label, per: { kcal: num(f.calories) ?? 0, p: num(f.protein_g) ?? 0, c: num(f.carbs_g) ?? 0, f: num(f.fat_g) ?? 0 } } : null;

function toItem(dayId: string, r: ItemRow): PlanItem {
  const kind: ItemKind | null = r.recipe_id ? "recipe" : r.custom_meal_id ? "custom_meal" : r.food_id ? "food" : r.custom_food_id ? "custom_food" : null;
  return {
    id: r.id,
    dayId,
    slot: r.meal_slot,
    position: r.position,
    kind,
    refId: r.recipe_id ?? r.custom_meal_id ?? r.food_id ?? r.custom_food_id,
    // A deleted source (ON DELETE SET NULL) leaves an item with no name.
    name: r.recipes?.title ?? r.custom_meals?.title ?? r.foods?.name ?? r.custom_foods?.name ?? "Removed item",
    grams: num(r.grams),
    servings: num(r.servings),
    note: r.note,
    facts: r.food_id ? factsOf(r.foods) : r.custom_food_id ? factsOf(r.custom_foods) : null,
  };
}

function toPlan(r: PlanRow): MealPlan {
  return {
    id: r.id,
    name: r.name,
    clientId: r.client_id,
    sourcePlanId: r.source_plan_id,
    isTemplate: r.is_template,
    kcalTarget: num(r.kcal_target),
    proteinPct: num(r.protein_pct),
    carbsPct: num(r.carbs_pct),
    fatPct: num(r.fat_pct),
    daysCount: r.days_count,
    notes: r.notes,
    updatedAt: r.updated_at,
    days: (r.meal_plan_days ?? [])
      .map((d) => ({ id: d.id, dayIndex: d.day_index, label: d.label, items: (d.meal_plan_items ?? []).map((i) => toItem(d.id, i)).sort((a, b) => a.position - b.position) }))
      .sort((a, b) => a.dayIndex - b.dayIndex),
  };
}

/** NU1: my templates, newest first, with their days and items (for the kcal line). */
export async function fetchTemplates(me: string): Promise<Read<MealPlan[]>> {
  const { data, error } = await from("meal_plans").select(PLAN_SELECT).eq("professional_id", me).eq("is_template", true).order("updated_at", { ascending: false });
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as PlanRow[]).map(toPlan) };
}

/** NU2: one plan (a template or a client's copy) in full. */
export async function fetchPlan(planId: string): Promise<Read<MealPlan | null>> {
  const { data, error } = await from("meal_plans").select(PLAN_SELECT).eq("id", planId).maybeSingle();
  if (error) return readFail(error);
  return { ok: true, data: data ? toPlan(data as unknown as PlanRow) : null };
}

export interface Assignment {
  id: string;
  planId: string;
  templateId: string | null;
  clientId: string;
  name: string;
  startsOn: string;
  endsOn: string | null;
}

/** NU1 Assigned, and the template's client counts: my active assignments. */
export async function fetchAssignments(me: string): Promise<Read<Assignment[]>> {
  const { data, error } = await from("meal_plan_assignments")
    .select("id, meal_plan_id, template_id, client_id, starts_on, ends_on, meal_plans:meal_plan_id(name)")
    .eq("professional_id", me)
    .is("ended_at", null)
    .order("assigned_at", { ascending: false });
  if (error) return readFail(error);
  type Row = { id: string; meal_plan_id: string; template_id: string | null; client_id: string; starts_on: string; ends_on: string | null; meal_plans: { name: string } | null };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => ({ id: r.id, planId: r.meal_plan_id, templateId: r.template_id, clientId: r.client_id, name: r.meal_plans?.name ?? "", startsOn: r.starts_on, endsOn: r.ends_on })),
  };
}

/** The assignment behind a client's copy (its start date names the days). */
export async function fetchAssignmentForPlan(planId: string): Promise<Read<(Assignment & { endedAt: string | null }) | null>> {
  const { data, error } = await from("meal_plan_assignments")
    .select("id, meal_plan_id, template_id, client_id, starts_on, ends_on, ended_at")
    .eq("meal_plan_id", planId)
    .order("assigned_at", { ascending: false })
    .limit(1);
  if (error) return readFail(error);
  type Row = { id: string; meal_plan_id: string; template_id: string | null; client_id: string; starts_on: string; ends_on: string | null; ended_at: string | null };
  const r = ((data ?? []) as unknown as Row[])[0];
  return { ok: true, data: r ? { id: r.id, planId: r.meal_plan_id, templateId: r.template_id, clientId: r.client_id, name: "", startsOn: r.starts_on, endsOn: r.ends_on, endedAt: r.ended_at } : null };
}

/** Home "Meal plans ending soon" (HANDOVER i): ends within 14 days, not ended. */
export async function fetchMealPlansEnding(me: string, today: string): Promise<Read<Assignment[]>> {
  const { data, error } = await from("meal_plan_assignments")
    .select("id, meal_plan_id, template_id, client_id, starts_on, ends_on, meal_plans:meal_plan_id(name)")
    .eq("professional_id", me)
    .is("ended_at", null)
    .gte("ends_on", today)
    .lte("ends_on", shiftIso(today, 14))
    .order("ends_on", { ascending: true });
  if (error) return readFail(error);
  type Row = { id: string; meal_plan_id: string; template_id: string | null; client_id: string; starts_on: string; ends_on: string | null; meal_plans: { name: string } | null };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => ({ id: r.id, planId: r.meal_plan_id, templateId: r.template_id, clientId: r.client_id, name: r.meal_plans?.name ?? "", startsOn: r.starts_on, endsOn: r.ends_on })),
  };
}

const NAME_MAX = 80;

/** A new template with its days (labels left empty: the builder names them). */
export async function createTemplate(me: string, name: string, daysCount: number): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const n = name.trim();
  if (!n) return { ok: false, message: "Name the meal plan first." };
  if (n.length > NAME_MAX) return { ok: false, message: `Keep the name under ${NAME_MAX} characters.` };
  // is_template defaults to true and client_id to null (a template); authenticated may not write either column (column grants).
  const { data, error } = await from("meal_plans").insert({ professional_id: me, name: n, days_count: daysCount } as never).select("id").single();
  if (error || !data) return failed(error, "Couldn't create the meal plan. Try again.");
  const id = (data as unknown as { id: string }).id;
  const days = Array.from({ length: daysCount }, (_, i) => ({ meal_plan_id: id, day_index: i + 1 }));
  const d = await from("meal_plan_days").insert(days as never);
  if (d.error) {
    await from("meal_plans").delete().eq("id", id);
    return failed(d.error, "Couldn't create the meal plan. Try again.");
  }
  return { ok: true, id };
}

export interface PlanMetaPatch {
  name?: string;
  kcalTarget?: number | null;
  proteinPct?: number | null;
  carbsPct?: number | null;
  fatPct?: number | null;
}

export async function updatePlanMeta(planId: string, patch: PlanMetaPatch): Promise<Write> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return { ok: false, message: "Name the meal plan first." };
    if (n.length > NAME_MAX) return { ok: false, message: `Keep the name under ${NAME_MAX} characters.` };
    row.name = n;
  }
  if (patch.kcalTarget !== undefined) row.kcal_target = patch.kcalTarget;
  if (patch.proteinPct !== undefined) row.protein_pct = patch.proteinPct;
  if (patch.carbsPct !== undefined) row.carbs_pct = patch.carbsPct;
  if (patch.fatPct !== undefined) row.fat_pct = patch.fatPct;
  const { error } = await from("meal_plans").update(row as never).eq("id", planId);
  return error ? failed(error, "Couldn't save the meal plan. Try again.") : { ok: true };
}

/** Deleting a template keeps every client's copy (template_id is set null). */
export async function deleteTemplate(planId: string): Promise<Write> {
  const { error } = await from("meal_plans").delete().eq("id", planId).eq("is_template", true);
  return error ? failed(error, "Couldn't delete the meal plan. Try again.") : { ok: true };
}

export interface ItemRef {
  kind: ItemKind;
  refId: string;
}

const refColumns = (ref: ItemRef) => ({
  food_id: ref.kind === "food" ? ref.refId : null,
  custom_food_id: ref.kind === "custom_food" ? ref.refId : null,
  recipe_id: ref.kind === "recipe" ? ref.refId : null,
  custom_meal_id: ref.kind === "custom_meal" ? ref.refId : null,
});

export interface ItemDraft {
  ref: ItemRef;
  slot: MealSlot;
  grams: number | null;
  servings: number | null;
}

/** Appends an item at the end of its meal on a plan day. */
export async function addItem(dayId: string, d: ItemDraft): Promise<Write> {
  const { data: last } = await from("meal_plan_items").select("position").eq("meal_plan_day_id", dayId).eq("meal_slot", d.slot).order("position", { ascending: false }).limit(1);
  const position = (((last ?? []) as unknown as { position: number }[])[0]?.position ?? -1) + 1;
  const { error } = await from("meal_plan_items").insert({ meal_plan_day_id: dayId, meal_slot: d.slot, position, grams: d.grams, servings: d.servings, ...refColumns(d.ref) } as never);
  return error ? failed(error, "Couldn't add that. Try again.") : { ok: true };
}

/** A swap: the item keeps its place and takes the new food, recipe or meal. */
export async function replaceItem(itemId: string, d: ItemDraft): Promise<Write> {
  const { error } = await from("meal_plan_items").update({ meal_slot: d.slot, grams: d.grams, servings: d.servings, ...refColumns(d.ref) } as never).eq("id", itemId);
  return error ? failed(error, "Couldn't swap that. Try again.") : { ok: true };
}

export async function deleteItem(itemId: string): Promise<Write> {
  const { error } = await from("meal_plan_items").delete().eq("id", itemId);
  return error ? failed(error, "Couldn't remove that. Try again.") : { ok: true };
}

/** "Also add to the template": the template's day with the same index. */
export async function templateDayId(templateId: string, dayIndex: number): Promise<string | null> {
  const { data } = await from("meal_plan_days").select("id").eq("meal_plan_id", templateId).eq("day_index", dayIndex).limit(1);
  return ((data ?? []) as unknown as { id: string }[])[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Conflicts and assigning
// ---------------------------------------------------------------------------

const ALLERGEN_MSG = "This plan contains an allergen the client has.";

export async function fetchConflicts(clientId: string, ref: ItemRef | null, name: string | null): Promise<ConflictRow[] | null> {
  const cols = ref ? refColumns(ref) : { food_id: null, custom_food_id: null, recipe_id: null, custom_meal_id: null };
  const { data, error } = await rpc("food_conflicts", {
    p_client_id: clientId,
    p_food_id: cols.food_id,
    p_custom_food_id: cols.custom_food_id,
    p_recipe_id: cols.recipe_id,
    p_custom_meal_id: cols.custom_meal_id,
    p_name: name,
  });
  if (error) return null;
  type Row = { kind: ConflictKind; allergen: string | null; severity: ConflictRow["severity"]; restriction: string | null; detail: string | null };
  return ((data ?? []) as Row[]).map((r) => ({ kind: r.kind, allergen: r.allergen, severity: r.severity, restriction: r.restriction, detail: r.detail }));
}

export async function assignMealPlan(templateId: string, clientId: string, startsOn: string, endsOn: string | null): Promise<{ ok: true; planId: string } | { ok: false; message: string; blocked?: boolean }> {
  const { data, error } = await rpc("assign_meal_plan", { p_template_id: templateId, p_client_id: clientId, p_starts_on: startsOn, p_ends_on: endsOn });
  if (error) {
    if (error.code === "ATXG7") return { ok: false, message: ALLERGEN_MSG, blocked: true };
    if (error.code === "ATX12") return { ok: false, message: "Nutrition coaching isn't on for this client." };
    if (error.code === "23514") return { ok: false, message: "The end date must be after the start." };
    return failed(error, "Couldn't assign the meal plan. Try again.");
  }
  return { ok: true, planId: String(data) };
}

export async function endAssignment(assignmentId: string): Promise<Write> {
  const { error } = await rpc("end_meal_plan_assignment", { p_assignment_id: assignmentId });
  return error ? failed(error, "Couldn't end the meal plan. Try again.") : { ok: true };
}

// ---------------------------------------------------------------------------
// Food journal (Food diary switch)
// ---------------------------------------------------------------------------

export interface DiaryEntry {
  id: string;
  clientId: string;
  date: string;
  slot: MealSlot;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  foodId: string | null;
  customFoodId: string | null;
  eatenAt: string | null;
  createdAt: string;
}

export type Reaction = "like" | "love" | "strong" | "question";

export interface Feedback {
  id: string;
  entryId: string;
  clientId: string;
  body: string | null;
  reaction: Reaction | null;
  clientReply: string | null;
  createdAt: string;
  repliedAt: string | null;
}

type EntryRow = {
  id: string;
  user_id: string;
  logged_date: string;
  meal: MealSlot;
  name: string;
  calories: unknown;
  protein_g: unknown;
  carbs_g: unknown;
  fat_g: unknown;
  food_id: string | null;
  custom_food_id: string | null;
  eaten_at: string | null;
  created_at: string;
};
const toEntry = (r: EntryRow): DiaryEntry => ({
  id: r.id,
  clientId: r.user_id,
  date: r.logged_date,
  slot: r.meal,
  name: r.name,
  kcal: num(r.calories) ?? 0,
  protein: num(r.protein_g) ?? 0,
  carbs: num(r.carbs_g) ?? 0,
  fat: num(r.fat_g) ?? 0,
  foodId: r.food_id,
  customFoodId: r.custom_food_id,
  eatenAt: r.eaten_at,
  createdAt: r.created_at,
});
const ENTRY_COLS = "id, user_id, logged_date, meal, name, calories, protein_g, carbs_g, fat_g, food_id, custom_food_id, eaten_at, created_at";

/** Entries of the clients who share their food diary (RLS returns nothing for the rest). */
export async function fetchDiary(clientIds: string[], since: string, until: string): Promise<Read<DiaryEntry[]>> {
  if (!clientIds.length) return { ok: true, data: [] };
  const { data, error } = await from("food_log_entries").select(ENTRY_COLS).in("user_id", clientIds).gte("logged_date", since).lte("logged_date", until).order("created_at", { ascending: true });
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as EntryRow[]).map(toEntry) };
}

const toFeedback = (r: { id: string; entry_id: string; client_id: string; body: string | null; reaction: Reaction | null; client_reply: string | null; created_at: string; replied_at: string | null }): Feedback => ({
  id: r.id,
  entryId: r.entry_id,
  clientId: r.client_id,
  body: r.body,
  reaction: r.reaction,
  clientReply: r.client_reply,
  createdAt: r.created_at,
  repliedAt: r.replied_at,
});

/** My feedback on these clients' entries. */
export async function fetchMyFeedback(me: string, clientIds: string[]): Promise<Read<Feedback[]>> {
  if (!clientIds.length) return { ok: true, data: [] };
  const { data, error } = await from("food_log_feedback").select("id, entry_id, client_id, body, reaction, client_reply, created_at, replied_at").eq("professional_id", me).in("client_id", clientIds).order("created_at", { ascending: true });
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as Parameters<typeof toFeedback>[0][]).map(toFeedback) };
}

export const FEEDBACK_MAX = 1000;

export async function commentOnEntry(entryId: string, body: string | null, reaction: Reaction | null): Promise<Write> {
  const b = body?.trim() || null;
  if (!b && !reaction) return { ok: false, message: "Write something first." };
  if (b && b.length > FEEDBACK_MAX) return { ok: false, message: `Keep it under ${FEEDBACK_MAX} characters.` };
  const { error } = await rpc("comment_on_food_entry", { p_entry_id: entryId, p_body: b, p_reaction: reaction });
  return error ? failed(error, "Couldn't send that. Try again.") : { ok: true };
}

// ---------------------------------------------------------------------------
// Targets (NU8)
// ---------------------------------------------------------------------------

export interface MyTargets {
  goalId: string;
  calories: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  /** Release A: the weight goal, rate and target weight I set (never hidden from me, recovery mode or not). */
  weightGoal: "lose" | "gain" | "maintain" | null;
  weeklyRateKg: number | null;
  desiredWeightKg: number | null;
  locked: boolean;
  setAt: string;
}

/** my_client_nutrition_targets: the targets I set, while I'm still connected; null otherwise. */
export async function fetchMyTargets(clientId: string): Promise<Read<MyTargets | null>> {
  const { data, error } = await rpc("my_client_nutrition_targets", { p_client_id: clientId });
  if (error) return readFail(error);
  type Row = { goal_id: string; target_calories: unknown; protein_pct: unknown; carbs_pct: unknown; fat_pct: unknown; weight_goal: MyTargets["weightGoal"]; weekly_rate_kg: unknown; desired_weight_kg: unknown; locked: boolean; set_at: string };
  const r = ((data ?? []) as Row[])[0];
  if (!r) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      goalId: r.goal_id,
      calories: num(r.target_calories) ?? 0,
      proteinPct: num(r.protein_pct) ?? 0,
      carbsPct: num(r.carbs_pct) ?? 0,
      fatPct: num(r.fat_pct) ?? 0,
      weightGoal: r.weight_goal ?? null,
      weeklyRateKg: num(r.weekly_rate_kg),
      desiredWeightKg: num(r.desired_weight_kg),
      locked: !!r.locked,
      setAt: r.set_at,
    },
  };
}

export interface BodyBasics {
  ageYears: number | null;
  sex: "female" | "male" | "other" | null;
  heightCm: number | null;
  activityLevel: "sedentary" | "light" | "moderate" | "very_active" | "athlete" | null;
}

/**
 * client_body_basics (Release A, W5-3c): the four TDEE inputs behind the
 * client's Weight or Progress switch. Null when there's no row (neither is
 * shared): never four nulls, so which ones a client filled in stays theirs.
 */
export async function fetchBodyBasics(clientId: string): Promise<Read<BodyBasics | null>> {
  const { data, error } = await rpc("client_body_basics", { p_client_id: clientId });
  if (error) return readFail(error);
  type Row = { age_years: unknown; sex: BodyBasics["sex"]; height_cm: unknown; activity_level: BodyBasics["activityLevel"] };
  const r = ((data ?? []) as Row[])[0];
  if (!r) return { ok: true, data: null };
  return { ok: true, data: { ageYears: num(r.age_years), sex: r.sex ?? null, heightCm: num(r.height_cm), activityLevel: r.activity_level ?? null } };
}

export interface ClientGoal {
  weightGoal: "lose" | "gain" | "maintain";
  weeklyRateKg: number;
  desiredWeightKg: number | null;
  calories: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  setByProfessionalId: string | null;
  locked: boolean;
  createdAt: string;
}

/**
 * The client's current nutrition_goals row (Progress switch): their weight
 * goal and rate. Not their target weight: since Database #41
 * (20261216100000) desired_weight_kg is outside the table's select grant
 * (naming it fails the whole read), and nobody reads a client's own target
 * weight off the table; the professional's own is my_client_nutrition_targets.
 */
export async function fetchClientGoal(clientId: string): Promise<Read<ClientGoal | null>> {
  const { data, error } = await from("nutrition_goals")
    .select("weight_goal, weekly_rate_kg, target_calories, protein_pct, carbs_pct, fat_pct, set_by_professional_id, locked, created_at")
    .eq("user_id", clientId)
    .eq("is_current", true)
    .limit(1);
  if (error) return readFail(error);
  type Row = { weight_goal: ClientGoal["weightGoal"]; weekly_rate_kg: unknown; target_calories: unknown; protein_pct: unknown; carbs_pct: unknown; fat_pct: unknown; set_by_professional_id: string | null; locked: boolean; created_at: string };
  const r = ((data ?? []) as unknown as Row[])[0];
  if (!r) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      weightGoal: r.weight_goal,
      weeklyRateKg: num(r.weekly_rate_kg) ?? 0,
      desiredWeightKg: null,
      calories: num(r.target_calories) ?? 0,
      proteinPct: num(r.protein_pct) ?? 0,
      carbsPct: num(r.carbs_pct) ?? 0,
      fatPct: num(r.fat_pct) ?? 0,
      setByProfessionalId: r.set_by_professional_id,
      locked: !!r.locked,
      createdAt: r.created_at,
    },
  };
}

/** The client's weigh-ins (Weight switch), one per day (the latest), oldest first. */
export async function fetchWeightSeries(clientId: string, since: string): Promise<Read<Record<string, number>>> {
  const { data, error } = await from("health_metrics").select("value, recorded_at").eq("user_id", clientId).eq("metric_type", "weight").gte("recorded_at", `${since}T00:00:00`).order("recorded_at", { ascending: true });
  if (error) return readFail(error);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as unknown as { value: unknown; recorded_at: string }[]) {
    const d = new Date(r.recorded_at);
    const p = (n: number) => String(n).padStart(2, "0");
    const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const v = num(r.value);
    if (v !== null) out[day] = v;
  }
  return { ok: true, data: out };
}

export interface TargetsDraft {
  calories: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  weightGoal: "lose" | "gain" | "maintain" | null;
  weeklyRateKg: number | null;
  /** Release A: my own target weight for the client; null sets none (the database never inherits one). */
  desiredWeightKg: number | null;
  lock: boolean;
}

export async function saveTargets(clientId: string, d: TargetsDraft): Promise<Write> {
  if (!(d.calories > 0)) return { ok: false, message: "Set a daily target first." };
  const { error } = await rpc("set_client_nutrition_targets", {
    p_client_id: clientId,
    p_target_calories: d.calories,
    p_protein_pct: d.proteinPct,
    p_carbs_pct: d.carbsPct,
    p_fat_pct: d.fatPct,
    p_weight_goal: d.weightGoal,
    p_weekly_rate_kg: d.weeklyRateKg,
    p_lock: d.lock,
    p_desired_weight_kg: d.desiredWeightKg,
  });
  if (error?.code === "22023") return { ok: false, message: "Enter a target weight between 1 and 500 kg." };
  if (error?.code === "ATX12") return { ok: false, message: "Nutrition coaching isn't on for this client." };
  if (error?.code === "23514") return { ok: false, message: "Protein, carbs and fat must add up to 100%." };
  return error ? failed(error, "Couldn't save the targets. Try again.") : { ok: true };
}
