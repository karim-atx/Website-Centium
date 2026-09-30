import type { WorkoutSession } from "../../types";
import { estimate1RM, loadKg } from "./index";
import { countsTowardVolume } from "./session";
import { isWorkingSet } from "./stats";

// Handover 2026-09-29 WO4.1, the Metrics page. Every value comes from logged
// sessions (03 "WO4.1").

export type VolumeMode = "workout" | "week";

export interface VolumePoint {
  /** Milliseconds (the session's day, or the week's Monday). */
  t: number;
  day: string;
  volumeKg: number;
  sessions: WorkoutSession[];
}

const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** The Monday of a "YYYY-MM-DD" day's week (03: By week sums Monday → Sunday). */
export function mondayOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const chronological = (a: WorkoutSession, b: WorkoutSession) =>
  a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt);

/** One point per session, or per Monday–Sunday week; oldest first. */
export function volumePoints(sessions: WorkoutSession[], mode: VolumeMode): VolumePoint[] {
  const ordered = [...sessions].sort(chronological);
  if (mode === "workout")
    return ordered.map((s) => ({ t: dayMs(s.date), day: s.date, volumeKg: s.totalVolumeKg, sessions: [s] }));
  const weeks = new Map<string, VolumePoint>();
  for (const s of ordered) {
    const monday = mondayOf(s.date);
    const w = weeks.get(monday) ?? { t: dayMs(monday), day: monday, volumeKg: 0, sessions: [] };
    w.volumeKg += s.totalVolumeKg;
    w.sessions.push(s);
    weeks.set(monday, w);
  }
  return [...weeks.values()];
}

export interface PointStats {
  volumeKg: number;
  /** Best estimated 1RM among the point's working sets (one 1RM: the app has no body-weight split). */
  oneRmKg: number | null;
  maxWeightKg: number | null;
  sets: number;
  reps: number;
  /** Timed work (endurance durations); null when there was none. */
  seconds: number | null;
}

export function pointStats(sessions: WorkoutSession[]): PointStats {
  let oneRm = 0;
  let maxWeight = 0;
  let sets = 0;
  let reps = 0;
  let seconds = 0;
  for (const s of sessions)
    for (const ex of s.exercises) {
      seconds += ex.enduranceResult?.duration_seconds ?? 0;
      for (const set of ex.sets) {
        if (countsTowardVolume(set)) {
          sets++;
          reps += set.reps;
        }
        if (isWorkingSet(set)) {
          oneRm = Math.max(oneRm, estimate1RM(loadKg(set), set.reps));
          maxWeight = Math.max(maxWeight, loadKg(set));
        }
      }
    }
  return {
    volumeKg: sessions.reduce((n, s) => n + s.totalVolumeKg, 0),
    oneRmKg: oneRm || null,
    maxWeightKg: maxWeight || null,
    sets,
    reps,
    seconds: seconds || null,
  };
}

export interface TrainingFrequency {
  /** Sessions in each of the last 8 Monday–Sunday weeks, oldest first; the last is this week. */
  weeks: number[];
  /** Their average, to one decimal. */
  perWeek: number;
}

export function trainingFrequency(sessions: WorkoutSession[], today: string): TrainingFrequency {
  const thisMonday = mondayOf(today);
  const mondays = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(`${thisMonday}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7 * (7 - i));
    return d.toISOString().slice(0, 10);
  });
  const weeks = mondays.map(() => 0);
  for (const s of sessions) {
    const i = mondays.indexOf(mondayOf(s.date));
    if (i >= 0) weeks[i]++;
  }
  return { weeks, perWeek: Math.round((weeks.reduce((a, b) => a + b, 0) / 8) * 10) / 10 };
}

/** "1k", "1.5k", "800". */
export const kiloTick = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v));

/**
 * Hero ticks: 0 and two round steps (1, 1.5, 2, 2.5, 3, 4 or 5 × 10^k), the
 * largest at most half the peak, so the frame's 2.1k peak reads 0 / 1k / 2k
 * and a 3k peak 0 / 1.5k / 3k. A peak above the top
 * tick uses the chart's headroom.
 */
export function volumeTicks(peak: number): [number, number, number] {
  if (peak <= 0) return [0, 1000, 2000];
  const target = peak / 2;
  const mag = 10 ** Math.floor(Math.log10(target));
  const step = [5, 4, 3, 2.5, 2, 1.5, 1].map((m) => m * mag).find((s) => s <= target) ?? mag;
  return [0, step, step * 2];
}

/**
 * The Balance chip (WO4.1): the dominant group's colour as a tint and a
 * darker shade — measured from the frame's chest chip, #D9A441 → #F8EFDD
 * (18% on white) and #8A6A3E (the colour 44% of the way to charcoal #241F1B,
 * which gives #896930 — the frame's own chip is the only sample).
 */
export function chipColors(hex: string): { background: string; color: string } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (c: number, a: number, base: number) => Math.round(base + (c - base) * a);
  const toHex = (n: number[]) => `#${n.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  return {
    background: toHex([r, g, b].map((c) => mix(c, 0.18, 255))),
    color: toHex([r, g, b].map((c, i) => mix(c, 0.56, [0x24, 0x1f, 0x1b][i]))),
  };
}
