// Release 3 · W5 Library › Programmes (TR1, TR6, TR7, TR14, TR22): the
// professional's reads beyond the template store in AppContext
// (services/templates). Database HANDOVER_API.md "Release 3", DB-3 and DB-5.
//
// - client_adherence(p_client_id, p_days, p_until): the assigned list's ring
//   (14 days, as W3) and TR7's week cells (7 days per programme week).
// - workout_sessions (+ logged_exercises / logged_sets), behind the client's
//   Workout activity switch (workout_sessions_select_granted_professional),
//   with Release 3's swaps and results_sent_at.
// - routines / routine_exercises: the client's copy, readable by the
//   professional who assigned it; writable through set_routine_exercises
//   while the client is connected (Release 3 follow-up 20261124150000,
//   can_edit_client_routine). Edits replace the whole list, so every stored
//   key is read back and re-sent (the client's pinned_note included).
// - current_personal_records: a client's estimated 1RM, behind Progress
//   (personal_records_select_granted_professional; the view is
//   security_invoker).
// - TR22 reply and "Mark as reviewed": services/workout/logReplies (Round D).

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { setTypesColumn } from "../templates/setTypes";
import { prescribedSetCount, readSetTargets, setTargetsColumn } from "../workout/setTargets";
import { SESSION_SELECT, toWorkoutSession } from "../workout/log";
import { rpc } from "./rpc";
import { tk } from "../../i18n/core";
import type { Read } from "./clients";
import type { BlockKind, Exercise, ExerciseClassification, MuscleGroup, PrescribedSetType, SetTarget, WorkoutBlock, WorkoutSession } from "../../types";

const fail = (error: unknown): { ok: false; offline: boolean } => ({ ok: false, offline: isOffline(error) });

/** client_adherence over `days` ending `until`; null = nothing planned it can count (or not shared). */
export async function fetchAdherence(clientId: string, days: number, until: string): Promise<Read<{ planned: number; completed: number; pct: number | null } | null>> {
  const { data, error } = await rpc("client_adherence", { p_client_id: clientId, p_days: days, p_until: until });
  if (error) return fail(error);
  const r = ((data ?? []) as { planned: number | null; completed: number | null; pct: number | null }[])[0];
  if (!r) return { ok: true, data: null };
  return { ok: true, data: { planned: r.planned ?? 0, completed: r.completed ?? 0, pct: r.pct } };
}

export interface ProgrammeSession extends WorkoutSession {
  userId: string;
  swaps: unknown;
  resultsSentAt: string | null;
}

const toProgrammeSession = (row: unknown): ProgrammeSession => {
  const r = row as { user_id: string; swaps: unknown; results_sent_at: string | null };
  return { ...toWorkoutSession(row), userId: r.user_id, swaps: r.swaps ?? null, resultsSentAt: r.results_sent_at ?? null };
};

/** The sessions logged against the routines these assignments produced, newest first. */
export async function fetchProgrammeSessions(routineIds: string[], limit = 200): Promise<Read<ProgrammeSession[]>> {
  if (routineIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`user_id, swaps, results_sent_at, ${SESSION_SELECT}`)
    .in("routine_id", routineIds)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) return fail(error);
  return { ok: true, data: (data ?? []).map(toProgrammeSession) };
}

/** One session (TR22). */
export async function fetchSession(sessionId: string): Promise<Read<ProgrammeSession | null>> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`user_id, swaps, results_sent_at, ${SESSION_SELECT}`)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) return fail(error);
  return { ok: true, data: data ? toProgrammeSession(data) : null };
}

// ---------------------------------------------------------------------------
// TR6: the client's own copy, read only
// ---------------------------------------------------------------------------

interface DefinitionRow {
  id: string;
  name: string;
  classification: ExerciseClassification;
  muscle_groups: MuscleGroup[];
  secondary_muscle_groups: MuscleGroup[];
}

