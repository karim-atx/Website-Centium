import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  createFolder,
  deleteFolder,
  getFolders,
  setFolderPositions as setFolderPositionsFor,
  updateFolder,
} from "../folders";
import { resolveExerciseRef, type ExerciseLookup } from "../routines";
import type {
  Exercise,
  ExerciseClassification,
  MuscleGroup,
  RepMaxUpdateMode,
  TemplateLevel,
  WorkoutTemplate,
  WorkoutTemplateAssignment,
} from "../../types";

// Workout templates, their folders, and pushing one to a client.
//
// A TEMPLATE AND AN ASSIGNMENT ARE DIFFERENT THINGS, which the client type used
// to conflate: one object held `assignedClientIds` and a single `assignedDay`
// for all of them. workout_template_assignments is one row per (template,
// client), each with its own day, because two clients running the same program
// on different days is ordinary.
//
// WHAT THIS MODULE MAY NOT DO. It never inserts or updates
// workout_template_assignments, and it never writes a client's routine.
// Both are the exclusive work of assign_template_to_client(), a SECURITY
// DEFINER function: no client role holds INSERT or UPDATE on the assignment
// table at all, and a professional cannot write another account's routine.
// Delete is the one exception the grants allow — un-recording an assignment
// deliberately leaves the client's routine alone.
//
// CURATED TEMPLATES ARE READ-ONLY HERE. `workout_templates_ownership_check`
// makes `(owner_id is null) = is_public`, the insert policy requires
// `auth.uid() = owner_id and not is_public`, and the assign function refuses a
// template whose owner is not the caller — a curated one has no owner, so
// `is distinct from` holds and it raises ATX09. Every write below sets
// owner_id and leaves is_public false, which is the only shape a professional
// is permitted to create.

/**
 * ATX18 IS THE ONE THAT MATTERS TO THE USER, and it is not a failure: it means
 * the client has edited the routine since it was last pushed, and re-assigning
 * would replace their work. The same call with `confirmOverwrite` succeeds,
 * which is precisely why it is not treated as terminal.
 *
 * The other codes the function raises are all real refusals:
 *   ATX08  the template does not exist
 *   ATX09  it is not yours to assign — including every curated one
 *   ATX12  that person is not your client
 */
export const OVERWRITE_REFUSED = "ATX18";

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === OVERWRITE_REFUSED) {
    return "This client has changed their routine since you last assigned it.";
  }
  if (code === "ATX08") return "That template no longer exists.";
  if (code === "ATX09") return "Only the template's owner can assign it.";
  if (code === "ATX12") return "That person isn't one of your clients.";
  if (code === "42501") return "You don't have permission to do that.";
  if (code === "23503") return "Something this refers to no longer exists. Try again.";
  if (code === "23514" || code === "22003") {
    return "One of those numbers is outside the range this can store.";
  }
  if (isOffline(error)) return OFFLINE_MESSAGE;
  return "Something went wrong. Please try again.";
}

export interface TemplatesResult {
  /** False means the read FAILED, not "no templates" — the usual distinction. */
  ok: boolean;
  templates: WorkoutTemplate[];
  message?: string;
}

export interface TemplateResult {
  ok: boolean;
  template?: WorkoutTemplate;
  message?: string;
}

export interface WriteResult {
  ok: boolean;
  message?: string;
}

// --- folders ---------------------------------------------------------------

/**
 * The same folder implementation routines use, pointed at the other table.
 *
 * Not a copy: workout_template_folders and routine_folders have identical
 * columns, grants and policies, and SHARE folder_validate_parent — one trigger
 * function dispatching on TG_TABLE_NAME, written that way so the two cannot
 * drift. ATX16 and ATX17 therefore already work here with no new code.
 */
export const getTemplateFolders = (userId: string) =>
  getFolders("workout_template_folders", userId);
export const createTemplateFolder = (
  userId: string,
  folder: { name: string; parentId: string | null; color?: string; position: number }
) => createFolder("workout_template_folders", userId, folder);
export const updateTemplateFolder = (
  id: string,
  patch: { name?: string; color?: string | null; parentId?: string | null; position?: number }
) => updateFolder("workout_template_folders", id, patch);
export const setTemplateFolderPositions = (positions: { id: string; position: number }[]) =>
  setFolderPositionsFor("workout_template_folders", positions);
