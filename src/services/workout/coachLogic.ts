import type { Exercise, LoggedSet, PrescribedSetType } from "../../types";
import { t, tk, tn } from "../../i18n/core";

// Release 3 · W7 (CU1 logger): what the client sees of a coach's prescription
// while logging, and what the session sends back. Pure, so it is tested
// without a client (coachLogic.test.ts).

/** The prescribed type of one set (Exercise.setTypes, index = set number - 1). */
export function prescribedType(ex: Pick<Exercise, "setTypes">, setIdx: number): PrescribedSetType {
  return ex.setTypes?.[setIdx] ?? "normal";
}

/** "82.5", "80": a weight as the logger writes it. */
export function fmtKg(kg: number): string {
  return String(Math.round(kg * 100) / 100);
}

/** The prescribed reps as text: "6", or the range "8 to 12" (COPY: ranges read "to", never a dash). */
function repsText(ex: Pick<Exercise, "reps" | "minReps" | "maxReps">): string | null {
  if (ex.minReps != null && ex.maxReps != null) return t("{min} to {max}", { min: ex.minReps, max: ex.maxReps });
  if (ex.minReps != null) return `${ex.minReps}+`;
  if (ex.reps != null && ex.reps > 0) return String(ex.reps);
  return null;
}

/** The weight a set is prescribed at: from 1RM when resolved, else the routine's weight. */
export function targetWeight(ex: Pick<Exercise, "weightKg">, resolved: number | null | undefined): number | null {
  if (resolved != null && resolved > 0) return resolved;
  return ex.weightKg != null && ex.weightKg > 0 ? ex.weightKg : null;
}

const TYPE_LEAD: Record<Exclude<PrescribedSetType, "normal">, string> = {
  warmup: tk("Warm-up"),
  dropset: tk("Drop set"),
  pr: tk("Personal record"),
};

/**
 * The target line under a set (CU1 v5): "Target 6 × 82.5 kg · RPE 8",
 * "Warm-up · 10 × 40 kg", "Drop set · 10 × 60 kg". Null when nothing is
 * prescribed for it.
 */
export function targetLine(
  ex: Pick<Exercise, "reps" | "minReps" | "maxReps" | "weightKg" | "rpe" | "setTypes">,
  setIdx: number,
  resolvedKg?: number | null
): string | null {
  const { type, core, rpe } = targetParts(ex, setIdx, resolvedKg);
  if (type !== "normal") return core ? `${t(TYPE_LEAD[type])} · ${core}` : t(TYPE_LEAD[type]);
  if (!core && !rpe) return null;
  return core ? `${t("Target {core}", { core })}${rpe ? ` · ${rpe}` : ""}` : t("Target {core}", { core: rpe! });
}

/**
 * The pieces of a target line, each already in the app's language, so the
 * two sentences built from them never take a translated string apart.
 */
function targetParts(
  ex: Pick<Exercise, "reps" | "minReps" | "maxReps" | "weightKg" | "rpe" | "setTypes">,
  setIdx: number,
  resolvedKg?: number | null
): { type: PrescribedSetType; core: string | null; rpe: string | null } {
  const reps = repsText(ex);
  const kg = targetWeight(ex, resolvedKg);
  const range = ex.minReps != null && ex.maxReps != null;
  // Exact reps as drawn ("6 × 82.5 kg"); a range keeps its unit so it reads
  // "8 to 12 reps × 70 kg" (the frame draws exact reps only).
  const core =
    reps && kg != null
      ? range
        ? t("{reps} reps × {kg} kg", { reps, kg: fmtKg(kg) })
        : `${reps} × ${fmtKg(kg)} kg`
      : reps
        ? t("{reps} reps", { reps })
        : kg != null
          ? `${fmtKg(kg)} kg`
          : null;
  return { type: prescribedType(ex, setIdx), core, rpe: ex.rpe != null ? `RPE ${ex.rpe}` : null };
}

