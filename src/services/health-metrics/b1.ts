import { useEffect, useState } from "react";
import { supabase as db } from "../../../lib/supabase/client";
import { useApp } from "../../context/AppContext";
import { readSources } from "../../pages/settings/sourcesData";
import { clock12 } from "../../utils/time12";
import { t, tk } from "../../i18n/core";
import { appLocale } from "../../i18n/format";
import { readActivityDays, readActivityHours, readSleepNights, removeSyncedReading } from "./readers";
import type { ReaderDay, ReaderHour, ReaderSource } from "./readersModel";
import { bodyWeightAllowed } from "../workout/setLimits";

// Database stage B1 "Health data model" (HANDOVER_API.md "## B1"), read for
// the Health A pages: raw health_metrics rows (note, context, device_name,
// external_id, source), water_intakes, activity_daily / activity_hourly,
// sleep_details times and sleep_segments, workout_sessions.kcal,
// heart_rate_alert_settings. Owner-only rows (RLS).
// Each result is mapped to a typed shape here.
//
// Round J · J-2a (Database DB-Z4): activity, hours and main nights come from
// the one-source readers (readers.ts), which pick one source per day, hour or
// night (manual first, then the providers by priority). A synced reading is
// removed with remove_synced_reading, never edited.

/** The local day [start, end) as ISO instants (local midnights). */
export function dayWindowIso(fromDay: string, toDay: string): [string, string] {
  const [y1, m1, d1] = fromDay.split("-").map(Number);
  const [y2, m2, d2] = toDay.split("-").map(Number);
  return [new Date(y1, m1 - 1, d1).toISOString(), new Date(y2, m2 - 1, d2 + 1).toISOString()];
}

export const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A read keyed on its inputs; `reload` re-runs it (after a write). */
function useB1Read<T>(read: (uid: string) => PromiseLike<T>, deps: unknown[], initial: T): { data: T; loading: boolean; reload: () => void } {
  // Re-read whenever health_metrics re-reads (a save or delete anywhere calls reloadMetrics).
  const { authUserId, metricsLoadedAt } = useApp();
  const [state, setState] = useState<{ data: T; loading: boolean }>({ data: initial, loading: true });
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void Promise.resolve(read(authUserId)).then((data) => {
      if (!cancelled) setState({ data, loading: false });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, key, metricsLoadedAt, ...deps]);
  return { ...state, reload: () => setKey((k) => k + 1) };
}

// ---------------------------------------------------------------------------
// health_metrics raw rows

export type MetricSource = "manual" | "apple_health" | "android_health" | "whoop";

export interface RawMetricRow {
  id: string;
  value: number;
  recordedAt: string;
  day: string;
  source: MetricSource;
  note: string | null;
  context: "rest" | "workout" | null;
  deviceName: string | null;
  externalId: string | null;
}

/** Every reading of one metric between two local days (inclusive), oldest first. */
export function useMetricRows(dbType: "weight" | "heart_rate" | "steps" | "sleep" | "calories_burned", fromDay: string, toDay: string) {
  return useB1Read<RawMetricRow[]>(
    (uid) => {
      const [from, to] = dayWindowIso(fromDay, toDay);
      return db
        .from("health_metrics")
        .select("id, value, recorded_at, source, note, context, device_name, external_id")
        .eq("user_id", uid)
        .eq("metric_type", dbType)
        .gte("recorded_at", from)
        .lt("recorded_at", to)
        .order("recorded_at", { ascending: true })
        .then(({ data, error }) =>
          error
            ? []
            : (data ?? [])
                // Batch D GH: a weight outside 20–500 kg (an old row) is not charted.
                .filter((r: Record<string, unknown>) => dbType !== "weight" || bodyWeightAllowed(Number(r.value)))
                .map((r: Record<string, unknown>) => ({
                id: r.id as string,
                value: Number(r.value),
                recordedAt: r.recorded_at as string,
                day: localDay(r.recorded_at as string),
                source: r.source as MetricSource,
                note: (r.note as string | null) ?? null,
                context: (r.context as "rest" | "workout" | null) ?? null,
                deviceName: (r.device_name as string | null) ?? null,
                externalId: (r.external_id as string | null) ?? null,
              }))
        );
    },
    [dbType, fromDay, toDay],
    []
  );
}

/**
 * Delete on a synced reading (V6-169): remove_synced_reading('metric') deletes
 * it and remembers it, so the next sync skips it (DB-Z4; it replaces the old
 * two-step hide). The reading stays in Apple Health / Health Connect / WHOOP.
 */
export async function hideSyncedReading(row: Pick<RawMetricRow, "id" | "source">): Promise<boolean> {
  if (row.source === "manual") return false;
  return removeSyncedReading("metric", row.id);
}

