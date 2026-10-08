import { localDayOf } from "./date";

// Monday is the first day of the week everywhere (v6 X-13, decided): every
// week row, week grid, month grid and weekday picker in the app goes Monday
// to Sunday, so this is the one place that decides what "this week" means
// and in which order the days are drawn.
//
// REORDER ONLY. Stored weekdays keep their own convention: JS / Postgres
// `extract(dow)` 0 = Sunday … 6 = Saturday (e.g. a contraception patch's
// `changeWeekday`), or ISO 1 = Monday … 7 = Sunday (`extract(isodow)`). The
// helpers below convert between a stored value and its drawn column; nothing
// here rewrites what is saved.
//
// Serialised with `localDayOf`, not `.toISOString()`. The latter converts to
// UTC first, which shifts every date back a day for anyone east of UTC (e.g.
// Beirut, UTC+3) even though `d`/`monday`/`day` above are all built from
// local-midnight `Date` objects — the weekday labels this feeds would then
// misalign with the dates they're paired with.
export function mondayFirstWeek(todayStr: string): string[] {
  const monday = new Date(`${startOfWeekISO(todayStr)}T00:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return localDayOf(day);
  });
}

export const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * A weekday's column in a Monday-first row: 0 = Monday … 6 = Sunday, from a
 * JS / `extract(dow)` weekday (0 = Sunday … 6 = Saturday).
 */
export function mondayIndex(jsWeekday: number): number {
  return (((jsWeekday + 6) % 7) + 7) % 7;
}

/** The stored JS weekday (0 = Sunday) drawn in a Monday-first column. */
export function jsWeekdayOfColumn(column: number): number {
  return (column + 1) % 7;
}

/**
 * The stored JS weekdays (0 = Sunday … 6 = Saturday) in the order they are
 * drawn: [1, 2, 3, 4, 5, 6, 0]. For a picker that lists stored weekdays.
 */
export const MONDAY_FIRST_JS_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

/** A date's column in a Monday-first row (0 = Monday). */
export function weekdayColumn(d: Date): number {
  return mondayIndex(d.getDay());
}

export function dayLetter(dateStr: string) {
  return DAY_LETTERS[weekdayColumn(new Date(`${dateStr}T00:00:00`))];
}

/** The Monday on or before `iso` (yyyy-mm-dd), as yyyy-mm-dd. */
export function startOfWeekISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - weekdayColumn(d));
  return localDayOf(d);
}

/** The Monday on or before a date, as a new local-midnight Date. */
export function startOfWeek(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - weekdayColumn(m));
  return m;
}

/**
 * Empty cells before the 1st in a Monday-first month grid (0 when the month
 * starts on a Monday, 6 when it starts on a Sunday).
 */
export function monthLeadingBlanks(year: number, month: number): number {
  return weekdayColumn(new Date(year, month, 1));
}
