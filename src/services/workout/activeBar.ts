import type { ActiveSession, LoggedExercise } from "../../types";
import { formatCompactDuration } from "./index";

// The WO17 active-workout bar's second line and progress line, derived from
// the active session (03) alone, so the bar never needs the logger mounted.

/** Session seconds so far, excluding paused time; frozen at pausedAt while paused. */
export function sessionElapsedSec(session: NonNullable<ActiveSession>, now: number): number {
  const until = session.status === "paused" && session.pausedAt ? Date.parse(session.pausedAt) : now;
  return Math.max(0, Math.floor((until - Date.parse(session.startedAt) - session.pausedMs) / 1000));
}

/**
 * "Exercise X of Y · 50m left"; "Exercise X of Y · 1h 5m elapsed" once over
 * the routine's estimate (or with no estimate); "Paused · Exercise X of Y".
 * Time left counts whole minutes up, so the last minute reads "1m left".
 */
export function activeBarLine(
  session: NonNullable<ActiveSession>,
  exerciseCount: number,
  estimatedMin: number,
  now: number
): string {
  const total = Math.max(1, exerciseCount);
  const x = Math.min(total, Math.max(1, session.currentExercise + 1));
  const exercise = `Exercise ${x} of ${total}`;
  if (session.status === "paused") return `Paused · ${exercise}`;
  const elapsed = sessionElapsedSec(session, now);
  const left = estimatedMin * 60 - elapsed;
  if (estimatedMin > 0 && left > 0) return `${exercise} · ${formatCompactDuration(Math.ceil(left / 60) * 60)} left`;
  return `${exercise} · ${formatCompactDuration(elapsed)} elapsed`;
}

/** Logged sets over all set rows, 0–1: a set counts once it is ticked or given an outcome. */
export function loggedFraction(logged: LoggedExercise[] | undefined): number {
  if (!logged) return 0;
  let done = 0;
  let total = 0;
  for (const ex of logged) {
    for (const s of ex.sets) {
      total += 1;
      if (s.completed || s.outcome != null) done += 1;
    }
  }
  return total === 0 ? 0 : done / total;
}
