// The Schedule's numbers and labels (OP1-074 … 095, OP1-140 … 155), pure so
// node --test can load it. Every count is computed from the business's own
// business_classes rows and the bookings on them; nothing is sample data.

import { minutesOfDay, time12 } from "../../../utils/time12";
import { DAY_LONG, DAY_SHORT, mondayIndex } from "../../../utils/week";

export interface SessionLite {
  id: string;
  title: string;
  classType: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  endTime: string;
  maxCapacity: number;
  professionalId: string | null;
}

export interface Session extends SessionLite {
  booked: number;
  /** B9: cancelled by the venue (business_classes.cancelled_at): kept as a record, never bookable. */
  cancelled?: boolean;
  /** B9: the repeating series it belongs to (class_series), or null. */
  seriesId?: string | null;
}

/** The sessions still running (not cancelled): every count, flag and conflict reads these. */
export const running = <T extends { cancelled?: boolean }>(list: T[]): T[] => list.filter((s) => !s.cancelled);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const at = (iso: string) => new Date(`${iso}T00:00:00`);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** YYYY-MM-DD plus n days (local calendar days). */
export function addDays(day: string, n: number): string {
  const d = at(day);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Today in the device's calendar (the app's day everywhere else). */
export function todayIso(now: Date = new Date()): string {
  return iso(now);
}

/** Monday of the week holding this day (Monday weeks, X-13). */
export function mondayOf(day: string): string {
  return addDays(day, -mondayIndex(at(day).getDay()));
}

