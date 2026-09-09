import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Medication, Surgery } from "../../types";

// A client's own medical history: medications, surgeries and comorbidities.
//
// THE MOST SENSITIVE CATEGORY IN THE APP, and the reason `medical_history`
// was split out of `health_metrics` in the first place: one switch covering
// step counts and surgical history meant consent given against it was not
// informed. Everything here is read by a professional only under that
// separate grant, and never written by one — the tables carry no
// professional INSERT/UPDATE/DELETE policy at all.
//
// INSERT AND DELETE, NEVER UPSERT, for the same reason as health_metrics and
// workout_sessions: every UPDATE grant on these three tables is column-scoped
// and deliberately excludes user_id, so `.upsert()` — which compiles to
// INSERT … ON CONFLICT DO UPDATE and writes every column in the payload —
// would raise 42501 the moment a row conflicted. The one genuine update path
// here is the medication reminder toggle, which uses `.update()` with just the
// columns it changes and therefore stays inside the grant.
//
// NO DATE ARITHMETIC ANYWHERE IN THIS FILE, deliberately. surgery_date is a
// plain `date`, not a timestamptz: it is a historical fact the user asserts,
// not a record of when they logged something. `<input type="date">` already
// yields yyyy-mm-dd, which is exactly what the column takes, so none of the
// local-day machinery that food, workouts and weight need applies here. The
// only reason `today` appears near surgeries at all is to stop the picker
// offering a future date.

export interface MedicalWriteResult {
  ok: boolean;
  message?: string;
}

function describe(error: PostgrestError, subject: string): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  if (code === "23502") {
    return `That ${subject} is missing something required.`;
  }
  return `Couldn't save that ${subject}. Check your connection and try again.`;
}

/**
 * Postgres `time` comes back as "08:00:00"; the UI deals in "08:00".
 *
 * Normalised on READ rather than on write, because the column is the thing
 * with the wider format — sending "08:00" is accepted and stored exactly —
 * so this is the only place the two representations can drift.
 */
function toHHMM(t: string): string {
  return t.slice(0, 5);
}

// --- surgeries --------------------------------------------------------------

/**
 * A surgery needs a date, and the caller is expected to have required one.
 *
 * surgery_date is `date NOT NULL`, so the "Not dated" sentinel this app used
 * locally has nowhere to go. The three alternatives were all worse: storing a
 * placeholder date would write a false fact into a medical record, keeping
 * undated entries local-only would rebuild the two-id-space problem the
 * workout log refused, and dropping them silently is not an option at all. So
 * the UI requires a date and explains why.
 *
 * That is a workaround for a schema that cannot currently say "I don't
 * remember exactly when", which is an ordinary answer about a surgery. See
 * the README follow-up; when surgery_date becomes nullable this guard relaxes
 * and nothing else here changes.
 */
export async function addSurgeryRemote(
  userId: string,
  surgery: Omit<Surgery, "id">
): Promise<MedicalWriteResult & { id?: string }> {
  if (!surgery.date || !/^\d{4}-\d{2}-\d{2}$/.test(surgery.date)) {
    return { ok: false, message: "Add the date of this surgery before saving." };
  }
  const { data, error } = await supabase
    .from("surgeries")
    .insert({ user_id: userId, name: surgery.name, surgery_date: surgery.date })
    .select("id")
    .single();

  if (error) {
    console.error("[medical-history] Could not save surgery:", error.message);
    return { ok: false, message: describe(error, "surgery") };
  }
  return { ok: true, id: data.id };
}

