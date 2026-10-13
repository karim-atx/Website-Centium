import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";

// Database stage B1 `metric_goals` (HANDOVER_API.md "metric_goals — and it is
// not measurement_goals"): a goal is a number with a date, keyed (user_id,
// metric, effective_from); changing it twice in a day replaces that day's
// row. "At goal" on a past day is judged against the goal that stood then.
// Ranges (enforced by the database): steps 1,000-40,000 step 500, water
// 500-6,000 step 50. Only `value` is updatable, so a save is update-then-
// insert (an upsert's update branch would name ungranted columns).
//
// Newer than lib/supabase/database.types.ts (generated from production).
const supabase = typed as unknown as SupabaseClient;

export type GoalMetric = "steps" | "water";

export interface GoalRow {
  metric: GoalMetric;
  value: number;
  /** Local yyyy-mm-dd the goal applies from. */
  effectiveFrom: string;
}

export const GOAL_DEFAULT: Record<GoalMetric, number> = { steps: 10000, water: 2500 };

/** Clamps and steps a goal to what the database accepts. */
export function normaliseGoal(metric: GoalMetric, value: number): number {
  const [min, max, step] = metric === "steps" ? [1000, 40000, 500] : [500, 6000, 50];
  return Math.max(min, Math.min(max, Math.round(value / step) * step));
}

/** Every steps / water goal of the signed-in person, oldest first. */
export async function fetchGoalHistory(userId: string): Promise<{ ok: true; rows: GoalRow[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("metric_goals")
    .select("metric, value, effective_from")
    .eq("user_id", userId)
    .in("metric", ["steps", "water"])
    .order("effective_from", { ascending: true });
  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    rows: ((data ?? []) as { metric: GoalMetric; value: number | string; effective_from: string }[]).map((r) => ({
      metric: r.metric,
      value: Number(r.value),
      effectiveFrom: r.effective_from,
    })),
  };
}

/** Saves `value` as the goal from `day` (the person's local today). */
export async function saveGoal(userId: string, metric: GoalMetric, value: number, day: string): Promise<{ ok: boolean; message?: string }> {
  const v = normaliseGoal(metric, value);
  const upd = await supabase
    .from("metric_goals")
    .update({ value: v })
    .eq("user_id", userId)
    .eq("metric", metric)
    .eq("effective_from", day)
    .select("metric");
  if (upd.error) return { ok: false, message: upd.error.message };
  if ((upd.data ?? []).length > 0) return { ok: true };
  const ins = await supabase.from("metric_goals").insert({ user_id: userId, metric, value: v, effective_from: day });
  if (ins.error) return { ok: false, message: ins.error.message };
  return { ok: true };
}

/** The goal as it stood on `day`, or null when none had been set by then (the database invents no default). */
export function goalOnFrom(rows: GoalRow[], metric: GoalMetric, day: string): number | null {
  let found: number | null = null;
  for (const r of rows) if (r.metric === metric && r.effectiveFrom <= day) found = r.value;
  return found;
}

/** `rows` with `metric`'s goal from `day` set to `value` (same-day replace), kept oldest first. */
export function upsertGoalRow(rows: GoalRow[], metric: GoalMetric, value: number, day: string): GoalRow[] {
  const rest = rows.filter((r) => !(r.metric === metric && r.effectiveFrom === day));
  return [...rest, { metric, value, effectiveFrom: day }].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));
}
