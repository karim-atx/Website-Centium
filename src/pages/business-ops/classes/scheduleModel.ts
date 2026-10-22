// The Schedule's numbers and labels (OP1-074 … 095, OP1-140 … 155), pure so
// node --test can load it. Every count is computed from the business's own
// business_classes rows and the bookings on them; nothing is sample data.

import { minutesOfDay, range12, time12 } from "../../../utils/time12";
import { DAY_LONG, DAY_SHORT, mondayIndex } from "../../../utils/week";
import { openOnCentium } from "../../../services/business-market/listingLogic";

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

/** "Wed, Oct 7" (the card / toast date, V6-164). */
export function shortDate(day: string): string {
  const d = at(day);
  return `${DAY_SHORT[mondayIndex(d.getDay())]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Tue, Oct 6, 2026" (the Date field, V6-162). */
export function longDate(day: string): string {
  return `${shortDate(day)}, ${at(day).getFullYear()}`;
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
      body: `${s.title} on ${when} has nobody teaching it. ${s.booked} ${s.booked === 1 ? people.replace(/s$/, "") : people} ${s.booked === 1 ? "is" : "are"} booked.${more > 0 ? ` ${more} more ${more === 1 ? "session has" : "sessions have"} no instructor.` : ""}`,
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

// ---------------------------------------------------------------------------
// Series cards (AN3-055 rows 1-3, O4): one card per repeating series, with the
// next session and how many are still to come.

export interface SeriesRuleLite {
  id: string;
  /** ISO weekdays, 1 = Monday. */
  weekdays: number[];
  intervalWeeks: number;
  untilOn: string | null;
  count: number | null;
}

export interface SeriesCard {
  seriesId: string;
  /** The next session still to come (opens on tap). */
  next: Session;
  /** Sessions of the series still to come (not cancelled, not ended). */
  remaining: number;
  /** "HIIT · Repeats every Wed and Fri" (row 2). */
  typeLine: string;
  /** "Next: 2026-10-07 · 7:00–8:00 AM · 12 sessions" (row 3). */
  whenLine: string;
}

/** "Wed", "Wed and Fri", "Mon, Wed and Fri"; seven days "day" (OURS, as repeatSummary's "Every day"). */
function repeatDays(weekdays: number[]): string {
  const ws = [...new Set(weekdays)].filter((w) => w >= 1 && w <= 7).sort((a, b) => a - b);
  if (ws.length === 7) return "day";
  return joinAnd(ws.map((w) => DAY_SHORT[w - 1]));
}

/** ISO weekday of a day, 1 = Monday. */
const isoWeekdayOf = (day: string) => mondayIndex(at(day).getDay()) + 1;

/**
 * One card per series that still has a session to come, soonest first. The
 * rule comes from class_series; when it couldn't be read, the weekdays come
 * from the sessions themselves and the count stands.
 */
export function seriesCards(sessions: Session[], rules: SeriesRuleLite[], now: Date): SeriesCard[] {
  const bySeries = new Map<string, Session[]>();
  for (const s of sessions) {
    if (!s.seriesId || s.cancelled || isEnded(s, now)) continue;
    bySeries.set(s.seriesId, [...(bySeries.get(s.seriesId) ?? []), s]);
  }
  const cards: SeriesCard[] = [];
  for (const [seriesId, list] of bySeries) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const next = sorted[0];
    const rule = rules.find((r) => r.id === seriesId) ?? null;
    const weekdays = rule?.weekdays.length ? rule.weekdays : sorted.map((s) => isoWeekdayOf(s.date));
    const interval = rule?.intervalWeeks ?? 1;
    const days = repeatDays(weekdays);
    const every = interval > 1 ? `${interval} weeks on ${days === "day" ? joinAnd(DAY_SHORT) : days}` : days;
    const type = (next.classType || "").trim();
    const typeLine = `${type ? `${type} · ` : ""}Repeats every ${every}`;
    // AN3-055 row 3 OURS: a series that never ends reads "weekly" for the count.
    const never = !!rule && !rule.untilOn && !rule.count;
    const tail = never ? "weekly" : `${sorted.length} ${sorted.length === 1 ? "session" : "sessions"}`;
    const whenLine = `Next: ${next.date} · ${range12(next.startTime, next.endTime, "–")} · ${tail}`;
    cards.push({ seriesId, next, remaining: sorted.length, typeLine, whenLine });
  }
  return cards.sort((a, b) => a.next.date.localeCompare(b.next.date) || a.next.startTime.localeCompare(b.next.startTime));
}

// ---------------------------------------------------------------------------
// Market + Share 3.0 B-MA.6 (Business Marketplace Screens `bizWeek`,
// `sessions`, `classFields`, `roster`): the week strip, the session cards,
// the Bookings page and the cancel dialog. Month first (D-02), 12-hour (D-03).

const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Friday, October 16": the caps over the day's sessions (the board's "Friday 16 October", month first per D-02). */
export function dayCaps(day: string): string {
  const d = at(day);
  return `${DAY_LONG[mondayIndex(d.getDay())]}, ${MONTH_LONG[d.getMonth()]} ${d.getDate()}`;
}

/** "Week of Oct 19" (the week navigation under the cards; the live Open spots wording). */
export function weekOf(monday: string): string {
  const d = at(monday);
  return `Week of ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Minutes from start to end (0 when the end is not after the start). */
export function durationMinutes(startTime: string, endTime: string): number {
  return Math.max(0, minutes(endTime) - minutes(startTime));
}

/** "45 min", "60 min", "90 min" (the board writes every length in minutes). */
export function durationText(startTime: string, endTime: string): string {
  return `${durationMinutes(startTime, endTime)} min`;
}

/** The Duration menu: 15 to 180 minutes, plus the class's own length when it is another. */
export function durationOptions(current: number): number[] {
  const base = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180];
  return current > 0 && !base.includes(current) ? [...base, current].sort((a, b) => a - b) : base;
}

