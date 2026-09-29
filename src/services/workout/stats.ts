import type { LoggedExercise, LoggedSet, SetOutcome, SetType, WorkoutSession } from "../../types";
import { estimate1RM } from "./index";

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
  { value: "normal", label: "Normal", short: "" },
  { value: "warmup", label: "Warm up", short: "W" },
  { value: "failed", label: "Failed", short: "F" },
  { value: "skipped", label: "Skipped", short: "S" },
  { value: "pr", label: "Personal record", short: "PR" },
  { value: "drop", label: "Drop set", short: "DS" },
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
  return (kind === "normal" || kind === "pr" || kind === "drop") && set.weightKg > 0 && set.reps > 0;
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

/** The best estimated 1RM (Epley) among an exercise's working sets, or null. */
export function best1RM(sets: LoggedSet[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const e = estimate1RM(s.weightKg, s.reps);
    if (best === null || e > best) best = e;
  }
  return best;
}

export interface LiftSummary {
  key: string;
  name: string;
  /** Best estimate across all qualifying sets ever logged. */
  oneRepMax: number;
  /**
   * Approved decision 21: best of the last 30 days minus the best before
   * that, so a drop can show. Null when either window has no working sets.
   */
  change30d: number | null;
  /** Per-session best, oldest first. */
  history: { sessionId: string; date: string; oneRepMax: number; isPr: boolean }[];
}

/** Every lift's estimated 1RM, from the logged sessions (03 Calculations). */
export function liftSummaries(sessions: WorkoutSession[], today = new Date()): LiftSummary[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const byKey = new Map<string, LiftSummary & { recent: number | null; before: number | null }>();

  const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const session of ordered) {
    for (const ex of session.exercises) {
      const est = best1RM(ex.sets);
      if (est === null) continue;
      const key = exerciseKey(ex);
      const entry =
        byKey.get(key) ??
        ({ key, name: ex.name, oneRepMax: 0, change30d: null, history: [], recent: null, before: null } as LiftSummary & {
          recent: number | null;
          before: number | null;
        });
      entry.name = ex.name;
      entry.oneRepMax = Math.max(entry.oneRepMax, est);
      entry.history.push({ sessionId: session.id, date: session.date, oneRepMax: est, isPr: ex.sets.some((s) => setKind(s) === "pr") });
      if (session.date >= cutoffIso) entry.recent = Math.max(entry.recent ?? 0, est);
      else entry.before = Math.max(entry.before ?? 0, est);
      byKey.set(key, entry);
    }
  }

  return [...byKey.values()]
    .map(({ recent, before, ...rest }) => ({
      ...rest,
      change30d: recent !== null && before !== null ? Math.round((recent - before) * 10) / 10 : null,
    }))
    .sort((a, b) => b.oneRepMax - a.oneRepMax);
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
        weight: set.completed && set.weightKg > 0 ? set.weightKg : null,
        reps: set.completed && set.reps > 0 ? set.reps : null,
      }))
    );
  }
  return out;
}
