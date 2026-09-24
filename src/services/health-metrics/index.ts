import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { localDayOf } from "../../utils/date";

// A client's own body metrics, in public.health_metrics: weight and water
// written from the manual-entry sheet, and heart rate, steps, sleep and
// calories burned read back for whoever eventually writes them.
//
// Until now both lived entirely in localStorage, so the same account on
// another device showed nothing, and the professional-side weight tiles —
// which have been written into ProfessionalClient, read in four places, and
// assigned by nothing — had no data to show. Same shape as the workout log
// before task 1.
//
// ABSOLUTE SNAPSHOTS, NOT INTAKE EVENTS, and this is forced rather than
// chosen. Water would naturally be a series of "+250 ml at 14:32" rows summed
// per day, but WaterDetailSheet sets an ABSOLUTE total from a range slider,
// and a slider fires on every step of a drag. Summed deltas would be nonsense
// the first time somebody dragged it. So a water row means "this much so far
// on this day, as of recorded_at", and the day's value is the latest such row
// — the same reduction public.current_health_metrics already performs, and
// the same one weight needs anyway, since re-saving a day's weight replaces
// it rather than adding to it.
//
// INSERT-ONLY, NEVER UPSERT. The UPDATE grant on this table is column-scoped
// to (metric_type, value, recorded_at, source) — user_id is deliberately not
// updatable. `.upsert()` compiles to INSERT … ON CONFLICT DO UPDATE and writes
// every column in the payload including the identifying one, so it would fail
// with 42501 the moment a row conflicted. Appending is also the honest shape
// for a table whose own comment calls it a pure time series.

/**
 * The metrics this module WRITES.
 *
 * Still two, because manual entry still exists for exactly two: weight and
 * water, both from AddMetricSheet. The four below are readable and not
 * writable here, which is not an oversight — there is no screen anywhere in
 * this app that lets somebody type in their step count, and inventing one to
 * make the set symmetrical would be building a feature to justify a type.
 */
export type MetricKind = "weight" | "water";

/**
 * The metrics this module READS.
 *
 * All six, where it used to be two. The other four — heart rate, steps, sleep
 * and calories burned — were never read from anywhere: their values came from
 * a `usePersistentState` seed of 68 / 8421 / 7.7 / 2340 that every account saw
 * on its first paint and kept for good. The enum has always held them and the
 * rows have always been readable; nothing asked.
 */
export const READ_METRIC_TYPES = [
  "weight",
  "water",
  "heart_rate",
  "steps",
  "sleep",
  "calories_burned",
] as const;
export type ReadMetricType = (typeof READ_METRIC_TYPES)[number];

// value is numeric(12,3) with a `value >= 0` check and no upper bound, so the
// only server-side rejection is a negative number. These bounds exist to turn
// a typo into a sentence the user can act on instead of a constraint
// violation, and to keep water consistent with the 0-5000 clamp the local
// setters have always applied.
const LIMITS: Record<MetricKind, { min: number; max: number; unit: string }> = {
  weight: { min: 1, max: 500, unit: "kg" },
  water: { min: 0, max: 5000, unit: "ml" },
};

export interface MetricWriteResult {
  ok: boolean;
  message?: string;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  if (code === "23514" || code === "22003") {
    return "That number is outside the range this can store.";
  }
  return "Couldn't save that. Check your connection and try again.";
}

/**
 * The instant to stamp on a reading filed under `day`.
 *
 * recorded_at is a timestamptz with no default and the column comment is
 * explicit that it means when the reading HAPPENED, not when the row was
 * written — so the client has to supply it, and supplying "now" for a
 * backdated entry would be wrong twice over: it would misdate the reading,
 * and localDayOf would then place it on today rather than on the day the user
 * filed it under.
 *
 * Today gets the real current instant. Any other day gets NOON LOCAL on that
 * day, which is the safest point in a day to stand: it survives the round trip
 * through UTC storage without landing on a neighbouring date in any timezone,
 * whereas midnight local is one hour of drift away from doing exactly that.
 */
