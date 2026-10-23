// Market + Share 3.0 · W5 · the professional calendar's hired class events
// (P-CA; PLAN §2.2 DB9, api.md "Calendar", types.ts HiredClassEvent) and the calendar sync notices (on hire, gym edits, gym
// cancels, role removed: the member inbox kinds of Database 20261210600000).
// Pure parsers and display rules (no Supabase import, so node:test runs them).
// Dates are month first (D-02: "Mon, Nov 2"), times 12-hour (D-03:
// "7:00 to 7:30 AM"), weekdays ISO (1 = Monday … 7 = Sunday).

import { num, rows, str } from "../market/parse";
import { formatMinutes12, minutesOfDay, rangeMinutes12 } from "../../utils/time12";

export type HiredStatus = "scheduled" | "cancelled" | "completed";
export type UpdatedField = "time" | "day" | "location";

/** One hired class session on the professional's calendar (my_calendar, DB9). */
export interface HiredClassEvent {
  classSessionId: string;
  hireId: string | null;
  classSeriesId: string | null;
  businessId: string | null;
  businessName: string;
  title: string;
  /** The hire's role ("HIIT instructor"), when the reader sends it. */
  roleTitle: string | null;
  location: string | null;
  /** The server's own words ("Every Mon and Wed"), when it sends them. */
  recurrenceLabel: string | null;
  /** ISO weekdays of the series. */
  weekdays: number[];
  bookedCount: number | null;
  capacity: number | null;
  payPerSession: number | null;
  /** class_series.colour (D-40); null = the reader sent none. */
  colour: string | null;
  status: HiredStatus;
  updatedFields: UpdatedField[];
  updatedAt: string | null;
  /** Local YYYY-MM-DD, "HH:MM", "HH:MM". */
  date: string;
  start: string;
  end: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const hhmm = (v: unknown): string | null => {
  const m = minutesOfDay(str(v));
  return m === null ? null : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};
const STATUSES: HiredStatus[] = ["scheduled", "cancelled", "completed"];
const FIELDS: UpdatedField[] = ["time", "day", "location"];

/** ISO weekday from 1–7 (or 0 read as Sunday, types.ts's 0–6 reading); null when unreadable. */
export function isoWeekday(v: unknown): number | null {
  const n = num(v);
  if (n === null || !Number.isInteger(n) || n < 0 || n > 7) return null;
  return n === 0 ? 7 : n;
}

const list = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.startsWith("{")) return v.slice(1, -1).split(",").filter(Boolean);
  return [];
};

