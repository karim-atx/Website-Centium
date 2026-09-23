import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { recordedAtFor } from "../health-metrics";

// Manually logged blood pressure, in public.blood_pressure_readings
// (migration 20260924000000). Same model as health-metrics: INSERT-ONLY, a
// reading is "this was the pressure at recorded_at", and a day's value is its
// latest reading. See services/health-metrics for why snapshots are appended
// rather than upserted.

// Match the table's check constraints so a typo becomes a sentence instead of
// a constraint violation. Wide plausibility bounds, not clinical ranges.
export const BP_LIMITS = { systolic: { min: 50, max: 300 }, diastolic: { min: 20, max: 200 } } as const;

export interface BloodPressure {
  systolic: number;
  diastolic: number;
}

export type BloodPressureWriteResult = { ok: true } | { ok: false; message: string };
export type BloodPressureReadResult = { ok: true; reading: BloodPressure | null } | { ok: false; message: string };

// The migration has to be applied by hand. Until it is, PostgREST reports the
// table as missing; say exactly that rather than a generic failure.
const TABLE_MISSING_MESSAGE =
  "Blood pressure can't be saved yet — the database update for it hasn't been applied.";

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST205" || code === "42P01") return TABLE_MISSING_MESSAGE;
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  if (code === "23514") return "Check those numbers — systolic should be higher than diastolic.";
  return "Couldn't save that. Check your connection and try again.";
}

/** Validates a pair before it is written. Returns an error sentence, or null when fine. */
export function validateBloodPressure(bp: BloodPressure): string | null {
  const { systolic, diastolic } = bp;
  if (!Number.isInteger(systolic) || !Number.isInteger(diastolic)) return "Enter whole numbers in mmHg.";
  if (systolic < BP_LIMITS.systolic.min || systolic > BP_LIMITS.systolic.max) {
    return `Systolic should be between ${BP_LIMITS.systolic.min} and ${BP_LIMITS.systolic.max} mmHg.`;
  }
  if (diastolic < BP_LIMITS.diastolic.min || diastolic > BP_LIMITS.diastolic.max) {
    return `Diastolic should be between ${BP_LIMITS.diastolic.min} and ${BP_LIMITS.diastolic.max} mmHg.`;
  }
  if (systolic <= diastolic) return "Systolic should be higher than diastolic.";
  return null;
}

/** Appends one reading filed under `day` (the diary's selected day). */
export async function logBloodPressure(params: {
  userId: string;
  reading: BloodPressure;
  day: string;
  today: string;
}): Promise<BloodPressureWriteResult> {
  const invalid = validateBloodPressure(params.reading);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await supabase.from("blood_pressure_readings").insert({
    user_id: params.userId,
    systolic: params.reading.systolic,
    diastolic: params.reading.diastolic,
    recorded_at: recordedAtFor(params.day, params.today),
    source: "manual",
  });
  if (error) {
    console.error("[blood-pressure] Could not save reading:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/**
 * The latest reading on one local day, or null when there is none. Local day
 * bounds, so a reading at 23:30 stays on the day the user was living in.
 */
export async function getBloodPressureForDay(userId: string, day: string): Promise<BloodPressureReadResult> {
  const [y, m, d] = day.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0).toISOString();

  const { data, error } = await supabase
    .from("blood_pressure_readings")
    .select("systolic, diastolic")
    .eq("user_id", userId)
    .gte("recorded_at", start)
    .lt("recorded_at", end)
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[blood-pressure] Could not read readings:", error.message);
    return { ok: false, message: describe(error) };
  }
  const row = data?.[0];
  return { ok: true, reading: row ? { systolic: row.systolic, diastolic: row.diastolic } : null };
}
