// How long a habit has been kept, from the days it was actually completed.
//
// PURE, AND SEPARATE FROM ./index.ts, which opens a Supabase client — the same
// split services/cycle and services/pregnancy use, so this can be tested
// without a database and without dragging `document` into the node runner.
//
// WHAT THIS REPLACES, AND WHY IT IS NOT THE SAME NUMBER. Habits used to live
// in localStorage as `{ done, streakDays }`, and streakDays was a COUNTER:
// toggleHabit did `streakDays + 1` on a tick and `- 1` on an untick, forever.
// It never reset on a missed day, so a habit ticked once a month for a year
// read "12 day streak". It was a count of taps, presented as a run of days.
//
// A run of days is now derived from habit_completions, which stores one row
// per (habit, date). The number can therefore go down when somebody misses a
// day, which the old one could not, and that is the point of it.

/** yyyy-mm-dd arithmetic in UTC, so no DST hour shifts a date. */
export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  at.setUTCDate(at.getUTCDate() + delta);
  return at.toISOString().slice(0, 10);
}

/**
 * Consecutive completed days ending today, or ending yesterday.
 *
 * TODAY NOT BEING DONE YET DOES NOT BREAK THE RUN, and that is a deliberate
 * choice rather than an oversight. A streak that collapses to zero at midnight
 * and comes back when you tick the box tells somebody they have lost something
 * they have not lost — at 9am they have simply not done it yet. The run only
 * ends once a whole day has passed unticked.
 *
 * Returns 0 when the most recent completion is older than yesterday.
 */
export function habitStreak(completedDates: readonly string[], today: string): number {
  if (completedDates.length === 0) return 0;
  const days = new Set(completedDates);

  // Start at today if it is done, otherwise at yesterday. Anything older than
  // that means the run has already been broken.
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  if (!days.has(cursor)) return 0;

  let run = 0;
  while (days.has(cursor)) {
    run++;
    cursor = shiftDay(cursor, -1);
  }
  return run;
}

/** Whether the habit is ticked for `today`. */
export function isDoneOn(completedDates: readonly string[], today: string): boolean {
  return completedDates.includes(today);
}

/**
 * The longest run of consecutive completed days in `completedDates`, which is
 * whatever window was loaded (365 days today): MO1.1's "Personal best". It is
 * the best inside that window, not all-time, which would need its own read.
 */
export function habitBestStreak(completedDates: readonly string[]): number {
  const days = new Set(completedDates);
  let best = 0;
  for (const day of days) {
    // Only count from the first day of each run.
    if (days.has(shiftDay(day, -1))) continue;
    let run = 0;
    let cursor = day;
    while (days.has(cursor)) {
      run++;
      cursor = shiftDay(cursor, 1);
    }
    if (run > best) best = run;
  }
  return best;
}