/** One my_calendar row as a hired class event, or null (a repo calendar item, or unreadable). */
export function parseHiredEvent(r: Record<string, unknown>): HiredClassEvent | null {
  const session = str(r.class_session_id);
  if (!session) return null;
  let date: string | null = null;
  let start: string | null = null;
  let end: string | null = null;
  const s = str(r.starts_at) ? new Date(r.starts_at as string) : null;
  const e = str(r.ends_at) ? new Date(r.ends_at as string) : null;
  if (s && !Number.isNaN(s.getTime())) {
    date = localDate(s);
    start = localTime(s);
    if (e && !Number.isNaN(e.getTime())) end = localTime(e);
  } else {
    date = str(r.date) && /^\d{4}-\d{2}-\d{2}/.test(r.date as string) ? (r.date as string).slice(0, 10) : null;
    start = hhmm(r.start_time);
    end = hhmm(r.end_time);
    const dur = num(r.duration_min);
    if (!end && start && dur !== null) {
      const m = (minutesOfDay(start) ?? 0) + dur;
      end = `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
    }
  }
  if (!date || !start) return null;
  const status = STATUSES.includes(r.status as HiredStatus) ? (r.status as HiredStatus) : "scheduled";
  return {
    classSessionId: session,
    hireId: str(r.hire_id),
    classSeriesId: str(r.class_series_id),
    businessId: str(r.business_id),
    businessName: str(r.business_name) ?? "",
    title: str(r.title) ?? str(r.class_title) ?? "",
    roleTitle: str(r.role_title),
    location: str(r.location),
    recurrenceLabel: str(r.recurrence_label),
    weekdays: [...new Set(list(r.weekdays).map(isoWeekday).filter((d): d is number => d !== null))].sort((a, b) => a - b),
    bookedCount: num(r.booked_count),
    capacity: num(r.capacity),
    payPerSession: num(r.pay_per_session),
    colour: str(r.colour),
    status,
    updatedFields: list(r.updated_fields).filter((f): f is UpdatedField => FIELDS.includes(f as UpdatedField)),
    updatedAt: str(r.updated_at),
    date,
    start,
    end: end ?? start,
  };
}

/** my_calendar answers repo calendar items + hired class events: the hired ones only (the repo items keep their live readers). */
export function parseMyCalendar(data: unknown): HiredClassEvent[] {
  return rows(data)
    .map(parseHiredEvent)
    .filter((e): e is HiredClassEvent => !!e);
}



// ---------------------------------------------------------------------------
// Class colour (D-40): class_series.colour when the reader sends one; until
// then (and for live assigned classes, which have none) a fixed palette, one
// colour per series, picked by a stable hash of its id so a series keeps its
// colour on every screen and every reload. The palette is the board's hired
// samples (Cedar #4F8F8A, Hamra #667BB1, tokens.json calendar.hiredSample)
// plus the third segment step ink (#5A859E); step 1 (#7D67D9) is left out
// because it reads as the own-session lavender (#7D6BB5).

export const CLASS_PALETTE = ["#4F8F8A", "#667BB1", "#5A859E"] as const;

/** A stable index into the palette for a series / session id. */
export function paletteIndex(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % CLASS_PALETTE.length;
}

/** The class's colour: the server's hex, else the palette colour for its key. */
export function classColour(colour: string | null | undefined, key: string): string {
  if (colour && /^#[0-9a-f]{6}$/i.test(colour)) return colour.toUpperCase();
  return CLASS_PALETTE[paletteIndex(key)];
}

/** The event sheet's ticket header [fill, ink] for a class colour (P-CA.4: #4F8F8A → #E6F1EF / #2F5F58). */
export function ticketTones(colour: string): { bg: string; ink: string } {
  const drawn: Record<string, { bg: string; ink: string }> = {
    "#4F8F8A": { bg: "#E6F1EF", ink: "#2F5F58" },
    "#667BB1": { bg: "#ECEFF5", ink: "#3F4F7E" },
  };
  const c = colour.toUpperCase();
  if (drawn[c]) return drawn[c];
  const n = parseInt(c.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const hex = (f: (v: number) => number) => "#" + ch.map((v) => Math.round(f(v)).toString(16).padStart(2, "0")).join("").toUpperCase();
  // The drawn pair, as a rule: the fill 88% toward white, the ink 38% toward black.
  return { bg: hex((v) => v + (255 - v) * 0.88), ink: hex((v) => v * 0.62) };
}

// ---------------------------------------------------------------------------
// Words

const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_PLURAL = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO weekday of a YYYY-MM-DD date. */
export function weekdayOf(iso: string): number {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return ((d.getDay() + 6) % 7) + 1;
}

/** "Mon, Nov 2" (D-02). */
export function dayDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${WEEKDAY[(d.getDay() + 6) % 7]}, ${MONTH[d.getMonth()]} ${d.getDate()}`;
}

/** "Mon", "Mon and Wed", "Mon, Wed and Fri" (Monday first). */
export function dayList(days: readonly number[], plural = false): string {
  const names = [...new Set(days.filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b).map((d) => (plural ? WEEKDAY_PLURAL : WEEKDAY)[d - 1]);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Repeats: the server's label, else "Every Mon and Wed" from the weekdays; null when neither. */
export function recurrenceText(label: string | null, weekdays: readonly number[]): string | null {
  if (label) return label;
  const d = dayList(weekdays);
  return d ? `Every ${d}` : null;
}

/** "Mon, Nov 2 · 7:00 to 7:30 AM". */
export function whenText(date: string, start: string, end: string): string {
  const a = minutesOfDay(start);
  const b = minutesOfDay(end);
  const time = a === null ? "" : b === null || b === a ? formatMinutes12(a) : rangeMinutes12(a, b);
  return [dayDate(date), time].filter(Boolean).join(" · ");
}

/** "30 min" (minutes, as the board writes them); null when unreadable. */
export function durationText(start: string, end: string): string | null {
  const a = minutesOfDay(start);
  const b = minutesOfDay(end);
  if (a === null || b === null) return null;
  const m = (b - a + 1440) % 1440;
  return m > 0 ? `${m} min` : null;
}

/** "12 of 16"; the count alone without a capacity; null without a count. */
export function bookedText(booked: number | null, capacity: number | null): string | null {
  if (booked === null) return null;
  return capacity !== null ? `${booked} of ${capacity}` : String(booked);
}

/** "$70 · as agreed" (pay is arranged between the professional and the gym; cash). */
export function payText(pay: number | null): string | null {
  if (pay === null) return null;
  const v = Number.isInteger(pay) ? String(pay) : pay.toFixed(2);
  return `$${v} · as agreed`;
}

// ---------------------------------------------------------------------------
// Sync notices: the member inbox's calendar kinds (Database 20261210600000,
// the payload table; read with my_notifications(p_kinds = SYNC_KINDS) by
// services/pro/notifications fetchMemberInbox). professional_notifications is
// NOT where these live: its kind enum is request / to_review / update, and
// notify_member() writes member_notification_kind rows to `notifications`.
// The documented subject and payload per kind:
// - classes_added (hire; business_name, role_title, session_count,
//   first_starts_at): the strip on hire;
// - class_changed (class_series; business_name, class_title, starts_at,
//   ends_at, previous_starts_at): the edit card;
// - class_cancelled (class_session; business_name, class_title, starts_at,
//   reason): the cancel strip (the lead keeps class_cancelled a CLIENT kind
//   for the member bell; a professional's own inbox reads it here only);
// - removed_from_team (business; business_name, role_title, ended_on).
// Timestamps are read on the device's clock (local date and time).

export type SyncKind = "added" | "changed" | "cancelled" | "removed";

/** member_notification_kind → the calendar's notice. */
export const SYNC_KINDS: Readonly<Record<string, SyncKind>> = {
  classes_added: "added",
  class_changed: "changed",
  class_cancelled: "cancelled",
  removed_from_team: "removed",
};

export interface SyncNotice {
  id: string;
  kind: SyncKind;
  createdAt: string;
  hireId: string | null;
  sessionId: string | null;
  seriesId: string | null;
  businessName: string | null;
  classTitle: string | null;
  /** Local YYYY-MM-DD of the session (cancelled). */
  date: string | null;
  /** ISO weekday of the new start (changed). */
  weekday: number | null;
  /** Local "HH:MM": the previous start and the new start (changed). */
  fromTime: string | null;
  toTime: string | null;
  count: number | null;
  /** Local YYYY-MM-DD of the first class (added). */
  startsOn: string | null;
}

/** The inbox fields read here (services/notifications MemberNotification, structurally). */
export interface NotificationLike {
  id: string;
  kind: string;
  subjectType?: string | null;
  subjectId?: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

const instant = (v: unknown): Date | null => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** An unread calendar notice; null for any other kind (or a row already read). */
export function parseNotice(n: NotificationLike): SyncNotice | null {
  const kind = SYNC_KINDS[n.kind];
  if (!kind || n.readAt) return null;
  const p = n.payload ?? {};
  const subject = (type: string) => (n.subjectType === type ? str(n.subjectId) : null);
  const starts = instant(p.starts_at);
  const before = instant(p.previous_starts_at);
  const first = instant(p.first_starts_at);
  const count = num(p.session_count);
  return {
    id: n.id,
    kind,
    createdAt: n.createdAt,
    hireId: subject("hire"),
    sessionId: subject("class_session"),
    seriesId: subject("class_series"),
    businessName: str(p.business_name),
    classTitle: str(p.class_title),
    date: kind === "cancelled" && starts ? localDate(starts) : null,
    weekday: kind === "changed" && starts ? ((starts.getDay() + 6) % 7) + 1 : null,
    fromTime: kind === "changed" && before ? localTime(before) : null,
    toTime: kind === "changed" && starts ? localTime(starts) : null,
    count: count !== null && Number.isInteger(count) && count > 0 ? count : null,
    startsOn: first ? localDate(first) : null,
  };
}

/** The strip (latest unread on hire / cancel / removal) and the notification card (latest unread edit). */
export function pickNotices(list: readonly NotificationLike[]): { strip: SyncNotice | null; note: SyncNotice | null } {
  const notices = list
    .map(parseNotice)
    .filter((n): n is SyncNotice => !!n)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return { strip: notices.find((n) => n.kind !== "changed") ?? null, note: notices.find((n) => n.kind === "changed") ?? null };
}

export type StripTone = "success" | "error" | "neutral";

/**
 * The P-CA strip for a notice, with what the events can fill in when the
 * payload lacks it (the class count and first date of that hire). Null when
 * there is too little to say anything true.
 */
export function stripOf(n: SyncNotice, events: readonly HiredClassEvent[], today: string): { text: string; tone: StripTone; action: "View" | "OK"; jumpTo: string | null } | null {
  const ofHire = n.hireId ? events.filter((e) => e.hireId === n.hireId) : [];
  const ofSession = n.sessionId ? events.find((e) => e.classSessionId === n.sessionId) ?? null : null;
  const gym = n.businessName ?? ofHire[0]?.businessName ?? ofSession?.businessName ?? null;
  if (n.kind === "added") {
    const future = ofHire.filter((e) => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
    const count = n.count ?? (ofHire.length ? new Set(ofHire.map((e) => e.classSeriesId ?? e.classSessionId)).size : null);
    const from = n.startsOn ?? future[0]?.date ?? null;
    if (!count || !gym) return null;
    return { text: addedStrip(count, gym, from), tone: "success", action: "View", jumpTo: from };
  }
  if (n.kind === "cancelled") {
    const title = n.classTitle ?? ofSession?.title ?? null;
    const date = n.date ?? ofSession?.date ?? null;
    if (!gym || !title) return null;
    return { text: cancelledStrip(gym, title, date), tone: "error", action: "OK", jumpTo: null };
  }
  if (n.kind === "removed") {
    if (!gym) return null;
    return { text: removedStrip(gym), tone: "neutral", action: "OK", jumpTo: null };
  }
  return null;
}

/** P-CA.5.1: "3 classes added to your calendar · Cedar Fitness, from Mon, Nov 2". */
export function addedStrip(count: number, gym: string, from: string | null): string {
  const what = `${count} ${count === 1 ? "class" : "classes"} added to your calendar · ${gym}`;
  return from ? `${what}, from ${dayDate(from)}` : what;
}

/** P-CA.5.3: "Cedar Fitness cancelled Core 20 on Fri, Nov 6". */
export function cancelledStrip(gym: string, title: string, date: string | null): string {
  return date ? `${gym} cancelled ${title} on ${dayDate(date)}` : `${gym} cancelled ${title}`;
}

/** P-CA.5.4. */
export const removedStrip = (gym: string): string => `Your role at ${gym} ended. Future classes were removed. Past ones stay as history.`;

/** P-CA.5.2: the notification card's title and body; null when there is too little to say. */
export function editedNote(n: SyncNotice, events: readonly HiredClassEvent[]): { title: string; body: string } | null {
  const ofSession = n.seriesId ? (events.find((e) => e.classSeriesId === n.seriesId) ?? null) : n.sessionId ? (events.find((e) => e.classSessionId === n.sessionId) ?? null) : null;
  const gym = n.businessName ?? ofSession?.businessName ?? null;
  const title = n.classTitle ?? ofSession?.title ?? null;
  if (!gym || !title) return null;
  const a = minutesOfDay(n.fromTime);
  const b = minutesOfDay(n.toTime);
  if (a !== null && b !== null) {
    const on = n.weekday ? ` on ${WEEKDAY_PLURAL[n.weekday - 1]}` : "";
    return { title: "Class time changed", body: `${gym} moved ${title}${on} from ${rangeMinutes12(a, b)}. Your calendar is updated.` };
  }
  return { title: "Class changed", body: `${gym} changed ${title}. Your calendar is updated.` };
}

/** The card's age: "now" (the board), then "5 min", "3 h", "Oct 21". */
export function ageText(createdAt: string, now: Date): string {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, (now.getTime() - t) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  const d = new Date(t);
  return `${MONTH[d.getMonth()]} ${d.getDate()}`;
}
