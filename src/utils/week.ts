import { localDayOf } from "./date";

// Iteration 6 "Team": every week-row across the redesign (streak board,
// Workout widget, Journal widget) is Monday-first, so this is the one place
// that decides what "this week" means.
//
// Serialised with `localDayOf`, not `.toISOString()`. The latter converts to
// UTC first, which shifts every date back a day for anyone east of UTC (e.g.
// Beirut, UTC+3) even though `d`/`monday`/`day` above are all built from
// local-midnight `Date` objects — the weekday labels this feeds would then
// misalign with the dates they're paired with.
export function mondayFirstWeek(todayStr: string): string[] {
  const d = new Date(`${todayStr}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return localDayOf(day);
  });
}

export const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function dayLetter(dateStr: string) {
  const dow = (new Date(`${dateStr}T00:00:00`).getDay() + 6) % 7;
  return DAY_LETTERS[dow];
}
