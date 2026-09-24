import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  BlockKind,
  EndurancePlan,
  Exercise,
  ExerciseClassification,
  MuscleGroup,
  RepMaxUpdateMode,
  Routine,
  WorkoutBlock,
} from "../../types";
import {
  createFolder,
  deleteFolder,
  getFolders,
  setFolderPositions as setFolderPositionsFor,
  updateFolder,
} from "../folders";

// Routines, their folders, and the prescriptions inside them.
//
// THE PRESCRIPTION IS NOT A SNAPSHOT, which is the opposite of ../food's rule
// and the same as ../custom-meals'. routine_exercises stores NO name: it points
// at a catalog row or one of the user's own movements and the name is read back
// through that pointer. So renaming a custom exercise renames it inside every
// routine that prescribes it, which is what a plan means. A session that
// actually happened is the other thing, and workout_sessions snapshots its
// names for exactly that reason.
//
// POSITION IS THE ORDER, on both folders and exercises. The client has always
// carried order implicitly in an array; the database has an explicit NOT NULL
// column and PostgREST promises nothing about the order an embedded list comes
// back in. Every read sorts by it and every write assigns it from the array
// index, so the two never drift.

/**
 * How a prescription names its movement.
 *
 * `routine_exercises_single_source_check` is `num_nonnulls(...) = 1` — exactly
 * one, never both, never neither. A row with neither would carry no name and no
 * definition at all, since there is no name column to fall back on.
 */
export type ExerciseRef =
  | { exercise_id: string; custom_exercise_id: null }
  | { exercise_id: null; custom_exercise_id: string };

/** The catalog and custom lists this module resolves names against. */
export interface ExerciseLookup {
  catalog: { id: string; name: string }[];
  custom: { id?: string; name: string }[];
}

const key = (name: string) => name.trim().toLowerCase();

/**
 * Which row a client-side exercise points at.
 *
 * THE ID WINS WHEN IT IS THERE, which is the lesson custom meals paid for: a
 * hydrated item carries a real uuid for both kinds of source, so `isUuid` can
 * no longer tell a catalog row from a user's own — guessing sent a foods.id
 * into custom_food_id and produced a foreign-key failure. Every pick made since
 * the library became real carries its origin explicitly.
 *
 * THE NAME FALLBACK IS FOR HISTORY, not for new writes. Routines that already
 * exist in localStorage were built when a pick carried a name and nothing else,
 * so the one-time upload has only the name to go on. The catalog is searched
 * first, then the user's own movements — the same order the picker lists them
 * in reverse, and the catalog is the shared meaning of a name like "Deadlift".
 */
export function resolveExerciseRef(ex: Exercise, lookup: ExerciseLookup): ExerciseRef | null {
  if (ex.exerciseId) return { exercise_id: ex.exerciseId, custom_exercise_id: null };
  if (ex.customExerciseId) return { exercise_id: null, custom_exercise_id: ex.customExerciseId };

  const wanted = key(ex.name);
  const fromCatalog = lookup.catalog.find((c) => key(c.name) === wanted);
  if (fromCatalog) return { exercise_id: fromCatalog.id, custom_exercise_id: null };

  const fromCustom = lookup.custom.find((c) => key(c.name) === wanted && c.id);
  if (fromCustom?.id) return { exercise_id: null, custom_exercise_id: fromCustom.id };

  return null;
}

/**
 * Routine-write failures.
 *
 * ATX16 AND ATX17 ARE NOT HANDLED HERE ANY MORE. They come from
 * folder_validate_parent(), which is attached to BOTH folder tables and
 * dispatches on TG_TABLE_NAME; the wording for them lives in ../folders
 * alongside the one implementation of folder CRUD, so template folders and
 * routine folders cannot word the same refusal two different ways.
 */
function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "42501") return "You don't have permission to do that.";
  // 23503 is the foreign key: a folder or exercise that is not there.
  if (code === "23503") return "Something this refers to no longer exists. Try again.";
  if (code === "23514" || code === "22003") {
    return "One of those numbers is outside the range this can store.";
  }
  if (isOffline(error)) return OFFLINE_MESSAGE;
  return "Something went wrong. Please try again.";
}

