import type { Streak } from "../types";

/**
 * How far along a streak is, as 0..1, for colouring a flame or filling a bar.
 *
 * WHY THIS EXISTS AT ALL. Four call sites used to write `days / goalDays`
 * inline. That was fine while every streak carried a goal and wrong the moment
 * the four auto rows stopped — `goalDays` is undefined on all of them, and
 * `12 / undefined` is NaN, which reaches the DOM as `width: NaN%` and a flame
 * coloured `rgb(NaN, NaN, NaN)`. One helper means one place got it right.
 */

/**
 * What a goalless streak's progress is measured against.
 *
 * NOT A GOAL, AND NOTHING TELLS THE USER IT IS. An auto streak has no target —
 * the schema forbids one — so this exists purely to give the flame and the bar
 * something to vary along, and every string that used to name a goal is now
 * hidden for these rows rather than rewritten to quote this number.
 *
 * 30 because it is what the app already treated as a full streak: three of the
 * four seeded mock streaks used a 30-day goal before the real rows replaced
 * them, so a 30-day run reads "established" at the same point it always did.
 */
export const GOALLESS_STREAK_SCALE = 30;

export function streakProgress(streak: Pick<Streak, "days" | "goalDays">): number {
  const scale = streak.goalDays && streak.goalDays > 0 ? streak.goalDays : GOALLESS_STREAK_SCALE;
  return Math.max(0, Math.min(1, streak.days / scale));
}
