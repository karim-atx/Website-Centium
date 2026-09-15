import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  Exercise,
  ExerciseClassification,
  MuscleGroup,
  RepMaxUpdateMode,
  Routine,
  RoutineFolder,
} from "../../types";

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
 * ATX16 AND ATX17 ARE REAL ANSWERS, not failures to report as "something went
 * wrong". Both come from folder_validate_parent(), a BEFORE INSERT OR UPDATE
 * trigger on the folder tables, and both describe a specific thing the user
 * asked for that cannot be done:
 *
 *   ATX17  the named parent belongs to a different account
 *   ATX16  the write would close a loop — a folder inside itself, or inside
 *          one of its own descendants
 *
 * Neither is retryable and neither is a bug to hide. The raised message names
 * folder uuids, which is why it is replaced here rather than shown.
 */
function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "ATX16") {
    return "A folder can't be filed inside itself or one of its own subfolders.";
  }
  if (code === "ATX17") {
    return "That folder belongs to a different account, so it can't be used as a parent.";
  }
  if (code === "42501") return "You don't have permission to do that.";
  // 23503 is the foreign key: a parent folder or exercise that is not there.
  if (code === "23503") return "Something this refers to no longer exists. Try again.";
  if (code === "23514" || code === "22003") {
    return "One of those numbers is outside the range this can store.";
  }
  if (isOffline(error)) return OFFLINE_MESSAGE;
  return "Something went wrong. Please try again.";
}

export interface FoldersResult {
  /**
   * False means the read FAILED, not "this account has no folders" — the
   * distinction every hydration in this app draws, because the caller replaces
   * state with the result and a dropped connection must not empty a screen.
   */
  ok: boolean;
  folders: RoutineFolder[];
  message?: string;
}

export interface FolderResult {
  ok: boolean;
  folder?: RoutineFolder;
  message?: string;
}

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
}

// --- folders ---------------------------------------------------------------

const FOLDER_COLUMNS = "id, name, parent_id, color, position";

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  position: number;
}

const toFolder = (r: FolderRow): RoutineFolder => ({
  id: r.id,
  name: r.name,
  parentId: r.parent_id,
  color: r.color ?? undefined,
});

/**
 * Ordered by position, which is what the reorder controls write.
 *
 * Position is per sibling group in the client's model — "move up" swaps two
 * folders sharing a parent — but a single ascending sort still reproduces the
 * tree correctly, because the UI renders each parent's children in the order
 * they appear in this flat list.
 */
export async function getRoutineFolders(userId: string): Promise<FoldersResult> {
  const { data, error } = await supabase
    .from("routine_folders")
    .select(FOLDER_COLUMNS)
    .eq("owner_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[routines] Could not read folders:", error.message);
    return { ok: false, folders: [], message: describe(error) };
  }
  return { ok: true, folders: (data ?? []).map((r) => toFolder(r as FolderRow)) };
}

export async function createRoutineFolder(
  userId: string,
  folder: { name: string; parentId: string | null; color?: string; position: number }
): Promise<FolderResult> {
  const { data, error } = await supabase
    .from("routine_folders")
    .insert({
      owner_id: userId,
      name: folder.name.trim(),
      parent_id: folder.parentId,
      color: folder.color ?? null,
      position: folder.position,
    })
    .select(FOLDER_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[routines] Could not create folder:", error?.message);
    return {
      ok: false,
      message: error ? describe(error) : "Something went wrong. Please try again.",
    };
  }
  return { ok: true, folder: toFolder(data as FolderRow) };
}

/**
 * Name, colour, parent and position — every column the UPDATE grant covers.
 *
 * owner_id is deliberately not among them, on the table or in this payload: it
 * is not updatable, and naming it would be refused with 42501 for an identical
 * value. `parentId` is the one that can raise ATX16 or ATX17.
 */
