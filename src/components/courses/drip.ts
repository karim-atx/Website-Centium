// CU25 (Release 3, DB-6): a course that opens a week at a time, as the
// enrolled learner sees it. Pure, so the wording and the "which week is next"
// rule are tested without Supabase.
//
// course_drip_schedule(course) gives every module's opens_at for the caller:
// null when it is open from the start (all at once, offset 0, the author, or
// not enrolled), otherwise the day it opens (a date cast to a timestamp at
// 00:00 UTC, so it is read back in UTC to keep the day the author meant).

export interface DripRow {
  moduleId: string;
  position: number;
  opensAt: string | null;
  isOpen: boolean;
}

/** The schedule drips for this learner: some module has its own opening day. */
export const hasDrip = (rows: DripRow[]): boolean => rows.some((r) => r.opensAt !== null);

/** The next module still to open (lowest position), or null when every week is open. */
export function nextLocked(rows: DripRow[]): DripRow | null {
  return [...rows].sort((a, b) => a.position - b.position).find((r) => !r.isOpen && r.opensAt) ?? null;
}

/** "Thursday" and "15 Oct" for an opening day, in UTC (see above). */
export function openingDay(opensAt: string): { weekday: string; date: string } {
  const d = new Date(opensAt);
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }),
    date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
  };
}

/** The author starts a sentence (LessonView's fallback is "the professional"). */
const lead = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Whole days from today (UTC) to the opening day. */
function daysUntil(opensAt: string, now: Date): number {
  const open = Date.parse(opensAt.slice(0, 10) + "T00:00:00Z");
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((open - today) / 86_400_000);
}

/**
 * Course page (CU25 "enrolled, progress and drip"):
 * "Alex opens a week at a time. Week 2 opens Thursday." Within the coming
 * week the weekday alone; further out, the date too ("Thursday 22 Oct").
 */
export function courseDripLine(author: string, week: number, opensAt: string, now = new Date()): string {
  const { weekday, date } = openingDay(opensAt);
  const when = daysUntil(opensAt, now) <= 6 ? weekday : `${weekday} ${date}`;
  return `${lead(author)} opens a week at a time. Week ${week} opens ${when}.`;
}

/** Lesson (CU25 "next week opens Thursday"): "Week 2 opens Thursday 15 Oct. Alex opens a week at a time." */
export function lessonDripLine(author: string, week: number, opensAt: string): string {
  const { weekday, date } = openingDay(opensAt);
  return `Week ${week} opens ${weekday} ${date}. ${lead(author)} opens a week at a time.`;
}