/** "Wed 7 Oct" (the card / toast date, V6-164). */
export function shortDate(day: string): string {
  const d = at(day);
  return `${DAY_SHORT[mondayIndex(d.getDay())]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Tue 6 Oct 2026" (the Date field, V6-162). */
export function longDate(day: string): string {
  return `${shortDate(day)} ${at(day).getFullYear()}`;
}

/** "Wednesday" */
export function weekdayLong(day: string): string {
  return DAY_LONG[mondayIndex(at(day).getDay())];
}

/** "Wed" */
export function weekdayShort(day: string): string {
  return DAY_SHORT[mondayIndex(at(day).getDay())];
}

/** "Today · Mon 5 Oct", "Tomorrow · Tue 6 Oct", else "Wed 7 Oct" (OpsTabsV4 logic 448). */
export function dayHeading(day: string, today: string): string {
  if (day === today) return `Today · ${shortDate(day)}`;
  if (day === addDays(today, 1)) return `Tomorrow · ${shortDate(day)}`;
  return shortDate(day);
}

/** "today", "tomorrow", else "on Thu 8 Oct" (OURS-AN3 C4). */
export function dayWords(day: string, today: string): string {
  if (day === today) return "today";
  if (day === addDays(today, 1)) return "tomorrow";
  return `on ${shortDate(day)}`;
}

const minutes = (hhmm: string) => minutesOfDay(hhmm) ?? 0;

/** The session has finished (its end time has passed). */
export function isEnded(s: SessionLite, now: Date): boolean {
  const today = todayIso(now);
  if (s.date < today) return true;
  if (s.date > today) return false;
  return minutes(s.endTime) <= now.getHours() * 60 + now.getMinutes();
}

/** The session has begun (book_class refuses it from here on). */
export function hasStarted(s: SessionLite, now: Date): boolean {
  const today = todayIso(now);
  if (s.date < today) return true;
  if (s.date > today) return false;
  return minutes(s.startTime) <= now.getHours() * 60 + now.getMinutes();
}

/** Hours from now until the session starts (negative once started). */
export function hoursUntil(s: SessionLite, now: Date): number {
  const start = at(s.date);
  start.setMinutes(minutes(s.startTime));
  return (start.getTime() - now.getTime()) / 3_600_000;
}

/** Two sessions overlap: other.start < new.end and new.start < other.end (back-to-back is fine). */
export function overlaps(a: Pick<SessionLite, "date" | "startTime" | "endTime">, b: Pick<SessionLite, "date" | "startTime" | "endTime">): boolean {
  return a.date === b.date && minutes(a.startTime) < minutes(b.endTime) && minutes(b.startTime) < minutes(a.endTime);
}

export const fillOf = (s: Session) => (s.maxCapacity > 0 ? s.booked / s.maxCapacity : 0);
export const isFull = (s: Session) => s.maxCapacity > 0 && s.booked >= s.maxCapacity;

/** Under 40% booked and starting within 48 hours (V6-162: amber only within 48 h). */
export function isLowSoon(s: Session, now: Date): boolean {
  const h = hoursUntil(s, now);
  return h > 0 && h <= 48 && fillOf(s) < 0.4;
}

export type IssueKind = "noinst" | "double" | "low";

export interface Issue {
  kind: IssueKind;
  sessions: Session[];
}

const byStart = (a: SessionLite, b: SessionLite) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title);

/**
 * Needs attention (OP1-142 S5), for sessions in the next 7 days that have not
 * started: no instructor (professional_id null with bookings), the same
 * instructor on two overlapping sessions, under 40% booked within 48 hours.
 * In that order; empty kinds left out. Cancelled sessions never count.
 *
 * B9: `clashes` is class_instructor_conflicts() (the server compares real
 * times in each venue's zone); when given, the double-booked sessions are its
 * pairs, else the local overlap check (back-to-back is fine).
 */
export function findIssues(sessions: Session[], now: Date, clashes?: { classId: string; otherClassId: string }[] | null): Issue[] {
  const today = todayIso(now);
  const end = addDays(today, 6);
  const live = running(sessions).filter((s) => s.date >= today && s.date <= end && !hasStarted(s, now)).sort(byStart);
  const noinst = live.filter((s) => !s.professionalId && s.booked > 0);
  const double: Session[] = [];
  const clashIds = clashes ? new Set(clashes.flatMap((x) => [x.classId, x.otherClassId])) : null;
  for (const s of live) {
    if (!s.professionalId) continue;
    if (clashIds ? clashIds.has(s.id) : live.some((o) => o.id !== s.id && o.professionalId === s.professionalId && overlaps(o, s))) double.push(s);
  }
  const low = live.filter((s) => isLowSoon(s, now));
  return [
    { kind: "noinst" as const, sessions: noinst },
    { kind: "double" as const, sessions: double },
    { kind: "low" as const, sessions: low },
  ].filter((i) => i.sessions.length > 0);
}

/** The ids each flag applies to, for the row tags and week dots. */
export function flagOf(s: Session, issues: Issue[]): IssueKind | null {
  for (const i of issues) if (i.sessions.some((x) => x.id === s.id)) return i.kind;
  return null;
}

export interface Figures {
  sessions: number;
  /** null when nothing is offered (no capacity to divide by: "–"). */
  bookedPct: number | null;
  /** No sessions in the 7 days before: nothing to compare (OP1-079). */
  early: boolean;
  sessionsDelta: number;
  pctDelta: number | null;
  empty: boolean;
}

/** "Sessions this week" and "Spots booked" for the next 7 days vs the 7 before (OP1-074 row 5). */
export function figures(sessions: Session[], today: string): Figures {
  const inRange = (from: string, to: string) => running(sessions).filter((s) => s.date >= from && s.date <= to);
  const now = inRange(today, addDays(today, 6));
  const prev = inRange(addDays(today, -7), addDays(today, -1));
  const pct = (list: Session[]) => {
    const cap = list.reduce((a, s) => a + s.maxCapacity, 0);
    return cap > 0 ? Math.round((list.reduce((a, s) => a + Math.min(s.booked, s.maxCapacity), 0) / cap) * 100) : null;
  };
  const p = pct(now);
  const q = pct(prev);
  return {
    sessions: now.length,
    bookedPct: p,
    early: prev.length === 0,
    sessionsDelta: now.length - prev.length,
    pctDelta: p !== null && q !== null ? p - q : null,
    // Nothing in the next 7 days reads as the empty card (OP1-080): "0", "–",
    // no deltas, "Create a class and it shows here with bookings."
    empty: now.length === 0,
  };
}

/** "+2", "−3", "0" (a true minus sign). */
export function signed(n: number, unit = ""): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}${unit}`;
}