/** "{n} classes" under a strip day ("1 class"). */
export function classesCount(n: number): string {
  return `${n} ${n === 1 ? "class" : "classes"}`;
}

export interface StripDay {
  day: string;
  /** "MON" */
  w: string;
  /** "12" */
  n: string;
  /** Sessions still running that day (cancelled ones left out). */
  count: number;
}

/** The 7 strip tiles, Monday first (bizWeek: "MON" / "12" / "6 classes"). */
export function weekStrip(sessions: Session[], monday: string): StripDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    return { day, w: DAY_SHORT[i].toUpperCase(), n: String(at(day).getDate()), count: running(sessions).filter((s) => s.date === day).length };
  });
}

/** The card's fill word: "Full" at capacity, else "{n} of {cap}" (sessions.fill). */
export function fillText(s: Pick<Session, "booked" | "maxCapacity">): string {
  return s.maxCapacity > 0 && s.booked >= s.maxCapacity ? "Full" : `${s.booked} of ${s.maxCapacity}`;
}

/** The bar's width in percent, 0 to 100 (sessions.pct). */
export function fillPct(s: Pick<Session, "booked" | "maxCapacity">): number {
  return s.maxCapacity > 0 ? Math.min(100, Math.round((s.booked / s.maxCapacity) * 100)) : 0;
}

/**
 * "Every Friday", "Every Mon and Wed", "Every 2 weeks on Friday", "Every day"
 * (classFields Repeat "Every Friday"; one day reads in full as drawn, several
 * in short).
 */
export function everyText(weekdays: number[], intervalWeeks = 1): string {
  const ws = [...new Set(weekdays)].filter((w) => w >= 1 && w <= 7).sort((a, b) => a - b);
  if (ws.length === 0) return "";
  const days = ws.length === 1 ? DAY_LONG[ws[0] - 1] : ws.length === 7 ? "day" : joinAnd(ws.map((w) => DAY_SHORT[w - 1]));
  return intervalWeeks > 1 ? `Every ${intervalWeeks} weeks on ${days === "day" ? "every day" : days}` : `Every ${days}`;
}

/** The Price tile's foot line: "Repeats every Friday" (classBookings), or "One-time class" for a class that doesn't repeat. */
export function repeatsLine(rule: { weekdays: number[]; intervalWeeks: number } | null): string {
  if (!rule) return "One-time class";
  const e = everyText(rule.weekdays, rule.intervalWeeks);
  return e ? `Repeats ${e.charAt(0).toLowerCase()}${e.slice(1)}` : "One-time class";
}

/** "Fri, Oct 16, 6:30 PM" (the board's "Fri 16 Oct, 6:30 PM", month first). */
export function whenText(day: string, startTime: string): string {
  return `${shortDate(day)}, ${time12(startTime)}`;
}

