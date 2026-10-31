import { appLocale } from "../../i18n/format";
// Release 3 · W7 (CU1): the client's "From your coach" section, as pure logic.
// Kept apart from ./programmes (which talks to Supabase) so it can be tested.
//
// A PROGRAMME IS ONE workout_template_assignments ROW. assign_template_to_client
// copies the template into ONE routine (routine_id) and puts its sessions on
// the client's calendar (calendar_events.source_template_assignment_id). Its
// dates (DB-3): starts_on is the client's first day, join_week the programme
// week they start at, ends_on = starts_on + (duration_weeks - join_week + 1) * 7 - 1.
// The client reads the template assigned to them (workout_templates, policy
// workout_templates_select_assigned_client, 20261124180000), so the
// programme's name and length are the template's own name and duration_weeks.

export interface ProgrammeAssignment {
  id: string;
  routineId: string | null;
  /** yyyy-mm-dd, or null on rows assigned before programme dates existed. */
  startsOn: string | null;
  endsOn: string | null;
  joinWeek: number;
  endedAt: string | null;
  assignedAt: string;
  createdAt: string;
  /** workout_templates.name (the programme's name). */
  templateName: string;
  /** workout_templates.duration_weeks: the programme's length, or null for one with no end. */
  durationWeeks: number | null;
}

const DAY_MS = 86_400_000;

/** Whole days from a to b (yyyy-mm-dd), read as UTC dates so a clock change never shifts it. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`)) / DAY_MS);
}

/** "Sep 28": the app's short date (HistoryTab's shortDate). */
export function shortDay(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
}

/** Running or not started yet: not ended, and its last day is today or later. */
export function isCurrentAssignment(a: ProgrammeAssignment, today: string): boolean {
  if (a.endedAt) return false;
  return !a.endsOn || a.endsOn >= today;
}

/** The day a past programme ended: when it was ended, else its last day. */
export function endedOn(a: ProgrammeAssignment): string | null {
  return a.endedAt ? a.endedAt.slice(0, 10) : a.endsOn;
}

/** Current programmes (in assignment order) and past ones (most recently ended first). */
export function splitAssignments(
  rows: ProgrammeAssignment[],
  today: string
): { current: ProgrammeAssignment[]; past: ProgrammeAssignment[] } {
  const current = rows.filter((a) => isCurrentAssignment(a, today)).sort((x, y) => x.assignedAt.localeCompare(y.assignedAt));
  const past = rows
    .filter((a) => !isCurrentAssignment(a, today))
    .sort((x, y) => (endedOn(y) ?? "").localeCompare(endedOn(x) ?? ""));
  return { current, past };
}

/** Programme week and day (1-based) of a date, counted from starts_on at join_week. */
export function weekDayOf(a: ProgrammeAssignment, day: string): { week: number; day: number } | null {
  if (!a.startsOn) return null;
  const d = daysBetween(a.startsOn, day);
  if (d < 0) return null;
  return { week: a.joinWeek + Math.floor(d / 7), day: (d % 7) + 1 };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The coach folder's count line: "Week 3 of 8 · 3 routines" (CU1 v4). Before
 * the start, "Starts Oct 20 · 1 routine"; with no end date, "Week 3 · 1 routine".
 */
export function programmeCountLine(a: ProgrammeAssignment, today: string, routineCount: number): string {
  const routinesText = plural(routineCount, "routine", "routines");
  if (a.startsOn && a.startsOn > today) return `Starts ${shortDay(a.startsOn)} · ${routinesText}`;
  const now = a.startsOn ? weekDayOf(a, today) : null;
  if (!now) return routinesText;
  const total = a.durationWeeks;
  const week = total != null ? Math.min(now.week, total) : now.week;
  return `${total != null ? `Week ${week} of ${total}` : `Week ${week}`} · ${routinesText}`;
}

/**
 * The next scheduled session on or after today (calendar_events of this
 * assignment), within the programme. Null when none is left.
 */
export function nextSession(eventDays: string[], today: string, a: ProgrammeAssignment): string | null {
  const ahead = eventDays
    .filter((d) => d >= today && (!a.endsOn || d <= a.endsOn))
    .sort();
  return ahead[0] ?? null;
}

/**
 * A coach routine's meta line: "Week 3, day 2 • 5 exercises • ~50 min"
 * (CU1 v4), from its next scheduled session; without one, the routine's own
 * "5 exercises • ~50 min" as in the client list.
 */
export function coachRoutineMeta(
  a: ProgrammeAssignment,
  next: string | null,
  exerciseCount: number,
  durationMin: number
): string {
  const base = `${exerciseCount} exercises • ~${durationMin} min`;
  const at = next ? weekDayOf(a, next) : null;
  return at ? `Week ${at.week}, day ${at.day} • ${base}` : base;
}

/**
 * "Updated": the coach re-assigned the programme after first assigning it.
 * assign_template_to_client's upsert moves assigned_at to now() and leaves
 * created_at, so a later assigned_at means an update (a minute's slack for
 * the two clocks in one insert).
 */
export function wasUpdatedByCoach(a: Pick<ProgrammeAssignment, "assignedAt" | "createdAt">): boolean {
  return Date.parse(a.assignedAt) - Date.parse(a.createdAt) > 60_000;
}

/** "Foundations, ended Sep 28 · Mobility reset, ended Jul 2" (CU1 v4 past programmes). */
export function pastProgrammesLine(past: { name: string; endedOn: string | null }[]): string {
  return past.map((p) => (p.endedOn ? `${p.name}, ended ${shortDay(p.endedOn)}` : p.name)).join(" · ");
}

/**
 * Translates a drop slot counted among the VISIBLE rows of a group (the coach
 * section takes its routines out of Unfiled and the folders) into the slot in
 * the whole group, which is what placeRoutine counts in. The moving routine
 * is left out of both, as the drag hook leaves it out of its count.
 */
export function fullGroupIndex(groupIds: string[], hidden: ReadonlySet<string>, movingId: string, visibleIndex: number): number {
  const rest = groupIds.filter((id) => id !== movingId);
  const visible = rest.filter((id) => !hidden.has(id));
  if (visibleIndex >= visible.length) return rest.length;
  return rest.indexOf(visible[Math.max(0, visibleIndex)]);
}
