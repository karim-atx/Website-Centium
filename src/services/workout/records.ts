import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Json } from "../../../lib/supabase/database.types";

// Personal records, and the paused sessions that are not records of anything.
//
// TWO TABLES THAT ONLY LOOK ALIKE. personal_records is append-only history —
// no UPDATE grant and no UPDATE policy at all, so correcting one is a delete
// then an insert, visibly. paused_workout_sessions is the opposite: at most one
// row per (user, routine), overwritten as the session runs, and deleted the
// moment the workout is finished or abandoned.
//
// A PR NAMES EXACTLY ONE MOVEMENT. personal_records takes
// `num_nonnulls(exercise_id, custom_exercise_id) = 1` — stricter than
// logged_exercises' `<= 1`, deliberately: a record naming no movement is not a
// record of anything, and name-keyed PRs are the failure the table was built to
// avoid. The consequence is real and is handled by the caller rather than
// hidden here: a custom movement that has not reached the server yet has no id
// to name, so its record waits until it does.

/** Which movement a record belongs to. Exactly one, never both. */
export type RecordRef =
  | { exercise_id: string; custom_exercise_id: null }
  | { exercise_id: null; custom_exercise_id: string };

export interface PersonalRecordRow {
  id: string;
  /** Resolved through whichever reference is set, never stored on the row. */
  name: string;
  estimatedOneRepMaxKg: number;
  achievedAt: string;
  exerciseId?: string;
  customExerciseId?: string;
}

export interface PersonalRecordsResult {
  /** False means the read failed, which is not "no records" — see every other hydration here. */
  ok: boolean;
  records: PersonalRecordRow[];
  message?: string;
}

export interface WriteResult {
  ok: boolean;
  message?: string;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "42501") return "You don't have permission to do that.";
  if (code === "23503") return "That exercise no longer exists.";
  if (code === "23514") return "That number is outside the range this can store.";
  if (isOffline(error)) return OFFLINE_MESSAGE;
  return "Something went wrong. Please try again.";
}

const DEFINITION = "id, name";

interface CurrentRow {
  id: string;
  exercise_id: string | null;
  custom_exercise_id: string | null;
  estimated_one_rep_max_kg: number;
  achieved_at: string;
  exercises: { id: string; name: string } | null;
  custom_exercise_library_items: { id: string; name: string } | null;
}

/**
 * The best record per movement, read from public.current_personal_records.
 *
 * NOT AGGREGATED HERE, on the view's own instruction. It is `distinct on
 * (user_id, exercise_id, custom_exercise_id)` ordered by
 * estimated_one_rep_max_kg DESC — the BEST ever achieved, with achieved_at only
 * breaking ties. Until 20260916210000 it ordered by achieved_at first, so a
 * later but lower estimate displaced a better earlier one and the "current
 * personal record" could go down. Re-implementing that sort on this side would
 * be one more place for it to be wrong.
 *
 * The name comes from the referenced movement, never from the record: a record
 * keyed by name "breaks the moment a name is edited" is the whole reason this
 * table exists.
 */
export async function getPersonalRecords(userId: string): Promise<PersonalRecordsResult> {
  const { data, error } = await supabase
    .from("current_personal_records")
    .select(
      `id, exercise_id, custom_exercise_id, estimated_one_rep_max_kg, achieved_at, ` +
        `exercises(${DEFINITION}), custom_exercise_library_items(${DEFINITION})`
    )
    .eq("user_id", userId);

  if (error) {
    console.error("[records] Could not read personal records:", error.message);
    return { ok: false, records: [], message: describe(error) };
  }

  const records: PersonalRecordRow[] = [];
  for (const row of (data ?? []) as unknown as CurrentRow[]) {
    const def = row.exercises ?? row.custom_exercise_library_items;
    // A record whose movement no longer resolves. exercise_id cascades on
    // delete and custom_exercise_id does too, so this should be unreachable;
    // dropping it beats rendering a nameless number.
    if (!def) continue;
    records.push({
      id: row.id,
      name: def.name,
      estimatedOneRepMaxKg: Number(row.estimated_one_rep_max_kg),
      achievedAt: row.achieved_at,
      exerciseId: row.exercise_id ?? undefined,
      customExerciseId: row.custom_exercise_id ?? undefined,
    });
  }
  return { ok: true, records };
}

/**
 * Appends one record.
 *
 * NO UPSERT AND NO UPDATE, because the table grants neither. Every improvement
 * is a new row and the view reports the best of them, which is what makes a PR
 * history rather than a mutable number.
 */
