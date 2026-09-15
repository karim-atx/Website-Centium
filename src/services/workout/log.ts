import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { LoggedExercise, LoggedSet, WorkoutSession } from "../../types";
import { localDayOf } from "../../utils/date";
import { isUuid } from "../food";

// A client's own training log: workout_sessions, and the logged_exercises /
// logged_sets hanging off it.
//
// Until now this lived entirely in localStorage, which is why the
// professional dashboard's "N of M trained" hero has never had anything to
// show — the read policies were built long ago and the client app simply
// never wrote a row.
//
// THE FOREIGN KEYS ARE FILLED IN NOW. This file used to write routine_id and
// exercise_id as null and said why: routines were seeded local state with ids
// like "routine-p1" and the exercise library was static with ids like "ex1",
// so a uuid column could not take them. Both catalogues are real tables since
// Phases 1 and 2, and it closed with "if those catalogues ever move
// server-side, the FKs become fillable and nothing else here has to change."
// They did, and this is that change.
//
// A NON-UUID ID STILL DEGRADES TO NULL RATHER THAN FAILING THE SAVE. Not
// every routine on screen is a row: one built while signed out carries
// `routine1737…`, and a routine mirrored from a workout template carries
// `routine-<templateId>` because templates are still local. A workout logged
// against either is a real workout and must be storable. routine_name is NOT
// NULL and carries the name, which is the same resolved-snapshot arrangement
// food_log_entries uses for a hand-typed food.
//
// NO BACKFILL. Rows written before this carry neither reference and keep only
// their names; nothing here tries to re-derive them. A name match would be a
// guess about what someone trained months ago, and
// logged_exercises_single_source_check permits NEITHER reference precisely so
// those rows remain valid as they are.

export interface WorkoutSaveResult {
  ok: boolean;
  /** The remote session id, present only on success. */
  id?: string;
  message?: string;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this workout.";
  }
  if (code === "23514") {
    return "Some of this workout's numbers were out of range and it couldn't be saved.";
  }
  return "Couldn't save this workout. Check your connection and try again.";
}

/** Rounds to the scale the column actually stores, so a check constraint
 *  never fails on a value the UI considered fine. */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A uuid column takes a uuid or nothing.
 *
 * Postgres rejects a malformed uuid with 22P02 before any constraint is
 * consulted, which would lose the whole session over a reference that is
 * optional anyway. Everything this guards is nullable by design.
 */
const asUuid = (value: string | null | undefined): string | null =>
  value && isUuid(value) ? value : null;

/**
 * Which library row a logged exercise names, if any.
 *
 * `num_nonnulls(exercise_id, custom_exercise_id) <= 1` — never both, and
 * NEITHER is allowed here unlike on routine_exercises. That is what makes a
 * custom movement created offline loggable: it has no row id yet, and the
 * name column carries it until it does.
 */
function exerciseRef(ex: LoggedExercise): {
  exercise_id: string | null;
  custom_exercise_id: string | null;
} {
  const catalogId = asUuid(ex.catalogExerciseId);
  if (catalogId) return { exercise_id: catalogId, custom_exercise_id: null };
  const customId = asUuid(ex.customExerciseId);
  if (customId) return { exercise_id: null, custom_exercise_id: customId };
  return { exercise_id: null, custom_exercise_id: null };
}

/**
 * Writes a completed session and everything under it.
 *
 * THREE INSERTS, NOT ONE, and the order matters: the session first for its
 * id, then the exercises for theirs, then every set in one batch. Postgres
 * has no nested insert here, and doing it child-by-child would be one round
 * trip per set.
 *
 * NOT A TRANSACTION, which is worth stating plainly. PostgREST gives each
 * insert its own, so a failure partway leaves a session with some of its
 * exercises. The cleanup below deletes the session on any child failure, and
 * ON DELETE CASCADE takes the children with it — a best-effort rollback that
 * covers the realistic case (a network drop mid-write) without pretending to
 * be atomic. A stored procedure would be the real fix if this ever matters
 * more than it does today.
 */
