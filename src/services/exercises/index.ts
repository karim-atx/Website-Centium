import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  CustomExerciseLibraryItem,
  ExerciseClassification,
  ExerciseTag,
  MuscleGroup,
} from "../../types";
import { readTags } from "../../utils/exerciseTags";

// The exercise library: the public catalog, and a user's own movements.
//
// TWO TABLES, TWO ACCESS SHAPES, THE SAME SPLIT ../food DRAWS between foods
// and custom_foods. public.exercises is anon-readable reference data with no
// client write path at all; custom_exercise_library_items is own-row-only and
// fully writable by its owner. Neither is a snapshot: an exercise is a
// DEFINITION, and re-reading it is the point — renaming your own movement is
// supposed to change it everywhere it appears.
//
// WHAT THIS FILE DELIBERATELY DOES NOT TOUCH. routine_exercises,
// workout_template_exercises, logged_exercises and personal_records all carry
// an exercise_id / custom_exercise_id pointing here, and each is written by
// the service that owns it — ../routines, ../templates and ../workout/log
// respectively. This one owns the DEFINITIONS and nothing that prescribes or
// records them.
//
// That paragraph used to end "and all four are still local-only state in this
// app", which stopped being true the moment those services landed. It is
// corrected rather than deleted because the boundary it describes is still
// real: a caller wanting to save a prescription goes to ../routines, not here.

/**
 * One row of the public catalog.
 *
 * category IS A MUSCLE GROUP, NOT THE PROTOTYPE'S UI GROUPING. The old local
 * library carried `category: "arms" | "legs" | "full_body" | ...`, which is a
 * browse taxonomy; this column is typed public.muscle_group and the seed
 * derives it as muscle_groups[1] — the primary mover. Half the prototype's
 * values are not muscle_group members at all, which is why that field could
 * not simply be carried over and is not reconstructed here.
 */
export interface CatalogExercise {
  id: string;
  name: string;
  category: MuscleGroup;
  classification: ExerciseClassification;
  /** The primary mover(s). What "filter by muscle group" means, per QA. */
  muscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  /**
   * True when the muscle-group mapping comes from a sourced anatomical
   * reference. EVERY SEEDED ROW IS FALSE, and the seed migration says why at
   * length: the mappings were hand-assigned in this prototype across three
   * review passes, which is careful work but is not a citation. Read as
   * "informed estimate", never as "unverified junk".
   */
  isVerified: boolean;
  /** The disciplines this movement belongs to. See ExerciseTag. */
  tags: ExerciseTag[];
}

const CATALOG_COLUMNS =
  "id, name, category, classification, muscle_groups, secondary_muscle_groups, is_verified, tags";
// No is_verified here, and no owner_id: a user's own movement is never
// verified — the table has no such column, precisely because the answer is
// always the same — and owner_id is settled by the RLS policy, not by the
// caller reading it back.
const CUSTOM_COLUMNS =
  "id, name, category, classification, muscle_groups, secondary_muscle_groups, tags";

interface CatalogRow {
  id: string;
  name: string;
  category: MuscleGroup;
  classification: ExerciseClassification;
  muscle_groups: MuscleGroup[];
  secondary_muscle_groups: MuscleGroup[];
  is_verified: boolean;
  tags: string[] | null;
}

interface CustomRow {
  id: string;
  name: string;
  category: MuscleGroup | null;
  classification: ExerciseClassification;
  muscle_groups: MuscleGroup[];
  secondary_muscle_groups: MuscleGroup[];
  tags: string[] | null;
}

const fromCatalog = (r: CatalogRow): CatalogExercise => ({
  id: r.id,
  name: r.name,
  category: r.category,
  classification: r.classification,
  muscleGroups: r.muscle_groups,
  secondaryMuscleGroups: r.secondary_muscle_groups,
  isVerified: r.is_verified,
  // Unknown values are dropped on read rather than shown: a tag this build
  // has no label for can be neither displayed nor filtered on, and the row
  // itself is untouched because nothing writes back what it did not read.
  tags: readTags(r.tags),
});

const fromCustom = (r: CustomRow): CustomExerciseLibraryItem => ({
  id: r.id,
  name: r.name,
  classification: r.classification,
  muscleGroups: r.muscle_groups,
  secondaryMuscleGroups: r.secondary_muscle_groups,
  tags: readTags(r.tags),
});

/**
 * category is DERIVED on write, the same way the catalog seed derives it.
 *
 * The column is nullable here and the client's creation sheet never asks for a
 * category, so the alternative is leaving it null on every row this app
 * writes. Taking the first primary mover instead keeps a user's own movement
 * groupable by the same rule as a catalog row, and null still results when
 * they picked no muscle group at all.
 */
const categoryOf = (item: CustomExerciseLibraryItem): MuscleGroup | null =>
  item.muscleGroups?.[0] ?? null;

function describe(error: PostgrestError): string {
  // 42501 is a privilege violation, not an expired session — see ../food.
  if (error.code === "42501") return "You don't have permission to do that.";
  if (isOffline(error)) return OFFLINE_MESSAGE;
  return "Something went wrong. Please try again.";
}

export interface CatalogResult {
  /**
   * False means the read FAILED, which is not "the catalog is empty" — the
   * same distinction getDiaryEntries and getCustomMeals draw. The caller
   * replaces state with `exercises`, so a dropped connection must not empty a
   * library that was on screen a moment ago.
   */
  ok: boolean;
  exercises: CatalogExercise[];
  message?: string;
}