/** set_routine_exercises' item keys (everything but position, which is the array order). */
const ITEM_KEYS = [
  "exercise_id", "custom_exercise_id", "sets", "reps", "weight_kg", "min_sets", "max_sets", "min_reps", "max_reps",
  "intensity_pct", "rep_max_kg", "rep_max_update_mode", "rest_seconds", "rpe", "tempo", "estimated_one_rep_max_kg",
  "cardio_duration_min", "cardio_distance_km", "cardio_incline_pct", "cardio_pace_min_per_km", "cardio_avg_heart_rate",
  "duration_seconds", "block_id", "endurance_plan", "pinned_note", "coach_note", "set_types", "set_targets",
] as const;

interface CopyExerciseRow {
  id: string;
  position: number;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  min_sets: number | null;
  max_sets: number | null;
  min_reps: number | null;
  max_reps: number | null;
  intensity_pct: number | null;
  rest_seconds: number | null;
  rpe: number | null;
  tempo: string | null;
  block_id: string | null;
  coach_note: string | null;
  set_types: (PrescribedSetType | null)[] | null;
  set_targets: (SetTarget | null)[] | null;
  exercises: DefinitionRow | null;
  custom_exercise_library_items: DefinitionRow | null;
}

export interface ClientCopy {
  routineId: string;
  name: string;
  updatedAt: string;
  exercises: Exercise[];
  blocks: WorkoutBlock[];
  /** Each exercise's stored item, by exercise (row) id, for a whole-list save. */
  items: Record<string, Record<string, unknown>>;
}

const n = (v: number | null) => (v == null ? undefined : Number(v));

