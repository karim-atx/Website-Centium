import type { WorkoutSession } from "../../types";
import { estimate1RM, loadKg } from "./index";
import { exerciseKey, isWorkingSet, setKind } from "./stats";

// Handover 2026-09-29 03 "Estimated 1RM" (WO18, WO19, WO4.1): Epley,
// weight × (1 + reps / 30), reps = 1 → the weight. Only Normal, PR and Drop
// sets count (isWorkingSet); Warm, Fail and Skip are excluded. A lift's 1RM is
// the best estimate across all its qualifying sets, a session's value that
// session's best, and the 30-day change is the current 1RM minus the best
// 1RM as of 30 days ago. Every value comes from logged sessions.

export interface LiftSession {
  sessionId: string;
  date: string;
  /** That session's best estimate, and the set it came from. */
  oneRm: number;
  set: { weightKg: number; reps: number };
  /** A set in this session was marked PR. */
  isPr: boolean;
}

export interface LiftMax {
  key: string;
  name: string;
  catalogId?: string;
  customId?: string;
  oneRm: number;
  /** The set the current 1RM came from, and when. */
  best: { weightKg: number; reps: number; date: string };
  lastTrained: string;
  /** Null when there was no 1RM yet 30 days ago. */
  change30: number | null;
  /** Oldest first. */
  sessions: LiftSession[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "YYYY-MM-DD" minus `days`, in calendar days. */
export function daysBefore(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function liftMaxes(sessions: WorkoutSession[], today: string): LiftMax[] {
  const lifts = new Map<string, LiftMax>();
  const ordered = [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
  for (const s of ordered) {
    // One entry per lift per session, however many times it was logged in it.
    const seen = new Map<string, LiftSession>();
    for (const ex of s.exercises) {
      const key = exerciseKey(ex);
      for (const set of ex.sets) {
        if (!isWorkingSet(set)) continue;
        const est = estimate1RM(loadKg(set), set.reps);
        const cur = seen.get(key);
        const isPr = (cur?.isPr ?? false) || setKind(set) === "pr";
        if (!cur || est > cur.oneRm) seen.set(key, { sessionId: s.id, date: s.date, oneRm: est, set: { weightKg: loadKg(set), reps: set.reps }, isPr });
        else cur.isPr = isPr;
      }
      const entry = seen.get(key);
      if (!entry) continue;
      const lift = lifts.get(key);
      if (!lift) {
        lifts.set(key, {
          key,
          name: ex.name,
          catalogId: ex.catalogExerciseId,
          customId: ex.customExerciseId,
          oneRm: 0,
          best: { ...entry.set, date: s.date },
          lastTrained: s.date,
          change30: null,
          sessions: [],
        });
      } else {
        // The latest name it was logged under.
        lift.name = ex.name;
      }
    }
    for (const [key, entry] of seen) {
      const lift = lifts.get(key)!;
      lift.sessions.push(entry);
      lift.lastTrained = s.date;
      if (entry.oneRm > lift.oneRm) {
        lift.oneRm = entry.oneRm;
        lift.best = { ...entry.set, date: s.date };
      }
    }
  }

  const cutoff = daysBefore(today, 30);
  for (const lift of lifts.values()) {
    const before = lift.sessions.filter((x) => x.date <= cutoff);
    lift.change30 = before.length ? round1(lift.oneRm - Math.max(...before.map((x) => x.oneRm))) : null;
  }
  return [...lifts.values()];
}

export type LiftSort = "highest" | "recent" | "change" | "az";

export const LIFT_SORT_LABEL: Record<LiftSort, string> = {
  highest: "Highest 1RM",
  recent: "Recently trained",
  change: "Biggest change",
  az: "A–Z",
};

export function sortLifts(lifts: LiftMax[], sort: LiftSort): LiftMax[] {
  const byName = (a: LiftMax, b: LiftMax) => a.name.localeCompare(b.name);
  const out = [...lifts];
  if (sort === "highest") out.sort((a, b) => b.oneRm - a.oneRm || byName(a, b));
  else if (sort === "recent") out.sort((a, b) => b.lastTrained.localeCompare(a.lastTrained) || b.oneRm - a.oneRm);
  else if (sort === "change")
    out.sort((a, b) => (b.change30 ?? -Infinity) - (a.change30 ?? -Infinity) || b.oneRm - a.oneRm);
  else out.sort(byName);
  return out;
}

/** Whole kilograms, as every 1RM surface shows them. */
export const kgWhole = (n: number) => Math.round(n);

export type LiftRange = "3M" | "6M" | "All";

/** A lift's sessions in the WO19 chart range, oldest first. */
export function sessionsInRange(lift: LiftMax, range: LiftRange, today: string): LiftSession[] {
  if (range === "All") return lift.sessions;
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - (range === "3M" ? 3 : 6));
  const from = d.toISOString().slice(0, 10);
  return lift.sessions.filter((s) => s.date >= from);
}

/** "80 kg × 5", "72.5 kg × 6". */
export const setLine = (set: { weightKg: number; reps: number }) => `${set.weightKg} kg × ${set.reps}`;