/** The figures foot line (OpsTabsV4 logic 463, 12-hour). */
export function figuresLine(f: Figures, sessions: Session[], issues: Issue[], today: string, now: Date): string {
  if (f.empty) return "Create a class and it shows here with bookings.";
  if (f.early && f.sessions > 0) return "Your first week of classes. Comparisons start next week.";
  const need = new Set(issues.flatMap((i) => i.sessions.map((s) => s.id))).size;
  const full = running(sessions)
    .filter((s) => s.date >= today && s.date <= addDays(today, 6) && !hasStarted(s, now) && isFull(s))
    .sort(byStart)[0];
  const parts: string[] = [];
  if (need > 0) parts.push(`${need} ${need === 1 ? "session needs" : "sessions need"} attention.`);
  if (full) parts.push(`${weekdayLong(full.date)} ${time12(full.startTime)} ${full.title} is already full.`);
  if (parts.length === 0) parts.push("Nothing needs attention this week.");
  return parts.join(" ");
}

/** The issue lines (OpsTabsV4 logic 450-452, 12-hour). */
export function issueText(i: Issue, nameOf: (id: string | null) => string, people: string): { title: string; body: string; chip: string } {
  const s = i.sessions[0];
  const more = i.sessions.length - 1;
  const when = `${shortDate(s.date)} at ${time12(s.startTime)}`;
  if (i.kind === "noinst") {
    return {
      title: "No instructor",
      body: `${s.title} on ${when} has nobody teaching it. ${s.booked} ${people} ${s.booked === 1 ? "is" : "are"} booked.${more > 0 ? ` ${more} more ${more === 1 ? "session has" : "sessions have"} no instructor.` : ""}`,
      chip: `${weekdayShort(s.date)} ${time12(s.startTime)} ${s.title}`,
    };
  }
  if (i.kind === "double") {
    const pair = i.sessions.filter((x) => x.professionalId === s.professionalId && overlaps(x, s));
    const names = pair.map((x) => x.title);
    const list = names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return {
      title: "Instructor booked twice",
      body: `${nameOf(s.professionalId)} is down for ${list} on ${shortDate(s.date)} at ${time12(s.startTime)}.`,
      chip: `${weekdayShort(s.date)} ${time12(s.startTime)} · ${pair.length} classes`,
    };
  }
  return {
    title: "Under 40% booked, starts within 48 hours",
    body: `${s.title} on ${when} has ${s.booked} of ${s.maxCapacity} spots booked.${more > 0 ? ` ${more} more ${more === 1 ? "session is" : "sessions are"} under 40%.` : ""}`,
    chip: `${weekdayShort(s.date)} ${time12(s.startTime)} ${s.title}`,
  };
}

/** Which classes a draft overlaps for the same instructor, every venue of the business (V6-164). */
export function conflictsFor(
  draft: Pick<SessionLite, "date" | "startTime" | "endTime" | "professionalId">,
  sessions: (SessionLite & { cancelled?: boolean })[],
  excludeId?: string
): SessionLite[] {
  if (!draft.professionalId) return [];
  return running(sessions)
    .filter((s) => s.id !== excludeId && s.professionalId === draft.professionalId && overlaps(s, draft))
    .sort(byStart);
}

/** The week grid's hour range (OP1-076 O1: at least 7 AM to 9 PM, wider when a session needs it). */
export function weekHours(sessions: SessionLite[]): { h0: number; h1: number } {
  let h0 = 7;
  let h1 = 21;
  for (const s of sessions) {
    h0 = Math.min(h0, Math.floor(minutes(s.startTime) / 60));
    h1 = Math.max(h1, Math.ceil(minutes(s.endTime) / 60));
  }
  return { h0, h1 };
}

/** "7 AM", "1 PM" (week grid labels, 12-hour). */
export function hourLabel(h: number): string {
  const hh = h % 24;
  return `${hh % 12 === 0 ? 12 : hh % 12} ${hh < 12 ? "AM" : "PM"}`;
}

/** Sorts a day's sessions: start time, then newest first for equal times (OP1-155 row 5), then name. */
export function sortDay<T extends SessionLite>(list: T[], newestFirst: string[] = []): T[] {
  return [...list].sort((a, b) => {
    const t = a.startTime.localeCompare(b.startTime);
    if (t) return t;
    const ia = newestFirst.indexOf(a.id);
    const ib = newestFirst.indexOf(b.id);
    if (ia !== ib) return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
    return a.title.localeCompare(b.title);
  });
}

/** The class types stored before the fixed list (V6-164 "Saved before this list"). */
export function isLegacyType(type: string, list: readonly string[]): boolean {
  return !!type && !list.includes(type);
}

/** Initial(s) for an avatar: the first letter of the first name (CF-D2). */
export function initialOf(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/** Plain list join: "a", "a and b", "a, b and c". */
export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
