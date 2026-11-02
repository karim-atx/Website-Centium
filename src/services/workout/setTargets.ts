import type { SetTarget } from "../../types";
import { t } from "../../i18n/core";

// Round D · TR11: a professional's target RPE and note per set
// (workout_template_exercises / routine_exercises.set_targets, beside
// set_types). set_targets_valid (20261223010000) accepts null, or at most 50
// entries, each null or {"rpe": 1–10 in halves, "note": up to 200 characters}
// and no other key. Everything here keeps a list inside that rule, so a save
// never meets the check constraint.

export const SET_TARGETS_MAX = 50;
export const SET_TARGET_NOTE_MAX = 200;

/** A target RPE the column takes: 1 to 10, in halves. */
export function isTargetRpe(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 10 && Number.isInteger(v * 2);
}

/** Every target RPE a professional can pick, 1 to 10 in halves, ascending. */
export const TARGET_RPE_CHOICES: number[] = Array.from({ length: 19 }, (_, i) => 1 + i / 2);

/**
 * One entry as the column takes it: an RPE outside 1–10 in halves is dropped,
 * the note is trimmed and cut to 200 characters, and an entry with neither is
 * null. Anything that isn't an object is null.
 */
export function cleanSetTarget(t: unknown): SetTarget | null {
  if (!t || typeof t !== "object" || Array.isArray(t)) return null;
  const raw = t as { rpe?: unknown; note?: unknown };
  const rpe = isTargetRpe(raw.rpe) ? raw.rpe : undefined;
  const note = typeof raw.note === "string" ? raw.note.trim().slice(0, SET_TARGET_NOTE_MAX) : "";
  if (rpe === undefined && !note) return null;
  return { ...(rpe !== undefined ? { rpe } : {}), ...(note ? { note } : {}) };
}

/** A stored set_targets value, read: undefined when there is no list. */
export function readSetTargets(raw: unknown): (SetTarget | null)[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.slice(0, SET_TARGETS_MAX).map(cleanSetTarget);
  return list.some((t) => t !== null) ? list : undefined;
}

/**
 * The list kept in step with the number of sets: cut to `setCount` (and 50),
 * or padded with null. A shorter prescription drops the targets of the sets
 * it no longer has.
 */
export function resizeSetTargets(targets: readonly (SetTarget | null)[] | undefined, setCount: number): (SetTarget | null)[] {
  const n = Math.max(0, Math.min(SET_TARGETS_MAX, Math.floor(setCount)));
  return Array.from({ length: n }, (_, i) => cleanSetTarget(targets?.[i]));
}

/** One set's target replaced (null clears it), the list sized to `setCount`. */
export function withSetTarget(
  targets: readonly (SetTarget | null)[] | undefined,
  index: number,
  target: SetTarget | null,
  setCount: number
): (SetTarget | null)[] {
  const next = resizeSetTargets(targets, Math.max(setCount, index + 1));
  if (index >= 0 && index < next.length) next[index] = cleanSetTarget(target);
  return next;
}

/**
 * set_targets as the column takes it: each entry cleaned, cut to `setCount`
 * when it is known, trailing nulls dropped, and null when no set has a target.
 */
export function setTargetsColumn(targets: readonly (SetTarget | null)[] | undefined, setCount?: number): (SetTarget | null)[] | null {
  if (!targets) return null;
  const sized = setCount === undefined ? targets.slice(0, SET_TARGETS_MAX).map(cleanSetTarget) : resizeSetTargets(targets, setCount);
  let end = sized.length;
  while (end > 0 && sized[end - 1] === null) end -= 1;
  return end === 0 ? null : sized.slice(0, end);
}

/** How many sets a prescription asks for, which is how many targets it can hold. */
export function prescribedSetCount(ex: { sets?: number; minSets?: number; maxSets?: number }): number {
  return Math.min(SET_TARGETS_MAX, ex.maxSets ?? ex.sets ?? ex.minSets ?? 0);
}

/** The quiet line under a set: "RPE 8 · keep the back flat". Null when there is no target. */
export function setTargetText(target: SetTarget | null | undefined): string | null {
  const clean = cleanSetTarget(target);
  if (!clean) return null;
  return [clean.rpe !== undefined ? t("RPE {value}", { value: clean.rpe }) : null, clean.note ?? null].filter(Boolean).join(" · ");
}

/** "Set 2 · RPE 8 · keep the back flat" for every set that has a target, in order. */
export function setTargetLines(targets: readonly (SetTarget | null)[] | undefined): string[] {
  return (targets ?? []).flatMap((target, i) => {
    const text = setTargetText(target);
    return text ? [`${t("Set {n}", { n: i + 1 })} · ${text}`] : [];
  });
}
