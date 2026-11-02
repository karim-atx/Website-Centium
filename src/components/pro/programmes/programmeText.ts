import { t, tn } from "../../../i18n/core";
import { weekCount, weekDayOn } from "../../../services/programmes/model";

// Round G (EH4b): the programme lines the professional's screens show, in the
// app's language. services/programmes/model.ts keeps its English doneLine and
// assignmentStatus (its tests and the member's Workout screen read them);
// these give the same English, translated through the catalogue.

/** "{done} of {n} sessions done", or "Not shared" without the client's consent. */
export function doneText(planned: number, done: number | null): string {
  if (done === null) return t("Not shared");
  return tn(planned, "{done} of {n} session done", "{done} of {n} sessions done", { done });
}

/** "Week {n} of {of}" / "Starts {date}" / "Ended" / "Finished" for an assignment on `today`. */
export function statusText(
  a: { startsOn: string; endsOn: string; joinWeek: number; endedAt?: string | null },
  weeks: number,
  today: string,
  fmt: (iso: string) => string
): string {
  if (a.endedAt) return t("Ended");
  if (today < a.startsOn) return t("Starts {date}", { date: fmt(a.startsOn) });
  if (today > a.endsOn) return t("Finished");
  const wd = weekDayOn(a, today);
  return wd ? t("Week {n} of {of}", { n: wd.week, of: weeks }) : "";
}

/** "{n} workouts a week" (or "2–4 workouts a week") over the weeks that have any; null when nothing is planned. */
export function workoutsAWeekText(grid: string[][][]): string | null {
  const counts = grid.map(weekCount).filter((n) => n > 0);
  if (counts.length === 0) return null;
  const lo = Math.min(...counts);
  const hi = Math.max(...counts);
  return lo === hi ? tn(lo, "{n} workout a week", "{n} workouts a week") : t("{lo}–{hi} workouts a week", { lo, hi });
}

/** The builder header and the library card: "{n} weeks · {n} workouts a week · used by {n} clients". */
export function programmeMetaText(weeks: number, grid: string[][][], clients?: number): string {
  const parts = [tn(weeks, "{n} week", "{n} weeks"), workoutsAWeekText(grid) ?? t("No workouts yet")];
  if (clients !== undefined && clients > 0) parts.push(tn(clients, "used by {n} client", "used by {n} clients"));
  return parts.join(" · ");
}
