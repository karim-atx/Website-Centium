// Release 3 · W7 (CU3, CU4, CU13 to CU15): the client's own reads and writes
// for what a professional adds to Food. Documented backend only (HANDOVER_API
// "Release 3 · DB-5"): nutrition_goals (own row; set_by_professional_id,
// locked), nutrition_targets_locked(p_user), meal_plan_assignments and
// meal_plans (the client's own), meal_plan_detail(p_meal_plan_id),
// food_log_feedback (own) and reply_to_food_feedback(p_feedback_id, p_reply),
// allergies (own; insert allergen/severity/note/user_id, update
// severity/note, delete), food_conflicts(...). The pure rules are in
// clientNutritionModel.ts.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Allergen, AllergySeverity, ConflictRow, MealPlanDetailRow, MyAllergy, ProfessionalTargets } from "./clientNutritionModel";
import { allergyDiff, assignmentIsCurrent } from "./clientNutritionModel";
import type { WeightGoalType } from "../../types";

export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean };
export type Write = { ok: true } | { ok: false; message: string };

const readFail = (error: unknown): { ok: false; offline: boolean } => {
  if (!isOffline(error)) console.error("[nutrition] read failed:", (error as { message?: string })?.message ?? error);
  return { ok: false, offline: isOffline(error) };
};
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** First names of the client's connected professionals (connected_professional_summary is scoped to the caller). */
async function professionalNames(ids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { data } = await supabase.from("connected_professional_summary").select("id, first_name").in("id", uniq);
  return new Map((data ?? []).filter((r) => r.id).map((r) => [r.id as string, (r.first_name ?? "").trim()]));
}

// ---------------------------------------------------------------------------
// Targets a professional set (CU3)
// ---------------------------------------------------------------------------

// my_nutrition_targets (Release A) isn't in the generated types (they read production).
type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
const rpcUntyped = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };

/**
 * The client's current goal row when a professional set it, with whether it
 * is locked (nutrition_targets_locked: locked by a professional the client is
 * still connected to). Null when the current row is the client's own, or
 * there is none (every account without a professional).
 *
 * Release A (20261216040000): the targets come from my_nutrition_targets(),
 * which returns desired_weight_kg as NULL in recovery-sensitive mode (the
 * professional's target weight is hidden from the client, never the other
 * way round). Reading nutrition_goals directly would show it, so the one
 * remaining direct read is the setter's id (for the name), not the weight.
 */
export async function fetchProfessionalTargets(userId: string): Promise<Read<ProfessionalTargets | null>> {
  const { data, error } = await rpcUntyped.rpc("my_nutrition_targets");
  if (error) return readFail(error);
  const r = ((data ?? []) as {
    goal_id: string;
    weight_goal: WeightGoalType;
    weekly_rate_kg: unknown;
    target_calories: unknown;
    protein_pct: unknown;
    carbs_pct: unknown;
    fat_pct: unknown;
    desired_weight_kg: unknown;
    set_by_professional: boolean;
    locked: boolean;
  }[])[0];
  if (!r || !r.set_by_professional) return { ok: true, data: null };
  const setter = await supabase.from("nutrition_goals").select("set_by_professional_id").eq("id", r.goal_id).maybeSingle();
  if (setter.error) return readFail(setter.error);
  const proId = (setter.data as { set_by_professional_id: string | null } | null)?.set_by_professional_id ?? null;
  if (!proId) return { ok: true, data: null };
  const [lockRes, names] = await Promise.all([
    supabase.rpc("nutrition_targets_locked", { p_user: userId }),
    professionalNames([proId]),
  ]);
  if (lockRes.error) return readFail(lockRes.error);
  return {
    ok: true,
    data: {
      goalId: r.goal_id,
      professionalId: proId,
      professionalName: names.get(proId) || null,
      weightGoal: r.weight_goal,
      weeklyRateKg: num(r.weekly_rate_kg) ?? 0,
      targetCalories: Math.round(num(r.target_calories) ?? 0),
      macroSplit: { proteinPct: num(r.protein_pct) ?? 0, carbsPct: num(r.carbs_pct) ?? 0, fatPct: num(r.fat_pct) ?? 0 },
      desiredWeightKg: num(r.desired_weight_kg),
      locked: !!lockRes.data,
    },
  };
}