/**
 * Folder CRUD lives in ../folders, parameterised by table.
 *
 * routine_folders and workout_template_folders are the same columns, the same
 * grants, the same policies and the same trigger — the migration attaches
 * folder_validate_parent to both precisely so they cannot drift. These
 * re-exports keep every existing caller working while there is only one
 * implementation to keep correct.
 */
export const getRoutineFolders = (userId: string) => getFolders("routine_folders", userId);
export const createRoutineFolder = (
  userId: string,
  folder: { name: string; parentId: string | null; color?: string; position: number }
) => createFolder("routine_folders", userId, folder);
export const updateRoutineFolder = (
  id: string,
  patch: { name?: string; color?: string | null; parentId?: string | null; position?: number }
) => updateFolder("routine_folders", id, patch);
export const setFolderPositions = (positions: { id: string; position: number }[]) =>
  setFolderPositionsFor("routine_folders", positions);
export const deleteRoutineFolder = (id: string) => deleteFolder("routine_folders", id);

export interface RoutinesResult {
  ok: boolean;
  routines: Routine[];
  message?: string;
}

export interface RoutineResult {
  ok: boolean;
  routine?: Routine;
  message?: string;
}

export interface WriteResult {
  ok: boolean;
  message?: string;
  /**
   * What the routine now looks like, when the write replaced its blocks.
   *
   * THE IDS CHANGE ON EVERY SAVE, because writeBlocks deletes and re-inserts.
   * A caller that keeps its own copy in state — which AppContext does, rather
   * than refetching — would otherwise hold block ids that no longer exist and
   * exercises pointing at them, and the NEXT save would then quietly ungroup
   * everything. Handing the resolved arrays back is cheaper and more certain
   * than a refetch.
   */
  saved?: { blocks: WorkoutBlock[]; exercises: Exercise[] };
}

/** Points each member at the real block id its local id was mapped to. */
function remapBlockIds(exercises: Exercise[], idByLocalId: Map<string, string>): Exercise[] {
  return exercises.map((ex) =>
    ex.blockId ? { ...ex, blockId: idByLocalId.get(ex.blockId) ?? null } : ex
  );
}

// --- routines --------------------------------------------------------------

const PRESCRIPTION_COLUMNS =
  "id, position, sets, reps, weight_kg, min_sets, max_sets, min_reps, max_reps, " +
  "intensity_pct, rep_max_kg, rep_max_update_mode, rest_seconds, rpe, tempo, " +
  "estimated_one_rep_max_kg, duration_seconds, endurance_plan, block_id, " +
  "cardio_duration_min, cardio_distance_km, " +
  "cardio_incline_pct, cardio_pace_min_per_km, cardio_avg_heart_rate";

/** A block row, read and written whole — there is no partial update path. */
const BLOCK_COLUMNS = "id, kind, label, time_cap_seconds, interval_seconds, rounds";

const DEFINITION_COLUMNS = "id, name, classification, muscle_groups, secondary_muscle_groups";

const ROUTINE_SELECT =
  "id, folder_id, name, color, estimated_duration_min, coach_note, " +
  `routine_exercise_blocks(${BLOCK_COLUMNS}), ` +
  `routine_exercises(${PRESCRIPTION_COLUMNS}, ` +
  `exercises(${DEFINITION_COLUMNS}), ` +
  `custom_exercise_library_items(${DEFINITION_COLUMNS}))`;

interface DefinitionRow {
  id: string;
  name: string;
  classification: ExerciseClassification;
  muscle_groups: MuscleGroup[];
  secondary_muscle_groups: MuscleGroup[];
}

interface PrescriptionRow {
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
  rep_max_kg: number | null;
  rep_max_update_mode: RepMaxUpdateMode | null;
  rest_seconds: number | null;
  rpe: number | null;
  tempo: string | null;
  estimated_one_rep_max_kg: number | null;
  duration_seconds: number | null;
  endurance_plan: EndurancePlan | null;
  block_id: string | null;
  cardio_duration_min: number | null;
  cardio_distance_km: number | null;
  cardio_incline_pct: number | null;
  cardio_pace_min_per_km: number | null;
  cardio_avg_heart_rate: number | null;
  exercises: DefinitionRow | null;
  custom_exercise_library_items: DefinitionRow | null;
}

