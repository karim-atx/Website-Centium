import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  CYCLE_FLAGS,
  LOG_LIMITS,
  SETTINGS_LIMITS,
  type CycleDayLog,
  type CyclePrediction,
  type CycleSettings,
  type Condition,
  type CycleFlag,
  type NotificationDetail,
  type Mood,
  type Symptom,
} from "./types";

export * from "./types";

// Reading and writing the cycle, in public.cycle_settings and
// public.cycle_day_logs.
//
// THE PREDICTION IS NOT COMPUTED HERE, and that is the important line. Where
// the user is in their cycle, when the next period is due, how wide the range
// is, how confident it is and which flags apply are all answered by
// `my_cycle_prediction()`, which reads auth.uid() itself. Re-deriving any of
// it client-side would produce a second opinion that disagrees with the
// professional-side `client_cycle_phase()` — two answers to one question, from
// one set of rows.
//
// WHAT THIS MODULE DOES compute: nothing. ./insights.ts looks backwards over
// logged days, ./hormones.ts draws an illustration, and both are pure and
// tested. This file moves rows.
//
// EVERY READ IS SELF-ONLY BY CONSTRUCTION. cycle_settings and cycle_day_logs
// carry owner policies; the two professional reads are functions that take a
// client id and check `has_client_access` themselves, so they cannot be
// pointed at somebody who has not shared.

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  if (code === "23514") return "That value is outside the range this can store.";
  if (code === "42501") {
    return "You don't have permission to save this. Sign in again and try once more.";
  }
  return "Couldn't save that. Check your connection and try again.";
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type SettingsResult =
  | { ok: true; settings: CycleSettings | null }
  | { ok: false; message: string };

// NO contraception COLUMN: 20260924470000 moved it to contraception_plans.
const SETTINGS_COLUMNS =
  "tracker_enabled, typical_cycle_length, typical_period_length, luteal_length, conditions, pill_reminder, method_reminders, notification_detail, timezone";

function toSettings(row: {
  tracker_enabled: boolean;
  typical_cycle_length: number;
  typical_period_length: number;
  luteal_length: number;
  conditions: string[];
  pill_reminder: boolean;
  method_reminders: boolean;
  notification_detail: NotificationDetail;
  timezone: string;
}): CycleSettings {
  return {
    trackerEnabled: row.tracker_enabled,
    typicalCycleLength: row.typical_cycle_length,
    typicalPeriodLength: row.typical_period_length,
    lutealLength: row.luteal_length,
    conditions: row.conditions as Condition[],
    pillReminder: row.pill_reminder,
    methodReminders: row.method_reminders,
    notificationDetail: row.notification_detail,
    timezone: row.timezone,
  };
}

/**
 * This account's settings, or null when no row exists yet.
 *
 * NULL IS NOT "OFF". A user who has never opened the tracker has no row; a
 * user who has switched it off has a row with tracker_enabled false. The
 * difference decides whether opening the tracker should create a row with the
 * default-on behaviour, and collapsing the two would switch the tracker back
 * on every time somebody who turned it off opened the tab.
 */
export async function getCycleSettings(userId: string): Promise<SettingsResult> {
  const { data, error } = await supabase
    .from("cycle_settings")
    .select(SETTINGS_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[cycle] Could not load settings:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, settings: data ? toSettings(data) : null };
}

export type WriteResult = { ok: true } | { ok: false; message: string };

/** Validates against the table's own CHECKs. Returns a sentence, or null. */
export function validateSettings(patch: Partial<CycleSettings>): string | null {
  const { cycleLength, periodLength, lutealLength } = SETTINGS_LIMITS;
  if (patch.typicalCycleLength !== undefined) {
    const v = patch.typicalCycleLength;
    if (!Number.isInteger(v) || v < cycleLength.min || v > cycleLength.max) {
      return `Cycle length should be between ${cycleLength.min} and ${cycleLength.max} days.`;
    }
  }
  if (patch.typicalPeriodLength !== undefined) {
    const v = patch.typicalPeriodLength;
    if (!Number.isInteger(v) || v < periodLength.min || v > periodLength.max) {
      return `Period length should be between ${periodLength.min} and ${periodLength.max} days.`;
    }
  }
  if (patch.lutealLength !== undefined) {
    const v = patch.lutealLength;
    if (!Number.isInteger(v) || v < lutealLength.min || v > lutealLength.max) {
      return `Luteal length should be between ${lutealLength.min} and ${lutealLength.max} days.`;
    }
  }
  return null;
}