// ---------------------------------------------------------------------------
// Meal plan (CU3 "Meal plan from {pro}")
// ---------------------------------------------------------------------------

export interface MyMealPlan {
  assignmentId: string;
  mealPlanId: string;
  name: string;
  daysCount: number;
  startsOn: string;
  endsOn: string | null;
  professionalId: string;
  professionalName: string | null;
  rows: MealPlanDetailRow[];
}

/** The client's current meal plan assignment (the most recent one), with its days from meal_plan_detail. */
export async function fetchMyMealPlan(userId: string, today: string): Promise<Read<MyMealPlan | null>> {
  const { data, error } = await supabase
    .from("meal_plan_assignments")
    .select("id, meal_plan_id, professional_id, starts_on, ends_on, ended_at, assigned_at")
    .eq("client_id", userId)
    .is("ended_at", null)
    .order("assigned_at", { ascending: false });
  if (error) return readFail(error);
  type A = { id: string; meal_plan_id: string; professional_id: string; starts_on: string; ends_on: string | null; ended_at: string | null };
  const a = ((data ?? []) as unknown as A[]).find((x) => assignmentIsCurrent({ endedAt: x.ended_at, endsOn: x.ends_on }, today));
  if (!a) return { ok: true, data: null };
  const [planRes, detailRes, names] = await Promise.all([
    supabase.from("meal_plans").select("id, name, days_count").eq("id", a.meal_plan_id).maybeSingle(),
    supabase.rpc("meal_plan_detail", { p_meal_plan_id: a.meal_plan_id }),
    professionalNames([a.professional_id]),
  ]);
  if (planRes.error) return readFail(planRes.error);
  if (detailRes.error) return readFail(detailRes.error);
  const plan = planRes.data as unknown as { id: string; name: string; days_count: number } | null;
  if (!plan) return { ok: true, data: null };
  type D = { day_index: number; day_label: string | null; meal_slot: string; item_position: number; name: string; calories: unknown };
  return {
    ok: true,
    data: {
      assignmentId: a.id,
      mealPlanId: a.meal_plan_id,
      name: plan.name,
      daysCount: plan.days_count,
      startsOn: a.starts_on,
      endsOn: a.ends_on,
      professionalId: a.professional_id,
      professionalName: names.get(a.professional_id) || null,
      rows: ((detailRes.data ?? []) as unknown as D[]).map((d) => ({
        dayIndex: d.day_index,
        dayLabel: d.day_label,
        slot: d.meal_slot,
        position: d.item_position,
        name: d.name,
        calories: num(d.calories),
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Allergies (CU13 / CU15)
// ---------------------------------------------------------------------------

export async function fetchMyAllergies(userId: string): Promise<Read<MyAllergy[]>> {
  const { data, error } = await supabase.from("allergies").select("allergen, severity").eq("user_id", userId);
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as { allergen: Allergen; severity: AllergySeverity }[]).map((r) => ({ allergen: r.allergen, severity: r.severity })) };
}

/** Saves the sheet: inserts what was ticked, updates changed severities, deletes what was unticked. */
export async function saveMyAllergies(userId: string, before: MyAllergy[], after: MyAllergy[]): Promise<Write> {
  const d = allergyDiff(before, after);
  const fail = (error: unknown): Write => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't save your allergies. Try again." });
  if (d.insert.length) {
    const { error } = await supabase.from("allergies").insert(d.insert.map((a) => ({ user_id: userId, allergen: a.allergen, severity: a.severity })));
    if (error) return fail(error);
  }
  for (const a of d.update) {
    const { error } = await supabase.from("allergies").update({ severity: a.severity }).eq("user_id", userId).eq("allergen", a.allergen);
    if (error) return fail(error);
  }
  if (d.remove.length) {
    const { error } = await supabase.from("allergies").delete().eq("user_id", userId).in("allergen", d.remove);
    if (error) return fail(error);
  }
  return { ok: true };
}

/** First names of the connected professionals the client shares Allergies and dietary needs with. */
export async function fetchAllergiesSharedWith(userId: string): Promise<Read<string[]>> {
  const { data, error } = await supabase
    .from("client_access_grants")
    .select("professional_id, granted")
    .eq("client_id", userId)
    .eq("category", "allergies_dietary" as never)
    .eq("granted", true);
  if (error) return readFail(error);
  const ids = ((data ?? []) as unknown as { professional_id: string | null }[]).map((r) => r.professional_id).filter((x): x is string => !!x);
  const names = await professionalNames(ids);
  // Only professionals the client is still connected to (the view is scoped to them).
  return { ok: true, data: ids.map((id) => names.get(id)).filter((n): n is string => !!n) };
}

/** Whether the client has any structured allergy or dietary row food_conflicts could match. */
export async function hasConflictData(userId: string): Promise<boolean> {
  const [a, d] = await Promise.all([
    supabase.from("allergies").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("dietary_restrictions").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return (a.count ?? 0) > 0 || (d.count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// food_conflicts (CU13 diary badges, Add Food)
// ---------------------------------------------------------------------------

export async function fetchFoodConflicts(
  userId: string,
  item: { foodId?: string | null; customFoodId?: string | null; recipeId?: string | null; customMealId?: string | null; name?: string | null }
): Promise<Read<ConflictRow[]>> {
  const { data, error } = await supabase.rpc("food_conflicts", {
    p_client_id: userId,
    p_food_id: item.foodId ?? undefined,
    p_custom_food_id: item.customFoodId ?? undefined,
    p_recipe_id: item.recipeId ?? undefined,
    p_custom_meal_id: item.customMealId ?? undefined,
    p_name: item.name ?? undefined,
  } as never);
  if (error) return readFail(error);
  type R = { kind: string; allergen: string | null; severity: string | null; restriction: string | null; detail: string | null };
  return { ok: true, data: ((data ?? []) as unknown as R[]).map((r) => ({ kind: r.kind, allergen: r.allergen, severity: r.severity, restriction: r.restriction, detail: r.detail })) };
}

// ---------------------------------------------------------------------------
// Feedback on diary entries (CU4)
// ---------------------------------------------------------------------------

export interface EntryFeedback {
  id: string;
  entryId: string;
  professionalId: string;
  professionalName: string | null;
  body: string | null;
  reaction: string | null;
  clientReply: string | null;
  createdAt: string;
}

/** The professionals' feedback on these entries (the client's own rows). */
export async function fetchEntryFeedback(userId: string, entryIds: string[]): Promise<Read<EntryFeedback[]>> {
  if (!entryIds.length) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from("food_log_feedback")
    .select("id, entry_id, professional_id, body, reaction, client_reply, created_at")
    .eq("client_id", userId)
    .in("entry_id", entryIds)
    .order("created_at", { ascending: true });
  if (error) return readFail(error);
  type F = { id: string; entry_id: string; professional_id: string; body: string | null; reaction: string | null; client_reply: string | null; created_at: string };
  const rows = (data ?? []) as unknown as F[];
  const names = await professionalNames(rows.map((r) => r.professional_id));
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      entryId: r.entry_id,
      professionalId: r.professional_id,
      professionalName: names.get(r.professional_id) || null,
      body: r.body,
      reaction: r.reaction,
      clientReply: r.client_reply,
      createdAt: r.created_at,
    })),
  };
}

export async function replyToFeedback(feedbackId: string, reply: string): Promise<Write> {
  const text = reply.trim();
  if (!text) return { ok: false, message: "Write something first." };
  const { error } = await supabase.rpc("reply_to_food_feedback", { p_feedback_id: feedbackId, p_reply: text });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATX08") return { ok: false, message: "This feedback is no longer available." };
  return { ok: false, message: "Couldn't send your reply. Try again." };
}