export async function saveWorkoutSession(
  userId: string,
  session: Omit<WorkoutSession, "id">
): Promise<WorkoutSaveResult> {
  const { data: sessionRow, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      // Real when the routine is a row, null when it is not — see the header.
      routine_id: asUuid(session.routineId),
      routine_name: session.routineName,
      started_at: session.startedAt,
      // THE DAY THE USER TRAINED, as their own calendar saw it — the same
      // thing food_log_entries.logged_date is, and for the same reason.
      //
      // The workout streak counts unbroken activity days from this column
      // (Database 20260916070000). started_at alone cannot answer it: the
      // sweep would have to pick a timezone, and the only one available
      // server-side is UTC, which puts a 9pm session in Beirut on tomorrow's
      // date and breaks the run. The migration's own backfill had to do
      // exactly that and says so.
      //
      // Derived from started_at rather than "now": a session saved after
      // midnight belongs to the day it began, which is how the person who
      // trained would count it.
      activity_date: localDayOf(session.startedAt),
      ended_at: session.endedAt ?? null,
      duration_sec: Math.max(0, Math.round(session.durationSec)),
      total_volume_kg: round2(Math.max(0, session.totalVolumeKg)),
      notes: session.notes ?? null,
    })
    .select("id")
    .single();

  if (sessionError || !sessionRow) {
    console.error("[workout] Could not save session:", sessionError?.message);
    return { ok: false, message: sessionError ? describe(sessionError) : "Couldn't save this workout." };
  }

  const sessionId = sessionRow.id;
  const abandon = async (message: string): Promise<WorkoutSaveResult> => {
    // Cascade removes the exercises and sets with it.
    await supabase.from("workout_sessions").delete().eq("id", sessionId);
    return { ok: false, message };
  };

  if (session.exercises.length === 0) return { ok: true, id: sessionId };

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("logged_exercises")
    .insert(
      session.exercises.map((ex, i) => ({
        workout_session_id: sessionId,
        ...exerciseRef(ex),
        name: ex.name,
        position: i,
      }))
    )
    .select("id, position");

  if (exerciseError || !exerciseRows) {
    console.error("[workout] Could not save exercises:", exerciseError?.message);
    return abandon(exerciseError ? describe(exerciseError) : "Couldn't save this workout.");
  }

  // Match children back to their parent by position rather than by array
  // order: the insert returns rows, and nothing guarantees the order they
  // come back in matches the order they went out.
  const idByPosition = new Map(exerciseRows.map((r) => [r.position, r.id]));

  const setRows = session.exercises.flatMap((ex, i) => {
    const loggedExerciseId = idByPosition.get(i);
    if (!loggedExerciseId) return [];
    return ex.sets.map((s, j) => ({
      logged_exercise_id: loggedExerciseId,
      // set_number > 0 is a check constraint. The UI is already 1-based, but
      // deriving it here means a caller that isn't cannot violate it.
      set_number: j + 1,
      reps: Math.max(0, Math.round(s.reps)),
      weight_kg: round2(Math.max(0, s.weightKg)),
      completed: s.completed,
      set_type: s.setType ?? null,
      notes: s.notes ?? null,
      rpe: s.rpe ?? null,
      mood: s.mood ?? null,
      pain: s.pain ?? null,
    }));
  });

  if (setRows.length > 0) {
    const { error: setError } = await supabase.from("logged_sets").insert(setRows);
    if (setError) {
      console.error("[workout] Could not save sets:", setError.message);
      return abandon(describe(setError));
    }
  }

  return { ok: true, id: sessionId };
}

export type WorkoutHistoryResult =
  | { ok: true; sessions: WorkoutSession[] }
  | { ok: false; message: string };

type SessionRow = {
  id: string;
  routine_name: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  total_volume_kg: number | null;
  notes: string | null;
  routine_id: string | null;
  logged_exercises: {
    id: string;
    name: string;
    position: number;
    exercise_id: string | null;
    custom_exercise_id: string | null;
    logged_sets: {
      set_number: number;
      reps: number | null;
      weight_kg: number | null;
      completed: boolean;
      set_type: LoggedSet["setType"] | null;
      notes: string | null;
      rpe: number | null;
      mood: number | null;
      pain: number | null;
    }[];
  }[];
};

/**
 * A user's sessions, newest first, with exercises and sets nested.
 *
 * One embedded query rather than three round trips. Returns `ok: false` on
 * failure rather than an empty list, for the reason getDiaryEntries does: the
 * caller replaces local history with this, and treating a network error as
 * "you have never trained" would erase the screen.
 */