interface BlockRow {
  id: string;
  kind: BlockKind;
  label: string | null;
  time_cap_seconds: number | null;
  interval_seconds: number | null;
  rounds: number | null;
}

interface RoutineRow {
  id: string;
  folder_id: string | null;
  name: string;
  color: string | null;
  estimated_duration_min: number | null;
  coach_note: string | null;
  routine_exercise_blocks: BlockRow[];
  routine_exercises: PrescriptionRow[];
}

/** numeric columns arrive as numbers or strings depending on the driver; undefined keeps an optional field absent. */
const num = (v: number | null): number | undefined => (v === null ? undefined : Number(v));

function toExercise(r: PrescriptionRow): Exercise | null {
  const def = r.exercises ?? r.custom_exercise_library_items;
  // Neither side resolved. Not possible while the single-source check holds
  // and both FKs cascade, so this is a "cannot happen" that drops the row
  // rather than rendering a nameless line in someone's routine.
  if (!def) return null;
  const isCustom = !!r.custom_exercise_library_items;

  return {
    id: r.id,
    name: def.name,
    // The three defaults the UI has always assumed for a prescription that
    // never filled them in. Null in the column means "not prescribed", and
    // every surface reads these as plain numbers.
    sets: r.sets ?? 3,
    reps: r.reps ?? 10,
    weightKg: num(r.weight_kg) ?? 0,
    muscleGroups: def.muscle_groups,
    secondaryMuscleGroups: def.secondary_muscle_groups,
    classification: def.classification,
    isCustom,
    // WHICH ROW THIS POINTS AT HAS TO SURVIVE THE READ, for the same reason
    // CustomMealItem.source does: once hydrated both kinds carry a uuid and
    // the id alone can no longer say which table it belongs to.
    exerciseId: isCustom ? undefined : def.id,
    customExerciseId: isCustom ? def.id : undefined,
    minSets: num(r.min_sets),
    maxSets: num(r.max_sets),
    minReps: num(r.min_reps),
    maxReps: num(r.max_reps),
    intensityPct: num(r.intensity_pct),
    repMaxKg: num(r.rep_max_kg),
    repMaxUpdateMode: r.rep_max_update_mode ?? undefined,
    restSeconds: num(r.rest_seconds),
    rpe: num(r.rpe),
    tempo: r.tempo ?? undefined,
    estimatedOneRepMaxKg: num(r.estimated_one_rep_max_kg),
    cardioDurationMin: num(r.cardio_duration_min),
    cardioDistanceKm: num(r.cardio_distance_km),
    cardioInclinePct: num(r.cardio_incline_pct),
    cardioPaceMinPerKm: num(r.cardio_pace_min_per_km),
    cardioAvgHeartRate: num(r.cardio_avg_heart_rate),
    durationSeconds: num(r.duration_seconds),
    endurancePlan: r.endurance_plan ?? null,
    blockId: r.block_id,
  };
}

const toBlock = (b: BlockRow): WorkoutBlock => ({
  id: b.id,
  kind: b.kind,
  label: b.label ?? undefined,
  timeCapSeconds: b.time_cap_seconds ?? undefined,
  intervalSeconds: b.interval_seconds ?? undefined,
  rounds: b.rounds ?? undefined,
});

function toRoutine(r: RoutineRow): Routine {
  const exercises = [...r.routine_exercises]
    .sort((a, b) => a.position - b.position)
    .map(toExercise)
    .filter((e): e is Exercise => e !== null);

  return {
    id: r.id,
    folderId: r.folder_id,
    name: r.name,
    // The row permits null; the client type does not, and every routine this
    // app writes carries one. A colourless row renders with the app's default
    // rather than `undefined` reaching a style attribute.
    color: r.color ?? "#7D6BB5",
    estimatedDurationMin: r.estimated_duration_min ?? 30,
    exercises,
    coachNote: r.coach_note ?? undefined,
    blocks: (r.routine_exercise_blocks ?? []).map(toBlock),
  };
}

