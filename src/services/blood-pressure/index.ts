import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { recordedAtFor } from "../health-metrics";

// Manually logged blood pressure, in public.blood_pressure_readings.
//
// ONE ROW PER CUFF INFLATION. Systolic, diastolic and pulse sit on one row
// rather than as three health_metrics entries, because a pair correlated only
// by timestamp comes apart the moment two readings land in the same second —
// and a systolic without its diastolic is not a partial reading, it is a
// meaningless one.
//
// EDITABLE, UNLIKE health_metrics. That module is append-only: a weight is a
// snapshot and re-saving a day replaces it by writing a newer one. A blood
// pressure reading is a distinct event, and correcting a typo in one should
// not delete it and create a different row with a different id — the reading
// still happened at the time it happened. Database-Atraxia 20260924395000 adds
// the UPDATE policy this uses, column-scoped so user_id cannot be reassigned.
//
// THE TABLE IS REAL NOW. This module used to carry a TABLE_MISSING_MESSAGE for
// PGRST205, because its migration sat in the app repo and had been applied
// nowhere; meanwhile a hand-made copy on staging had policies and no DML grant,
// so every write would have failed with 42501 before RLS was consulted. Both
// are fixed, and the message is gone rather than kept "just in case": a
// sentence about an unapplied migration is not something to show a user.

export type BpArm = "left" | "right";
export type BpPosition = "sitting" | "standing" | "lying";

/** Matches the table's CHECKs, so a typo becomes a sentence rather than a 23514. */
export const BP_LIMITS = {
  systolic: { min: 50, max: 300 },
  diastolic: { min: 30, max: 200 },
  pulse: { min: 25, max: 250 },
  notesMaxLength: 500,
} as const;

export const BP_ARMS: readonly BpArm[] = ["left", "right"];
export const BP_POSITIONS: readonly BpPosition[] = ["sitting", "standing", "lying"];

export interface BloodPressureInput {
  systolic: number;
  diastolic: number;
  /** Not every cuff reports one. */
  pulse?: number | null;
  arm?: BpArm | null;
  position?: BpPosition | null;
  notes?: string | null;
}

export interface BloodPressureReading extends BloodPressureInput {
  id: string;
  /** ISO timestamp of the measurement itself, not of the row. */
  recordedAt: string;
}

export type BpWriteResult = { ok: true; id?: string } | { ok: false; message: string };
export type BpListResult =
  | { ok: true; readings: BloodPressureReading[] }
  | { ok: false; message: string };

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  // 23514 is a CHECK the client should already have caught. Naming the likely
  // one is more use than "constraint violated" — every other CHECK on this
  // table is a range the validator below mirrors exactly.
  if (code === "23514") return "Check those numbers — systolic should be higher than diastolic.";
  if (code === "42501") {
    return "You don't have permission to save blood-pressure readings. Sign in again and try once more.";
  }
  return "Couldn't save that. Check your connection and try again.";
}

/**
 * Validates one reading. Returns an error sentence, or null when it is fine.
 *
 * MIRRORS THE DATABASE'S OWN CHECKS, all seven of them, so the user is told
 * what is wrong in their own terms rather than being shown a constraint name.
 * The bounds are deliberately the table's — wide plausibility ranges, not
 * clinical ones — so this never refuses a reading the database would accept.
 */
export function validateBloodPressure(input: BloodPressureInput): string | null {
  const { systolic, diastolic, pulse, arm, position, notes } = input;

  if (!Number.isInteger(systolic) || !Number.isInteger(diastolic)) {
    return "Enter whole numbers in mmHg.";
  }
  if (systolic < BP_LIMITS.systolic.min || systolic > BP_LIMITS.systolic.max) {
    return `Systolic should be between ${BP_LIMITS.systolic.min} and ${BP_LIMITS.systolic.max} mmHg.`;
  }
  if (diastolic < BP_LIMITS.diastolic.min || diastolic > BP_LIMITS.diastolic.max) {
    return `Diastolic should be between ${BP_LIMITS.diastolic.min} and ${BP_LIMITS.diastolic.max} mmHg.`;
  }
  // Strictly greater, matching blood_pressure_readings_order_check. An equal
  // pair has no pulse pressure and an inverted one is a transcription error.
  if (systolic <= diastolic) return "Systolic should be higher than diastolic.";

  if (pulse !== null && pulse !== undefined) {
    if (!Number.isInteger(pulse)) return "Enter a whole number for pulse.";
    if (pulse < BP_LIMITS.pulse.min || pulse > BP_LIMITS.pulse.max) {
      return `Pulse should be between ${BP_LIMITS.pulse.min} and ${BP_LIMITS.pulse.max} bpm.`;
    }
  }
  if (arm != null && !BP_ARMS.includes(arm)) return "Choose which arm you measured.";
  if (position != null && !BP_POSITIONS.includes(position)) return "Choose how you were sitting.";
  if (notes != null && notes.length > BP_LIMITS.notesMaxLength) {
    return `Keep the note under ${BP_LIMITS.notesMaxLength} characters.`;
  }
  return null;
}

/** The row shape, from the app shape. `undefined` becomes null, not absent. */
function toRow(input: BloodPressureInput) {
  return {
    systolic: input.systolic,
    diastolic: input.diastolic,
    pulse: input.pulse ?? null,
    arm: input.arm ?? null,
    position: input.position ?? null,
    // An empty note is no note. Stored as null rather than "" so "has a note"
    // is one test everywhere rather than two.
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };
}