export const deleteTemplateFolder = (id: string) =>
  deleteFolder("workout_template_folders", id);

// --- templates -------------------------------------------------------------

const PRESCRIPTION_COLUMNS =
  "id, position, sets, reps, weight_kg, min_sets, max_sets, min_reps, max_reps, " +
  "intensity_pct, rep_max_kg, rep_max_update_mode, rest_seconds, rpe, tempo, " +
  "estimated_one_rep_max_kg, cardio_duration_min, cardio_distance_km, " +
  "cardio_incline_pct, cardio_pace_min_per_km, cardio_avg_heart_rate";

const DEFINITION_COLUMNS = "id, name, classification, muscle_groups, secondary_muscle_groups";

const TEMPLATE_SELECT =
  "id, owner_id, name, category, description, duration_min, level, folder_id, coach_note, is_public, created_at, " +
  `workout_template_exercises(${PRESCRIPTION_COLUMNS}, ` +
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

interface TemplateRow {
  id: string;
  owner_id: string | null;
  name: string;
  category: string | null;
  description: string | null;
  duration_min: number | null;
  level: TemplateLevel | null;
  folder_id: string | null;
  coach_note: string | null;
  is_public: boolean;
  created_at: string;
  workout_template_exercises: PrescriptionRow[];
}

const num = (v: number | null): number | undefined => (v === null ? undefined : Number(v));

/** Identical in shape to the routine reader, because the two column lists are
 *  deliberately identical — the schema says to keep them in step by hand. */
function toExercise(r: PrescriptionRow): Exercise | null {
  const def = r.exercises ?? r.custom_exercise_library_items;
  // workout_template_exercises takes `= 1`, unlike logged_exercises: a
  // prescription always names exactly one movement, so this is unreachable.
  if (!def) return null;
  const isCustom = !!r.custom_exercise_library_items;

  return {
    id: r.id,
    name: def.name,
    sets: r.sets ?? 3,
    reps: r.reps ?? 10,
    weightKg: num(r.weight_kg) ?? 0,
    muscleGroups: def.muscle_groups,
    secondaryMuscleGroups: def.secondary_muscle_groups,
    classification: def.classification,
    isCustom,
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

function toTemplate(r: TemplateRow): WorkoutTemplate {
  return {
    id: r.id,
    name: r.name,
    exercises: [...r.workout_template_exercises]
      .sort((a, b) => a.position - b.position)
      .map(toExercise)
      .filter((e): e is Exercise => e !== null),
    createdAt: r.created_at.slice(0, 10),
    folderId: r.folder_id,
    coachNote: r.coach_note ?? undefined,
    category: r.category ?? undefined,
    description: r.description ?? undefined,
    durationMin: r.duration_min ?? undefined,
    level: r.level ?? undefined,
    isPublic: r.is_public,
    ownerId: r.owner_id,
  };
}

/**
 * The professional's own templates AND the curated ones.
 *
 * Both come back from one query because both policies are SELECT policies on
 * the same table — `is_public` for anyone, `owner_id = auth.uid()` for the
 * owner — so PostgREST returns the union without being asked. `isPublic` is
 * what the UI keys read-only treatment off.
 */
export async function getTemplates(userId: string): Promise<TemplatesResult> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select(TEMPLATE_SELECT)
    .or(`owner_id.eq.${userId},is_public.is.true`)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[templates] Could not read templates:", error.message);
    return { ok: false, templates: [], message: describe(error) };
  }
  return {
    ok: true,
    templates: (data ?? []).map((r) => toTemplate(r as unknown as TemplateRow)),
  };
}