export async function getRoutines(userId: string): Promise<RoutinesResult> {
  const { data, error } = await supabase
    .from("routines")
    .select(ROUTINE_SELECT)
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[routines] Could not read routines:", error.message);
    return { ok: false, routines: [], message: describe(error) };
  }
  return { ok: true, routines: (data ?? []).map((r) => toRoutine(r as unknown as RoutineRow)) };
}

/**
 * The prescription columns, built from one client-side exercise.
 *
 * EVERY OPTIONAL FIELD IS SENT AS NULL RATHER THAN OMITTED, because this is
 * also the payload an edit re-inserts: leaving a key out of an INSERT and
 * clearing it are the same thing here only because the rows are replaced
 * wholesale, and writing it out makes that explicit rather than incidental.
 */
function prescriptionOf(
  ex: Exercise,
  ref: ExerciseRef,
  routineId: string,
  position: number,
  blockId: string | null
) {
  return {
    routine_id: routineId,
    ...ref,
    position,
    sets: ex.sets ?? null,
    reps: ex.reps ?? null,
    weight_kg: ex.weightKg ?? null,
    min_sets: ex.minSets ?? null,
    max_sets: ex.maxSets ?? null,
    min_reps: ex.minReps ?? null,
    max_reps: ex.maxReps ?? null,
    intensity_pct: ex.intensityPct ?? null,
    rep_max_kg: ex.repMaxKg ?? null,
    rep_max_update_mode: ex.repMaxUpdateMode ?? null,
    rest_seconds: ex.restSeconds ?? null,
    rpe: ex.rpe ?? null,
    tempo: ex.tempo ?? null,
    estimated_one_rep_max_kg: ex.estimatedOneRepMaxKg ?? null,
    cardio_duration_min: ex.cardioDurationMin ?? null,
    cardio_distance_km: ex.cardioDistanceKm ?? null,
    cardio_incline_pct: ex.cardioInclinePct ?? null,
    cardio_pace_min_per_km: ex.cardioPaceMinPerKm ?? null,
    cardio_avg_heart_rate: ex.cardioAvgHeartRate ?? null,
    duration_seconds: ex.durationSeconds ?? null,
    // WRITTEN ONLY FOR CARDIO. routine_exercises_endurance_plan_classification
    // refuses a plan on anything else, and a stale plan left on an exercise
    // whose classification just changed is exactly what that trigger is for.
    endurance_plan: ex.classification === "cardio" ? ex.endurancePlan ?? null : null,
    block_id: blockId,
  };
}

/**
 * Replaces a routine's blocks, and says what id each one ended up with.
 *
 * DELETE-THEN-INSERT, LIKE THE PRESCRIPTIONS THEMSELVES, and for the same
 * reason: a block carries no user data of its own beyond a kind, a label and
 * three numbers, so rewriting the set is simpler and more honest than
 * diffing it — and diffing would still have to handle a block that gained,
 * lost or reordered members, which is the whole of the interesting case.
 *
 * THE RETURNED MAP IS THE POINT. The editor mints local ids for blocks the
 * user has just drawn (`blk…`), and the rows come back with real uuids; the
 * prescriptions inserted immediately after must point at those. Returning the
 * map rather than mutating the caller's exercises keeps this function free of
 * opinions about what a member looks like.
 *
 * WHY THIS CANNOT VIOLATE THE MEMBERSHIP RULE. routine_exercises_block_
 * membership is a DEFERRED constraint trigger, so it runs at the end of each
 * transaction — and each PostgREST request is one transaction. By the time
 * this runs the caller has already deleted every prescription, so the blocks
 * it deletes have no members to strand and the blocks it inserts are
 * momentarily memberless, which the trigger explicitly permits. The only
 * state that has to satisfy contiguity is the prescription insert that
 * follows, and that insert carries every position and every block_id at once
 * — so a reorder and a regroup are the same write and cannot half-apply.
 */
