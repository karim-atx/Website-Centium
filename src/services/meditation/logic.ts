/**
 * The meditation log's rules, as the app and the database agreed them
 * (Database 20261006000000). Pure, so they are tested without a server.
 */

/** The shortest session worth saving; the table's own floor too (Database
 *  B3 lowered it from 10 to 8 so one Simple Deep cycle, 8 s, can be stored). */
export const MIN_SESSION_SECONDS = 8;
/** The table's ceiling (4 hours). A runner left going longer is clamped. */
export const MAX_SESSION_SECONDS = 14400;

/**
 * THE KEYS ARE THE APP'S, NOT THE CATALOGUE'S. `kind` is checked only for
 * shape (^[a-z][a-z0-9_]{1,38}[a-z0-9]$), not against a list, so these are
 * the set in use. Changing one splits a user's history in two; add, never
 * rename. Keyed by the breathing pattern ids in data/mockMindContent, plus
 * the two pose sequences (PB-O-20, MO1.1.4.1 S7 / MO1.1.4.2 S2): a finished
 * Stretching or Yoga sequence is one session of its own kind.
 */
export const MEDITATION_KINDS: Record<string, string> = {
  box: "box_breathing",
  "478": "breathing_4_7_8",
  deep: "deep_breathing",
  stretching: "stretching_sequence",
  yoga: "yoga_sequence",
};

/** The `kind` for a pattern. An unknown pattern still gets a valid key. */
export function meditationKind(patternId: string): string {
  return MEDITATION_KINDS[patternId] ?? "breathing_other";
}

/**
 * Seconds actually spent, from wall-clock start and end, or null when the
 * run was too short to save. TIME SPENT, NEVER A PLANNED LENGTH: the runner
 * has none, and a session stopped early is still the minutes it lasted.
 */
export function sessionSeconds(startedAtMs: number, endedAtMs: number): number | null {
  const s = Math.floor((endedAtMs - startedAtMs) / 1000);
  if (!Number.isFinite(s) || s < MIN_SESSION_SECONDS) return null;
  return Math.min(s, MAX_SESSION_SECONDS);
}

/**
 * Whether a breathing run is saved when it ends (MO1.1.4 S2-S5, V6-144):
 * only after one full cycle AND at least the table's 8 s floor; under that
 * nothing is written. Reset never saves (the caller does not ask). "short"
 * is a full cycle under 8 s (none of today's patterns since B3 lowered the
 * floor from 10 s, which Simple Deep's 8 s cycle used to miss).
 */
export function breathingSaveRule(cycles: number, seconds: number | null): "save" | "cycle" | "short" {
  if (cycles < 1) return "cycle";
  if (seconds === null) return "short";
  return "save";
}

/**
 * "45 sec", "1 min", "13 min", "2 h 5 min". From SECONDS, never re-derived
 * from the summary's rounded minutes, and rounded the way the database
 * rounds its own minutes (750 s reads 13 min, not 12).
 */
export function formatMeditationTime(seconds: number): string {
  if (seconds <= 0) return "0 min";
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export interface MeditationSummary {
  secondsToday: number;
  secondsThisWeek: number;
  sessionsThisWeek: number;
  streakDays: number;
}

/**
 * Nothing to report: no time today, none this calendar week, no streak.
 * The summary has no all-time count, so this cannot tell "never meditated"
 * from "not since last week", and the empty copy is worded to be true of
 * both.
 */
export function isEmptySummary(s: MeditationSummary): boolean {
  return s.secondsToday === 0 && s.secondsThisWeek === 0 && s.sessionsThisWeek === 0 && s.streakDays === 0;
}