/** "Apple Health", "Health Connect", "WHOOP", or "Logged by you" (translated; call at render time). */
export const sourceName = (s: MetricSource | string | null | undefined) =>
  s === "apple_health" ? "Apple Health" : s === "android_health" ? "Health Connect" : s === "whoop" ? "WHOOP" : t("Logged by you");

// ---------------------------------------------------------------------------
// water_intakes

export interface Drink {
  id: string;
  ml: number;
  loggedAt: string;
  day: string;
  source: MetricSource;
  /** A pre-B1 day total carried over by the backfill: a day total, never a drink. */
  backfilled: boolean;
}

export function useDrinks(fromDay: string, toDay: string) {
  return useB1Read<Drink[]>(
    (uid) => {
      const [from, to] = dayWindowIso(fromDay, toDay);
      return db
        .from("water_intakes")
        .select("id, amount_ml, logged_at, source, backfilled")
        .eq("user_id", uid)
        .gte("logged_at", from)
        .lt("logged_at", to)
        .order("logged_at", { ascending: true })
        .then(({ data, error }) =>
          error
            ? []
            : (data ?? []).map((r: Record<string, unknown>) => ({
                id: r.id as string,
                ml: Number(r.amount_ml),
                loggedAt: r.logged_at as string,
                day: localDay(r.logged_at as string),
                source: r.source as MetricSource,
                backfilled: !!r.backfilled,
              }))
        );
    },
    [fromDay, toDay],
    []
  );
}

/** Edit a drink (amount_ml / logged_at are the updatable columns). */
export async function updateDrink(id: string, ml: number): Promise<boolean> {
  const { error } = await db.from("water_intakes").update({ amount_ml: Math.round(ml) }).eq("id", id);
  return !error;
}

