// Where a pregnancy is, in weeks and days.
//
// PURE, so the dating can be checked against a wheel without a database, and
// separate from ./index.ts which opens a Supabase client.
//
// GESTATIONAL AGE IS COUNTED FROM THE LAST PERIOD, not from conception. That
// is the convention every clinician, scan report and pregnancy app uses, and
// it makes a pregnancy "4 weeks" at roughly the time of a first missed period
// rather than 2. A due date is LMP + 280 days (40 weeks) — Naegele's rule —
// so the two are the same fact stated twice, and either one gives the other.
//
// WHICH IS WHY BOTH ARE ACCEPTED AND ONLY ONE IS STORED AS THE BASIS. Somebody
// who knows their LMP has it computed; somebody whose dating scan moved their
// due date enters that instead, and the LMP is then back-calculated. The
// database's own `pregnancies_basis_check` requires at least one of the two.

/** 40 weeks. The number Naegele's rule adds to the last period. */
export const GESTATION_DAYS = 280;

export interface Gestation {
  /** Completed weeks, 0-based: day 0–6 is week 0. */
  week: number;
  /** Days into the current week, 0–6. */
  day: number;
  /** 1, 2 or 3. */
  trimester: 1 | 2 | 3;
  /** 0–1, capped at 1 — a pregnancy past its due date is not 103% done. */
  progress: number;
  /** Negative once the due date has passed. */
  daysUntilDue: number;
  /** True past 42 weeks, where "week 47" would be a dating error, not a fact. */
  implausible: boolean;
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

/** Due date from a last period: LMP + 280 days. */
export const dueDateFromLmp = (lmp: string): string => shiftDay(lmp, GESTATION_DAYS);

/** Last period from a due date, the same rule read backwards. */
export const lmpFromDueDate = (due: string): string => shiftDay(due, -GESTATION_DAYS);

/**
 * TRIMESTER BOUNDARIES, stated once.
 *
 * First: weeks 0–13. Second: 14–27. Third: 28 onwards. Definitions vary by a
 * week at the edges between sources; this app uses ACOG's, and states it here
 * rather than in three components.
 */
export function trimesterOf(week: number): 1 | 2 | 3 {
  if (week < 14) return 1;
  if (week < 28) return 2;
  return 3;
}

/**
 * Where the pregnancy is on `on`, from whichever basis exists.
 *
 * Returns null when neither date is known, which the database also refuses —
 * so a caller that gets null has a row that should not exist, and shows
 * nothing rather than counting from an assumption.
 */
export function gestationOn(
  on: string,
  basis: { lmpDate?: string | null; dueDate?: string | null }
): Gestation | null {
  const lmp = basis.lmpDate ?? (basis.dueDate ? lmpFromDueDate(basis.dueDate) : null);
  if (!lmp) return null;
  const due = basis.dueDate ?? dueDateFromLmp(lmp);

  const elapsed = daysBetween(lmp, on);
  // BEFORE THE LAST PERIOD IS NOT WEEK ZERO, it is an impossible date. Clamped
  // so nothing downstream divides by it, and flagged so the UI can say so.
  const days = Math.max(0, elapsed);
  const week = Math.floor(days / 7);

  return {
    week,
    day: days % 7,
    trimester: trimesterOf(week),
    progress: Math.max(0, Math.min(1, days / GESTATION_DAYS)),
    daysUntilDue: daysBetween(on, due),
    // 42 weeks is the outer edge of post-term. Past it, the dating is wrong
    // rather than the pregnancy being remarkable.
    implausible: elapsed < 0 || week > 42,
  };
}

/**
 * "Due in 11 days" / "Due today" / "3 days past your due date".
 *
 * PAST THE DUE DATE IS SAID PLAINLY, not as a negative countdown and not as
 * an alarm: most pregnancies that reach 40 weeks continue a little past it.
 */
export function dueLabel(g: Gestation): string {
  if (g.daysUntilDue === 0) return "Due today";
  if (g.daysUntilDue > 0) {
    return `Due in ${g.daysUntilDue} day${g.daysUntilDue === 1 ? "" : "s"}`;
  }
  const over = Math.abs(g.daysUntilDue);
  return `${over} day${over === 1 ? "" : "s"} past your due date`;
}

// ---------------------------------------------------------------------------
// Kick counting and contraction timing
// ---------------------------------------------------------------------------

/**
 * The interval between the START of consecutive contractions.
 *
 * START TO START, which is what "five minutes apart" means clinically and is
 * NOT the gap between the end of one and the start of the next. Getting this
 * wrong reports a longer spacing than the real one, on the measurement people
 * use to decide when to travel.
 */
export function contractionSpacingSeconds(
  startedAt: string,
  previousStartedAt: string
): number {
  return Math.round(
    (new Date(startedAt).getTime() - new Date(previousStartedAt).getTime()) / 1000
  );
}

/** Seconds a contraction lasted, or null while it is still running. */
export function contractionDurationSeconds(
  startedAt: string,
  endedAt: string | null
): number | null {
  if (!endedAt) return null;
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

/** "1m 05s" / "45s". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
