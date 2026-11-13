import type { LoggedExercise, LoggedSet, WorkoutSession } from "../../types";
import { estimate1RM } from "./index";
import { countsTowardVolume } from "./session";

// Batch D GH (Karim, with the Database session's numbers): what a logged set
// and a body-weight entry may hold.
//
// TWO LEVELS. Above the CONFIRM figures the logger asks "Is this right?" and
// logs the set once the person says yes; above the CEILINGS the set cannot be
// saved at all. The ceilings are the server's (NOT VALID checks on new and
// updated rows: logged_sets_weight_ceiling, logged_sets_reps_ceiling); the
// confirm figures are the client's alone.
//
// READERS IGNORE WHAT THE SERVER WOULD REFUSE, old rows included: a set over
// either ceiling, or whose estimated 1RM is over 1,000 kg, counts toward no
// record, chart or prefill (current_personal_records skips the same three).
// Pure, so the boundaries are tested (setLimits.test.ts).

/** Weight per set: above this, "Is this right?". */
export const SET_WEIGHT_CONFIRM_KG = 300;
/** Weight per set: above this, refused (logged_sets_weight_ceiling; numeric(7,2), so 1000.00 is allowed). */
export const SET_WEIGHT_MAX_KG = 1000;
/** Reps per set: above this, "Is this right?". */
export const SET_REPS_CONFIRM = 100;
/** Reps per set: above this, refused (logged_sets_reps_ceiling). */
export const SET_REPS_MAX = 1000;
/** A logged set has at least one whole rep (the server still allows 0; Karim: the client asks for 1 or more). */
export const SET_REPS_MIN = 1;
/** No personal record is written, or read, above this estimated 1RM. */
export const ONE_RM_MAX_KG = 1000;
/** A body-weight entry, inclusive (health_metrics_weight_possible). */
export const BODY_WEIGHT_MIN_KG = 20;
export const BODY_WEIGHT_MAX_KG = 500;

/** What log.ts writes: weight to the column's 2 decimals, reps rounded (so 1000.004 kg is the 1000.00 the server takes). */
export const storedWeightKg = (kg: number | null): number => (kg == null ? 0 : Math.round(Math.max(0, kg) * 100) / 100);
export const storedReps = (reps: number): number => Math.max(0, Math.round(reps || 0));

export type SetLevel = "ok" | "confirm" | "refuse";

export interface SetCheck {
  level: SetLevel;
  /** Which values put it there (both can). */
  weight: boolean;
  reps: boolean;
}

/** One set's values against the limits. */
export function checkSet(weightKg: number | null, reps: number): SetCheck {
  const w = storedWeightKg(weightKg);
  const r = storedReps(reps);
  const wRefuse = w > SET_WEIGHT_MAX_KG;
  const rRefuse = r > SET_REPS_MAX;
  if (wRefuse || rRefuse) return { level: "refuse", weight: wRefuse, reps: rRefuse };
  const wConfirm = w > SET_WEIGHT_CONFIRM_KG;
  const rConfirm = r > SET_REPS_CONFIRM;
  if (wConfirm || rConfirm) return { level: "confirm", weight: wConfirm, reps: rConfirm };
  return { level: "ok", weight: false, reps: false };
}

/** Reps a logged set may carry: a whole number, at least 1 (the ceiling is checkSet's). */
export const validReps = (reps: number): boolean => Number.isInteger(reps) && reps >= SET_REPS_MIN;

/** The reps box takes whole numbers only: digits, and anything after a decimal point is dropped ("2.5" → 2, not 25). */
export function repsFromInput(raw: string): number {
  const whole = raw.split(/[.,٫]/)[0].replace(/\D/g, "");
  return whole === "" ? 0 : Number(whole);
}

/** A stored set the records and charts may read: under both ceilings, and an estimated 1RM no higher than 1,000 kg. */
export function plausibleSet(set: Pick<LoggedSet, "weightKg" | "reps">): boolean {
  const w = set.weightKg ?? 0;
  const r = set.reps || 0;
  if (w > SET_WEIGHT_MAX_KG || r > SET_REPS_MAX) return false;
  return estimate1RM(w, r) <= ONE_RM_MAX_KG;
}

/** A 1RM a record may hold. */
export const plausibleOneRm = (kg: number): boolean => Number.isFinite(kg) && kg > 0 && kg <= ONE_RM_MAX_KG;

/**
 * A session's volume without the sets readers ignore. The stored total is
 * kept as is unless it holds such a set, so every ordinary session reads
 * exactly what it did before.
 */
export function plausibleVolumeKg(s: Pick<WorkoutSession, "totalVolumeKg" | "exercises">): number {
  let drop = 0;
  for (const ex of s.exercises) for (const set of ex.sets) if (countsTowardVolume(set) && !plausibleSet(set)) drop += (set.weightKg ?? 0) * (set.reps || 0);
  return drop > 0 ? Math.max(0, Math.round((s.totalVolumeKg - drop) * 100) / 100) : s.totalVolumeKg;
}

/** A session that logged sets and every one of them is one readers ignore (it is not a training day for the charts). */
export const onlyImplausibleSets = (s: Pick<WorkoutSession, "exercises">): boolean => {
  const sets = s.exercises.flatMap((ex) => ex.sets);
  return sets.length > 0 && !s.exercises.some((ex) => ex.enduranceResult) && sets.every((set) => !plausibleSet(set));
};

/** The sets the server would refuse (over a ceiling), as "exIdx-setIdx" keys, in the logger's own indexes. */
export function setsOverCeiling(exercises: readonly Pick<LoggedExercise, "sets">[]): string[] {
  const out: string[] = [];
  exercises.forEach((ex, i) => ex.sets.forEach((s, j) => checkSet(s.weightKg, s.reps).level === "refuse" && out.push(`${i}-${j}`)));
  return out;
}

/** A body-weight entry: inside 20–500 kg inclusive, or refused. */
export const bodyWeightAllowed = (kg: number): boolean => Number.isFinite(kg) && kg >= BODY_WEIGHT_MIN_KG && kg <= BODY_WEIGHT_MAX_KG;

// ---------------------------------------------------------------------------
// Batch D GH follow-up (Karim): the professional's reads of a client's
// lifts and weight skip the same impossible values.

/** A set read as kg and reps (the professional's insights shape) the records and charts may use. */
export const plausibleLift = (kg: number | null, reps: number | null): boolean => plausibleSet({ weightKg: kg, reps: reps ?? 0 });

/**
 * A professional's read of a session's sets, without the impossible ones, and
 * the volume they had added (completed sets only, as the stored total counts).
 */
export function withoutImplausibleSets<S extends { kg: number | null; reps: number | null; completed?: boolean }>(sets: readonly S[]): { sets: S[]; droppedVolumeKg: number } {
  const kept: S[] = [];
  let dropped = 0;
  for (const s of sets) {
    if (plausibleLift(s.kg, s.reps)) kept.push(s);
    else if (s.completed !== false) dropped += (s.kg ?? 0) * (s.reps ?? 0);
  }
  return { sets: kept, droppedVolumeKg: dropped };
}

/** A health reading charts may show: a weight only inside 20–500 kg; any other type as it is. */
export const plausibleReading = (type: string, value: number): boolean => type !== "weight" || bodyWeightAllowed(value);
