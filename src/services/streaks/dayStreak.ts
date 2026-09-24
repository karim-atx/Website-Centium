import { localDayOf } from "../../utils/date";

// The unified day streak, as the Home board computes it.
//
// EXTRACTED SO THERE IS ONE OF IT. This walk used to live inline in
// StreaksBar, which is the only place that showed it — and the sidebar, which
// also claimed to show it, printed the literal "7 day streak" on every page
// instead. Two surfaces naming the same number is only safe when they read the
// same function, so this is that function and both now call it.
//
// PURE ON PURPOSE, and separate from ./index.ts, which opens a Supabase
// client. The four auto-streak rows that file deals with are a DIFFERENT
// number: the nightly sweep advances one counter per category, while this is
// the single headline streak the redesign replaced them with on the board. A
// test of this must not need a database, hence the split.

/**
 * The four daily sub-goals, in whatever shape the caller already holds them.
 *
 * DELIBERATELY STRUCTURAL rather than importing AppContext's types: the only
 * thing this computation needs of a food entry is its date, and asking for the
 * whole type would drag a React context into a pure module and its tests.
 */
export interface DayGoalSources {
  foodLog: readonly { date: string }[];
  waterByDate: Readonly<Record<string, number>>;
  workoutLog: readonly { date: string; completed?: boolean }[];
  journalEntries: readonly { date: string }[];
}

/**
 * How many of the day's four sub-goals were met: food logged, water logged, a
 * workout completed, a journal entry written.
 */
export function subGoalsMet(sources: DayGoalSources, day: string): number {
  return [
    sources.foodLog.some((e) => e.date === day),
    (sources.waterByDate[day] ?? 0) > 0,
    sources.workoutLog.some((w) => w.date === day && w.completed),
    sources.journalEntries.some((e) => e.date === day),
  ].filter(Boolean).length;
}

/** A day counts toward the streak once at least two of the four are met. */
export function dayEarned(sources: DayGoalSources, day: string): boolean {
  return subGoalsMet(sources, day) >= 2;
}

/**
 * Consecutive earned days, walking back from today.
 *
 * TODAY IS SKIPPED PAST, NOT BROKEN ON. Today is very often not yet earned
 * whenever this runs — most of the day, until the last sub-goal lands — and
 * breaking there zeroed the streak most mornings even when yesterday's run was
 * intact. Only a COMPLETED past day that wasn't earned actually ends it.
 *
 * Dates are serialised with `localDayOf`, not `.toISOString()`: the latter
 * converts to UTC first, which shifts every date back a day for anyone east of
 * UTC and misaligns the streak from the weekday it is paired with.
 */
export function currentDayStreak(sources: DayGoalSources, today: string): number {
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00`);
  for (;;) {
    const day = localDayOf(cursor);
    if (!dayEarned(sources, day)) {
      if (day !== today) break;
    } else {
      streak++;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * The sidebar's streak line: the count when there is one, and an honest
 * invitation when there is not.
 *
 * NEVER "0 day streak". A zero is not a streak, and the card that used to
 * carry this said "7 day streak" to everyone — including accounts that had
 * logged nothing at all. Saying "Start a streak today" is the only truthful
 * thing to put there when the walk above returns nothing.
 */
export function dayStreakLabel(streak: number): string {
  if (streak <= 0) return "Start a streak today";
  return `${streak} day streak`;
}