/**
 * What a logged set changed from its target, for "· logged 80 kg" (CU1 v5).
 * Only a set that was done, and only against an exact target: a range is met
 * by any number in it.
 */
export function loggedOffText(
  ex: Pick<Exercise, "reps" | "minReps" | "maxReps" | "weightKg">,
  set: Pick<LoggedSet, "reps" | "weightKg" | "completed" | "outcome">,
  resolvedKg?: number | null
): string | null {
  const done = set.completed || set.outcome === "failed";
  if (!done) return null;
  const kg = targetWeight(ex, resolvedKg);
  const exactReps = ex.minReps == null && ex.maxReps == null && ex.reps != null && ex.reps > 0 ? ex.reps : null;
  const weightOff = kg != null && set.weightKg != null && Math.abs(set.weightKg - kg) > 0.001;
  const repsOff = exactReps != null && set.reps > 0 && set.reps !== exactReps;
  if (weightOff && repsOff) return `${set.reps} × ${fmtKg(set.weightKg!)} kg`;
  if (weightOff) return `${fmtKg(set.weightKg!)} kg`;
  if (repsOff) return t("{reps} reps", { reps: set.reps });
  return null;
}

/**
 * The prescribed Warm up / Drop set types, put on a fresh session's asked
 * rows so they log as the coach planned them. Personal record is how a set
 * went, not a plan, so it is shown in the target line only. A row the client
 * has already typed is left alone, and so is an optional row (it must stay
 * untouched to be dropped when unused).
 */
export function seedPrescribedTypes(ex: Pick<Exercise, "setTypes">, sets: LoggedSet[]): LoggedSet[] {
  if (!ex.setTypes?.length) return sets;
  return sets.map((s, i) => {
    const t = ex.setTypes?.[i];
    if (s.optional || s.setType || (t !== "warmup" && t !== "dropset")) return s;
    return { ...s, setType: t };
  });
}

/** One swapped exercise, as workout_sessions.swaps stores it (HANDOVER_API, 20261124160000). */
export interface SessionSwap {
  /** The exercise's position in the routine (0-based, routine_exercises.position order). */
  position: number;
  from_exercise_id: string | null;
  from_custom_exercise_id: string | null;
  to_exercise_id: string | null;
  to_custom_exercise_id: string | null;
  /** Optional free text, at most 60 characters. */
  reason: string | null;
}

export const SWAP_REASON_MAX = 60;
export const SWAPS_MAX_BYTES = 8 * 1024;

const uuidOrNull = (v: string | null | undefined): string | null =>
  v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : null;

/** One swap: from the routine's exercise to the picked one, with the reason cut to 60. */
export function buildSwap(
  position: number,
  from: { exerciseId?: string; customExerciseId?: string },
  to: { exerciseId?: string; customExerciseId?: string },
  reason: string | null | undefined
): SessionSwap {
  const r = reason?.trim().slice(0, SWAP_REASON_MAX) ?? "";
  const fromCatalog = uuidOrNull(from.exerciseId);
  const toCatalog = uuidOrNull(to.exerciseId);
  return {
    position,
    from_exercise_id: fromCatalog,
    from_custom_exercise_id: fromCatalog ? null : uuidOrNull(from.customExerciseId),
    to_exercise_id: toCatalog,
    to_custom_exercise_id: toCatalog ? null : uuidOrNull(to.customExerciseId),
    reason: r || null,
  };
}

const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;

/**
 * The session's swaps column: one object per swapped position (the last swap
 * of a position wins, and a swap back to the routine's own exercise is no
 * swap), in routine order, within 8 KB. Null when nothing was swapped. Past
 * 8 KB the reasons go first, then the latest swaps: the database refuses the
 * whole session otherwise.
 */
