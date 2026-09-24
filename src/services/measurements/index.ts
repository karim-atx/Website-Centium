import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

// Tape-measure readings and body fat, in public.health_metrics.
//
// FOURTEEN METRIC TYPES, NOT A TABLE OF THEIR OWN. Database 20260924310000
// added them to health_metric_type and 20260924320000 gave them their own
// ranges and their own consent category; they are the same shape as weight
// and water — one row per reading, (user_id, metric_type, value, recorded_at).
//
// METRIC ONLY, AND THAT IS THE SCHEMA'S RULE RATHER THAN A UI CHOICE.
// health_metrics has no unit column and never has: the unit is implied by
// metric_type, and every stored length in this database is centimetres
// (profiles.height_cm, routine_exercises.weight_kg, and the rest). There is no
// unit preference anywhere in this app to read, either. Imperial would be a
// display layer over these values and is not one this module pretends to have.
//
// ONE ENTRY IS MANY ROWS SHARING ONE recorded_at. "I measured myself on
// Sunday morning" is a single event that produced a waist and a chest and a
// left arm; storing them with one timestamp is what lets them be read back as
// one entry, compared against the previous one, and edited or deleted
// together. Nothing enforces that at the database — it is a convention this
// module keeps, which is why every writer here goes through one function.

export type {
  MeasurementGroup,
  MeasurementSite,
  MeasurementType,
} from "./sites";
import {
  MEASUREMENT_TYPES,
  checkValue,
  isMeasurementType,
  type MeasurementType,
} from "./sites";
export {
  GROUP_LABEL,
  MEASUREMENT_SITES,
  MEASUREMENT_TYPES,
  RANGE,
  checkValue,
  isMeasurementType,
  siteFor,
} from "./sites";

export interface MeasurementReading {
  /** The health_metrics row id, which is what an edit or a delete addresses. */
  id: string;
  type: MeasurementType;
  value: number;
  recordedAt: string;
}

export interface MeasurementSiteHistory {
  type: MeasurementType;
  /** Newest first, which is the order every surface reads them in. */
  readings: MeasurementReading[];
}

export type MeasurementsResult =
  | { ok: true; bySite: Partial<Record<MeasurementType, MeasurementReading[]>> }
  | { ok: false; message: string };

export interface MeasurementWriteResult {
  ok: boolean;
  message?: string;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  // 23514 is the range CHECK; 22003 is numeric overflow. Both mean the number
  // was out of range, and the client-side check should have caught it — this
  // is the message for the case where it did not.
  if (code === "23514" || code === "22003") {
    return "That measurement is outside the range this can store.";
  }
  return "Couldn't save that. Check your connection and try again.";
}

/**
 * Writes one entry: every filled field, sharing a single recorded_at.
 *
 * ONE INSERT, NOT ONE PER FIELD. PostgREST has no transaction, so a
 * field-by-field loop could leave half an entry behind after a dropped
 * connection — and half an entry is worse than none, because the card would
 * then show a waist measured on Sunday beside a chest measured last month and
 * call them the same reading. A single multi-row insert is atomic in Postgres.
 */
export async function logMeasurements(params: {
  userId: string;
  /** Only the fields that were filled in. An empty object writes nothing. */
  values: Partial<Record<MeasurementType, number>>;
  /** The instant the reading HAPPENED, which the user picks. */
  recordedAt: string;
}): Promise<MeasurementWriteResult> {
  const { userId, values, recordedAt } = params;
  const entries = Object.entries(values).filter(([, v]) => v != null && Number.isFinite(v)) as [
    MeasurementType,
    number,
  ][];
  if (entries.length === 0) return { ok: false, message: "Fill in at least one measurement." };

  for (const [type, value] of entries) {
    const problem = checkValue(type, value);
    if (problem) return { ok: false, message: problem };
  }

  const { error } = await supabase.from("health_metrics").insert(
    entries.map(([type, value]) => ({
      user_id: userId,
      metric_type: type,
      // Rounded to the scale the column stores, so a float artefact never
      // fails a constraint the form considered fine.
      value: Math.round(value * 1000) / 1000,
      recorded_at: recordedAt,
      source: "manual" as const,
    }))
  );

  if (error) {
    console.error("[measurements] Could not save entry:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

const SELECT = "id, metric_type, value, recorded_at";

/**
 * Every measurement this user has recorded, newest first per site.
 *
 * Reports `ok: false` rather than an empty map on failure, for the reason
 * getHealthMetrics does: a dropped connection must never render as "you have
 * never measured yourself".
 */
export async function getMeasurements(userId: string): Promise<MeasurementsResult> {
  const { data, error } = await supabase
    .from("health_metrics")
    .select(SELECT)
    .eq("user_id", userId)
    .in("metric_type", MEASUREMENT_TYPES)
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[measurements] Could not load measurements:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, bySite: groupBySite(data ?? []) };
}

/** The same read, for a client a professional holds the grant for. */
export async function getClientMeasurements(clientId: string): Promise<MeasurementsResult> {
  const { data, error } = await supabase
    .from("health_metrics")
    .select(SELECT)
    .eq("user_id", clientId)
    .in("metric_type", MEASUREMENT_TYPES)
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[measurements] Could not load a client's measurements:", error.message);
    return { ok: false, message: describe(error) };
  }
  // RLS decides what came back. A client who has not granted
  // `body_measurements` produces zero rows here rather than an error, which
  // is why the caller must tell "not shared" from "nothing logged" by asking
  // about the GRANT and never by counting rows.
  return { ok: true, bySite: groupBySite(data ?? []) };
}

type Row = { id: string; metric_type: string; value: number | string; recorded_at: string };

function groupBySite(rows: Row[]): Partial<Record<MeasurementType, MeasurementReading[]>> {
  const bySite: Partial<Record<MeasurementType, MeasurementReading[]>> = {};
  for (const row of rows) {
    if (!isMeasurementType(row.metric_type)) continue;
    (bySite[row.metric_type] ??= []).push({
      id: row.id,
      type: row.metric_type,
      value: Number(row.value),
      recordedAt: row.recorded_at,
    });
  }
  return bySite;
}

/**
 * Changes one reading's value.
 *
 * user_id IS NOT SENT. The UPDATE grant is column-scoped to (metric_type,
 * value, recorded_at, source) — naming the identifying column would be
 * refused with 42501 even where the value is unchanged, which is the same
 * trap services/exercises documents on its own update.
 */
export async function updateMeasurement(
  id: string,
  type: MeasurementType,
  value: number
): Promise<MeasurementWriteResult> {
  const problem = checkValue(type, value);
  if (problem) return { ok: false, message: problem };

  const { data, error } = await supabase
    .from("health_metrics")
    .update({ value: Math.round(value * 1000) / 1000 })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[measurements] Could not update a reading:", error.message);
    return { ok: false, message: describe(error) };
  }
  // A row-policy rejection on UPDATE is SILENT — zero rows, no error — so the
  // returned rows are what says it happened. The same trap deleteDiaryEntry
  // and deleteWorkoutSession both document.
  if (!data || data.length === 0) return { ok: false, message: "That reading couldn't be updated." };
  return { ok: true };
}

export async function deleteMeasurement(id: string): Promise<MeasurementWriteResult> {
  const { data, error } = await supabase.from("health_metrics").delete().eq("id", id).select("id");
  if (error) {
    console.error("[measurements] Could not delete a reading:", error.message);
    return { ok: false, message: describe(error) };
  }
  if (!data || data.length === 0) return { ok: false, message: "That reading couldn't be deleted." };
  return { ok: true };
}