export function recordedAtFor(day: string, today: string): string {
  if (day === today) return new Date().toISOString();
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

/**
 * Writes one reading. Reports failure rather than no-opping, so the caller can
 * say so and offer a retry instead of showing a value that was never stored.
 */
export async function logHealthMetric(params: {
  userId: string;
  kind: MetricKind;
  value: number;
  /** yyyy-mm-dd the reading is filed under — the diary's selected day. */
  day: string;
  /** The app's current local day, so backdating can be detected. */
  today: string;
}): Promise<MetricWriteResult> {
  const { userId, kind, value, day, today } = params;
  const limit = LIMITS[kind];

  if (!Number.isFinite(value)) {
    return { ok: false, message: "That doesn't look like a number." };
  }
  if (value < limit.min || value > limit.max) {
    return {
      ok: false,
      message: `Enter a value between ${limit.min} and ${limit.max} ${limit.unit}.`,
    };
  }

  const { error } = await supabase.from("health_metrics").insert({
    user_id: userId,
    metric_type: kind,
    // Rounded to the scale the column actually stores, so a float artefact
    // never fails a constraint the UI considered fine.
    value: Math.round(value * 1000) / 1000,
    recorded_at: recordedAtFor(day, today),
    // Honest provenance: this is the manual-entry path. Device sync, when it
    // exists, writes apple_health / android_health from the mobile app.
    source: "manual",
  });

  if (error) {
    console.error("[health-metrics] Could not save reading:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/**
 * Day-keyed history, one map per metric that has any readings.
 *
 * ABSENT MEANS NEVER MEASURED, and that distinction is the reason this is a
 * partial record rather than six maps initialised to `{}`. A metric with no
 * entry stands for "nothing has ever been recorded"; the UI can then show its
 * empty state instead of a zero, and the difference between "no steps today"
 * and "no step data at all" survives the trip out of this module.
 */
export type MetricHistory = Partial<Record<ReadMetricType, Record<string, number>>>;

export type MetricHistoryResult =
  | { ok: true; history: MetricHistory }
  | { ok: false; message: string };

/**
 * Reads back both series for one user, reduced to one value per local day.
 *
 * LATEST WINS, which is what makes the snapshot shape work. Rows come back
 * oldest-first ordered by (recorded_at, created_at) — the same ordering
 * public.current_health_metrics resolves "current" by, only ascending — so
 * writing each row into the map in turn leaves the newest reading for each day
 * in place. created_at breaks ties for two readings stamped at the same
 * instant, which backfilled noon-local entries make possible.
 *
 * Days are LOCAL days, via localDayOf, so a reading taken at 01:30 lands on
 * the day the user was living in rather than on the previous UTC one.
 *
 * Reports `ok: false` rather than empty history on failure, so a dropped
 * connection is never rendered as "you have never weighed yourself".
 */
export async function getHealthMetrics(
  userId: string,
  sinceDay: string
): Promise<MetricHistoryResult> {
  const { data, error } = await supabase
    .from("health_metrics")
    .select("metric_type, value, recorded_at, created_at")
    .eq("user_id", userId)
    .in("metric_type", READ_METRIC_TYPES)
    .gte("recorded_at", `${sinceDay}T00:00:00Z`)
    .order("recorded_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[health-metrics] Could not load readings:", error.message);
    return { ok: false, message: describe(error) };
  }

  // A map appears only once a row of that type has been seen, so a metric with
  // no readings stays absent rather than arriving as an empty object that a
  // consumer might round to zero.
  const history: MetricHistory = {};
  const readable = new Set<string>(READ_METRIC_TYPES);

  for (const row of data ?? []) {
    if (!readable.has(row.metric_type)) continue;
    const type = row.metric_type as ReadMetricType;
    const day = localDayOf(row.recorded_at);
    // Ascending order means the last row written into a day wins, which is
    // the "latest snapshot" reduction this table's shape requires.
    (history[type] ??= {})[day] = Number(row.value);
  }

  return { ok: true, history };
}

/** The most recent day carrying a reading of this metric, or null. */
export function latestDayOf(history: MetricHistory, type: ReadMetricType): string | null {
  const days = Object.keys(history[type] ?? {});
  if (days.length === 0) return null;
  return days.reduce((newest, day) => (day > newest ? day : newest));
}
