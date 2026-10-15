// Release 3 · W5 Insights readers (Database HANDOVER_API "Release 3"; every
// table here is read through its has_client_access() policy, so a switch
// that is off returns no rows; the screens also don't ask for what
// useClientAccess says is off).
//
// - activity_daily / activity_hourly, health_metrics (water, steps,
//   heart_rate, sleep, calories_burned): Activity and vitals;
// - health_metrics weight: Weight; waist / body fat: Body measurements;
// - blood_pressure_readings: Blood pressure (services/blood-pressure);
// - workout_sessions + logged_exercises + logged_sets: Workout activity;
// - food_log_entries (eaten_at, DB-5 / J8): Food diary;
// - habit_items + habit_completions: Habits (services/pro/clientPage);
// - my_client_nutrition_targets (the targets this professional set) and
//   nutrition_goals (needs Progress; the only way the target weight shows);
// - request_client_access with a message (TR20).
// Lab results reuse services/labs and services/pro/clientPage.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import type { Read, Write } from "./clients";

const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });
const from = (table: string) => supabase.from(table as never);
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Local yyyy-mm-dd of a timestamp (the device's day, as the client app logs). */
export function localDay(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function localMinute(ts: string): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

/** PostgREST caps a response at 1,000 rows; read in pages. */
async function paged<T>(build: (fromRow: number, toRow: number) => PromiseLike<{ data: unknown; error: unknown }>, max = 10000): Promise<{ ok: true; rows: T[] } | { ok: false; error: unknown }> {
  const rows: T[] = [];
  for (let start = 0; start < max; start += 1000) {
    const { data, error } = await build(start, start + 999);
    if (error) return { ok: false, error };
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return { ok: true, rows };
}

// ---------------------------------------------------------------------------
// Activity and vitals
// ---------------------------------------------------------------------------

export interface ActivityDay {
  day: string;
  steps: number | null;
  activeMinutes: number | null;
  restingBpm: number | null;
  kcal: number | null;
}

export async function fetchActivityDays(clientId: string, since: string): Promise<Read<ActivityDay[]>> {
  const r = await paged<{ local_date: string; steps: unknown; active_minutes: unknown; resting_bpm: unknown; kcal_burned: unknown }>((a, b) =>
    from("activity_daily").select("local_date, steps, active_minutes, resting_bpm, kcal_burned").eq("user_id", clientId).gte("local_date", since).order("local_date").range(a, b)
  );
  if (!r.ok) return readFail(r.error);
  return { ok: true, data: r.rows.map((x) => ({ day: x.local_date, steps: num(x.steps), activeMinutes: num(x.active_minutes), restingBpm: num(x.resting_bpm), kcal: num(x.kcal_burned) })) };
}

export interface ActivityHour {
  day: string;
  hour: number;
  steps: number;
}

export async function fetchActivityHours(clientId: string, since: string): Promise<Read<ActivityHour[]>> {
  const r = await paged<{ local_date: string; hour: number; steps: unknown }>((a, b) => from("activity_hourly").select("local_date, hour, steps").eq("user_id", clientId).gte("local_date", since).order("local_date").range(a, b));
  if (!r.ok) return readFail(r.error);
  return { ok: true, data: r.rows.map((x) => ({ day: x.local_date, hour: Number(x.hour), steps: num(x.steps) ?? 0 })) };
}

export type MetricType = "weight" | "heart_rate" | "steps" | "sleep" | "water" | "calories_burned" | "waist" | "body_fat_pct";

export interface MetricRow {
  type: MetricType;
  value: number;
  at: string;
  day: string;
  rest: boolean;
}

export async function fetchMetricRows(clientId: string, types: MetricType[], since: string): Promise<Read<MetricRow[]>> {
  if (!types.length) return { ok: true, data: [] };
  const r = await paged<{ metric_type: MetricType; value: unknown; recorded_at: string; context: string | null }>((a, b) =>
    from("health_metrics").select("metric_type, value, recorded_at, context").eq("user_id", clientId).in("metric_type", types).gte("recorded_at", `${since}T00:00:00`).order("recorded_at").range(a, b)
  );
  if (!r.ok) return readFail(r.error);
  return { ok: true, data: r.rows.map((x) => ({ type: x.metric_type, value: Number(x.value), at: x.recorded_at, day: localDay(x.recorded_at), rest: x.context === "rest" })) };
}

/** Which metric types have at least one row the caller can read (vitals tabs only for what is tracked). */
export async function fetchTrackedTypes(clientId: string, types: MetricType[]): Promise<Read<MetricType[]>> {
  const out: MetricType[] = [];
  for (const t of types) {
    const { data, error } = await from("health_metrics").select("id").eq("user_id", clientId).eq("metric_type", t).limit(1);
    if (error) return readFail(error);
    if ((data ?? []).length) out.push(t);
  }
  return { ok: true, data: out };
}

// ---------------------------------------------------------------------------
// Training (workout_sessions + logged sets)
// ---------------------------------------------------------------------------

export interface LoggedSet {
  reps: number | null;
  kg: number | null;
  completed: boolean;
  type: string | null;
  rpe: number | null;
  pr: boolean;
}

export interface Workout {
  id: string;
  name: string;
  day: string;
  startedAt: string;
  durationMin: number | null;
  volumeKg: number | null;
  exercises: { name: string; sets: LoggedSet[] }[];
}

export async function fetchWorkouts(clientId: string, since: string): Promise<Read<Workout[]>> {
  const r = await paged<{
    id: string;
    routine_name: string | null;
    started_at: string;
    activity_date: string | null;
    duration_sec: unknown;
    total_volume_kg: unknown;
    logged_exercises: { name: string; position: number; logged_sets: { reps: unknown; weight_kg: unknown; completed: boolean | null; set_type: string | null; rpe: unknown; is_pr: boolean | null; set_number: number }[] }[] | null;
  }>((a, b) =>
    from("workout_sessions")
      .select("id, routine_name, started_at, activity_date, duration_sec, total_volume_kg, logged_exercises(name, position, logged_sets(reps, weight_kg, completed, set_type, rpe, is_pr, set_number))")
      .eq("user_id", clientId)
      .gte("started_at", `${since}T00:00:00`)
      .order("started_at")
      .range(a, b)
  );
  if (!r.ok) return readFail(r.error);
  return {
    ok: true,
    data: r.rows.map((w) => ({
      id: w.id,
      name: w.routine_name ?? "Workout",
      day: w.activity_date ?? localDay(w.started_at),
      startedAt: w.started_at,
      durationMin: num(w.duration_sec) != null ? Math.round((num(w.duration_sec) as number) / 60) : null,
      volumeKg: num(w.total_volume_kg),
      exercises: [...(w.logged_exercises ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((e) => ({
          name: e.name,
          sets: [...(e.logged_sets ?? [])]
            .sort((a, b) => a.set_number - b.set_number)
            .map((s) => ({ reps: num(s.reps), kg: num(s.weight_kg), completed: s.completed !== false, type: s.set_type, rpe: num(s.rpe), pr: !!s.is_pr })),
        })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Food diary
// ---------------------------------------------------------------------------

export interface FoodEntry {
  day: string;
  /** eaten_at (DB-5); null for rows logged before it existed. */
  eatenAt: string | null;
  createdAt: string;
  meal: "breakfast" | "lunch" | "snack" | "dinner";
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  nutrients: Record<string, number> | null;
}

export async function fetchFoodEntries(clientId: string, since: string): Promise<Read<FoodEntry[]>> {
  const r = await paged<{ logged_date: string; eaten_at: string | null; created_at: string; meal: FoodEntry["meal"]; name: string; calories: unknown; protein_g: unknown; carbs_g: unknown; fat_g: unknown; nutrients: Record<string, number> | null }>((a, b) =>
    from("food_log_entries").select("logged_date, eaten_at, created_at, meal, name, calories, protein_g, carbs_g, fat_g, nutrients").eq("user_id", clientId).gte("logged_date", since).order("logged_date").range(a, b)
  );
  if (!r.ok) return readFail(r.error);
  return {
    ok: true,
    data: r.rows.map((x) => ({
      day: x.logged_date,
      eatenAt: x.eaten_at,
      createdAt: x.created_at,
      meal: x.meal,
      name: x.name,
      kcal: num(x.calories) ?? 0,
      p: num(x.protein_g) ?? 0,
      c: num(x.carbs_g) ?? 0,
      f: num(x.fat_g) ?? 0,
      nutrients: x.nutrients && typeof x.nutrients === "object" ? x.nutrients : null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export interface InsightTargets {
  kcal: number | null;
  pct: [number, number, number] | null;
  /** Who the numbers come from: this professional (my_client_nutrition_targets) or the client's own goal (Progress shared). */
  source: "mine" | "client" | null;
  /** Target weight, only when the client's goal row is readable (Progress shared). */
  goalWeightKg: number | null;
}

/** The targets this professional set (any lane may call it; it returns rows only for the setter). */
export async function fetchInsightTargets(clientId: string, progressShared: boolean): Promise<Read<InsightTargets>> {
  const mine = await rpc("my_client_nutrition_targets", { p_client_id: clientId });
  if (mine.error) return readFail(mine.error);
  const m = ((mine.data ?? []) as { target_calories: unknown; protein_pct: unknown; carbs_pct: unknown; fat_pct: unknown }[])[0];
  let goal: { target_calories: unknown; protein_pct: unknown; carbs_pct: unknown; fat_pct: unknown; desired_weight_kg: unknown; weight_goal: string | null } | undefined;
  if (progressShared) {
    const g = await from("nutrition_goals").select("target_calories, protein_pct, carbs_pct, fat_pct, desired_weight_kg, weight_goal").eq("user_id", clientId).eq("is_current", true).limit(1);
    if (g.error) return readFail(g.error);
    goal = ((g.data ?? []) as unknown as (typeof goal)[])[0];
  }
  const pctOf = (r: { protein_pct: unknown; carbs_pct: unknown; fat_pct: unknown } | undefined): [number, number, number] | null => {
    if (!r) return null;
    const a = [num(r.protein_pct), num(r.carbs_pct), num(r.fat_pct)];
    return a.every((x) => x != null) ? (a as [number, number, number]) : null;
  };
  const src = m ?? goal;
  return {
    ok: true,
    data: {
      kcal: src ? num(src.target_calories) : null,
      pct: pctOf(src),
      source: m ? "mine" : goal ? "client" : null,
      goalWeightKg: goal && goal.weight_goal !== "maintain" ? num(goal.desired_weight_kg) : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Ask to share (TR20): request_client_access with the professional's message.
// ---------------------------------------------------------------------------

/** request_client_access refuses a message over 280 characters (22023). */
export const ASK_MESSAGE_MAX = 280;

export async function askWithMessage(clientId: string, category: "lab_results" | "health_metrics" | "weight" | "blood_pressure" | "food_diary" | "workout_activity" | "body_measurements" | "progress", message: string): Promise<Write> {
  const m = message.trim();
  const { error } = await rpc("request_client_access", { p_client_id: clientId, p_category: category, p_message: m ? m.slice(0, ASK_MESSAGE_MAX) : null });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  const text = (error as { message?: string }).message ?? "";
  if (/already asked/.test(text)) return { ok: false, message: "You've already asked. It's waiting for them." };
  if (/already share/.test(text)) return { ok: false, message: "They already share this with you." };
  return { ok: false, message: "Couldn't send the request. Try again." };
}