async function writeBlocks(
  routineId: string,
  blocks: WorkoutBlock[]
): Promise<{ idByLocalId: Map<string, string>; saved: WorkoutBlock[] } | { message: string }> {
  const { error: clearError } = await supabase
    .from("routine_exercise_blocks")
    .delete()
    .eq("routine_id", routineId);
  if (clearError) {
    console.error("[routines] Could not clear blocks:", clearError.message);
    return { message: describe(clearError) };
  }

  if (blocks.length === 0) return { idByLocalId: new Map(), saved: [] };

  const rows = blocks.map((b) => ({
    routine_id: routineId,
    kind: b.kind,
    label: b.label?.trim() || null,
    // NULL WHERE THE KIND FORBIDS IT. routine_exercise_blocks_kind_shape_check
    // rejects a superset carrying rounds as firmly as an EMOM missing them, so
    // the shape is decided here rather than trusted from whatever the editor
    // last had in state.
    time_cap_seconds: b.kind === "amrap" || b.kind === "for_time" ? b.timeCapSeconds ?? null : null,
    interval_seconds: b.kind === "emom" ? b.intervalSeconds ?? null : null,
    rounds: b.kind === "emom" || b.kind === "for_time" ? b.rounds ?? null : null,
  }));

  const { data, error } = await supabase
    .from("routine_exercise_blocks")
    .insert(rows)
    .select(BLOCK_COLUMNS);
  if (error || !data) {
    console.error("[routines] Could not write blocks:", error?.message);
    return { message: error ? describe(error) : "Could not save the blocks in this routine." };
  }

  // INSERT ORDER IS THE ONLY LINK between what went in and what came back —
  // a block has no natural key, and two supersets in one routine are
  // identical rows. PostgREST returns an insert's rows in the order they were
  // sent, which is what makes this safe and also why the two arrays are
  // zipped rather than matched on anything.
  const saved = (data as BlockRow[]).map(toBlock);
  const idByLocalId = new Map<string, string>();
  blocks.forEach((b, i) => {
    const row = saved[i];
    if (row) idByLocalId.set(b.id, row.id);
  });
  return { idByLocalId, saved };
}

/**
 * Writes the prescriptions for a routine that already exists.
 *
 * NOT A TRANSACTION, because PostgREST has none — the same admission
 * writeItems makes for custom meals. The routine row is written first and its
 * exercises second, so a failure leaves a named routine with no exercises
 * rather than exercises belonging to nothing, and both callers below delete the
 * routine when this fails.
 */
async function writeExercises(
  routineId: string,
  exercises: Exercise[],
  lookup: ExerciseLookup,
  blockIdByLocalId: Map<string, string>
): Promise<string | null> {
  const rows = [];
  for (const [index, ex] of exercises.entries()) {
    const ref = resolveExerciseRef(ex, lookup);
    // REFUSED, NOT DROPPED. A routine that silently comes back with four of
    // its five movements is worse than one that did not save, because nothing
    // tells the user which one is missing.
    if (!ref) {
      return `"${ex.name}" isn't in the exercise library, so this routine can't be saved.`;
    }
    // An unknown local id means a member whose block was dropped between the
    // editor and here. Ungrouped is the safe reading — the alternative is an
    // insert that fails the foreign key and loses the whole routine.
    const blockId = ex.blockId ? blockIdByLocalId.get(ex.blockId) ?? null : null;
    rows.push(prescriptionOf(ex, ref, routineId, index, blockId));
  }

  if (rows.length === 0) return null;
  const { error } = await supabase.from("routine_exercises").insert(rows);
  if (error) {
    console.error("[routines] Could not write exercises:", error.message);
    return describe(error);
  }
  return null;
}

