import type { CycleDayLog, CyclePhase, Symptom } from "./types";

// What the logs actually show. Nothing else.
//
// PURE, so every rule below can be tested without a database, and separate
// from the prediction on purpose: `my_cycle_prediction()` is the authority on
// where the user is TODAY and what happens next, and re-deriving that here
// would be a second opinion. This module only looks backwards, at days that
// were logged.
//
// THE RULE THROUGHOUT, and it is the same one the health metrics follow: a
// statistic is computed over the data that exists, or it is null. Never a
// zero, never a bar of height nothing, never an average over days nobody
// logged. Two periods is the minimum for a cycle length, because a cycle is
// the gap BETWEEN two starts — one period is a date, not a length.

/** The fewest period starts that can produce one cycle length. */
export const MIN_STARTS_FOR_A_CYCLE = 2;

/** How many cycle lengths the history chart shows at most. */
export const CYCLE_HISTORY_LIMIT = 6;

export interface CycleLength {
  /** The date the cycle started. */
  startDate: string;
  /** Days from this start to the next one. */
  days: number;
}

export interface CycleStats {
  /** Most recent last, at most CYCLE_HISTORY_LIMIT entries. */
  history: CycleLength[];
  /** Mean cycle length over the history, or null under two period starts. */
  averageCycle: number | null;
  /** Mean period length over completed periods, or null when none. */
  averagePeriod: number | null;
  /** Longest minus shortest cycle, or null under two cycle lengths. */
  variationDays: number | null;
  /** How many period starts the above is based on. */
  periodStarts: number;
}

/**
 * The first day of each period, oldest first.
 *
 * A START IS A PERIOD DAY WHOSE PREVIOUS DAY WAS NOT ONE. Counting every
 * `is_period` day as a start would make a five-day period five cycles; looking
 * only at gaps of "more than N days" would merge two genuinely short cycles.
 * Adjacency is the definition that needs no threshold.
 */
export function periodStarts(logs: readonly CycleDayLog[]): string[] {
  const days = logs
    .filter((l) => l.isPeriod)
    .map((l) => l.date)
    .sort();
  const starts: string[] = [];
  for (const day of days) {
    const previous = shiftDay(day, -1);
    if (!days.includes(previous)) starts.push(day);
  }
  return starts;
}

/**
 * The length of each completed period, oldest first.
 *
 * COMPLETED ONLY. A period still in progress has no length yet — counting the
 * days logged so far would report a three-day period on its third morning and
 * drag every average down. A run is complete once a non-period day follows it,
 * which is why the last run is dropped unless something was logged after it.
 */
export function periodLengths(logs: readonly CycleDayLog[]): number[] {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const days = logs
    .filter((l) => l.isPeriod)
    .map((l) => l.date)
    .sort();
  if (days.length === 0) return [];

  const lastLogged = logs.map((l) => l.date).sort().slice(-1)[0];
  const lengths: number[] = [];
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run += 1;
    const next = shiftDay(days[i], 1);
    const runEnds = !days.includes(next);
    if (runEnds) {
      // Complete only if we know what came after: either a logged non-period
      // day, or any later logged day at all.
      const closed = byDate.has(next) || (lastLogged !== undefined && next <= lastLogged);
      if (closed) lengths.push(run);
      run = 0;
    }
  }
  return lengths;
}

/** Cycle lengths, from the gaps between consecutive period starts. */
export function cycleLengths(logs: readonly CycleDayLog[]): CycleLength[] {
  const starts = periodStarts(logs);
  const out: CycleLength[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    out.push({ startDate: starts[i], days: daysBetween(starts[i], starts[i + 1]) });
  }
  return out;
}

export function cycleStats(logs: readonly CycleDayLog[]): CycleStats {
  const all = cycleLengths(logs);
  const history = all.slice(-CYCLE_HISTORY_LIMIT);
  const periods = periodLengths(logs);
  const lengths = all.map((c) => c.days);

  return {
    history,
    averageCycle: lengths.length > 0 ? Math.round(mean(lengths)) : null,
    averagePeriod: periods.length > 0 ? Math.round(mean(periods)) : null,
    variationDays: lengths.length >= 2 ? Math.max(...lengths) - Math.min(...lengths) : null,
    periodStarts: periodStarts(logs).length,
  };
}

