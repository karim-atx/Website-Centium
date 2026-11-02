// Round D · week-by-day programmes (Database 20261223020000, PLAN.md DT1):
// the pure rules behind the professional's builder (TR2), assigning (TR5),
// progress (TR7) and the client's Programme card (CU1), kept apart from
// ./index (which talks to Supabase) so they can be tested.
//
// A PROGRAMME is weeks × days (1 = Monday … 7 = Sunday) × up to four
// workouts a day, each one of the professional's own workout templates.
// Dates mirror the server's programme_session_dates: week `join_week` is the
// Monday-to-Sunday week holding starts_on, then whole weeks; sessions before
// starts_on aren't scheduled; ends_on is the Sunday of the last week.
//
// Round F (DW1–DW3, Database 20261226000000): a week can carry the
// professional's note; a session can be skipped (not planned, so never
// missed) or moved to another day of its own week. Both name the session by
// its id (programme_schedule.session_id, Database 20261226130000).

import { programmeCodeMessage } from "./copy";
import { t, tn } from "../../i18n/core";

export const MAX_WEEKS = 52;
export const MAX_PER_DAY = 4;
export const NAME_MAX = 120;
export const TEXT_MAX = 2000;
/** programme_week_notes.note: up to 280 characters. */
export const WEEK_NOTE_MAX = 280;

/** One programme_sessions row. */
export interface ProgrammeSlot {
  week: number;
  /** 1 = Monday … 7 = Sunday. */
  day: number;
  position: number;
  workoutTemplateId: string;
}

/** A week of the builder: seven days (index 0 = Monday), each its workouts in order. */
export type WeekGrid = string[][];

/** weeks × 7 days of template ids, in position order; slots outside the length are dropped. */
export function buildGrid(weeks: number, slots: ProgrammeSlot[]): WeekGrid[] {
  const grid: WeekGrid[] = Array.from({ length: Math.max(0, weeks) }, () => Array.from({ length: 7 }, () => [] as string[]));
  const sorted = [...slots].sort((a, b) => a.week - b.week || a.day - b.day || a.position - b.position);
  for (const s of sorted) {
    if (s.week < 1 || s.week > weeks || s.day < 1 || s.day > 7) continue;
    grid[s.week - 1][s.day - 1].push(s.workoutTemplateId);
  }
  return grid;
}

/** A day's list after adding a workout (at most four; null when full). */
export function addToDay(ids: string[], id: string): string[] | null {
  if (ids.length >= MAX_PER_DAY) return null;
  return [...ids, id];
}

/** A day's list without the workout at `index`. */
export const removeFromDay = (ids: string[], index: number): string[] => ids.filter((_, i) => i !== index);