export async function createRoutine(
  userId: string,
  routine: Omit<Routine, "id">,
  lookup: ExerciseLookup
): Promise<RoutineResult> {
  const { data, error } = await supabase
    .from("routines")
    .insert({
      owner_id: userId,
      folder_id: routine.folderId,
      name: routine.name.trim(),
      color: routine.color ?? null,
      estimated_duration_min: routine.estimatedDurationMin ?? null,
      coach_note: routine.coachNote ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[routines] Could not create routine:", error?.message);
    return {
      ok: false,
      message: error ? describe(error) : "Something went wrong. Please try again.",
    };
  }

  // BLOCKS FIRST, because the prescriptions point at them. A freshly created
  // routine has none to clear, but the same function is used so the id map
  // comes back the one way.
  const blockWrite = await writeBlocks(data.id, routine.blocks ?? []);
  if ("message" in blockWrite) {
    await supabase.from("routines").delete().eq("id", data.id);
    return { ok: false, message: blockWrite.message };
  }

  const exerciseError = await writeExercises(
    data.id,
    routine.exercises,
    lookup,
    blockWrite.idByLocalId
  );
  if (exerciseError) {
    // Clean up rather than leaving an empty routine in the list. Best effort:
    // if this delete also fails the user sees an exercise-less routine they
    // can delete themselves.
    await supabase.from("routines").delete().eq("id", data.id);
    return { ok: false, message: exerciseError };
  }

  return {
    ok: true,
    routine: {
      ...routine,
      id: data.id,
      blocks: blockWrite.saved,
      exercises: remapBlockIds(routine.exercises, blockWrite.idByLocalId),
    },
  };
}

/**
 * Updates the routine's own columns, and replaces its exercises when the caller
 * passes any.
 *
 * EXERCISES ARE REPLACED, NOT DIFFED, for the reason custom_meal_items gives:
 * position changes on every reorder anyway, and the client holds prescriptions
 * rather than row identities it could diff against. Deleting and re-inserting
 * is what the grants allow and is one round trip either way.
 *
 * Passing `exercises: undefined` leaves them alone, which is what a colour
 * change or a rename does.
 */
export async function updateRoutine(
  id: string,
  patch: Partial<Omit<Routine, "id" | "exercises">>,
  exercises: Exercise[] | undefined,
  lookup: ExerciseLookup
): Promise<WriteResult> {
  const payload: {
    folder_id?: string | null;
    name?: string;
    color?: string | null;
    estimated_duration_min?: number | null;
    coach_note?: string | null;
  } = {};
  if (patch.folderId !== undefined) payload.folder_id = patch.folderId;
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.estimatedDurationMin !== undefined) {
    payload.estimated_duration_min = patch.estimatedDurationMin;
  }
  if (patch.coachNote !== undefined) payload.coach_note = patch.coachNote ?? null;

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from("routines").update(payload).eq("id", id);
    if (error) {
      console.error("[routines] Could not update routine:", error.message);
      return { ok: false, message: describe(error) };
    }
  }

  if (exercises === undefined) return { ok: true };

  // ORDER IS FORCED, AND EACH STEP IS ITS OWN TRANSACTION.
  //
  //   1. delete the prescriptions  -> every block is now memberless, which the
  //      deferred membership trigger explicitly permits
  //   2. delete and re-insert the blocks -> nothing points at them
  //   3. insert the prescriptions carrying both position and block_id
  //
  // Only step 3 has to satisfy contiguity, and it carries the whole final
  // arrangement in one statement — so a reorder and a regroup are the same
  // write. There is no transaction across the three (PostgREST has none), so
  // a failure at 2 or 3 leaves the routine without prescriptions; that is the
  // pre-existing shape of this function and the caller reports it.
  const { error: clearError } = await supabase
    .from("routine_exercises")
    .delete()
    .eq("routine_id", id);
  if (clearError) {
    console.error("[routines] Could not clear exercises:", clearError.message);
    return { ok: false, message: describe(clearError) };
  }

  const blockWrite = await writeBlocks(id, patch.blocks ?? []);
  if ("message" in blockWrite) return { ok: false, message: blockWrite.message };

  const exerciseError = await writeExercises(id, exercises, lookup, blockWrite.idByLocalId);
  if (exerciseError) return { ok: false, message: exerciseError };
  return {
    ok: true,
    saved: {
      blocks: blockWrite.saved,
      exercises: remapBlockIds(exercises, blockWrite.idByLocalId),
    },
  };
}

/** Prescriptions go with it: routine_exercises.routine_id is ON DELETE CASCADE. */
export async function deleteRoutine(id: string): Promise<WriteResult> {
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) {
    console.error("[routines] Could not delete routine:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
