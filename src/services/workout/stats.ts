import type { Exercise, LoggedExercise, LoggedSet, SetOutcome, SetType, WorkoutSession } from "../../types";
import { tk } from "../../i18n/core";
import { plausibleSet } from "./setLimits";

/**
 * Handover 2026-09-29 set types (02 "Set types and numbering"): ONE type per
 * set — Normal, Warm up, Failed, Skipped, Personal record, Drop set.
 *
 * The database keeps these as three fields (set_type, outcome, is_pr), which
 * is kept: each handover type maps onto them (approved decision 14), so a set
 * can no longer be both PR and Failed in the UI, but nothing is migrated.
 */
export type HandoverSetType = "normal" | "warmup" | "failed" | "skipped" | "pr" | "drop";

export const HANDOVER_SET_TYPES: { value: HandoverSetType; label: string; short: string }[] = [
  { value: "normal", label: tk("Normal"), short: "" },
  { value: "warmup", label: tk("Warm up"), short: "W" },
  { value: "failed", label: tk("Failed"), short: "F" },
  { value: "skipped", label: tk("Skipped"), short: "S" },
  { value: "pr", label: tk("Personal record"), short: "PR" },
  { value: "drop", label: tk("Drop set"), short: "DS" },
];

/** A logged set's one handover type, read from the three stored fields. */
export function setKind(set: Pick<LoggedSet, "outcome" | "isPr" | "setType">): HandoverSetType {
  if (set.outcome === "skipped") return "skipped";
  if (set.outcome === "failed") return "failed";
  if (set.isPr || set.setType === "pr") return "pr";
  if (set.setType === "warmup") return "warmup";
  if (set.setType === "dropset") return "drop";
  return "normal";
}

/**
 * The stored fields for a handover type. `completed` sets keep their
 * outcome; a set that is not done yet stays without one.
 */
export function kindFields(
  kind: HandoverSetType,
  current: Pick<LoggedSet, "outcome" | "completed">
): { setType: SetType; outcome: SetOutcome | undefined; isPr: boolean } {
  const done: SetOutcome | undefined = current.completed ? "completed" : current.outcome === "completed" ? "completed" : undefined;
  switch (kind) {
    case "skipped":
      return { setType: "normal", outcome: "skipped", isPr: false };
    case "failed":
      return { setType: "normal", outcome: "failed", isPr: false };
    case "pr":
      return { setType: "normal", outcome: done, isPr: true };
    case "warmup":
      return { setType: "warmup", outcome: done, isPr: false };
    case "drop":
      return { setType: "dropset", outcome: done, isPr: false };
    default:
      return { setType: "normal", outcome: done, isPr: false };
  }
}

/**
 * A working set for 1RM and "top set" (03): a completed Normal, PR or Drop
 * set. Warm up, Failed and Skipped never count.
 */
export function isWorkingSet(set: LoggedSet): boolean {
  if (!set.completed) return false;
  const kind = setKind(set);
  // A bodyweight set (0 kg) is not a working set for load: no top set, no 1RM.
  // Batch D GH: nor is a set over the server's ceilings (old rows included).
  return (kind === "normal" || kind === "pr" || kind === "drop") && (set.weightKg ?? 0) > 0 && set.reps > 0 && plausibleSet(set);
}

/**
 * Which exercise a logged exercise is, across sessions and routines: the
 * library row when there is one, else the name (legacy rows and custom
 * movements logged before they had an id).
 */
export function exerciseKey(ex: Pick<LoggedExercise, "catalogExerciseId" | "customExerciseId" | "name">): string {
  if (ex.catalogExerciseId) return `c:${ex.catalogExerciseId}`;
  if (ex.customExerciseId) return `u:${ex.customExerciseId}`;
  return `n:${ex.name.trim().toLowerCase()}`;
}

/**
 * Batch D GH: the key the app's personalRecords map uses for a record read
 * back (services/workout/records), the same exerciseKey a logged exercise
 * has. Never the name: a custom "Bench Press" and the library's keep
 * separate records.
 */
export const recordKey = (r: { exerciseId?: string; customExerciseId?: string; name: string }): string =>
  exerciseKey({ catalogExerciseId: r.exerciseId, customExerciseId: r.customExerciseId, name: r.name });

/** The same key for a reference about to be written (personal_records' exercise_id / custom_exercise_id). */
export const refKey = (ref: { exercise_id: string | null; custom_exercise_id: string | null }, name: string): string =>
  exerciseKey({ catalogExerciseId: ref.exercise_id ?? undefined, customExerciseId: ref.custom_exercise_id ?? undefined, name });

/**
 * Batch D GH: the same key for a routine's exercise (its `exerciseId` is the
 * library row). Records are keyed this way, never by name, so a custom
 * "Bench Press" and the library's "Bench Press" keep separate records.
 */
export const routineExerciseKey = (ex: Pick<Exercise, "exerciseId" | "customExerciseId" | "name">): string =>
  exerciseKey({ catalogExerciseId: ex.exerciseId, customExerciseId: ex.customExerciseId, name: ex.name });

/**
 * Batch D GH: the library definition a logged exercise is, by id. Without an
 * id (a legacy row, or a custom movement not yet uploaded), by name only when
 * exactly one definition across both lists has it: a name both the library
 * and a custom movement use is never guessed.
 */
export function definitionOf<C extends { id: string; name: string }, U extends { id?: string; name: string }>(
  ex: Pick<LoggedExercise, "catalogExerciseId" | "customExerciseId" | "name">,
  catalog: readonly C[],
  custom: readonly U[]
): C | U | undefined {
  if (ex.catalogExerciseId) return catalog.find((e) => e.id === ex.catalogExerciseId);
  if (ex.customExerciseId) {
    const byId = custom.find((e) => e.id === ex.customExerciseId);
    if (byId) return byId;
  }
  const wanted = ex.name.trim().toLowerCase();
  const same = (e: { name: string }) => e.name.trim().toLowerCase() === wanted;
  // A custom id that doesn't resolve (a local id replaced on upload) is still
  // a custom movement, never a library one; custom names are unique.
  if (ex.customExerciseId) return custom.find(same);
  const named = [...catalog.filter(same), ...custom.filter(same)];
  return named.length === 1 ? named[0] : undefined;
}

/**
 * Previous-session prefill (03 LastSession, WO8): for a routine, the weight
 * and reps logged for each set position of each exercise in its most recent
 * finished session. Duplicated routines have their own id, so they start
 * with no history.
 */
export function lastSessionPrefill(
  sessions: WorkoutSession[],
  routineId: string
): Map<string, { weight: number | null; reps: number | null }[]> {
  const out = new Map<string, { weight: number | null; reps: number | null }[]>();
  let latest: WorkoutSession | null = null;
  for (const s of sessions) {
    if (s.routineId !== routineId) continue;
    // By the day it counts on (WO3.1 can move it), then by start time.
    if (!latest || s.date > latest.date || (s.date === latest.date && s.startedAt > latest.startedAt)) latest = s;
  }
  if (!latest) return out;
  for (const ex of latest.exercises) {
    out.set(
      exerciseKey(ex),
      ex.sets.map((set) => ({
        // A logged bodyweight set (0) prefills as bodyweight; only a row with no weight is blank.
        // Batch D GH: a set over the ceilings prefills nothing.
        weight: set.completed && set.weightKg !== null && plausibleSet(set) ? set.weightKg : null,
        reps: set.completed && set.reps > 0 && plausibleSet(set) ? set.reps : null,
      }))
    );
  }
  return out;
}