/**
 * Creates or updates the settings row.
 *
 * UPDATE FIRST, INSERT IF IT MISSED — NOT UPSERT, and this cost a bug before
 * it was written down. `.upsert()` compiles to INSERT … ON CONFLICT DO
 * UPDATE, and the UPDATE branch writes EVERY column in the payload. On this
 * table `user_id` is granted for INSERT and deliberately not for UPDATE (it
 * identifies the row; nothing may reassign one), so the moment a row already
 * existed the upsert asked for a privilege it does not have and came back
 * 42501, "permission denied for table cycle_settings".
 *
 * services/health-metrics carries the same warning in capital letters at the
 * top of the file. Two requests instead of one is the price of a grant that
 * says what it means.
 */
export async function saveCycleSettings(
  userId: string,
  patch: Partial<CycleSettings>
): Promise<WriteResult> {
  const invalid = validateSettings(patch);
  if (invalid) return { ok: false, message: invalid };

  // NO user_id IN THE PATCH, because RLS supplies it: the update policy is
  // `auth.uid() = user_id`, so a row belonging to anyone else is not visible
  // to update in the first place.
  const patchRow: Record<string, unknown> = {};
  if (patch.trackerEnabled !== undefined) patchRow.tracker_enabled = patch.trackerEnabled;
  if (patch.typicalCycleLength !== undefined) patchRow.typical_cycle_length = patch.typicalCycleLength;
  if (patch.typicalPeriodLength !== undefined) patchRow.typical_period_length = patch.typicalPeriodLength;
  if (patch.lutealLength !== undefined) patchRow.luteal_length = patch.lutealLength;
  if (patch.conditions !== undefined) patchRow.conditions = patch.conditions;
  if (patch.pillReminder !== undefined) patchRow.pill_reminder = patch.pillReminder;
  if (patch.methodReminders !== undefined) patchRow.method_reminders = patch.methodReminders;
  if (patch.notificationDetail !== undefined) patchRow.notification_detail = patch.notificationDetail;
  if (patch.timezone !== undefined) patchRow.timezone = patch.timezone;
  if (Object.keys(patchRow).length === 0) return { ok: true };

  const { data: updated, error: updateError } = await supabase
    .from("cycle_settings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patchRow as any)
    .eq("user_id", userId)
    .select("user_id");

  if (updateError) {
    console.error("[cycle] Could not save settings:", updateError.message);
    return { ok: false, message: describe(updateError) };
  }
  if (updated && updated.length > 0) return { ok: true };

  // No row to update, so this is the first write. user_id belongs in the
  // INSERT and only in the INSERT.
  const { error: insertError } = await supabase
    .from("cycle_settings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: userId, ...patchRow } as any);

  if (insertError) {
    console.error("[cycle] Could not create settings:", insertError.message);
    return { ok: false, message: describe(insertError) };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Day logs
// ---------------------------------------------------------------------------

const LOG_COLUMNS =
  "log_date, flow, is_period, symptoms, mood, energy, cervical_mucus, bbt_celsius, lh_test, pregnancy_test, sex_activity, notes";

export type LogsResult = { ok: true; logs: CycleDayLog[] } | { ok: false; message: string };

function toLog(row: Record<string, unknown>): CycleDayLog {
  return {
    date: row.log_date as string,
    flow: (row.flow as CycleDayLog["flow"]) ?? null,
    isPeriod: Boolean(row.is_period),
    symptoms: ((row.symptoms as string[]) ?? []) as Symptom[],
    mood: ((row.mood as string[]) ?? []) as Mood[],
    energy: (row.energy as number | null) ?? null,
    cervicalMucus: (row.cervical_mucus as CycleDayLog["cervicalMucus"]) ?? null,
    bbtCelsius: row.bbt_celsius === null || row.bbt_celsius === undefined ? null : Number(row.bbt_celsius),
    lhTest: (row.lh_test as CycleDayLog["lhTest"]) ?? null,
    pregnancyTest: (row.pregnancy_test as CycleDayLog["pregnancyTest"]) ?? null,
    sexActivity: (row.sex_activity as CycleDayLog["sexActivity"]) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}

/** Every logged day since `sinceDay`, oldest first. */
export async function getCycleLogs(userId: string, sinceDay: string): Promise<LogsResult> {
  const { data, error } = await supabase
    .from("cycle_day_logs")
    .select(LOG_COLUMNS)
    .eq("user_id", userId)
    .gte("log_date", sinceDay)
    .order("log_date", { ascending: true });

  if (error) {
    console.error("[cycle] Could not load day logs:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, logs: (data ?? []).map((r) => toLog(r as Record<string, unknown>)) };
}

/**
 * Validates one day against the table's CHECKs. Returns a sentence, or null.
 *
 * The two array checks call `valid_string_set`, which IS executable by
 * `authenticated` (verified) — so an out-of-vocabulary value is refused by the
 * database rather than silently accepted, and this mirrors it so the user sees
 * a sentence instead of a 23514.
 */
export function validateDayLog(log: Partial<CycleDayLog>): string | null {
  if (log.energy !== null && log.energy !== undefined) {
    const { min, max } = LOG_LIMITS.energy;
    if (!Number.isInteger(log.energy) || log.energy < min || log.energy > max) {
      return `Energy should be between ${min} and ${max}.`;
    }
  }
  if (log.bbtCelsius !== null && log.bbtCelsius !== undefined) {
    const { min, max } = LOG_LIMITS.bbt;
    if (!Number.isFinite(log.bbtCelsius) || log.bbtCelsius < min || log.bbtCelsius > max) {
      return `Temperature should be between ${min} and ${max} °C.`;
    }
  }
  if (log.notes != null && log.notes.length > LOG_LIMITS.notesMaxLength) {
    return `Keep the note under ${LOG_LIMITS.notesMaxLength} characters.`;
  }
  return null;
}

/**
 * Writes one day, replacing whatever was there.
 *
 * A DAY IS ONE RECORD THAT GETS EDITED, not a series of events — logging
 * cramps in the morning and a temperature at night is one day, twice amended,
 * which is what `cycle_day_logs_unique_day` on (user_id, log_date) assumes.
 *
 * UPDATE FIRST, INSERT IF IT MISSED, for the reason on saveCycleSettings:
 * id, created_at and user_id are granted for INSERT and not for UPDATE, and
 * an upsert writes the whole payload down the UPDATE branch.
 */
export async function saveCycleDay(userId: string, log: CycleDayLog): Promise<WriteResult> {
  const invalid = validateDayLog(log);
  if (invalid) return { ok: false, message: invalid };

  const row = {
    log_date: log.date,
    flow: log.flow,
    is_period: log.isPeriod,
    symptoms: log.symptoms,
    mood: log.mood,
    energy: log.energy,
    cervical_mucus: log.cervicalMucus,
    bbt_celsius: log.bbtCelsius,
    lh_test: log.lhTest,
    pregnancy_test: log.pregnancyTest,
    sex_activity: log.sexActivity,
    // An empty note is no note, so "has a note" is one test everywhere.
    notes: log.notes?.trim() ? log.notes.trim() : null,
  };

  const { data: updated, error: updateError } = await supabase
    .from("cycle_day_logs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(row as any)
    .eq("user_id", userId)
    .eq("log_date", log.date)
    .select("log_date");

  if (updateError) {
    console.error("[cycle] Could not save day:", updateError.message);
    return { ok: false, message: describe(updateError) };
  }
  if (updated && updated.length > 0) return { ok: true };

  const { error: insertError } = await supabase
    .from("cycle_day_logs")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: userId, ...row } as any);

  if (insertError) {
    console.error("[cycle] Could not create day:", insertError.message);
    return { ok: false, message: describe(insertError) };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The prediction
// ---------------------------------------------------------------------------

export type PredictionResult =
  | { ok: true; prediction: CyclePrediction | null }
  | { ok: false; message: string };

/**
 * What the database says about one day.
 *
 * NO ROWS MEANS NO PREDICTION, which is the ordinary case rather than an edge:
 * a user with no settings, with the tracker off, or with nothing logged gets
 * an empty set, and every screen shows its setup state. That is different from
 * a failed read, which leaves whatever is on screen alone.
 */
export async function getCyclePrediction(on?: string): Promise<PredictionResult> {
  const { data, error } = await supabase.rpc(
    "my_cycle_prediction",
    on ? { p_on: on } : undefined
  );

  if (error) {
    console.error("[cycle] Could not read the prediction:", error.message);
    return { ok: false, message: describe(error) };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: true, prediction: null };

  const known = new Set<string>(CYCLE_FLAGS);
  return {
    ok: true,
    prediction: {
      phase: row.phase,
      cycleDay: row.cycle_day ?? null,
      nextPeriodStart: row.next_period_start ?? null,
      nextPeriodFrom: row.next_period_from ?? null,
      nextPeriodTo: row.next_period_to ?? null,
      ovulationEstimate: row.ovulation_estimate ?? null,
      fertileFrom: row.fertile_from ?? null,
      fertileTo: row.fertile_to ?? null,
      confidence: row.confidence ?? null,
      irregular: Boolean(row.irregular),
      // A flag with no copy is DROPPED rather than rendered raw. If the
      // database learns a new one before this app does, the user sees one
      // fewer card instead of the string "oligomenorrhoea".
      flags: ((row.flags ?? []) as string[]).filter((f): f is CycleFlag => known.has(f)),
      pregnancyWeek: row.pregnancy_week ?? null,
      pregnancyDay: row.pregnancy_day ?? null,
      trimester: row.trimester ?? null,
    },
  };
}

/** Removes every cycle row this account has. Irreversible, by design. */
export async function deleteAllCycleData(): Promise<WriteResult> {
  const { error } = await supabase.rpc("delete_my_cycle_data");
  if (error) {
    console.error("[cycle] Could not delete cycle data:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The professional's two reads
// ---------------------------------------------------------------------------

/**
 * A client's phase — one word, or `unavailable`.
 *
 * THE FUNCTION, NEVER THE TABLES. client_cycle_phase checks has_client_access
 * itself and returns a single enum value: no dates, no cycle day, no flags, no
 * logs. Reading cycle_day_logs directly would be both refused by RLS and the
 * wrong shape of request — the client agreed to share a phase name, and a
 * phase name is all this can ask for.
 */
export async function fetchClientCyclePhase(
  clientId: string
): Promise<{ ok: true; phase: CyclePrediction["phase"] } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("client_cycle_phase", { p_client: clientId });
  if (error) {
    console.error("[cycle] Could not read the client's phase:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, phase: (data as CyclePrediction["phase"]) ?? "unavailable" };
}

/** A client's pregnancy status and trimester, behind its own grant. */
export async function fetchClientPregnancy(
  clientId: string
): Promise<
  { ok: true; status: string; trimester: number | null } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("client_pregnancy_status", { p_client: clientId });
  if (error) {
    console.error("[cycle] Could not read the client's pregnancy status:", error.message);
    return { ok: false, message: describe(error) };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    status: (row?.status as string) ?? "unavailable",
    trimester: (row?.trimester as number | null) ?? null,
  };
}