function prescriptionOf(
  ex: Exercise,
  ref: { exercise_id: string | null; custom_exercise_id: string | null },
  templateId: string,
  position: number
) {
  return {
    workout_template_id: templateId,
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
 * Writes the prescriptions for a template that already exists.
 *
 * REFUSES RATHER THAN DROPS an unresolvable movement, the same call
 * writeExercises makes for routines: a template that silently comes back with
 * four of its five movements is worse than one that did not save.
 */
async function writeExercises(
  templateId: string,
  exercises: Exercise[],
  lookup: ExerciseLookup
): Promise<string | null> {
  const rows = [];
  for (const [index, ex] of exercises.entries()) {
    const ref = resolveExerciseRef(ex, lookup);
    if (!ref) {
      return `"${ex.name}" isn't in the exercise library, so this template can't be saved.`;
    }
    rows.push(prescriptionOf(ex, ref, templateId, index));
  }

  if (rows.length === 0) return null;
  const { error } = await supabase.from("workout_template_exercises").insert(rows);
  if (error) {
    console.error("[templates] Could not write exercises:", error.message);
    return describe(error);
  }
  return null;
}

export async function createTemplate(
  userId: string,
  template: Omit<WorkoutTemplate, "id" | "createdAt" | "isPublic" | "ownerId">,
  lookup: ExerciseLookup
): Promise<TemplateResult> {
  const { data, error } = await supabase
    .from("workout_templates")
    .insert({
      // The only shape a professional may create: owned, and not public. The
      // insert policy checks both, and the ownership check would reject any
      // other combination even if the policy allowed it.
      owner_id: userId,
      is_public: false,
      name: template.name.trim(),
      category: template.category ?? null,
      description: template.description ?? null,
      duration_min: template.durationMin ?? null,
      level: template.level ?? null,
      folder_id: template.folderId ?? null,
      coach_note: template.coachNote ?? null,
    })
    .select("id, created_at")
    .single();

  if (error || !data) {
    console.error("[templates] Could not create template:", error?.message);
    return {
      ok: false,
      message: error ? describe(error) : "Something went wrong. Please try again.",
    };
  }

  const exerciseError = await writeExercises(data.id, template.exercises, lookup);
  if (exerciseError) {
    // Clean up rather than leaving an exercise-less template behind.
    await supabase.from("workout_templates").delete().eq("id", data.id);
    return { ok: false, message: exerciseError };
  }

  return {
    ok: true,
    template: {
      ...template,
      id: data.id,
      createdAt: data.created_at.slice(0, 10),
      isPublic: false,
      ownerId: userId,
    },
  };
}

/**
 * Updates a template's own columns, and replaces its exercises when given any.
 *
 * EDITING A TEMPLATE DOES NOT TOUCH ANY ROUTINE IT HAS ALREADY PRODUCED, and
 * that is the schema's design rather than an omission here: the two column
 * lists are independent copies "so that editing a template cannot retroactively
 * rewrite routines already generated from it". Pushing a revision to a client
 * is a separate, explicit act — assignTemplate below.
 */
export async function updateTemplate(
  id: string,
  patch: Partial<Omit<WorkoutTemplate, "id" | "createdAt" | "exercises" | "isPublic" | "ownerId">>,
  exercises: Exercise[] | undefined,
  lookup: ExerciseLookup
): Promise<WriteResult> {
  const payload: {
    name?: string;
    category?: string | null;
    description?: string | null;
    duration_min?: number | null;
    level?: TemplateLevel | null;
    folder_id?: string | null;
    coach_note?: string | null;
  } = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.category !== undefined) payload.category = patch.category ?? null;
  if (patch.description !== undefined) payload.description = patch.description ?? null;
  if (patch.durationMin !== undefined) payload.duration_min = patch.durationMin ?? null;
  if (patch.level !== undefined) payload.level = patch.level ?? null;
  if (patch.folderId !== undefined) payload.folder_id = patch.folderId ?? null;
  if (patch.coachNote !== undefined) payload.coach_note = patch.coachNote ?? null;

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from("workout_templates").update(payload).eq("id", id);
    if (error) {
      console.error("[templates] Could not update template:", error.message);
      return { ok: false, message: describe(error) };
    }
  }

  if (exercises === undefined) return { ok: true };

  const { error: clearError } = await supabase
    .from("workout_template_exercises")
    .delete()
    .eq("workout_template_id", id);
  if (clearError) {
    console.error("[templates] Could not clear exercises:", clearError.message);
    return { ok: false, message: describe(clearError) };
  }

  const exerciseError = await writeExercises(id, exercises, lookup);
  if (exerciseError) return { ok: false, message: exerciseError };
  return { ok: true };
}