/**
 * Appends one reading.
 *
 * `recordedAt` is the measurement's own instant. A reading filed under a past
 * day gets noon local on that day, the rule services/health-metrics documents:
 * it survives the round trip through UTC without landing on a neighbouring
 * date in any timezone.
 */
export async function logBloodPressure(params: {
  userId: string;
  reading: BloodPressureInput;
  /** yyyy-mm-dd the reading is filed under. */
  day: string;
  /** The app's current local day, so backdating can be detected. */
  today: string;
  /** An exact instant, when the user picked a time rather than just a day. */
  recordedAt?: string;
}): Promise<BpWriteResult> {
  const invalid = validateBloodPressure(params.reading);
  if (invalid) return { ok: false, message: invalid };

  const { data, error } = await supabase
    .from("blood_pressure_readings")
    .insert({
      user_id: params.userId,
      ...toRow(params.reading),
      recorded_at: params.recordedAt ?? recordedAtFor(params.day, params.today),
      // Honest provenance. Device sync writes apple_health / android_health
      // when it exists; nothing does today.
      source: "manual",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[blood-pressure] Could not save reading:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, id: data?.id };
}

/** Corrects an existing reading in place, keeping its id and its history. */
export async function updateBloodPressure(params: {
  id: string;
  reading: BloodPressureInput;
  recordedAt?: string;
}): Promise<BpWriteResult> {
  const invalid = validateBloodPressure(params.reading);
  if (invalid) return { ok: false, message: invalid };

  // Spread rather than a Record<string, unknown>: postgrest-js checks the
  // payload against the table's Update type, and a loose index signature
  // defeats that check rather than passing it.
  const patch = params.recordedAt
    ? { ...toRow(params.reading), recorded_at: params.recordedAt }
    : toRow(params.reading);

  // NO user_id IN THE FILTER, because RLS already provides it: the update
  // policy is `auth.uid() = user_id` on both USING and WITH CHECK, so a row
  // belonging to anyone else is not visible to update in the first place.
  const { error } = await supabase.from("blood_pressure_readings").update(patch).eq("id", params.id);

  if (error) {
    console.error("[blood-pressure] Could not update reading:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

export async function deleteBloodPressure(id: string): Promise<BpWriteResult> {
  const { error } = await supabase.from("blood_pressure_readings").delete().eq("id", id);
  if (error) {
    console.error("[blood-pressure] Could not delete reading:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

function toReading(row: {
  id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  arm: string | null;
  position: string | null;
  notes: string | null;
  recorded_at: string;
}): BloodPressureReading {
  return {
    id: row.id,
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulse: row.pulse,
    // arm and position are free text with a CHECK rather than enums, so they
    // are narrowed here instead of trusted.
    arm: row.arm === "left" || row.arm === "right" ? row.arm : null,
    position:
      row.position === "sitting" || row.position === "standing" || row.position === "lying"
        ? row.position
        : null,
    notes: row.notes,
    recordedAt: row.recorded_at,
  };
}

const COLUMNS = "id, systolic, diastolic, pulse, arm, position, notes, recorded_at";

/**
 * Every reading since `sinceDay`, NEWEST FIRST.
 *
 * Newest first because every consumer wants the latest one and the list is
 * read top-down; anything needing chronological order reverses a copy.
 *
 * An empty list is `ok: true`, and a failed read is `ok: false`. Those mean
 * opposite things and the caller has to be able to tell them apart — one is an
 * empty state, the other is "we could not ask".
 */
export async function getBloodPressureReadings(
  userId: string,
  sinceDay: string
): Promise<BpListResult> {
  const { data, error } = await supabase
    .from("blood_pressure_readings")
    .select(COLUMNS)
    .eq("user_id", userId)
    .gte("recorded_at", `${sinceDay}T00:00:00Z`)
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[blood-pressure] Could not read readings:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, readings: (data ?? []).map(toReading) };
}

/**
 * The latest reading on one local day, or null.
 *
 * Local day bounds, so a reading at 23:30 stays on the day the user was living
 * in rather than sliding into the next UTC one.
 */
export async function getBloodPressureForDay(
  userId: string,
  day: string
): Promise<{ ok: true; reading: BloodPressureReading | null } | { ok: false; message: string }> {
  const [y, m, d] = day.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0).toISOString();

  const { data, error } = await supabase
    .from("blood_pressure_readings")
    .select(COLUMNS)
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
  return { ok: true, reading: row ? toReading(row) : null };
}

/**
 * A professional's read of one client's readings, gated by RLS.
 *
 * NO GRANT CHECK HERE, because the database does it. The policy
 * blood_pressure_readings_select_granted_professional calls has_client_access,
 * which needs both a live relationship and the blood_pressure category
 * switched on — so a client who has not shared simply returns no rows, and
 * this function cannot be made to return any by asking differently.
 */
export async function fetchClientBloodPressure(
  clientIds: string[],
  sinceDay: string
): Promise<{ ok: true; byClient: Record<string, BloodPressureReading[]> } | { ok: false; message: string }> {
  if (clientIds.length === 0) return { ok: true, byClient: {} };

  const { data, error } = await supabase
    .from("blood_pressure_readings")
    .select(`user_id, ${COLUMNS}`)
    .in("user_id", clientIds)
    .gte("recorded_at", `${sinceDay}T00:00:00Z`)
    .order("recorded_at", { ascending: false });

  if (error) {
    console.error("[blood-pressure] Could not read client readings:", error.message);
    return { ok: false, message: describe(error) };
  }

  const byClient: Record<string, BloodPressureReading[]> = {};
  for (const row of data ?? []) {
    (byClient[row.user_id] ??= []).push(toReading(row));
  }
  return { ok: true, byClient };
}
