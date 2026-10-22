// Market + Share 3.0 · C-SH.1: the cards' facts from the app's own data
// (AppContext's workouts, personal records, the Home day streak, the health
// series, the food diary), pure (clientShareData.test.ts). Nothing here
// reads the network or invents a value: a fact the app doesn't hold is left
// out of the card (D-52: real data only).

import type { FoodLogEntry, LoggedSet, WorkoutSession } from "../../../types";
import { dayEarned, type DayGoalSources } from "../../../services/streaks/dayStreak";
import { daysBefore, type FoodFacts, type PrFacts, type StreakFacts, type WorkoutFacts } from "./clientCardModel";

const done = (s: LoggedSet) => s.completed || s.outcome === "completed";

/** A logged session's card facts (C-SH.3 workout). */
export function workoutFacts(s: WorkoutSession, bodyWeightKg: number | null): WorkoutFacts {
  const exercises = s.exercises.filter((ex) => ex.sets.some(done) || ex.enduranceResult);
  const sets = exercises.reduce((n, ex) => n + ex.sets.filter(done).length, 0);
  const prs = exercises.reduce((n, ex) => n + ex.sets.filter((x) => done(x) && x.isPr).length, 0);
  const exerciseVolumes = exercises.map((ex) => ex.sets.filter(done).reduce((v, x) => v + (x.weightKg ?? 0) * (x.reps || 0), 0));
  return {
    name: s.routineName,
    date: s.date,
    durationSec: s.durationSec,
    volumeKg: s.totalVolumeKg,
    sets,
    exercises: exercises.length,
    prs,
    exerciseVolumes,
    bodyWeightKg: bodyWeightKg != null && bodyWeightKg > 0 ? bodyWeightKg : null,
  };
}

/** A lift's personal-best facts (the Metrics one-rep maxes, services/workout/oneRepMax LiftMax). */
export function prFacts(
  lift: { name: string; oneRm: number; best: { weightKg: number; reps: number; date: string }; change30: number | null; sessions: { oneRm: number }[] },
  today: string,
): PrFacts {
  return {
    lift: lift.name,
    oneRmKg: lift.oneRm,
    date: lift.best.date,
    best: { weightKg: lift.best.weightKg, reps: lift.best.reps },
    change30: lift.change30,
    since: daysBefore(today, 30),
    history: lift.sessions.map((x) => x.oneRm),
  };
}

/** A personal best is "new" (it gets the share icon, C-SH.1 e3PR) when it was set in the last 14 days. */
export const NEW_PR_DAYS = 14;
export const isNewPr = (bestDate: string, today: string) => bestDate >= daysBefore(today, NEW_PR_DAYS) && bestDate <= today;

/**
 * The Home day streak (services/streaks/dayStreak: today is skipped past, not
 * broken on) with the day it began, the workouts completed and the meals
 * logged since. Null without a streak.
 */
export function streakFacts(src: Omit<DayGoalSources, "foodLog"> & { foodLog: readonly { date: string; meal?: string }[] }, today: string): StreakFacts | null {
  let days = 0;
  let since = today;
  const cursor = new Date(`${today}T00:00:00`);
  for (let guard = 0; guard < 4000; guard++) {
    const d = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (dayEarned(src, d)) {
      days++;
      since = d;
    } else if (d !== today) break;
    cursor.setDate(cursor.getDate() - 1);
  }
  if (days <= 0) return null;
  const inRun = (d: string) => d >= since && d <= today;
  const workouts = src.workoutLog.filter((w) => w.completed && inRun(w.date)).length;
  const meals = new Set(src.foodLog.filter((f) => inRun(f.date)).map((f) => `${f.date}|${f.meal ?? ""}`)).size;
  return { days, today, since, workouts, meals };
}

/** A diary day's totals (C-SH.3 food day). Null when nothing was logged. */
export function foodFacts(log: readonly FoodLogEntry[], date: string, goalKcal: number | null): FoodFacts | null {
  const day = log.filter((e) => e.date === date);
  if (!day.length) return null;
  const sum = (k: "calories" | "protein" | "carbs" | "fat") => day.reduce((n, e) => n + (Number(e[k]) || 0), 0);
  return { date, kcal: sum("calories"), goalKcal: goalKcal && goalKcal > 0 ? goalKcal : null, protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat") };
}

/** The body weight on record on or before a day (weightByDate), or null. */
export function weightOn(byDate: Readonly<Record<string, number>>, date: string): number | null {
  let best: string | null = null;
  for (const d of Object.keys(byDate)) if (d <= date && byDate[d] > 0 && (!best || d > best)) best = d;
  return best ? byDate[best] : null;
}