/** The cancel dialog's body: "Fri, Oct 16, 6:30 PM. The 14 bookings for this session will be cancelled." */
export function cancelText(day: string, startTime: string, booked: number): string {
  const head = `${whenText(day, startTime)}.`;
  if (booked <= 0) return `${head} Nobody has booked this session yet.`;
  return `${head} The ${booked} ${booked === 1 ? "booking" : "bookings"} for this session will be cancelled.`;
}

/**
 * The cancel dialog's notify line (lead decision, R1 polish): the board's
 * "Notify the {n} booked members" switch is replaced by a plain line, because
 * cancel_class_session always tells every booked member.
 */
export function notifiedText(people: "clients" | "members"): string {
  return `${people === "clients" ? "Clients" : "Members"} with a booking are notified.`;
}

/** The live waitlist / paid counts under the cancel body (cancel_class_session tells the waitlist; paid bookings stay paid). */
export function cancelExtras(waitlist: number, paid: number): string {
  const parts: string[] = [];
  if (waitlist > 0) parts.push(`${waitlist} on the waitlist ${waitlist === 1 ? "is" : "are"} told too.`);
  if (paid > 0) parts.push(`${paid} paid ${paid === 1 ? "booking stays" : "bookings stay"} paid. Record any refund in Revenue.`);
  return parts.join(" ");
}

/**
 * A roster row's payment word, from the live booking (venue_class_roster
 * payment_method): "Cash", "Membership", "Class pack", ... as the data says.
 * Payment in the app is cash at the venue, so the store and Whish methods are
 * never named as paid methods (pre-decided): they read as nothing.
 */
export function payMethodText(method: string | null, priceAgreed: number | null): string {
  const m = (method ?? "").trim().toLowerCase();
  if (!m) return priceAgreed === 0 ? "Free" : "";
  if (m === "whish" || m === "app_store" || m === "appstore" || m === "store" || m === "google_play") return "";
  const known: Record<string, string> = { cash: "Cash", membership: "Membership", pass: "Pass", class_pack: "Class pack", pack: "Class pack", free: "Free", card: "Card", transfer: "Bank transfer" };
  if (known[m]) return known[m];
  const words = m.replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The card's Centium line (the old Open spots row, PLAN §3.4; B13 MK-04):
 * "{n} open on Centium" while the class is on Explore (spots left for
 * Centium = the free spots, capped by centium_spots less the Centium
 * bookings), "Members only" when the class is off Explore, "Listing is off"
 * when the whole business is hidden. Nothing for an ended or cancelled
 * session.
 */
export function centiumLine(o: {
  capacity: number;
  booked: number;
  centiumSpots: number | null;
  listed: boolean;
  listingActive: boolean | null;
  fromCentium: number | null;
  ended: boolean;
  cancelled: boolean;
}): { text: string; tone: "teal" | "faint"; open: number } | null {
  if (o.cancelled || o.ended) return null;
  if (o.listingActive === false) return { text: "Listing is off", tone: "faint", open: 0 };
  if (!o.listed) return { text: "Members only", tone: "faint", open: 0 };
  if (o.centiumSpots !== null && o.fromCentium === null) return { text: "On Explore", tone: "teal", open: 0 };
  const open = openOnCentium(o.capacity, o.booked, o.centiumSpots, o.fromCentium ?? 0);
  return { text: `${open} open on Centium`, tone: "teal", open };
}

/** The card's flag chip: the live flags (OP1-074) first, then the old Open spots "Almost full" (80% or more). */
export function cardFlag(s: Session, issue: IssueKind | null, now: Date): { label: string; tone: "high" | "caution" | "good" } | null {
  if (s.cancelled) return { label: "Cancelled", tone: "high" };
  if (issue === "noinst") return { label: "No instructor", tone: "high" };
  if (issue === "double") return { label: "Double-booked", tone: "high" };
  if (issue === "low") return { label: "Under 40%", tone: "caution" };
  if (!isEnded(s, now) && s.maxCapacity > 0 && s.booked < s.maxCapacity && s.booked / s.maxCapacity >= 0.8) return { label: "Almost full", tone: "good" };
  return null;
}

/** The card / Price tile's price: "$12"; a class with no price or $0 reads "Free". */
export function priceText(price: string | null | undefined): string {
  const p = (price ?? "").trim();
  return !p || /^\$?0(\.0+)?$/.test(p) ? "Free" : p;
}