export function swapsPayload(swaps: SessionSwap[]): SessionSwap[] | null {
  const byPos = new Map<number, SessionSwap>();
  for (const s of swaps) {
    const same =
      s.from_exercise_id === s.to_exercise_id && s.from_custom_exercise_id === s.to_custom_exercise_id;
    if (same) byPos.delete(s.position);
    else byPos.set(s.position, s);
  }
  let out = [...byPos.values()].sort((a, b) => a.position - b.position);
  if (out.length === 0) return null;
  if (bytes(out) > SWAPS_MAX_BYTES) out = out.map((s) => ({ ...s, reason: null }));
  while (out.length > 0 && bytes(out) > SWAPS_MAX_BYTES) out = out.slice(0, -1);
  return out.length ? out : null;
}

/**
 * The toast after a coach's routine is finished and the database marked the
 * results sent (CU1 v5): "Results sent to Alex, with your swap and changed sets."
 */
export function resultsSentMessage(coachName: string, swapCount: number, changedSets: number): string {
  const parts: string[] = [];
  if (swapCount === 1) parts.push(t("your swap"));
  else if (swapCount > 1) parts.push(t("your {n} swaps", { n: swapCount }));
  if (changedSets > 0) parts.push(t("changed sets"));
  return parts.length
    ? t("Results sent to {name}, with {items}.", { name: coachName, items: parts.join(t(" and ")) })
    : t("Results sent to {name}.", { name: coachName });
}

/** "Sent to Alex · 1 swap" on a History card (CU1 v4). */
export function sentLine(coachName: string, swapCount: number): string {
  const sent = t("Sent to {name}", { name: coachName });
  return swapCount > 0 ? `${sent} · ${tn(swapCount, "{n} swap", "{n} swaps")}` : sent;
}

/**
 * The set options sheet's line (CU1 v5): "Alex's target: 6 × 82.5 kg at RPE 8";
 * a typed set names its type: "Alex's target: warm-up, 10 × 40 kg".
 */
export function optionsTargetText(
  coachName: string | null,
  ex: Pick<Exercise, "reps" | "minReps" | "maxReps" | "weightKg" | "rpe" | "setTypes">,
  setIdx: number,
  resolvedKg?: number | null
): string | null {
  const line = targetLine(ex, setIdx, resolvedKg);
  if (!line) return null;
  const who = coachName ? t("{name}'s target", { name: coachName }) : t("Your coach's target");
  const { type, core, rpe } = targetParts(ex, setIdx, resolvedKg);
  if (type !== "normal") {
    const lead = t(TYPE_LEAD[type]).toLowerCase();
    return core ? t("{who}: {type}, {detail}", { who, type: lead, detail: core }) : t("{who}: {detail}", { who, detail: lead });
  }
  // "Target 6 × 82.5 kg · RPE 8" → "6 × 82.5 kg at RPE 8".
  if (core && rpe) return t("{who}: {detail} at RPE {rpe}", { who, detail: core, rpe: ex.rpe! });
  return t("{who}: {detail}", { who, detail: core ?? rpe! });
}

/** What identifies the library row an exercise names. */
const refOf = (x: { exerciseId?: string; customExerciseId?: string; name: string }) =>
  x.exerciseId ? `e:${x.exerciseId}` : x.customExerciseId ? `c:${x.customExerciseId}` : `n:${x.name.trim().toLowerCase()}`;

/**
 * The session's swaps, derived from what is being logged against the routine
 * (position by position), so a swap survives a minimised or resumed session
 * with no state of its own. `reasons` are by position, as typed in this run.
 */
export function derivedSwaps(
  template: Pick<Exercise, "name" | "exerciseId" | "customExerciseId">[],
  logged: { name: string; catalogExerciseId?: string; customExerciseId?: string; removedFromRoutine?: boolean }[],
  reasons: Record<number, string | undefined> = {}
): SessionSwap[] {
  const out: SessionSwap[] = [];
  template.forEach((t, i) => {
    const l = logged[i];
    if (!l || l.removedFromRoutine) return;
    const done = { name: l.name, exerciseId: l.catalogExerciseId, customExerciseId: l.customExerciseId };
    if (refOf(t) === refOf(done)) return;
    out.push(buildSwap(i, t, done, reasons[i]));
  });
  return out;
}