/** A synced drink can't be edited (DB-Z4: an update changes nothing); it is removed with remove_synced_reading. */
export async function removeDrink(id: string, source: MetricSource = "manual"): Promise<boolean> {
  if (source !== "manual") return removeSyncedReading("water", id);
  const { error } = await db.from("water_intakes").delete().eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// activity_daily / activity_hourly

export interface ActivityDay {
  day: string;
  /** The steps' source (else the first field's), for the "from Health Connect" line. */
  source: MetricSource;
  /** Which source each field came from (the reader's `sources`). */
  sources: Partial<Record<string, ReaderSource>>;
  steps: number | null;
  distanceM: number | null;
  activeMinutes: number | null;
  floors: number | null;
  restingBpm: number | null;
  kcalBurned: number | null;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function useActivityDaily(fromDay: string, toDay: string) {
  return useB1Read<ActivityDay[]>(
    () =>
      readActivityDays(fromDay, toDay).then((r) =>
        !r.ok
          ? []
          : r.rows.map((d) => ({
              day: d.day,
              source: d.sources.steps ?? Object.values(d.sources)[0] ?? "manual",
              sources: d.sources,
              steps: d.steps,
              distanceM: d.distanceM,
              activeMinutes: d.activeMinutes,
              floors: d.floors,
              restingBpm: d.restingBpm,
              kcalBurned: d.kcalBurned,
            }))
      ),
    [fromDay, toDay],
    []
  );
}

/**
 * One row per local day. The readers already send one per day, so this keys
 * them by day; with several rows a day it keeps the first source in
 * `priority` order that reported each field.
 */
export function activityByDay(rows: ActivityDay[], priority: Partial<Record<string, number>> = {}): Record<string, ActivityDay> {
  const out: Record<string, ActivityDay> = {};
  const rank = (s: string) => priority[s] ?? 99;
  for (const r of [...rows].sort((a, b) => rank(a.source) - rank(b.source))) {
    const cur = out[r.day];
    if (!cur) out[r.day] = { ...r };
    else
      for (const k of ["steps", "distanceM", "activeMinutes", "floors", "restingBpm", "kcalBurned"] as const)
        if (cur[k] === null && r[k] !== null) cur[k] = r[k];
  }
  return out;
}

export interface ActivityHour {
  hour: number;
  steps: number | null;
  kcal: number | null;
  /** The hour's heart rate, from one source together (DB-Z4: the sync keeps no raw samples). */
  hrMin: number | null;
  hrAvg: number | null;
  hrMax: number | null;
}

export function useActivityHourly(day: string) {
  return useB1Read<ActivityHour[]>(
    () =>
      readActivityHours(day, day).then((r) =>
        !r.ok ? [] : r.rows.map(({ hour, steps, kcal, hrMin, hrAvg, hrMax }) => ({ hour, steps, kcal, hrMin, hrAvg, hrMax }))
      ),
    [day],
    []
  );
}

/** Synced heart rate for one hour (min, average, max from one source). */
export interface HeartRateHour {
  day: string;
  hour: number;
  min: number;
  avg: number;
  max: number;
  source: MetricSource;
}

/** Synced heart rate by hour over a range (read 31 days at a time). */
export function useHeartRateHours(fromDay: string, toDay: string) {
  return useB1Read<HeartRateHour[]>(
    () => readActivityHours(fromDay, toDay).then((r) => (r.ok ? heartRateHours(r.rows) : [])),
    [fromDay, toDay],
    []
  );
}

/** The hours that have a heart rate, as HeartRateHour. */
export function heartRateHours(rows: { day: string; hour: number; hrMin: number | null; hrAvg: number | null; hrMax: number | null; sources: Partial<Record<string, ReaderSource>> }[]): HeartRateHour[] {
  return rows
    .filter((h) => h.hrAvg !== null)
    .map((h) => ({
      day: h.day,
      hour: h.hour,
      avg: h.hrAvg as number,
      min: h.hrMin ?? (h.hrAvg as number),
      max: h.hrMax ?? (h.hrAvg as number),
      source: h.sources.hr_avg ?? h.sources.hr_min ?? h.sources.hr_max ?? "manual",
    }));
}

/** Which source each day's and hour's activity fields came from, for "Remove from Centium?" (HA-12). */
export function useActivitySources(fromDay: string, toDay: string) {
  return useB1Read<{ days: ReaderDay[]; hours: ReaderHour[] }>(
    () =>
      Promise.all([readActivityDays(fromDay, toDay), readActivityHours(fromDay, toDay)]).then(([d, h]) => ({
        days: d.ok ? d.rows : [],
        hours: h.ok ? h.rows : [],
      })),
    [fromDay, toDay],
    { days: [], hours: [] }
  );
}

/** The middle of a local hour as an ISO instant, so an hour's average plots where the hour is. */
export function hourIso(day: string, hour: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 30).toISOString();
}

// ---------------------------------------------------------------------------
// sleep_details (times) and sleep_segments

export interface SleepSession {
  /** The night's row, for removing a synced one (remove_synced_reading 'sleep'). */
  id: string;
  day: string;
  score: number | null;
  bedStart: string | null;
  wakeEnd: string | null;
  asleepMin: number | null;
  inBedMin: number | null;
  source: string | null;
  isNap: boolean;
  segments: { stage: "awake" | "light" | "deep" | "rem"; startsAt: string; endsAt: string }[];
}

/**
 * Main nights from my_sleep_nights (one per date, by source priority), and
 * naps from sleep_details, which the reader leaves out.
 */
export function useSleepSessions(fromDay: string, toDay: string) {
  return useB1Read<SleepSession[]>(
    (uid) =>
      Promise.all([
        readSleepNights(fromDay, toDay),
        db
          .from("sleep_details")
          .select("id, sleep_date, score, bed_start, wake_end, asleep_min, in_bed_min, source, is_nap, sleep_segments(stage, starts_at, ends_at)")
          .eq("user_id", uid)
          .eq("is_nap", true)
          .gte("sleep_date", fromDay)
          .lte("sleep_date", toDay)
          .order("sleep_date", { ascending: true }),
      ]).then(([nights, naps]) => {
        const main: SleepSession[] = !nights.ok
          ? []
          : nights.rows.map((n) => ({
              id: n.id,
              day: n.day,
              score: n.score,
              bedStart: n.bedStart,
              wakeEnd: n.wakeEnd,
              asleepMin: n.asleepMin,
              inBedMin: n.inBedMin,
              source: n.source,
              isNap: false,
              segments: n.segments,
            }));
        const napRows: SleepSession[] = naps.error
          ? []
          : (naps.data ?? []).map((r: Record<string, unknown>) => ({
              id: r.id as string,
              day: r.sleep_date as string,
              score: num(r.score),
              bedStart: (r.bed_start as string | null) ?? null,
              wakeEnd: (r.wake_end as string | null) ?? null,
              asleepMin: num(r.asleep_min),
              inBedMin: num(r.in_bed_min),
              source: (r.source as string | null) ?? null,
              isNap: true,
              segments: ((r.sleep_segments as { stage: SleepSession["segments"][number]["stage"]; starts_at: string; ends_at: string }[] | null) ?? [])
                .map((g) => ({ stage: g.stage, startsAt: g.starts_at, endsAt: g.ends_at }))
                .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1)),
            }));
        return [...main, ...napRows].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
      }),
    [fromDay, toDay],
    []
  );
}

