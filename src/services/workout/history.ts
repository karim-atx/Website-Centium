import type { LoggedExercise, WorkoutSession } from "../../types";
import { isWorkingSet } from "./stats";

// WO3.1 History: the period, the hero summary, each card's top sets, and the
// volume comparison phrase.

export type HistoryPeriod = "week" | "month" | "year" | "all" | "custom";

export const PERIOD_LABEL: Record<HistoryPeriod, string> = {
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
  custom: "Custom range",
};

/** Inclusive ISO day bounds; null = no bound. The week starts on Monday (as WO4.1's "By week"). */
export function periodRange(
  period: HistoryPeriod,
  today: string,
  custom?: { from: string; to: string } | null
): { from: string | null; to: string | null } {
  const d = new Date(`${today}T00:00:00`);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  switch (period) {
    case "week": {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return { from: iso(monday), to: today };
    }
    case "month":
      return { from: iso(new Date(d.getFullYear(), d.getMonth(), 1)), to: today };
    case "year":
      return { from: iso(new Date(d.getFullYear(), 0, 1)), to: today };
    case "custom":
      return custom ? { from: custom.from, to: custom.to } : { from: null, to: null };
    default:
      return { from: null, to: null };
  }
}

export const inRange = (date: string, r: { from: string | null; to: string | null }) =>
  (!r.from || date >= r.from) && (!r.to || date <= r.to);

/** Newest first: by day, then by start time within a day (a moved workout sorts by its new day). */
export const byNewest = (a: WorkoutSession, b: WorkoutSession) =>
  b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt);

/** Completed sets (every type), as the hero's "N sets". */
export const completedSets = (s: WorkoutSession) =>
  s.exercises.reduce((n, ex) => n + ex.sets.filter((set) => set.completed).length, 0);

export function historySummary(sessions: WorkoutSession[]) {
  return {
    volumeKg: sessions.reduce((n, s) => n + s.totalVolumeKg, 0),
    seconds: sessions.reduce((n, s) => n + s.durationSec, 0),
    workouts: sessions.length,
    sets: sessions.reduce((n, s) => n + completedSets(s), 0),
  };
}

/** The heaviest completed working set (Normal, PR or Drop set), ties to the most reps. */
export function topSet(ex: LoggedExercise): { weightKg: number; reps: number } | null {
  let best: { weightKg: number; reps: number } | null = null;
  for (const set of ex.sets) {
    if (!isWorkingSet(set)) continue;
    if (!best || set.weightKg > best.weightKg || (set.weightKg === best.weightKg && set.reps > best.reps)) {
      best = { weightKg: set.weightKg, reps: set.reps };
    }
  }
  return best;
}

// V8 (QA 8.0): "say that the client lifted the equivalent of a certain
// animal or object of that similar weight" — whichever reference is closest
// in weight to the total volume, so a small total still gets a sensible one.
const WEIGHT_COMPARISONS: { weight: number; label: string; emoji: string }[] = [
  { weight: 4, label: "a housecat", emoji: "🐱" },
  { weight: 30, label: "a Labrador", emoji: "🐕" },
  { weight: 70, label: "an adult human", emoji: "🧍" },
  { weight: 200, label: "a grand piano", emoji: "🎹" },
  { weight: 380, label: "a grizzly bear", emoji: "🐻" },
  { weight: 900, label: "a motorbike", emoji: "🏍️" },
  { weight: 1500, label: "a small car", emoji: "🚗" },
  { weight: 5400, label: "an elephant", emoji: "🐘" },
  { weight: 12000, label: "a school bus", emoji: "🚌" },
  { weight: 180000, label: "a blue whale", emoji: "🐋" },
];

/** WO3.1: the emoji ends the sentence. Hidden (null) at 0 kg. */
export function comparisonPhrase(totalKg: number): string | null {
  if (totalKg <= 0) return null;
  const c = WEIGHT_COMPARISONS.reduce((best, x) =>
    Math.abs(x.weight - totalKg) < Math.abs(best.weight - totalKg) ? x : best
  );
  return `That's the equivalent of lifting ${c.label} ${c.emoji}`;
}

// --- WO14: one exercise across sessions ------------------------------------

export interface ExerciseHistoryEntry {
  sessionId: string;
  date: string;
  routineName: string;
  sets: number;
  top: { weightKg: number; reps: number } | null;
  volumeKg: number;
  /** "120×5 · 120×5 · 115×6" (reps alone when there is no load). */
  line: string;
}

/**
 * The sessions that included an exercise, newest first: completed sets only,
 * the top set (heaviest working set), and weight × reps summed over them.
 * Matched by library row, else by name (legacy rows logged before ids).
 */
export function exerciseHistory(
  sessions: WorkoutSession[],
  match: { catalogId?: string; customId?: string; name: string }
): ExerciseHistoryEntry[] {
  const is = (ex: LoggedExercise) =>
    (match.catalogId && ex.catalogExerciseId === match.catalogId) ||
    (match.customId && ex.customExerciseId === match.customId) ||
    (!ex.catalogExerciseId && !ex.customExerciseId && ex.name.trim().toLowerCase() === match.name.trim().toLowerCase());
  const out: ExerciseHistoryEntry[] = [];
  for (const s of [...sessions].sort(byNewest)) {
    const logged = s.exercises.filter(is);
    if (logged.length === 0) continue;
    const done = logged.flatMap((ex) => ex.sets.filter((set) => set.completed));
    if (done.length === 0) continue;
    const tops = logged.map(topSet).filter((t): t is { weightKg: number; reps: number } => !!t);
    const top = tops.reduce<{ weightKg: number; reps: number } | null>(
      (best, t) => (!best || t.weightKg > best.weightKg || (t.weightKg === best.weightKg && t.reps > best.reps) ? t : best),
      null
    );
    out.push({
      sessionId: s.id,
      date: s.date,
      routineName: s.routineName,
      sets: done.length,
      top,
      volumeKg: done.reduce((n, set) => n + set.weightKg * set.reps, 0),
      line: done.map((set) => (set.weightKg > 0 ? `${set.weightKg}×${set.reps}` : `${set.reps} reps`)).join(" · "),
    });
  }
  return out;
}