export interface CustomExercisesResult {
  ok: boolean;
  exercises: CustomExerciseLibraryItem[];
  message?: string;
}

export interface CustomExerciseResult {
  ok: boolean;
  exercise?: CustomExerciseLibraryItem;
  message?: string;
}

export interface CustomExerciseWriteResult {
  ok: boolean;
  message?: string;
}

/**
 * The whole catalog, which is what every browse surface in the app wants.
 *
 * NO SEARCH ARGUMENT, unlike searchFoods. 52 curated rows is small enough to
 * hold and filter in memory, and the two surfaces that browse it — the picker
 * sheet and the Exercise Database tab — both already filter and group a full
 * list client-side. A server-side ilike would be a second code path for the
 * same answer. If this ever grows past a few hundred rows it should become a
 * paged or category-scoped query, exactly as listFoods says of itself.
 *
 * Anon-readable: `exercises_select_public` is `using (true)` and the SELECT
 * grant covers anon as well as authenticated, so a signed-out visitor browsing
 * the library gets the real thing rather than an empty list.
 */
export async function listExercises(): Promise<CatalogResult> {
  const { data, error } = await supabase
    .from("exercises")
    .select(CATALOG_COLUMNS)
    .order("name")
    .limit(300);

  if (error) {
    console.error("[exercises] Could not read the catalog:", error.message);
    return { ok: false, exercises: [], message: describe(error) };
  }
  return { ok: true, exercises: (data ?? []).map((r) => fromCatalog(r as CatalogRow)) };
}

/**
 * The signed-in user's own movements.
 *
 * Private to the owner — there is no scoped-to-client mode here, unlike
 * custom_foods, because nothing describes a professional authoring an exercise
 * for one specific client. A client CAN hold a copy of their professional's
 * movement, but it is their own row, created by assign_template_to_client()
 * and linked back through source_custom_exercise_id; it reads like any other
 * row of theirs, which is why that column is not selected above.
 */
export async function getCustomExercises(userId: string): Promise<CustomExercisesResult> {
  const { data, error } = await supabase
    .from("custom_exercise_library_items")
    .select(CUSTOM_COLUMNS)
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[exercises] Could not read custom exercises:", error.message);
    return { ok: false, exercises: [], message: describe(error) };
  }
  return { ok: true, exercises: (data ?? []).map((r) => fromCustom(r as CustomRow)) };
}

/** Returns the stored row, so the caller can replace a local id with the real one. */
export async function createCustomExercise(
  userId: string,
  item: CustomExerciseLibraryItem
): Promise<CustomExerciseResult> {
  const { data, error } = await supabase
    .from("custom_exercise_library_items")
    .insert({
      owner_id: userId,
      name: item.name.trim(),
      category: categoryOf(item),
      classification: item.classification,
      muscle_groups: item.muscleGroups ?? [],
      secondary_muscle_groups: item.secondaryMuscleGroups ?? [],
      tags: item.tags ?? [],
    })
    .select(CUSTOM_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[exercises] Could not create custom exercise:", error?.message);
    return {
      ok: false,
      message: error ? describe(error) : "Something went wrong. Please try again.",
    };
  }
  return { ok: true, exercise: fromCustom(data as CustomRow) };
}

/**
 * Renaming included — the edit sheet has always allowed it.
 *
 * owner_id IS NOT SENT, and that is not an oversight. The UPDATE grant is
 * column-scoped to (name, category, classification, muscle_groups,
 * secondary_muscle_groups, tags); naming owner_id in the payload would be
 * refused with 42501 even though the value would be identical.
 */
export async function updateCustomExercise(
  id: string,
  item: CustomExerciseLibraryItem
): Promise<CustomExerciseWriteResult> {
  const { error } = await supabase
    .from("custom_exercise_library_items")
    .update({
      name: item.name.trim(),
      category: categoryOf(item),
      classification: item.classification,
      muscle_groups: item.muscleGroups ?? [],
      secondary_muscle_groups: item.secondaryMuscleGroups ?? [],
      tags: item.tags ?? [],
    })
    .eq("id", id);

  if (error) {
    console.error("[exercises] Could not update custom exercise:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/**
 * Deletes one of the user's own movements.
 *
 * WHAT GOES WITH IT, measured off pg_constraint rather than assumed:
 *
 *   routine_exercises.custom_exercise_id          ON DELETE CASCADE
 *   workout_template_exercises.custom_exercise_id ON DELETE CASCADE
 *   personal_records.custom_exercise_id           ON DELETE CASCADE
 *   logged_exercises.custom_exercise_id           ON DELETE SET NULL
 *
 * So the movement leaves every routine and template that prescribed it, and
 * its personal record goes with it — but TRAINING HISTORY SURVIVES, because
 * logged_exercises.name is NOT NULL and carries the name the set was logged
 * under. A past session still reads correctly with the definition gone.
 *
 * That last column is the reason the confirm can promise history is kept.
 * This comment used to end "None of that is reachable yet — those tables are
 * still local state", which stopped being true when routines, templates and
 * the workout log became rows.
 */
export async function deleteCustomExercise(id: string): Promise<CustomExerciseWriteResult> {
  const { error } = await supabase.from("custom_exercise_library_items").delete().eq("id", id);
  if (error) {
    console.error("[exercises] Could not delete custom exercise:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