// ---------------------------------------------------------------------------
// heart_rate_alert_settings (owner only; never shared with a professional)

export interface HrAlertSettings {
  enabled: boolean;
  highBpm: number;
  lowBpm: number;
  minutes: number;
}

export async function loadHrAlertSettings(userId: string): Promise<HrAlertSettings | null> {
  const { data, error } = await db.from("heart_rate_alert_settings").select("enabled, high_bpm, low_bpm, minutes").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  const r = data as { enabled: boolean; high_bpm: number; low_bpm: number; minutes: number };
  return { enabled: r.enabled, highBpm: r.high_bpm, lowBpm: r.low_bpm, minutes: r.minutes };
}

/** Update first, insert when there is no row (the UPDATE grant excludes user_id: never upsert). */
export async function saveHrAlertSettings(userId: string, s: HrAlertSettings): Promise<boolean> {
  const row = { enabled: s.enabled, high_bpm: s.highBpm, low_bpm: s.lowBpm, minutes: s.minutes };
  const upd = await db.from("heart_rate_alert_settings").update(row).eq("user_id", userId).select("user_id");
  if (upd.error) return false;
  if ((upd.data ?? []).length > 0) return true;
  const ins = await db.from("heart_rate_alert_settings").insert({ user_id: userId, ...row });
  return !ins.error;
}

// ---------------------------------------------------------------------------
// Sources and freshness (HA-01: health_integrations access_state, last_synced_at, priority)

export interface HealthSource {
  provider: "apple_health" | "android_health" | "whoop";
  name: string;
  lastSyncedAt: string | null;
  /** Null = unknown (never read as ok). */
  accessState: "ok" | "access_off" | "error" | null;
  lastErrorAt: string | null;
}

/** The person's connected sources, in priority order (lower first). Empty on the web today. */
export function useHealthSources() {
  return useB1Read<HealthSource[]>(
    (uid) =>
      readSources(uid).then((r) =>
        r.ok
          ? r.sources.map((x) => ({ provider: x.provider, name: sourceName(x.provider), lastSyncedAt: x.lastSyncedAt, accessState: x.accessState, lastErrorAt: x.lastErrorAt }))
          : []
      ),
    [],
    []
  );
}

/** A source's sync state for the freshness / sync lines (HE1 #2, HE1.2 #28). */
export function syncState(s: HealthSource): "access_off" | "error" | "ok" {
  if (s.accessState === "access_off") return "access_off";
  if (s.accessState === "error" || (s.lastErrorAt && (!s.lastSyncedAt || s.lastErrorAt > s.lastSyncedAt))) return "error";
  return "ok";
}

/** "today at 8:40 AM", "yesterday at 9:10 PM", "on Oct 5 at 7:02 AM" (12-hour, X-14), in the app's language. */
export function whenText(iso: string, today: string): string {
  const day = localDay(iso);
  const [y, m, d] = today.split("-").map(Number);
  const yest = localDay(new Date(y, m - 1, d - 1, 12).toISOString());
  const time = clock12(iso);
  if (day === today) return t("today at {time}", { time });
  if (day === yest) return t("yesterday at {time}", { time });
  const dt = new Date(iso);
  const loc = appLocale();
  const date = loc
    ? dt.toLocaleDateString(loc, { month: "short", day: "numeric" })
    : `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()]} ${dt.getDate()}`;
  return t("on {date} at {time}", { date, time });
}

/** A session without a routine name (a catalogue key: FromWorkoutsCard shows it through t()). */
export const WORKOUT_FALLBACK = tk("Workout");

export interface WorkoutKcalSession {
  id: string;
  name: string;
  startedAt: string;
  durationSec: number | null;
  kcal: number;
}

/** One local day's Centium workouts that carry a kcal (HE1.4 "From workouts", HA-07); with `toDay`, every day from `day` to it (HE1.4.m foot). */
export function useWorkoutSessionsKcal(day: string, toDay?: string) {
  return useB1Read<WorkoutKcalSession[]>(
    (uid) =>
      db
        .from("workout_sessions")
        .select("id, routine_name, started_at, duration_sec, kcal, activity_date")
        .eq("user_id", uid)
        .not("kcal", "is", null)
        .gte("activity_date", day)
        .lte("activity_date", toDay ?? day)
        .order("started_at", { ascending: true })
        .then(({ data, error }) =>
          error
            ? []
            : (data ?? []).map((r: Record<string, unknown>) => ({
                id: r.id as string,
                name: (r.routine_name as string | null) ?? WORKOUT_FALLBACK,
                startedAt: r.started_at as string,
                durationSec: num(r.duration_sec),
                kcal: Number(r.kcal),
              }))
        ),
    [day, toDay],
    []
  );
}
