import { countsTowardVolume } from "./session";
import type { LoggedSet } from "../../types";

/** Epley formula — a standard, simple estimated-1RM calculation. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Volume, counting only the sets that happened.
 *
 * A SKIPPED SET IS WORTH NOTHING and a FAILED ONE IS WORTH WHAT WAS DONE —
 * the reps in the box are already the reps managed, so the rule is a filter
 * rather than a calculation. Falls back to `completed` for sessions logged
 * before outcomes existed, which is what those rows carry.
 */
export function volumeForSets(sets: LoggedSet[]): number {
  return sets.filter(countsTowardVolume).reduce((sum, s) => sum + s.reps * loadKg(s), 0);
}

/** A set's external load in kg: bodyweight (0) and a not-yet-typed row (null) both carry none. */
export const loadKg = (s: Pick<LoggedSet, "weightKg">): number => s.weightKg ?? 0;

/**
 * A set's weight as shown: "60 kg", or bodyweight as "Bodyweight" ("BW" where
 * space is tight). null for a row with no weight typed.
 */
export function formatSetWeight(weightKg: number | null, short = false): string | null {
  if (weightKg === null) return null;
  if (weightKg === 0) return short ? "BW" : "Bodyweight";
  return `${weightKg} kg`;
}

/**
 * Handover 2026-09-29, 02 "Compact duration format" — the one formatter for
 * every workout duration shown as a total (Time taken, session durations):
 * the two largest units with short labels, rounded down, a zero second unit
 * dropped. <1h → "52m"; <1d → "4h 50m"; <30d → "7d 4h"; <365d → "1mo 7d";
 * ≥365d → "1y 2mo" (month = 30 days, year = 365). The live logger timer
 * keeps formatDuration's clock format.
 */
export function formatCompactDuration(totalSeconds: number): string {
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const pair = (big: number, bigUnit: string, small: number, smallUnit: string) =>
    small > 0 ? `${big}${bigUnit} ${small}${smallUnit}` : `${big}${bigUnit}`;
  if (hours < 1) return `${minutes}m`;
  if (days < 1) return pair(hours, "h", minutes % 60, "m");
  if (days < 30) return pair(days, "d", hours % 24, "h");
  if (days < 365) return pair(Math.floor(days / 30), "mo", days % 30, "d");
  return pair(Math.floor(days / 365), "y", Math.floor((days % 365) / 30), "mo");
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

/** The chart's %1RM for a rep count at an RPE (the number weightFromRpe applies). */
export function percentFromRpe(reps: number, rpe: number): number {
  const col = Math.max(0, Math.min(9, reps - 1));
  const row = RPE_TABLE[rpe as keyof typeof RPE_TABLE] ?? RPE_TABLE[8];
  return row[col] ?? row[row.length - 1];
}

export function weightFromRpe(oneRepMax: number, reps: number, rpe: number): number {
  return Math.round(oneRepMax * (percentFromRpe(reps, rpe) / 100) * 10) / 10;
}

export const rpeOptions = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];