/** A day's list with the workout at `index` moved by `by` (-1 up, +1 down); unchanged at an edge. */
export function moveInDay(ids: string[], index: number, by: -1 | 1): string[] {
  const to = index + by;
  if (index < 0 || index >= ids.length || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Workouts in one week of the grid. */
export const weekCount = (week: string[][] | undefined): number => (week ?? []).reduce((n, d) => n + d.length, 0);

/** The last week with any workout (0 when empty): the shortest length update_programme accepts. */
export function lastUsedWeek(grid: WeekGrid[]): number {
  for (let w = grid.length; w >= 1; w -= 1) if (weekCount(grid[w - 1]) > 0) return w;
  return 0;
}

/**
 * "{n} workouts a week" over the weeks that have any: one number when they
 * agree, else the range ("2–4 workouts a week"); null when nothing is planned.
 */
export function workoutsAWeek(grid: WeekGrid[]): string | null {
  const counts = grid.map(weekCount).filter((n) => n > 0);
  if (counts.length === 0) return null;
  const lo = Math.min(...counts);
  const hi = Math.max(...counts);
  return lo === hi ? tn(lo, "{n} workout a week", "{n} workouts a week") : t("{lo}–{hi} workouts a week", { lo, hi });
}

/** The builder header and the library card: "{n} weeks · {n} workouts a week · used by {n} clients". */
export function programmeMeta(weeks: number, grid: WeekGrid[], clients?: number): string {
  const parts = [tn(weeks, "{n} week", "{n} weeks")];
  const perWeek = workoutsAWeek(grid);
  parts.push(perWeek ?? t("No workouts yet"));
  if (clients !== undefined && clients > 0) parts.push(tn(clients, "used by {n} client", "used by {n} clients"));
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const isoOfUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** yyyy-mm-dd plus n days (calendar arithmetic in UTC, so a clock change never shifts it). */
export const addDays = (iso: string, n: number): string => isoOfUtc(utc(iso) + n * DAY_MS);

/** Whole days from a to b. */
export const daysBetween = (a: string, b: string): number => Math.round((utc(b) - utc(a)) / DAY_MS);

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoDay(iso: string): number {
  const d = new Date(utc(iso)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** The Monday of the week holding `iso`. */
export const mondayOf = (iso: string): string => addDays(iso, 1 - isoDay(iso));

/** The date of programme week `week`, day `day` for an assignment (programme_session_dates). */
export function sessionDate(startsOn: string, joinWeek: number, week: number, day: number): string {
  return addDays(mondayOf(startsOn), (week - joinWeek) * 7 + (day - 1));
}

/** ends_on as assign_programme_to_client computes it: the Sunday of the last week. */
export function assignmentEnd(startsOn: string, joinWeek: number, weeks: number): string {
  return addDays(mondayOf(startsOn), (weeks - joinWeek + 1) * 7 - 1);
}

/** The programme week and day for `today` (my_programmes' current_week / current_day); null outside the dates. */
export function weekDayOn(a: { startsOn: string; endsOn: string; joinWeek: number }, today: string): { week: number; day: number } | null {
  if (today < a.startsOn || today > a.endsOn) return null;
  return { week: a.joinWeek + Math.floor(daysBetween(mondayOf(a.startsOn), mondayOf(today)) / 7), day: isoDay(today) };
}

// ---------------------------------------------------------------------------
// Schedule and progress (programme_schedule, programme_progress)
// ---------------------------------------------------------------------------

export interface ScheduleRow {
  week: number;
  day: number;
  onDate: string;
  position: number;
  workoutTemplateId: string;
  workoutName: string;
  routineId: string | null;
  /** null: a professional without the client's Workout activity consent. */
  done: boolean | null;
  /** Round F: skipped (not planned, so never missed). A skipped moved session keeps its move. */
  skipped: boolean;
  /** Round F: the planned date when the session was moved to onDate, else null. */
  movedFrom: string | null;
  /** Round F: programme_sessions.id, which every skip and move names. It survives the builder's edits, but re-read it after one. */
  sessionId: string;
}

export interface ProgressRow {
  week: number;
  weekStartsOn: string;
  workoutTemplateId: string;
  workoutName: string;
  /** Skipped sessions excluded. */
  planned: number;
  /** null: not shared with this professional. */
  done: number | null;
  /** Round F: sessions of this workout skipped that week. */
  skipped: number;
  /** Round F: the week's note (the same on every row of a week), or null. */
  weekNote: string | null;
}

export interface ScheduleDay {
  day: number;
  onDate: string;
  sessions: ScheduleRow[];
}

export interface ScheduleWeek {
  week: number;
  days: ScheduleDay[];
}

/** The schedule by week, then by day (only days with a session), in date order. */
export function groupSchedule(rows: ScheduleRow[]): ScheduleWeek[] {
  const weeks: ScheduleWeek[] = [];
  const sorted = [...rows].sort((a, b) => a.onDate.localeCompare(b.onDate) || a.position - b.position);
  for (const r of sorted) {
    let w = weeks.find((x) => x.week === r.week);
    if (!w) weeks.push((w = { week: r.week, days: [] }));
    let d = w.days.find((x) => x.onDate === r.onDate);
    if (!d) w.days.push((d = { day: r.day, onDate: r.onDate, sessions: [] }));
    d.sessions.push(r);
  }
  return weeks.sort((a, b) => a.week - b.week);
}

/** The sessions on one date, in order. */
export const sessionsOn = (rows: ScheduleRow[], date: string): ScheduleRow[] =>
  rows.filter((r) => r.onDate === date).sort((a, b) => a.position - b.position);

export interface WeekProgress {
  week: number;
  weekStartsOn: string;
  /** Skipped sessions excluded. */
  planned: number;
  /** null when the professional can't see it. */
  done: number | null;
  /** Round F: sessions skipped that week. */
  skipped: number;
  /** Round F: the professional's note for the week, or null. */
  weekNote: string | null;
  byWorkout: { workoutTemplateId: string; workoutName: string; planned: number; done: number | null; skipped: number }[];
}

/** programme_progress rows summed per week; a week's done is null when any row is. */
export function summariseProgress(rows: ProgressRow[]): WeekProgress[] {
  const out: WeekProgress[] = [];
  for (const r of [...rows].sort((a, b) => a.week - b.week || a.workoutName.localeCompare(b.workoutName))) {
    let w = out.find((x) => x.week === r.week);
    if (!w) out.push((w = { week: r.week, weekStartsOn: r.weekStartsOn, planned: 0, done: 0, skipped: 0, weekNote: null, byWorkout: [] }));
    w.planned += r.planned;
    w.done = w.done === null || r.done === null ? null : w.done + r.done;
    w.skipped += r.skipped;
    w.weekNote ??= r.weekNote;
    w.byWorkout.push({ workoutTemplateId: r.workoutTemplateId, workoutName: r.workoutName, planned: r.planned, done: r.done, skipped: r.skipped });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Round F: skipping and moving a session (skip_programme_session,
// unskip_programme_session, move_programme_session), as the server checks them
// ---------------------------------------------------------------------------

/** A session that can still change: not done and not skipped. */
export const isOpen = (r: ScheduleRow): boolean => !r.done && !r.skipped;

/** The day a session was planned on (a moved one keeps its planned date in movedFrom). */
export const plannedOn = (r: ScheduleRow): string => r.movedFrom ?? r.onDate;

/**
 * The client may skip a day of the current Monday-to-Sunday week (today, or
 * any other day of it) that still has an unfinished session; another week is
 * ATXP1. The professional may skip any day.
 */
export function clientMaySkip(onDate: string, sessions: ScheduleRow[], today: string): boolean {
  return mondayOf(onDate) === mondayOf(today) && sessions.some(isOpen);
}

/**
 * How "Skip this day" is written: skip_programme_sessions_on for the whole
 * day when nothing on it is done (all or none), else skip_programme_session
 * for each unfinished one (the whole-day call refuses a day holding a done
 * workout, ATXP0). Null when nothing is left to skip.
 */
export type SkipCalls = { day: string } | { sessionIds: string[] };
export function skipCalls(sessions: ScheduleRow[]): SkipCalls | null {
  const open = sessions.filter(isOpen);
  if (open.length === 0) return null;
  return sessions.some((s) => s.done) ? { sessionIds: open.map((s) => s.sessionId) } : { day: open[0].onDate };
}

export interface MoveTarget {
  date: string;
  /** 1 = Monday … 7 = Sunday. */
  day: number;
  /** Sessions already on that day (skipped ones don't count). */
  count: number;
  /** Four already: ATXP3. */
  full: boolean;
  /** The session's own planned day: moving it back clears the move. */
  planned: boolean;
}

/**
 * Where a session may move: another day of its own Monday-to-Sunday week,
 * today or later, within the assignment's dates (ATXP2), at most four a day
 * (ATXP3). None for a done or skipped session (ATXP0, ATXP4).
 */
export function moveTargets(session: ScheduleRow, rows: ScheduleRow[], today: string, a: { startsOn: string; endsOn: string }): MoveTarget[] {
  if (!isOpen(session)) return [];
  const monday = mondayOf(plannedOn(session));
  const out: MoveTarget[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(monday, i);
    if (date === session.onDate || date < today || date < a.startsOn || date > a.endsOn) continue;
    const count = rows.filter((r) => r.onDate === date && !r.skipped).length;
    out.push({ date, day: i + 1, count, full: count >= MAX_PER_DAY, planned: date === session.movedFrom });
  }
  return out;
}

/** Whether a session may be dropped on `date`: a free day among its move targets. */
export function canMoveTo(session: ScheduleRow, date: string, rows: ScheduleRow[], today: string, a: { startsOn: string; endsOn: string }): boolean {
  return moveTargets(session, rows, today, a).some((t) => t.date === date && !t.full);
}

/**
 * Round D D-S4: yesterday's unfinished sessions, for "Yesterday: {workout} ·
 * Do it today" with "Skip". Only while yesterday is in this week (from
 * Tuesday on): the client can't move or skip last Sunday's session.
 */
export function yesterdaysOpen(rows: ScheduleRow[], today: string): ScheduleRow[] {
  if (isoDay(today) === 1) return [];
  return sessionsOn(rows, addDays(today, -1)).filter(isOpen);
}

/** The builder's "Move to…": the other days of the week shown, each with its count (four is full, ATXP3). */
export function builderMoveTargets(week: string[][] | undefined, fromDay: number): { day: number; count: number; full: boolean }[] {
  const days = week ?? [];
  const out: { day: number; count: number; full: boolean }[] = [];
  for (let d = 1; d <= 7; d += 1) {
    if (d === fromDay) continue;
    const count = (days[d - 1] ?? []).length;
    out.push({ day: d, count, full: count >= MAX_PER_DAY });
  }
  return out;
}

/** The whole programme so far: planned and done over the weeks that have started by `today`. */
export function totalSoFar(weeks: WeekProgress[], today: string): { planned: number; done: number | null } {
  const started = weeks.filter((w) => w.weekStartsOn <= today);
  const planned = started.reduce((n, w) => n + w.planned, 0);
  const done = started.some((w) => w.done === null) ? null : started.reduce((n, w) => n + (w.done ?? 0), 0);
  return { planned, done };
}

/** "{n} of {n} sessions done", or "Not shared" when done is unknown (never a 0). */
export function doneLine(planned: number, done: number | null): string {
  if (done === null) return t("Not shared");
  return tn(planned, "{done} of {n} session done", "{done} of {n} sessions done", { done });
}

/** "Week {n} of {n}" / "Starts {date}" / "Ended" for an assignment on `today`. */
export function assignmentStatus(
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

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * A short sentence for each refusal the programme calls raise (the codes and
 * texts in 20261223020000, and Round F's in 20261226000000, whose sentences
 * are translated in ./copy). Offline is decided by the caller.
 */
export function programmeErrorMessage(error: { code?: string; message?: string } | null | undefined, fallback: string): string {
  const code = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  // Round F (20261226000000): skipping, moving and week notes.
  const f2 = programmeCodeMessage(code, msg);
  if (f2) return f2;
  if (code === "ATX12") return t("That person isn't your client any more.");
  if (code === "ATX09") {
    if (msg.includes("own workouts")) return t("Only your own workouts can go in a programme.");
    if (msg.includes("professional")) return t("Programmes are built by professionals.");
    return t("Only the professional who made this programme can change it.");
  }
  if (code === "ATX08") return t("This programme isn't available any more.");
  if (code === "ATX06") return t("Sign in again to continue.");
  if (code === "22023") {
    const week = /week (\d+) has sessions/.exec(msg);
    if (week) return t("Week {n} has workouts. Clear it before shortening the programme.", { n: week[1] });
    if (msg.includes("nothing is scheduled")) return t("Nothing is planned from that week on. Pick an earlier week or add workouts.");
    if (msg.includes("join week")) return t("Pick a week within the programme.");
    if (msg.includes("four workouts")) return t("A day can hold up to four workouts.");
    if (msg.includes("copy one week")) return t("Pick a different week to copy to.");
    if (msg.includes("week 1 to")) return t("That day isn't in the programme.");
    if (msg.includes("name")) return t("Give the programme a name (up to 120 characters) and 1 to 52 weeks.");
  }
  return fallback;
}
