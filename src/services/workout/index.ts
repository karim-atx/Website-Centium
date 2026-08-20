import type { LoggedExercise, LoggedSet } from "../../types";

/** Epley formula — a standard, simple estimated-1RM calculation. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function volumeForSets(sets: LoggedSet[]): number {
  return sets.filter((s) => s.completed).reduce((sum, s) => sum + s.reps * s.weightKg, 0);
}

export function volumeForSession(exercises: LoggedExercise[]): number {
  return exercises.reduce((sum, ex) => sum + volumeForSets(ex.sets), 0);
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Simplified RPE chart: %1RM by RPE (rows) and reps-in-set (cols 1-10).
// Widely-used approximation (Mike Tuchscherer-style RPE chart), rounded.
const RPE_TABLE: Record<number, number[]> = {
  10: [100, 95.5, 92.2, 89.6, 87.4, 85.5, 83.7, 82, 80.5, 79.1],
  9.5: [97.9, 93.9, 90.7, 88.1, 86, 84.1, 82.4, 80.7, 79.3, 77.9],
  9: [95.5, 92.2, 89.6, 87.4, 85.5, 83.7, 82, 80.5, 79.1, 77.8],
  8.5: [93.9, 90.7, 88.1, 86, 84.1, 82.4, 80.7, 79.3, 77.9, 76.6],
  8: [92.2, 89.6, 87.4, 85.5, 83.7, 82, 80.5, 79.1, 77.8, 76.5],
  7.5: [90.7, 88.1, 86, 84.1, 82.4, 80.7, 79.3, 77.9, 76.6, 75.4],
  7: [89.6, 87.4, 85.5, 83.7, 82, 80.5, 79.1, 77.8, 76.5, 75.3],
  6.5: [88.1, 86, 84.1, 82.4, 80.7, 79.3, 77.9, 76.6, 75.4, 74.2],
  6: [86.6, 85, 83.3, 81.5, 80, 78.5, 77.2, 75.9, 74.7, 73.5],
};

export function weightFromRpe(oneRepMax: number, reps: number, rpe: number): number {
  const col = Math.max(0, Math.min(9, reps - 1));
  const row = RPE_TABLE[rpe as keyof typeof RPE_TABLE] ?? RPE_TABLE[8];
  const pct = row[col] ?? row[row.length - 1];
  return Math.round(oneRepMax * (pct / 100) * 10) / 10;
}

export const rpeOptions = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];