/** True once there is enough to say anything at all about patterns. */
export function hasEnoughForInsights(logs: readonly CycleDayLog[]): boolean {
  return periodStarts(logs).length >= MIN_STARTS_FOR_A_CYCLE;
}

// ---------------------------------------------------------------------------
// Symptoms by phase
// ---------------------------------------------------------------------------

/** The four phases a logged day can be attributed to. */
export const GRID_PHASES: readonly CyclePhase[] = [
  "menstrual",
  "follicular",
  "ovulatory",
  "luteal",
];

export interface SymptomGrid {
  /** Symptoms that were logged at least once, most-logged first. */
  symptoms: Symptom[];
  /** counts[symptom][phase] — how many days it was logged in that phase. */
  counts: Record<string, Record<string, number>>;
  /** How many logged days fall in each phase, the denominator for a rate. */
  daysInPhase: Record<string, number>;
}

/**
 * How often each symptom was logged, per phase.
 *
 * THE PHASE OF A PAST DAY IS WORKED OUT HERE, from the period starts around
 * it, because `my_cycle_prediction()` answers for one day at a time and
 * asking it 180 times is not a chart. The rule is the same one it uses: days
 * from the start of the cycle, with the period itself menstrual, the days
 * around the estimated ovulation ovulatory, and the rest split follicular
 * before and luteal after.
 *
 * A DAY OUTSIDE ANY KNOWN CYCLE IS SKIPPED, not bucketed into a default. A
 * symptom logged before the first period start has no phase, and putting it in
 * "follicular" would invent the most common answer.
 */
export function symptomGrid(logs: readonly CycleDayLog[], lutealLength: number): SymptomGrid {
  const starts = periodStarts(logs);
  const counts: Record<string, Record<string, number>> = {};
  const daysInPhase: Record<string, number> = {
    menstrual: 0,
    follicular: 0,
    ovulatory: 0,
    luteal: 0,
  };
  const totals: Record<string, number> = {};

  for (const log of logs) {
    const phase = phaseOfDay(log, logs, starts, lutealLength);
    if (phase === null) continue;
    daysInPhase[phase] += 1;
    for (const symptom of log.symptoms) {
      (counts[symptom] ??= { menstrual: 0, follicular: 0, ovulatory: 0, luteal: 0 })[phase] += 1;
      totals[symptom] = (totals[symptom] ?? 0) + 1;
    }
  }

  const symptoms = Object.keys(counts).sort(
    (a, b) => (totals[b] ?? 0) - (totals[a] ?? 0) || a.localeCompare(b)
  ) as Symptom[];

  return { symptoms, counts, daysInPhase };
}

/** Which phase a logged day belongs to, or null when it is outside any cycle. */
export function phaseOfDay(
  log: CycleDayLog,
  logs: readonly CycleDayLog[],
  starts: readonly string[],
  lutealLength: number
): CyclePhase | null {
  if (log.isPeriod) return "menstrual";

  // The cycle this day sits in: the latest start on or before it.
  let startIndex = -1;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] <= log.date) startIndex = i;
  }
  if (startIndex === -1) return null; // before any period we know about

  const start = starts[startIndex];
  const nextStart = starts[startIndex + 1];
  // An open final cycle is still usable: the days in it are real and their
  // phase up to today is knowable. Only its LENGTH is unknown.
  const length = nextStart ? daysBetween(start, nextStart) : null;
  const day = daysBetween(start, log.date) + 1;

  if (length === null) {
    // Without a closing start there is no ovulation day to place, so only the
    // period itself is attributable — handled above. Anything else is skipped
    // rather than guessed.
    void logs;
    return null;
  }

  const ovulation = length - lutealLength;
  if (ovulation < 2) return "luteal"; // a very short cycle: nothing else fits
  if (day >= ovulation - 1 && day <= ovulation + 1) return "ovulatory";
  return day < ovulation ? "follicular" : "luteal";
}

// ---------------------------------------------------------------------------

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Whole days from `a` to `b`, by UTC date, so no DST hour shifts the count. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

/** yyyy-mm-dd arithmetic in UTC. */
export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  at.setUTCDate(at.getUTCDate() + delta);
  return at.toISOString().slice(0, 10);
}