export async function getWorkoutSessions(
  userId: string,
  limit = 100
): Promise<WorkoutHistoryResult> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      "id, routine_id, routine_name, started_at, ended_at, duration_sec, total_volume_kg, notes, logged_exercises(id, name, position, exercise_id, custom_exercise_id, logged_sets(set_number, reps, weight_kg, completed, set_type, notes, rpe, mood, pain))"
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[workout] Could not read history:", error.message);
    return { ok: false, message: describe(error) };
  }

  const sessions: WorkoutSession[] = (data ?? []).map((row) => {
    const r = row as unknown as SessionRow;
    const exercises: LoggedExercise[] = [...(r.logged_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ex) => ({
        // The logged_exercises row id, as before. The two library references
        // below are separate, and are both absent on a row written before
        // they could be filled in — no backfill, per the header.
        exerciseId: ex.id,
        ...(ex.exercise_id ? { catalogExerciseId: ex.exercise_id } : {}),
        ...(ex.custom_exercise_id ? { customExerciseId: ex.custom_exercise_id } : {}),
        name: ex.name,
        sets: [...(ex.logged_sets ?? [])]
          .sort((a, b) => a.set_number - b.set_number)
          .map((s) => ({
            setNumber: s.set_number,
            reps: s.reps ?? 0,
            weightKg: s.weight_kg ?? 0,
            completed: s.completed,
            ...(s.set_type ? { setType: s.set_type } : {}),
            ...(s.notes ? { notes: s.notes } : {}),
            ...(s.rpe != null ? { rpe: s.rpe } : {}),
            ...(s.mood != null ? { mood: s.mood } : {}),
            ...(s.pain != null ? { pain: s.pain } : {}),
          })),
      }));

    return {
      id: r.id,
      routineId: r.routine_id,
      routineName: r.routine_name,
      // The table has no date column; the day is whatever started_at fell on
      // LOCALLY. Slicing the ISO string instead would give the UTC day, which
      // is a different day for part of every night and would not match what
      // WorkoutSessionSheet wrote or what the streak anchors compare against.
      date: localDayOf(r.started_at),
      startedAt: r.started_at,
      endedAt: r.ended_at ?? undefined,
      durationSec: r.duration_sec ?? 0,
      totalVolumeKg: r.total_volume_kg ?? 0,
      exercises,
      ...(r.notes ? { notes: r.notes } : {}),
    };
  });

  return { ok: true, sessions };
}

export type WorkoutMutationResult = { ok: boolean; message?: string };

/**
 * Deletes a session. Exercises and sets go with it via ON DELETE CASCADE.
 *
 * Checks the returned rows rather than just the error, because a row-policy
 * rejection on DELETE is SILENT — zero rows affected, `error` null — so
 * `if (error)` would report success on a delete that did nothing. The same
 * trap deleteDiaryEntry documents.
 */
export async function deleteWorkoutSession(sessionId: string): Promise<WorkoutMutationResult> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .select("id");

  if (error) {
    console.error("[workout] Could not delete session:", error.message);
    return { ok: false, message: describe(error) };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That workout couldn't be deleted." };
  }
  return { ok: true };
}

/**
 * Edits the session's own fields. Exercises and sets are not touched here —
 * re-logging a session's contents is a different operation, and no UI asks
 * for it today.
 *
 * Same row-count check as delete, for the same silent-rejection reason.
 */
export async function updateWorkoutSession(
  sessionId: string,
  patch: { routineName?: string; notes?: string | null }
): Promise<WorkoutMutationResult> {
  const row = {
    ...(patch.routineName !== undefined && { routine_name: patch.routineName }),
    ...(patch.notes !== undefined && { notes: patch.notes }),
  };
  if (Object.keys(row).length === 0) return { ok: true };

  const { data, error } = await supabase
    .from("workout_sessions")
    .update(row)
    .eq("id", sessionId)
    .select("id");

  if (error) {
    console.error("[workout] Could not update session:", error.message);
    return { ok: false, message: describe(error) };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "That workout couldn't be updated." };
  }
  return { ok: true };
}
