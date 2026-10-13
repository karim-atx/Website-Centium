import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { useApp } from "../../../context/AppContext";

// v6 Batch 2 · Home: the reads the HO1 widgets need that AppContext does not
// hold. Owner-only rows (RLS), read-only; nothing here writes.

/**
 * Database B1 / B3 objects (metric_goal_on, activity_daily, habit_items.colour,
 * my_workout_week, my_journal_week) are on the local stack but not yet in the
 * generated lib/supabase/database.types.ts (it reads production), so these
 * reads go through a loosely typed view of the same client.
 */
type LooseResult = PromiseLike<{ data: any; error: { message: string } | null }>; // eslint-disable-line @typescript-eslint/no-explicit-any
interface LooseQuery extends LooseResult {
  select: (cols: string) => LooseQuery;
  eq: (col: string, v: unknown) => LooseQuery;
  not: (col: string, op: string, v: unknown) => LooseQuery;
}
const loose = supabase as unknown as { from: (t: string) => LooseQuery; rpc: (fn: string, args?: Record<string, unknown>) => LooseResult };

/** The local day [start, end) as ISO instants. */
function dayWindow(day: string): [string, string] {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
}

export interface HeartRateDay {
  /** The day's samples, oldest first. */
  samples: number[];
  loading: boolean;
  error: boolean;
}

/**
 * HO1.W7 "54 to 128 today": every heart_rate sample of the selected local day
 * (health_metrics keeps samples; AppContext reduces them to one per day).
 * Resting heart rate has no source yet (V6-21, Database B1 activity_daily):
 * the widget shows the latest sample labelled "Latest".
 */
export function useHeartRateDay(day: string, reloadKey: unknown): HeartRateDay {
  const { authUserId } = useApp();
  const [state, setState] = useState<HeartRateDay>({ samples: [], loading: true, error: false });
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    const [from, to] = dayWindow(day);
    setState((s) => ({ ...s, loading: true }));
    void supabase
      .from("health_metrics")
      .select("value, recorded_at")
      .eq("user_id", authUserId)
      .eq("metric_type", "heart_rate")
      .gte("recorded_at", from)
      .lt("recorded_at", to)
      .order("recorded_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setState((s) => ({ ...s, loading: false, error: true }));
        else setState({ samples: (data ?? []).map((r) => Number(r.value)), loading: false, error: false });
      });
    return () => {
      cancelled = true;
    };
  }, [authUserId, day, reloadKey]);
  return state;
}

/**
 * HO1.W10 #6: which days of this Monday-first week carry a meditation session
 * (meditation_sessions, SELECT granted; the summary RPC has no per-day list,
 * PB-HO-10). Null until read.
 */
export function useMeditationWeek(week: string[], reloadKey: unknown): boolean[] | null {
  const { authUserId } = useApp();
  const [days, setDays] = useState<boolean[] | null>(null);
  const first = week[0];
  const last = week[week.length - 1];
  useEffect(() => {
    if (!authUserId || !first || !last) return;
    let cancelled = false;
    const [from] = dayWindow(first);
    const [, to] = dayWindow(last);
    void supabase
      .from("meditation_sessions")
      .select("started_at")
      .eq("user_id", authUserId)
      .gte("started_at", from)
      .lt("started_at", to)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const local = new Set(
          (data ?? []).map((r) => {
            const d = new Date(r.started_at as string);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })
        );
        setDays(week.map((d) => local.has(d)));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, first, last, reloadKey]);
  return days;
}

/**
 * OURS-home-no-device-connected §1: whether a phone ever linked Apple Health
 * or Health Connect (health_integrations.connected). Null until read or on a
 * failed read (the widget then keeps the drawn "Connect a source" hint).
 */
export function useSourceConnected(): boolean | null {
  const { authUserId } = useApp();
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void supabase
      .from("health_integrations")
      .select("connected")
      .eq("user_id", authUserId)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setConnected((data ?? []).some((r) => r.connected));
      });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);
  return connected;
}

// ---------------------------------------------------------------------------
// Database B1 / B3 readers (HANDOVER_API.md; on the local stack 8 Oct).

/** One RPC / query result that re-reads when `deps` change; null until read or on failure. */
function useRead<T>(read: (userId: string) => PromiseLike<T | null>, deps: unknown[]): T | null {
  const { authUserId } = useApp();
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void read(authUserId).then((v) => {
      if (!cancelled) setValue(v);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, ...deps]);
  return value;
}

/**
 * B1 `metric_goal_on('steps', day)`: the step goal as it stood on that day.
 * Null when never set (the database invents no default): the widget then
 * keeps the app's own goal (stepsGoal, localStorage, default 10,000).
 */
export function useStepsGoalOn(day: string): number | null {
  return useRead(
    () =>
      loose.rpc("metric_goal_on", { p_metric: "steps", p_on: day }).then(({ data, error }: { data: any; error: unknown }) => (error || data == null ? null : Number(data))),
    [day]
  );
}

/**
 * B1 `activity_daily.resting_bpm` for the local day ("while inactive", HA-08).
 * Two sources may report a day; the lowest reported value is not invented,
 * the first non-null one is used. Null: show the latest sample as "Latest" (V6-21).
 */
export function useRestingBpm(day: string): number | null {
  return useRead(
    (uid) =>
      loose
        .from("activity_daily")
        .select("resting_bpm, source")
        .eq("user_id", uid)
        .eq("local_date", day)
        .not("resting_bpm", "is", null)
        .then(({ data, error }: { data: any; error: unknown }) => (error || !data?.length ? null : Number(data[0].resting_bpm))),
    [day]
  );
}

export type HabitColourKey = "lavender" | "teal" | "gold" | "rose" | "sky";

/** B3 `habit_items.colour` by habit id (the app's HabitItem does not carry it yet). */
export function useHabitColours(ids: string[]): Record<string, HabitColourKey> | null {
  const key = ids.join(",");
  return useRead(
    (uid) =>
      loose
        .from("habit_items")
        .select("id, colour")
        .eq("owner_id", uid)
        .then(({ data, error }: { data: any; error: unknown }) => (error ? null : Object.fromEntries((data ?? []).map((r: { id: string; colour: string }) => [r.id as string, r.colour as HabitColourKey])))),
    [key]
  );
}

/** B3 `my_workout_week()`: sessions done this Monday-start week and the days scheduled (0 with no coach: hide "/N"). */
export function useWorkoutWeek(reloadKey: unknown): { done: number; scheduled: number } | null {
  return useRead(
    () =>
      loose.rpc("my_workout_week").then(({ data, error }: { data: any; error: unknown }) => {
        const row = Array.isArray(data) ? data[0] : data;
        return error || !row ? null : { done: Number(row.done), scheduled: Number(row.scheduled) };
      }),
    [reloadKey]
  );
}

/** B3 `my_journal_week()`: entries and words this week; locked folders are left out entirely. */
export function useJournalWeek(reloadKey: unknown): { entries: number; words: number } | null {
  return useRead(
    () =>
      loose.rpc("my_journal_week").then(({ data, error }: { data: any; error: unknown }) => {
        const row = Array.isArray(data) ? data[0] : data;
        return error || !row ? null : { entries: Number(row.entries), words: Number(row.words) };
      }),
    [reloadKey]
  );
}