export async function updateRoutineFolder(
  id: string,
  patch: { name?: string; color?: string | null; parentId?: string | null; position?: number }
): Promise<WriteResult> {
  // Typed rather than a loose record: the generated Update type rejects an
  // index signature outright, which is the schema refusing a payload it cannot
  // check column by column.
  const payload: {
    name?: string;
    color?: string | null;
    parent_id?: string | null;
    position?: number;
  } = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.parentId !== undefined) payload.parent_id = patch.parentId;
  if (patch.position !== undefined) payload.position = patch.position;
  if (Object.keys(payload).length === 0) return { ok: true };

  const { error } = await supabase.from("routine_folders").update(payload).eq("id", id);
  if (error) {
    console.error("[routines] Could not update folder:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/** Reorders siblings. Separate calls because PostgREST cannot write two different values in one statement. */
export async function setFolderPositions(
  positions: { id: string; position: number }[]
): Promise<WriteResult> {
  for (const p of positions) {
    const { error } = await supabase
      .from("routine_folders")
      .update({ position: p.position })
      .eq("id", p.id);
    if (error) {
      console.error("[routines] Could not reorder folders:", error.message);
      return { ok: false, message: describe(error) };
    }
  }
  return { ok: true };
}

/**
 * Deletes one folder, and ONLY that folder.
 *
 * parent_id is ON DELETE CASCADE, so a plain delete would take the whole
 * subtree with it — which is not what this app does. Subfolders of a deleted
 * folder have always been promoted to the top level, and routines inside it
 * unfiled; the local comment calls that "never silently deletes a routine", and
 * it stays true here. So the children are re-parented FIRST and the folder is
 * deleted second.
 *
 * The routines need no such step: routines.folder_id is ON DELETE SET NULL, so
 * the database unfiles them itself, which is exactly the old local behaviour.
 */
export async function deleteRoutineFolder(id: string): Promise<WriteResult> {
  const { error: promoteError } = await supabase
    .from("routine_folders")
    .update({ parent_id: null })
    .eq("parent_id", id);

  if (promoteError) {
    console.error("[routines] Could not promote subfolders:", promoteError.message);
    return { ok: false, message: describe(promoteError) };
  }

  const { error } = await supabase.from("routine_folders").delete().eq("id", id);
  if (error) {
    console.error("[routines] Could not delete folder:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

// --- routines --------------------------------------------------------------

const PRESCRIPTION_COLUMNS =
  "id, position, sets, reps, weight_kg, min_sets, max_sets, min_reps, max_reps, " +
  "intensity_pct, rep_max_kg, rep_max_update_mode, rest_seconds, rpe, tempo, " +
  "estimated_one_rep_max_kg, cardio_duration_min, cardio_distance_km, " +
  "cardio_incline_pct, cardio_pace_min_per_km, cardio_avg_heart_rate";

const DEFINITION_COLUMNS = "id, name, classification, muscle_groups, secondary_muscle_groups";

const ROUTINE_SELECT =
  "id, folder_id, name, color, estimated_duration_min, coach_note, " +
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
  cardio_duration_min: number | null;
  cardio_distance_km: number | null;
  cardio_incline_pct: number | null;
  cardio_pace_min_per_km: number | null;
  cardio_avg_heart_rate: number | null;
  exercises: DefinitionRow | null;
  custom_exercise_library_items: DefinitionRow | null;
}

interface RoutineRow {
  id: string;
  folder_id: string | null;
  name: string;
  color: string | null;
  estimated_duration_min: number | null;
  coach_note: string | null;
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
  };
}

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
function prescriptionOf(ex: Exercise, ref: ExerciseRef, routineId: string, position: number) {
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
  };
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
  lookup: ExerciseLookup
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
    rows.push(prescriptionOf(ex, ref, routineId, index));
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

  const exerciseError = await writeExercises(data.id, routine.exercises, lookup);
  if (exerciseError) {
    // Clean up rather than leaving an empty routine in the list. Best effort:
    // if this delete also fails the user sees an exercise-less routine they
    // can delete themselves.
    await supabase.from("routines").delete().eq("id", data.id);
    return { ok: false, message: exerciseError };
  }

  return { ok: true, routine: { ...routine, id: data.id } };
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

  const { error: clearError } = await supabase
    .from("routine_exercises")
    .delete()
    .eq("routine_id", id);
  if (clearError) {
    console.error("[routines] Could not clear exercises:", clearError.message);
    return { ok: false, message: describe(clearError) };
  }

  const exerciseError = await writeExercises(id, exercises, lookup);
  if (exerciseError) return { ok: false, message: exerciseError };
  return { ok: true };
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
