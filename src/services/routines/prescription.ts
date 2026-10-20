import type {
  EndurancePlan,
  Exercise,
  ExerciseClassification,
  MuscleGroup,
  PrescribedSetType,
  RepMaxUpdateMode,
} from "../../types";

// One routine_exercises row, read and written. Kept apart from ./index (which
// talks to Supabase) so the round trip can be tested without a client.
//
// EVERY COLUMN THAT IS READ IS WRITTEN BACK. A save deletes the routine's rows
// and re-inserts them, so a column read here but not written by prescriptionOf
// is erased by the client's next save. Release 3 found exactly that: a coach's
// per-exercise note and set types (coach_note, set_types) vanished the first
// time a client edited a coach-assigned routine. prescription.test.ts checks
// that every column listed here survives a read and a write.

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

/** routine_exercises columns this app reads (and therefore must write back). */
export const PRESCRIPTION_COLUMNS =
  "id, position, sets, reps, weight_kg, min_sets, max_sets, min_reps, max_reps, " +
  "intensity_pct, rep_max_kg, rep_max_update_mode, rest_seconds, rpe, tempo, " +
  "estimated_one_rep_max_kg, duration_seconds, endurance_plan, block_id, pinned_note, " +
  "cardio_duration_min, cardio_distance_km, " +
  "cardio_incline_pct, cardio_pace_min_per_km, cardio_avg_heart_rate, " +
  // Release 3 (DB-5): the professional's, copied in by assign_template_to_client.
  "coach_note, set_types";

export interface DefinitionRow {
  id: string;
  name: string;
  classification: ExerciseClassification;
  muscle_groups: MuscleGroup[];
  secondary_muscle_groups: MuscleGroup[];
}

export interface PrescriptionRow {
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
  pinned_note: string | null;
  cardio_duration_min: number | null;
  cardio_distance_km: number | null;
  cardio_incline_pct: number | null;
  cardio_pace_min_per_km: number | null;
  cardio_avg_heart_rate: number | null;
  coach_note: string | null;
  set_types: (PrescribedSetType | null)[] | null;
  exercises: DefinitionRow | null;
  custom_exercise_library_items: DefinitionRow | null;
}

/** numeric columns arrive as numbers or strings depending on the driver; undefined keeps an optional field absent. */
const num = (v: number | null): number | undefined => (v === null ? undefined : Number(v));

export function toExercise(r: PrescriptionRow): Exercise | null {
  const def = r.exercises ?? r.custom_exercise_library_items;
  // Neither side resolved. Not possible while the single-source check holds
  // and both FKs cascade, so this is a "cannot happen" that drops the row
  // rather than rendering a nameless line in someone's routine.
  if (!def) return null;
  const isCustom = !!r.custom_exercise_library_items;

  return {
    id: r.id,
    name: def.name,
    // NOTHING IS INVENTED HERE. These read `?? 3` and `?? 10`, which made
    // "not prescribed" unsayable: the prescription formatter has an AMRAP
    // case for an exercise with no rep target that could never be reached,
    // and a session seeded five rows of ten reps for a coach who had
    // deliberately written none. Null in the column means the coach did not
    // say, and every reader now decides for itself what to do with that.
    sets: r.sets ?? undefined,
    reps: r.reps ?? undefined,
    // null stays null (no weight prescribed); 0 is bodyweight. It used to be
    // `?? 0`, and the next save wrote that 0 back as if it were a weight.
    weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
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
    pinnedNote: r.pinned_note ?? undefined,
    ...(r.coach_note ? { coachNote: r.coach_note } : {}),
    ...(Array.isArray(r.set_types) ? { setTypes: r.set_types } : {}),
  };
}

/**
 * The prescription columns, built from one client-side exercise.
 *
 * EVERY OPTIONAL FIELD IS SENT AS NULL RATHER THAN OMITTED, because this is
 * also the payload an edit re-inserts: leaving a key out of an INSERT and
 * clearing it are the same thing here only because the rows are replaced
 * wholesale, and writing it out makes that explicit rather than incidental.
 */
export function prescriptionOf(
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
    // THE LEGACY CARDIO COLUMNS ARE CARRIED, NEVER AUTHORED. Nothing produces
    // these any more — the editor writes endurance_plan — so what appears here
    // is whatever was read back, passed through unchanged.
    //
    // NOT NULLED ON SAVE, deliberately. 20260924270000 demoted them with the
    // note that shipped client code in TWO repos still reads them, so blanking
    // them would make a cardio prescription vanish in the other app the moment
    // somebody opened this one and pressed Save. They go when both clients are
    // off them, which is a migration rather than a line here.
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
    // The athlete's own note (WO8/WO10); 20260929130000. Blank is stored as null.
    pinned_note: ex.pinnedNote?.trim() || null,
    // Release 3 (DB-5): the coach's note and set types, PASSED THROUGH. The
    // client never authors them, but a save replaces the rows, so leaving them
    // out would erase what the coach wrote on a coach-assigned routine.
    coach_note: ex.coachNote || null,
    // Exactly as read (the database already validated it), so the stored form
    // ("normal" or null for a plain set) doesn't change under the coach.
    set_types: Array.isArray(ex.setTypes) && ex.setTypes.length > 0 ? ex.setTypes.slice(0, 50) : null,
  };
}