export async function fetchClientCopy(routineId: string): Promise<Read<ClientCopy | null>> {
  const def = "id, name, classification, muscle_groups, secondary_muscle_groups";
  const { data, error } = await supabase
    .from("routines")
    .select(
      "id, name, updated_at, routine_exercise_blocks(id, kind, label, time_cap_seconds, interval_seconds, rounds), " +
        "routine_exercises(id, position, " + ITEM_KEYS.join(", ") + ", " +
        `exercises(${def}), custom_exercise_library_items(${def}))`
    )
    .eq("id", routineId)
    .maybeSingle();
  if (error) return fail(error);
  if (!data) return { ok: true, data: null };
  const r = data as unknown as {
    id: string;
    name: string;
    updated_at: string;
    routine_exercise_blocks: { id: string; kind: BlockKind; label: string | null; time_cap_seconds: number | null; interval_seconds: number | null; rounds: number | null }[] | null;
    routine_exercises: CopyExerciseRow[] | null;
  };
  const exercises: Exercise[] = [...(r.routine_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .flatMap((e) => {
      const d = e.exercises ?? e.custom_exercise_library_items;
      if (!d) return [];
      const x: Exercise = {
        id: e.id,
        name: d.name,
        sets: n(e.sets),
        reps: n(e.reps),
        weightKg: e.weight_kg == null ? null : Number(e.weight_kg),
        muscleGroups: d.muscle_groups,
        secondaryMuscleGroups: d.secondary_muscle_groups,
        classification: d.classification,
        isCustom: !!e.custom_exercise_library_items,
        exerciseId: e.exercises ? d.id : undefined,
        customExerciseId: e.custom_exercise_library_items ? d.id : undefined,
        minSets: n(e.min_sets),
        maxSets: n(e.max_sets),
        minReps: n(e.min_reps),
        maxReps: n(e.max_reps),
        intensityPct: n(e.intensity_pct),
        restSeconds: n(e.rest_seconds),
        rpe: n(e.rpe),
        tempo: e.tempo ?? undefined,
        blockId: e.block_id,
        ...(e.coach_note ? { coachNote: e.coach_note } : {}),
        ...(Array.isArray(e.set_types) ? { setTypes: e.set_types } : {}),
        ...(readSetTargets(e.set_targets) ? { setTargets: readSetTargets(e.set_targets) } : {}),
      };
      return [x];
    });
  const blocks: WorkoutBlock[] = (r.routine_exercise_blocks ?? []).map((b) => ({
    id: b.id,
    kind: b.kind,
    label: b.label ?? undefined,
    timeCapSeconds: b.time_cap_seconds ?? undefined,
    intervalSeconds: b.interval_seconds ?? undefined,
    rounds: b.rounds ?? undefined,
  }));
  const items: Record<string, Record<string, unknown>> = {};
  for (const e of r.routine_exercises ?? []) {
    const raw = e as unknown as Record<string, unknown>;
    items[e.id] = Object.fromEntries(ITEM_KEYS.map((k) => [k, raw[k] ?? null]));
  }
  return { ok: true, data: { routineId: r.id, name: r.name, updatedAt: r.updated_at, exercises, blocks, items } };
}

/** can_edit_client_routine: the assigning professional, while the client is connected. */
export async function canEditClientRoutine(routineId: string): Promise<boolean> {
  const { data, error } = await rpc("can_edit_client_routine", { p_routine_id: routineId });
  return !error && data === true;
}

type SaveResult = { ok: true } | { ok: false; message: string };

function copyFailure(error: { code?: string } & object): SaveResult {
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  // ATXB5 / 42501: another professional, the client's own routine, or after End coaching.
  if (error.code === "42501") return { ok: false, message: tk("This isn't a programme you assigned to a current client.") };
  if (error.code === "23514" || error.code === "22003") return { ok: false, message: tk("One of those numbers is outside the range this can store.") };
  return { ok: false, message: tk("Couldn't save. Try again.") };
}

const sameBlocks = (a: WorkoutBlock[], b: WorkoutBlock[]) =>
  a.length === b.length &&
  a.every((x, i) => x.id === b[i].id && x.kind === b[i].kind && (x.label ?? null) === (b[i].label ?? null) && (x.timeCapSeconds ?? null) === (b[i].timeCapSeconds ?? null) && (x.intervalSeconds ?? null) === (b[i].intervalSeconds ?? null) && (x.rounds ?? null) === (b[i].rounds ?? null));

/**
 * Saves the client's copy (TR6 "Only {name}'s copy", TR13 on a copy).
 *
 * The prescriptions go through set_routine_exercises: each stored item, with
 * the fields the professional edits overlaid from `exercises` (array order =
 * position), so keys the editor doesn't show (the client's pinned_note,
 * rep_max_*, cardio_*, endurance_plan) are re-sent unchanged.
 *
 * Blocks, only when they changed: the same order the client's own save uses
 * (services/routines writeBlocks): clear the prescriptions, replace the
 * blocks (routine_exercise_blocks_all_assigning_professional), then write the
 * prescriptions pointing at the new block ids, so the deferred membership
 * trigger only ever sees a complete list.
 *
 * A movement added here must be a catalogue exercise: a professional's own
 * custom exercise is private to them and reaches a client only through
 * assign_template_to_client, which copies it into the client's library.
 */
export async function saveClientCopy(copy: ClientCopy, exercises: Exercise[], blocks: WorkoutBlock[] = copy.blocks): Promise<SaveResult> {
  for (const ex of exercises) {
    if (!copy.items[ex.id] && !ex.exerciseId) {
      return { ok: false, message: `"${ex.name}" can reach a client only through the template.` };
    }
  }
  let blockIds = new Map<string, string>(copy.blocks.map((b) => [b.id, b.id]));
  if (!sameBlocks(copy.blocks, blocks)) {
    const cleared = await rpc("set_routine_exercises", { p_routine_id: copy.routineId, p_items: [] });
    if (cleared.error) return copyFailure(cleared.error);
    const del = await supabase.from("routine_exercise_blocks").delete().eq("routine_id", copy.routineId);
    if (del.error) return copyFailure(del.error);
    blockIds = new Map();
    if (blocks.length) {
      const { data, error } = await supabase
        .from("routine_exercise_blocks")
        .insert(
          blocks.map((b) => ({
            routine_id: copy.routineId,
            kind: b.kind,
            label: b.label?.trim() || null,
            time_cap_seconds: b.kind === "amrap" || b.kind === "for_time" ? b.timeCapSeconds ?? null : null,
            interval_seconds: b.kind === "emom" ? b.intervalSeconds ?? null : null,
            rounds: b.kind === "emom" || b.kind === "for_time" ? b.rounds ?? null : null,
          }))
        )
        .select("id");
      if (error || !data) return error ? copyFailure(error) : { ok: false, message: tk("Couldn't save. Try again.") };
      blocks.forEach((b, i) => {
        const row = (data as { id: string }[])[i];
        if (row) blockIds.set(b.id, row.id);
      });
    }
  }
  const items = exercises.map((ex) => {
    const base = copy.items[ex.id] ?? { exercise_id: ex.exerciseId ?? null };
    return {
      ...base,
      block_id: ex.blockId ? blockIds.get(ex.blockId) ?? null : null,
      sets: ex.sets ?? null,
      reps: ex.reps ?? null,
      weight_kg: ex.weightKg ?? null,
      min_sets: ex.minSets ?? null,
      max_sets: ex.maxSets ?? null,
      min_reps: ex.minReps ?? null,
      max_reps: ex.maxReps ?? null,
      intensity_pct: ex.intensityPct ?? null,
      rest_seconds: ex.restSeconds ?? null,
      rpe: ex.rpe ?? null,
      tempo: ex.tempo ?? null,
      coach_note: ex.coachNote?.trim().slice(0, 500) || null,
      set_types: setTypesColumn(ex.setTypes),
      // Round D (TR11): one target per prescribed set, cut to the sets it has.
      set_targets: setTargetsColumn(ex.setTargets, prescribedSetCount(ex)),
    };
  });
  // A JSON null is not SQL null for the jsonb keys (set_types_valid and
  // valid_endurance_plan refuse it), so null-valued keys are left out: an
  // absent key is stored as null.
  const clean = items.map((it) => Object.fromEntries(Object.entries(it).filter(([, v]) => v !== null && v !== undefined)));
  const { error } = await rpc("set_routine_exercises", { p_routine_id: copy.routineId, p_items: clean });
  return error ? copyFailure(error) : { ok: true };
}

/** Changes one exercise's weight in a client's copy (TR14 Save targets). */
export async function setClientCopyWeight(routineId: string, match: { exerciseId?: string; name: string }, weightKg: number): Promise<{ ok: true } | { ok: false; message: string }> {
  const copy = await fetchClientCopy(routineId);
  if (!copy.ok) return { ok: false, message: copy.offline ? OFFLINE_MESSAGE : tk("Couldn't save. Try again.") };
  if (!copy.data) return { ok: false, message: tk("That client's copy no longer exists.") };
  const idx = copy.data.exercises.findIndex((e) => (match.exerciseId && e.exerciseId === match.exerciseId) || e.name === match.name);
  if (idx < 0) return { ok: false, message: tk("That exercise isn't in their copy any more.") };
  const next = copy.data.exercises.map((e, i) => (i === idx ? { ...e, weightKg } : e));
  return saveClientCopy(copy.data, next);
}

// ---------------------------------------------------------------------------
// TR14: each client's estimated 1RM for one catalogue exercise
// ---------------------------------------------------------------------------

/**
 * current_personal_records for these clients and this catalogue exercise.
 * A client's copy of a professional's custom movement is a different row, so
 * only catalogue exercises can be matched. Missing key = no 1RM recorded.
 */
export async function fetchOneRepMaxes(clientIds: string[], exerciseId: string): Promise<Read<Record<string, number>>> {
  if (clientIds.length === 0) return { ok: true, data: {} };
  const { data, error } = await supabase
    .from("current_personal_records")
    .select("user_id, estimated_one_rep_max_kg")
    .in("user_id", clientIds)
    .eq("exercise_id", exerciseId);
  if (error) return fail(error);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { user_id: string | null; estimated_one_rep_max_kg: number | null }[]) {
    if (r.user_id && r.estimated_one_rep_max_kg != null) out[r.user_id] = Math.max(out[r.user_id] ?? 0, Number(r.estimated_one_rep_max_kg));
  }
  return { ok: true, data: out };
}
