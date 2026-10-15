import type { ClassRow, TeamPerson } from "./teamTypes";

// AN5 Team analytics: pure numbers from real rows (no samples). Thresholds
// from the handover: TARGET 70 % (AnTeamV6 l.381), fill shown from 3 sessions
// (HANDOVER §3.10, AN5-045 row 5), comparisons from 20 bookings (MIN_BK),
// early data = first class taught fewer than 4 weeks ago (AN5-003 row 1).

export const TARGET = 70;
export const MIN_SESSIONS = 3;
export const MIN_BOOKINGS = 20;
export const EARLY_DAYS = 28;

export const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const lengthMin = (c: ClassRow) => Math.max(0, minutesOf(c.end) - minutesOf(c.start));

export interface InstructorStats {
  person: TeamPerson;
  sessions: number;
  booked: number;
  capacity: number;
  /** Booked spots ÷ capacity, % (null under MIN_SESSIONS). */
  fill: number | null;
  avgBooked: number;
  hoursPerWeek: number;
  classesPerWeek: number;
  upcoming: ClassRow[];
  taught: ClassRow[];
}

export interface TeamStats {
  activeInstructors: number;
  classesTaught: number;
  prevActive: number;
  prevTaught: number;
  studioFill: number | null;
  onTarget: number;
  withFill: number;
  totalBookings: number;
  hoursAvg: number;
  overloaded: number;
  perPerson: InstructorStats[];
}

/** Sessions that have happened by today, inside [from, to]. */
export function taughtIn(classes: ClassRow[], from: string, to: string, today: string): ClassRow[] {
  return classes.filter((c) => c.professionalId && c.date >= from && c.date <= to && c.date <= today);
}

export function teamStats(
  people: TeamPerson[],
  classes: ClassRow[],
  range: { from: string; to: string },
  prev: { from: string; to: string },
  today: string,
  days: number
): TeamStats {
  const accepted = people.filter((p) => p.acceptedAt);
  const ids = new Set(accepted.map((p) => p.id));
  const now = taughtIn(classes, range.from, range.to, today).filter((c) => ids.has(c.professionalId as string));
  const before = taughtIn(classes, prev.from, prev.to, today).filter((c) => ids.has(c.professionalId as string));
  const weeks = Math.max(1, days / 7);

  const perPerson: InstructorStats[] = accepted.map((person) => {
    const mine = now.filter((c) => c.professionalId === person.id);
    const booked = mine.reduce((a, c) => a + c.booked, 0);
    const capacity = mine.reduce((a, c) => a + c.capacity, 0);
    const minutes = mine.reduce((a, c) => a + lengthMin(c), 0);
    return {
      person,
      sessions: mine.length,
      booked,
      capacity,
      fill: mine.length >= MIN_SESSIONS && capacity > 0 ? Math.round((booked / capacity) * 100) : null,
      avgBooked: mine.length ? Math.round((booked / mine.length) * 10) / 10 : 0,
      hoursPerWeek: Math.round((minutes / 60 / weeks) * 10) / 10,
      classesPerWeek: Math.round((mine.length / weeks) * 10) / 10,
      taught: mine,
      upcoming: classes.filter((c) => c.professionalId === person.id && c.date > today).slice(0, 50),
    };
  });

  const booked = now.reduce((a, c) => a + c.booked, 0);
  const capacity = now.reduce((a, c) => a + c.capacity, 0);
  const withFill = perPerson.filter((p) => p.fill !== null);
  const teaching = perPerson.filter((p) => p.sessions > 0);
  const hoursAvg = teaching.length ? teaching.reduce((a, p) => a + p.hoursPerWeek, 0) / teaching.length : 0;
  return {
    activeInstructors: new Set(now.map((c) => c.professionalId)).size,
    classesTaught: now.length,
    prevActive: new Set(before.map((c) => c.professionalId)).size,
    prevTaught: before.length,
    studioFill: now.length >= MIN_SESSIONS && capacity > 0 ? Math.round((booked / capacity) * 100) : null,
    onTarget: withFill.filter((p) => (p.fill as number) >= TARGET).length,
    withFill: withFill.length,
    totalBookings: booked,
    hoursAvg: Math.round(hoursAvg * 10) / 10,
    overloaded: teaching.length > 1 ? teaching.filter((p) => p.hoursPerWeek >= hoursAvg * 1.3).length : 0,
    perPerson,
  };
}

export type Issue =
  | { kind: "none"; cls: ClassRow }
  | { kind: "left"; cls: ClassRow; professionalId: string }
  | { kind: "overlap"; a: ClassRow; b: ClassRow; professionalId: string };

/** Schedule coverage (AN5-023 row 22): next 14 days, this business only. */
export function coverageIssues(classes: ClassRow[], teamIds: Set<string>, today: string, until: string, nowMin: number): { issues: Issue[]; upcoming: ClassRow[] } {
  const upcoming = classes.filter(
    (c) => c.date >= today && c.date <= until && !(c.date === today && minutesOf(c.start) < nowMin)
  );
  const issues: Issue[] = [];
  for (const c of upcoming) {
    if (!c.professionalId) issues.push({ kind: "none", cls: c });
    else if (!teamIds.has(c.professionalId)) issues.push({ kind: "left", cls: c, professionalId: c.professionalId });
  }
  const byPro = new Map<string, ClassRow[]>();
  for (const c of upcoming) {
    if (!c.professionalId || !teamIds.has(c.professionalId)) continue;
    byPro.set(c.professionalId, [...(byPro.get(c.professionalId) ?? []), c]);
  }
  for (const [pid, list] of byPro) {
    const sorted = [...list].sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        if (a.date !== b.date) break;
        if (overlaps(a.start, a.end, b.start, b.end)) issues.push({ kind: "overlap", a, b, professionalId: pid });
      }
    }
  }
  const at = (x: Issue) => (x.kind === "overlap" ? x.a.date + x.a.start : x.cls.date + x.cls.start);
  issues.sort((x, y) => at(x).localeCompare(at(y)));
  return { issues, upcoming };
}

export const overlaps = (s1: string, e1: string, s2: string, e2: string): boolean =>
  minutesOf(s1) < minutesOf(e2) && minutesOf(s2) < minutesOf(e1);

/**
 * Who is free for one session (AN5-024 rows 9-11, 13; OURS availability A1):
 * free first, then busy, then off that day (instructor_unavailable_dates, B6);
 * team order inside each. Someone both busy and off counts as busy.
 */
export function availabilityFor(
  session: ClassRow,
  people: TeamPerson[],
  classes: ClassRow[],
  exclude?: string | null,
  offToday: ReadonlySet<string> = new Set()
): { person: TeamPerson; busyWith: ClassRow | null; off: boolean }[] {
  const rows = people
    .filter((p) => p.acceptedAt && p.id !== exclude)
    .map((person) => {
      const busyWith =
        classes.find(
          (c) => c.id !== session.id && c.professionalId === person.id && c.date === session.date && overlaps(c.start, c.end, session.start, session.end)
        ) ?? null;
      return { person, busyWith, off: !busyWith && offToday.has(person.id) };
    });
  return [...rows.filter((r) => !r.busyWith && !r.off), ...rows.filter((r) => r.busyWith), ...rows.filter((r) => r.off)];
}

/** Initials from the shown name (AN5-024 row 7: never the sample's). */
export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
