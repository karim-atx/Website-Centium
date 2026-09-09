import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { LoggedExercise, LoggedSet, WorkoutSession } from "../../types";

// A client's own training log: workout_sessions, and the logged_exercises /
// logged_sets hanging off it.
//
// Until now this lived entirely in localStorage, which is why the
// professional dashboard's "N of M trained" hero has never had anything to
// show — the read policies were built long ago and the client app simply
// never wrote a row.
//
// TWO FOREIGN KEYS ARE DELIBERATELY LEFT NULL, and this is not a shortcut.
// workout_sessions.routine_id references public.routines, and
// logged_exercises.exercise_id references public.exercises. Neither table is
// ever read or written by this app: routines are usePersistentState seeded
// from static data with ids like "routine-p1", and the exercise library is
// static with ids like "ex1". Writing those strings into a uuid column fails
// outright — the same way mock food ids like "f7" failed during the diary
// work. The information is not lost: routine_name and name are both NOT NULL
// and carry it, which is the resolved-snapshot pattern food_log_entries
// already uses. If those catalogues ever move server-side, the FKs become
// fillable and nothing else here has to change.

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
      // See the header: local routine ids are not uuids and public.routines
      // holds no matching row. routine_name carries it instead.
      routine_id: null,
      routine_name: session.routineName,
      started_at: session.startedAt,
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
        exercise_id: null, // See the header.
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
  logged_exercises: {
    id: string;
    name: string;
    position: number;
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
      "id, routine_name, started_at, ended_at, duration_sec, total_volume_kg, notes, logged_exercises(id, name, position, logged_sets(set_number, reps, weight_kg, completed, set_type, notes, rpe, mood, pain))"
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
        // No exercise_id was written, so the library id cannot be recovered.
        // The name is what every consumer actually displays.
        exerciseId: ex.id,
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
      routineId: null,
      routineName: r.routine_name,
      // The table has no date column; the day is whatever started_at fell on.
      date: r.started_at.slice(0, 10),
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