/** Prescriptions and assignment rows go with it, both ON DELETE CASCADE. The
 *  clients' routines do NOT: routines.source_template_id is a provenance
 *  column, and a client keeps the plan they were given. */
export async function deleteTemplate(id: string): Promise<WriteResult> {
  const { error } = await supabase.from("workout_templates").delete().eq("id", id);
  if (error) {
    console.error("[templates] Could not delete template:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

// --- assignments -----------------------------------------------------------

interface AssignmentRow {
  id: string;
  workout_template_id: string;
  client_id: string;
  routine_id: string | null;
  assigned_day: string | null;
  assigned_at: string;
}

export interface AssignmentsResult {
  ok: boolean;
  assignments: WorkoutTemplateAssignment[];
  message?: string;
}

const toAssignment = (r: AssignmentRow): WorkoutTemplateAssignment => ({
  id: r.id,
  templateId: r.workout_template_id,
  clientId: r.client_id,
  routineId: r.routine_id,
  assignedDay: r.assigned_day,
  assignedAt: r.assigned_at,
});

/**
 * Every assignment the caller can see.
 *
 * Both SELECT policies apply without being asked for: a professional sees the
 * rows for templates they own, and a client sees the rows naming them. The
 * caller decides which of those it is.
 */
export async function getTemplateAssignments(): Promise<AssignmentsResult> {
  const { data, error } = await supabase
    .from("workout_template_assignments")
    .select("id, workout_template_id, client_id, routine_id, assigned_day, assigned_at")
    .order("assigned_at", { ascending: true });

  if (error) {
    console.error("[templates] Could not read assignments:", error.message);
    return { ok: false, assignments: [], message: describe(error) };
  }
  return { ok: true, assignments: (data ?? []).map((r) => toAssignment(r as AssignmentRow)) };
}

export interface AssignResult {
  ok: boolean;
  /** True when the refusal was ATX18 and the caller may retry with confirmation. */
  needsOverwriteConfirmation?: boolean;
  routineId?: string;
  message?: string;
}

/**
 * Pushes a template to one client.
 *
 * THE FUNCTION DOES ALL OF IT — creates or refreshes the routine, copies the
 * prescription, re-points a private custom movement at a copy the client can
 * read, records the assignment and syncs the calendar event. None of that is
 * reachable from here directly: a professional cannot write another account's
 * routine, and no client role holds INSERT or UPDATE on the assignment table.
 *
 * `confirmOverwrite` IS THE WHOLE SAFETY MECHANISM and defaults to false. The
 * function compares routines.updated_at against the assignment's assigned_at
 * INSIDE the transaction that would do the overwrite, behind the same
 * FOR UPDATE locks — so a client editing between a warning and its
 * confirmation is caught, which a client-side pre-check could never do. A
 * refusal writes nothing, including the calendar event.
 */
export async function assignTemplate(
  templateId: string,
  clientId: string,
  assignedDay: string | null,
  confirmOverwrite = false
): Promise<AssignResult> {
  const { data, error } = await supabase.rpc("assign_template_to_client", {
    p_template_id: templateId,
    p_client_id: clientId,
    p_assigned_day: assignedDay,
    p_confirm_overwrite: confirmOverwrite,
  });

  if (error) {
    const refused = (error.code ?? "") === OVERWRITE_REFUSED;
    // Not logged as an error when it is the guard doing its job: the caller
    // turns this into a diff and a question, not a failure.
    if (!refused) console.error("[templates] Could not assign template:", error.message);
    return {
      ok: false,
      needsOverwriteConfirmation: refused,
      message: describe(error as unknown as PostgrestError),
    };
  }

  const routine = data as { id?: string } | null;
  return { ok: true, routineId: routine?.id };
}

/** Un-records an assignment. Deliberately leaves the client's routine alone —
 *  the table comment is explicit that the client keeps what they have. */
export async function unassignTemplate(assignmentId: string): Promise<WriteResult> {
  const { data, error } = await supabase
    .from("workout_template_assignments")
    .delete()
    .eq("id", assignmentId)
    .select("id");

  if (error) {
    console.error("[templates] Could not unassign template:", error.message);
    return { ok: false, message: describe(error) };
  }
  // A policy rejection on DELETE is silent — zero rows, no error — so the row
  // count is the only honest check, as deleteWorkoutSession documents.
  if (!data || data.length === 0) {
    return { ok: false, message: "That assignment couldn't be removed." };
  }
  return { ok: true };
}

// --- the overwrite diff ----------------------------------------------------

/** One line of "what they have now" against "what this would give them". */
export interface PrescriptionDiff {
  name: string;
  /** Absent when the movement is not in the client's routine at all. */
  current?: string;
  /** Absent when the template does not prescribe it — it would be removed. */
  proposed?: string;
}

interface ClientRoutineRow {
  id: string;
  name: string;
  updated_at: string;
  routine_exercises: {
    position: number;
    sets: number | null;
    reps: number | null;
    weight_kg: number | null;
    exercises: { name: string } | null;
    custom_exercise_library_items: { name: string } | null;
  }[];
}

/** "5×5 @ 100kg" — the shape a coach reads at a glance. */
function summarise(sets: number | null, reps: number | null, weightKg: number | null): string {
  const scheme = `${sets ?? "?"}×${reps ?? "?"}`;
  const weight = weightKg === null ? null : `${Number(weightKg)}kg`;
  return weight ? `${scheme} @ ${weight}` : scheme;
}

export interface OverwriteDiffResult {
  ok: boolean;
  /** Empty when the routine matches what the template would prescribe. */
  differences: PrescriptionDiff[];
  routineName?: string;
  message?: string;
}

/**
 * What re-assigning would change in the client's routine.
 *
 * NO NEW FUNCTION IS NEEDED FOR THIS READ: routines_select_assigning_professional
 * and routine_exercises_select_assigning_professional already let the
 * professional who assigned a routine read it and its prescriptions. That is
 * exactly the routine at risk here, because it is the one this assignment
 * produced.
 *
 * A REAL DIFF, NOT "SOMETHING CHANGED". The professional is being asked to
 * destroy specific work, so they are shown which movement and which numbers —
 * added, removed, or altered. Compared by movement NAME rather than by id
 * because the client's copy of a private custom movement is a different row
 * with the same name, by design of the assign function.
 *
 * THIS IS NOT THE GUARD. The database decides whether an overwrite is refused,
 * inside the transaction that would perform it; this only explains to a human
 * what they are about to agree to.
 */
export async function getOverwriteDiff(
  routineId: string,
  templateExercises: Exercise[]
): Promise<OverwriteDiffResult> {
  const { data, error } = await supabase
    .from("routines")
    .select(
      "id, name, updated_at, routine_exercises(position, sets, reps, weight_kg, " +
        "exercises(name), custom_exercise_library_items(name))"
    )
    .eq("id", routineId)
    .maybeSingle();

  if (error) {
    console.error("[templates] Could not read the client's routine:", error.message);
    return { ok: false, differences: [], message: describe(error) };
  }
  // The routine is gone, so there is nothing to overwrite and nothing to warn
  // about; the assignment will create a fresh one.
  if (!data) return { ok: true, differences: [] };

  const routine = data as unknown as ClientRoutineRow;
  const current = new Map<string, string>();
  for (const re of routine.routine_exercises ?? []) {
    const name = re.exercises?.name ?? re.custom_exercise_library_items?.name;
    if (!name) continue;
    current.set(name, summarise(re.sets, re.reps, re.weight_kg));
  }

  const proposed = new Map<string, string>();
  for (const ex of templateExercises) {
    proposed.set(ex.name, summarise(ex.sets ?? null, ex.reps ?? null, ex.weightKg ?? null));
  }

  const differences: PrescriptionDiff[] = [];
  for (const [name, currentText] of current) {
    const proposedText = proposed.get(name);
    if (proposedText === undefined) differences.push({ name, current: currentText });
    else if (proposedText !== currentText) {
      differences.push({ name, current: currentText, proposed: proposedText });
    }
  }
  for (const [name, proposedText] of proposed) {
    if (!current.has(name)) differences.push({ name, proposed: proposedText });
  }

  return { ok: true, differences, routineName: routine.name };
}