export async function recordPersonalRecord(
  userId: string,
  ref: RecordRef,
  estimatedOneRepMaxKg: number,
  achievedAt: string,
  sourceLoggedSetId?: string | null
): Promise<WriteResult> {
  const { error } = await supabase.from("personal_records").insert({
    user_id: userId,
    ...ref,
    // numeric(7,2): rounded here so a float artefact never trips the
    // `> 0` check on a value the UI considered fine.
    estimated_one_rep_max_kg: Math.round(estimatedOneRepMaxKg * 100) / 100,
    achieved_at: achievedAt,
    source_logged_set_id: sourceLoggedSetId ?? null,
  });

  if (error) {
    console.error("[records] Could not write personal record:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

// --- paused sessions -------------------------------------------------------

export interface PausedState {
  /** The client's own LoggedExercise[], stored verbatim. */
  logged: unknown[];
  elapsedSec: number;
  startedAt: string;
  started: boolean;
}

export interface PausedSessionsResult {
  ok: boolean;
  /** Keyed by routine id, which is how the client has always held these. */
  byRoutineId: Record<string, PausedState>;
  message?: string;
}

/**
 * logged_state CARRIES `started` AS WELL AS THE SETS.
 *
 * The table has elapsed_sec and started_at as real columns and one jsonb for
 * the rest; the client's fourth field — whether the clock had been started —
 * has no column of its own and folding it in beats adding one for a boolean
 * that only this screen understands. `{ started, logged }` rather than a bare
 * array, which is also why the read below accepts both shapes: the column
 * defaults to `'[]'` and a row written by anything else may be the array.
 */
function toState(row: {
  elapsed_sec: number;
  started_at: string;
  logged_state: unknown;
}): PausedState {
  const state = row.logged_state;
  const isWrapped = !!state && typeof state === "object" && !Array.isArray(state);
  const wrapped = isWrapped ? (state as { started?: unknown; logged?: unknown }) : null;

  return {
    logged: Array.isArray(state) ? state : Array.isArray(wrapped?.logged) ? wrapped.logged : [],
    elapsedSec: row.elapsed_sec,
    startedAt: row.started_at,
    started: wrapped?.started === true,
  };
}

export async function getPausedSessions(userId: string): Promise<PausedSessionsResult> {
  const { data, error } = await supabase
    .from("paused_workout_sessions")
    .select("routine_id, elapsed_sec, started_at, logged_state")
    .eq("user_id", userId);

  if (error) {
    console.error("[records] Could not read paused sessions:", error.message);
    return { ok: false, byRoutineId: {}, message: describe(error) };
  }

  const byRoutineId: Record<string, PausedState> = {};
  for (const row of data ?? []) byRoutineId[row.routine_id] = toState(row);
  return { ok: true, byRoutineId };
}

/**
 * Writes or replaces the resume state for one routine.
 *
 * UPDATE FIRST, INSERT ONLY IF NOTHING WAS THERE — deliberately NOT an upsert,
 * and this was measured rather than assumed. `.upsert()` compiles to
 * INSERT … ON CONFLICT DO UPDATE SET every column in the payload, which here
 * includes user_id and routine_id. The UPDATE grant on this table is
 * column-scoped to (elapsed_sec, started_at, logged_state), so the upsert was
 * refused outright with 42501 — "permission denied for table
 * paused_workout_sessions" — and quitting a workout silently failed to save
 * its resume state. The three columns this updates are exactly the three the
 * grant names, which is also the only three that can change.
 *
 * `paused_workout_sessions_unique_pair unique (user_id, routine_id)` still
 * does the work of keeping this to one row per routine: the insert below can
 * only be reached when the update matched nothing.
 *
 * A FREEFORM SESSION CANNOT BE PAUSED, and that is the table's rule rather than
 * this app's preference: routine_id is NOT NULL. The caller does not offer the
 * option; if it ever did, this would refuse it rather than invent a routine.
 */
export async function savePausedSession(
  userId: string,
  routineId: string,
  state: PausedState
): Promise<WriteResult> {
  const columns = {
    elapsed_sec: Math.max(0, Math.round(state.elapsedSec)),
    started_at: state.startedAt,
    // Cast at the boundary: LoggedExercise is a plain JSON-safe shape, but
    // the generated Json type cannot know that about `unknown[]`.
    logged_state: { started: state.started, logged: state.logged } as unknown as Json,
  };

  const { data: updated, error: updateError } = await supabase
    .from("paused_workout_sessions")
    .update(columns)
    .eq("user_id", userId)
    .eq("routine_id", routineId)
    .select("routine_id");

  if (updateError) {
    console.error("[records] Could not update paused session:", updateError.message);
    return { ok: false, message: describe(updateError) };
  }
  if (updated && updated.length > 0) return { ok: true };

  const { error: insertError } = await supabase
    .from("paused_workout_sessions")
    .insert({ user_id: userId, routine_id: routineId, ...columns });

  if (insertError) {
    console.error("[records] Could not save paused session:", insertError.message);
    return { ok: false, message: describe(insertError) };
  }
  return { ok: true };
}

export async function clearPausedSession(
  userId: string,
  routineId: string
): Promise<WriteResult> {
  const { error } = await supabase
    .from("paused_workout_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("routine_id", routineId);

  if (error) {
    console.error("[records] Could not clear paused session:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