export async function deleteSurgeryRemote(id: string): Promise<MedicalWriteResult> {
  // Row count, not absence of error: a policy refusal on DELETE returns zero
  // rows with error === null, so `if (error)` is not a check.
  const { data, error } = await supabase.from("surgeries").delete().eq("id", id).select("id");
  if (error) {
    console.error("[medical-history] Could not remove surgery:", error.message);
    return { ok: false, message: "That surgery couldn't be removed." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That surgery couldn't be removed." };
  }
  return { ok: true };
}

// --- medications ------------------------------------------------------------

export async function addMedicationRemote(
  userId: string,
  med: Omit<Medication, "id">
): Promise<MedicalWriteResult & { id?: string }> {
  const { data, error } = await supabase
    .from("medications")
    .insert({
      user_id: userId,
      name: med.name,
      dose: med.dose,
      route: med.route,
      times: med.times,
      notify_enabled: med.notifyEnabled,
      notes: med.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[medical-history] Could not save medication:", error.message);
    return { ok: false, message: describe(error, "medication") };
  }
  return { ok: true, id: data.id };
}

/**
 * Targeted update — currently only the reminder toggle uses it.
 *
 * Sends ONLY the columns that changed, which is what keeps it inside the
 * column-scoped UPDATE grant. Adding user_id here, or reaching for upsert,
 * would fail with 42501.
 */
export async function updateMedicationRemote(
  id: string,
  patch: Partial<Omit<Medication, "id">>
): Promise<MedicalWriteResult> {
  // Typed to the columns the grant actually allows, rather than a loose
  // record: the generated Update type rejects excess properties, which is
  // exactly the guard that would catch someone adding user_id here.
  const row: {
    name?: string;
    dose?: string;
    route?: Medication["route"];
    times?: string[];
    notify_enabled?: boolean;
    notes?: string | null;
  } = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.dose !== undefined) row.dose = patch.dose;
  if (patch.route !== undefined) row.route = patch.route;
  if (patch.times !== undefined) row.times = patch.times;
  if (patch.notifyEnabled !== undefined) row.notify_enabled = patch.notifyEnabled;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (Object.keys(row).length === 0) return { ok: true };

  const { data, error } = await supabase
    .from("medications")
    .update(row)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[medical-history] Could not update medication:", error.message);
    return { ok: false, message: "That change couldn't be saved." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That change couldn't be saved." };
  }
  return { ok: true };
}

export async function deleteMedicationRemote(id: string): Promise<MedicalWriteResult> {
  const { data, error } = await supabase.from("medications").delete().eq("id", id).select("id");
  if (error) {
    console.error("[medical-history] Could not remove medication:", error.message);
    return { ok: false, message: "That medication couldn't be removed." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That medication couldn't be removed." };
  }
  return { ok: true };
}

// --- comorbidities ----------------------------------------------------------

/**
 * Adds one condition.
 *
 * The table has NO uniqueness constraint, and that is deliberate on the
 * database's side — its comment says near-duplicate phrasings are the user's
 * to resolve. So this cannot rely on a conflict to deduplicate, and the
 * caller checks membership before calling.
 */
export async function addComorbidityRemote(
  userId: string,
  condition: string
): Promise<MedicalWriteResult & { id?: string }> {
  const { data, error } = await supabase
    .from("comorbidities")
    .insert({ user_id: userId, condition })
    .select("id")
    .single();

  if (error) {
    console.error("[medical-history] Could not save condition:", error.message);
    return { ok: false, message: describe(error, "condition") };
  }
  return { ok: true, id: data.id };
}

/**
 * Removes a condition by NAME, deleting every row that carries it.
 *
 * Deleting by name rather than by id, and all matches rather than one,
 * because nothing stops two rows holding the same condition — no unique
 * index, and two clients could both insert it. The UI shows one chip per
 * distinct condition, so turning that chip off has to clear all of them or
 * the chip would reappear on the next hydration, having apparently un-deleted
 * itself.
 */
export async function removeComorbidityRemote(
  userId: string,
  condition: string
): Promise<MedicalWriteResult> {
  const { data, error } = await supabase
    .from("comorbidities")
    .delete()
    .eq("user_id", userId)
    .eq("condition", condition)
    .select("id");

  if (error) {
    console.error("[medical-history] Could not remove condition:", error.message);
    return { ok: false, message: "That condition couldn't be removed." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That condition couldn't be removed." };
  }
  return { ok: true };
}

// --- read -------------------------------------------------------------------

export interface MedicalHistory {
  comorbidities: string[];
  surgeries: Surgery[];
  medications: Medication[];
}

export type MedicalHistoryResult =
  | { ok: true; history: MedicalHistory }
  | { ok: false; message: string };

/** Distinct conditions, oldest first, so duplicate rows collapse to one chip
 *  without either of them being deleted behind the user's back. */
function distinctConditions(rows: { condition: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    if (seen.has(r.condition)) continue;
    seen.add(r.condition);
    out.push(r.condition);
  }
  return out;
}

/**
 * Reads all three lists for one user.
 *
 * Three queries rather than one: they are separate tables with no join worth
 * making, and issuing them together costs one round trip's latency rather
 * than three.
 *
 * Reports `ok: false` rather than empty lists on failure. An empty medical
 * history and an unreadable one are opposite claims, and rendering "no
 * medications" over a dropped connection is a clinical statement nobody made.
 */
export async function getMedicalHistory(userId: string): Promise<MedicalHistoryResult> {
  const [cond, surg, meds] = await Promise.all([
    supabase
      .from("comorbidities")
      .select("condition, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("surgeries")
      .select("id, name, surgery_date")
      .eq("user_id", userId)
      .order("surgery_date", { ascending: false }),
    supabase
      .from("medications")
      .select("id, name, dose, route, times, notify_enabled, notes")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const failure = cond.error ?? surg.error ?? meds.error;
  if (failure) {
    console.error("[medical-history] Could not load history:", failure.message);
    return { ok: false, message: "Could not load your medical records." };
  }

  return {
    ok: true,
    history: {
      comorbidities: distinctConditions(cond.data ?? []),
      surgeries: (surg.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        date: s.surgery_date,
      })),
      medications: (meds.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        dose: m.dose,
        route: m.route,
        times: (m.times ?? []).map(toHHMM),
        notifyEnabled: m.notify_enabled,
        ...(m.notes ? { notes: m.notes } : {}),
      })),
    },
  };
}
