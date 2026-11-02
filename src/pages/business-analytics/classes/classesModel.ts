import { minutesOfDay, range12 } from "../../../utils/time12";
import { DAY_LONG, DAY_SHORT, mondayIndex, startOfWeekISO } from "../../../utils/week";
import { localDayOf, shiftDate } from "../../../utils/date";
import type { ClassAnalyticsRow } from "../../../services/business-analytics/model";
import { t, tn, tx } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";

// AN3 Analytics › Classes: New vs returning, Top classes and member
// cancellations come from B15 class_analytics (CL-07); the session-level
// blocks are computed on the device from the owner's own business_classes and
// business_class_bookings rows (no reader gives sessions one by one).
// Pure: no React, no network, so node --test covers it. The handover's
// sample numbers (AnClassesV6 l.292-393) are never used; each block either
// shows what the rows say or its honest empty / early state.

export type Kind = "classes" | "gym" | "store";
export type RangeKey = "week" | "4w" | "12w" | "custom";

export interface RangeIn {
  key: RangeKey;
  from: string;
  to: string;
  compare: boolean;
}

export interface SessionIn {
  id: string;
  title: string;
  type: string | null;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM[:SS]
  end: string;
  cap: number;
  proId: string | null;
}

export interface BookingIn {
  classId: string;
  clientId: string;
  createdAt: string; // ISO timestamp
}

export interface RawData {
  /** Sessions from the look-back start up to range.to (inclusive). */
  sessions: SessionIn[];
  /** The bookings on those sessions. */
  bookings: BookingIn[];
  /** The business's first class date ever (null: none). */
  firstEver: string | null;
  /** First names of the business's accepted team, by profile id. */
  names: Record<string, string>;
  /** B15 class_analytics for the range (null: the reader is missing or not the caller's). */
  analytics: ClassAnalyticsRow[] | null;
}

// ---------------------------------------------------------------------------
// Dates and wording

const at = (iso: string) => new Date(`${iso}T00:00:00`);
export const dayCol = (iso: string) => mondayIndex(at(iso).getDay());
/** "Wed, Oct 7" */
export const dayDate = (iso: string) => at(iso).toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" });
/** "Sep 8" */
export const dayMonth = (iso: string) => at(iso).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
export const daysBetween = (a: string, b: string) => Math.round((at(b).getTime() - at(a).getTime()) / 86400000);
export const rangeDayCount = (r: { from: string; to: string }) => daysBetween(r.from, r.to) + 1;
export const prevOf = (r: { from: string; to: string }) => {
  const n = rangeDayCount(r);
  return { from: shiftDate(r.from, -n), to: shiftDate(r.from, -1) };
};
/** The earliest day any block reads: the previous period, or 4 weeks before for "Same slot, last 4 weeks". */
export const lookbackFrom = (r: { from: string; to: string }) => {
  const p = prevOf(r).from;
  const four = shiftDate(r.from, -28);
  return p < four ? p : four;
};

/** "7 AM" on the hour, else "7:30 PM" (AN3-001 O9). */
export function slotLabel(start: string): string {
  const m = minutesOfDay(start) ?? 0;
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const mer = h24 < 12 ? t("AM") : t("PM");
  return min === 0 ? `${h} ${mer}` : `${h}:${String(min).padStart(2, "0")} ${mer}`;
}
/** "9:30 AM" (minutes always, as the source's ft()). */
export function timeLabel(start: string): string {
  const m = minutesOfDay(start) ?? 0;
  const h24 = Math.floor(m / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m % 60).padStart(2, "0")} ${h24 < 12 ? t("AM") : t("PM")}`;
}
const hhmm = (t: string) => {
  const m = minutesOfDay(t) ?? 0;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "4 weeks" / "week" / "12 weeks" / "{n} days" (range length words). */
export function periodWords(r: RangeIn): string {
  if (r.key === "week") return "week";
  if (r.key === "4w") return "4 weeks";
  if (r.key === "12w") return "12 weeks";
  return plural(rangeDayCount(r), "day", "days");
}
/** "Previous 4 weeks" (S158) and its variants (the English is periodWords' words). */
export function previousLabel(r: RangeIn): string {
  if (r.key === "week") return t("Previous week");
  if (r.key === "4w") return t("Previous 4 weeks");
  if (r.key === "12w") return t("Previous 12 weeks");
  return tn(rangeDayCount(r), "Previous 1 day", "Previous {n} days");
}
/** "in 4 weeks" / "this week" / "in 12 weeks" / "in this range". */
export function inPeriod(r: RangeIn): string {
  if (r.key === "week") return t("this week");
  if (r.key === "custom") return t("in this range");
  if (r.key === "4w") return t("in 4 weeks");
  return t("in 12 weeks");
}
/** "the 4 weeks before" / "the week before" / "the {n} days before". */
export function theBefore(r: RangeIn): string {
  if (r.key === "week") return t("the week before");
  if (r.key === "4w") return t("the 4 weeks before");
  if (r.key === "12w") return t("the 12 weeks before");
  return tn(rangeDayCount(r), "the 1 day before", "the {n} days before");
}
/** "over 4 weeks" / "this week" / "in this range" (the By day caption). */
export function overPeriod(r: RangeIn): string {
  if (r.key === "week") return t("this week");
  if (r.key === "custom") return t("in this range");
  if (r.key === "4w") return t("over 4 weeks");
  return t("over 12 weeks");
}

// ---------------------------------------------------------------------------
// Colour rules (AN3-001 rows 24a / 24b): returned as role names; the
// component maps them to the theme tokens.

export type Tone = "high" | "caution" | "primary" | "deep";
export const pctTone = (p: number): Tone => (p < 40 ? "high" : p < 70 ? "caution" : p >= 90 ? "deep" : "primary");
export type InkTone = "high" | "caution" | "ink";
export const pctInk = (p: number): InkTone => (p < 40 ? "high" : p < 70 ? "caution" : "ink");

// ---------------------------------------------------------------------------
// The model

export interface Session extends SessionIn {
  booked: number;
  pct: number; // 0-100, rounded
  full: boolean;
  who: string | null; // instructor first name
}

export interface Row {
  key: string;
  label: string;
  sub: string;
  pct: number;
  sessions: number;
  booked: number;
  spots: number;
  initial?: string;
}

export interface Slot {
  key: string; // "<col>|HH:MM"
  col: number;
  start: string; // HH:MM
  label: string; // "Tue 6 PM"
  sessions: Session[];
  pct: number;
}

export interface HeatCell {
  key: string;
  pct: number | null;
}
export interface HeatRow {
  start: string;
  label: string;
  cells: HeatCell[];
  /** A "Full day" row with no slots (lighter dashes, source emptyRow). */
  filler?: boolean;
}

export interface Band {
  short: string;
  long: string;
  tone: "high" | "caution" | "primary" | "pdark" | "full";
  sessions: Session[];
}

export interface ClassesModel {
  state: "empty" | "early" | "data";
  /** Only future classes: the date of the first one (AN3-062 O1). */
  upcomingFirst: string | null;
  sessions: Session[]; // in range, date then start
  booked: number;
  offered: number;
  pct: number;
  /** Previous-period fill, null when there is none or comparison is off / early. */
  prevPct: number | null;
  /** Previous period had sessions (for the early legend wording). */
  prevExists: boolean;
  deltaPts: number | null;
  byType: Row[];
  byInstructor: Row[];
  bands: Band[];
  // Bookings
  bookingsN: number;
  prevBookingsN: number | null;
  bookingsDeltaPct: number | null;
  weeks: { label: string; n: number; ghost: number | null }[];
  dow: { label: string; n: number; avg: number }[];
  /** class_analytics: first-ever bookings and the rest (null: no reader). */
  newCount: number | null;
  returningCount: number | null;
  /** class_analytics: bookings the member cancelled (not the venue). */
  cancellations: number | null;
  lead: { label: string; pct: number }[];
  top: { title: string; sub: string; n: number }[];
  // Peak times
  slots: Slot[];
  heat: HeatRow[];
  firstEver: string | null;
  totalSessionsEver: number;
}

const DEFAULT_ROWS = ["07:00", "09:00", "12:00", "18:00", "19:30"];
export const FULL_DAY_ROWS = ["06:00", "07:00", "08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "17:00", "18:00", "19:30", "20:30"];

const avg = (xs: Session[]) => {
  const spots = xs.reduce((s, x) => s + x.cap, 0);
  const booked = xs.reduce((s, x) => s + x.booked, 0);
  return spots > 0 ? Math.round((booked / spots) * 100) : 0;
};

export function computeModel(raw: RawData, range: RangeIn): ClassesModel {
  // Bookings per session.
  const perClass = new Map<string, number>();
  for (const b of raw.bookings) perClass.set(b.classId, (perClass.get(b.classId) ?? 0) + 1);

  const decorate = (s: SessionIn): Session => {
    const booked = perClass.get(s.id) ?? 0;
    const cap = Math.max(1, s.cap);
    return { ...s, booked, pct: Math.round((Math.min(booked, cap) / cap) * 100), full: booked >= cap, who: s.proId ? raw.names[s.proId] ?? null : null };
  };
  const all = raw.sessions.map(decorate).sort((a, b) => (a.date === b.date ? hhmm(a.start).localeCompare(hhmm(b.start)) : a.date.localeCompare(b.date)));
  const inR = (d: string, r: { from: string; to: string }) => d >= r.from && d <= r.to;
  const sessions = all.filter((s) => inR(s.date, range));
  const prev = prevOf(range);
  const prevSessions = all.filter((s) => inR(s.date, prev));

  const booked = sessions.reduce((s, x) => s + x.booked, 0);
  const offered = sessions.reduce((s, x) => s + x.cap, 0);
  const pct = offered > 0 ? Math.round((booked / offered) * 100) : 0;

  // Early rule (HANDOVER §3, AN3-062 row 1): under 2 weeks of classes OR
  // under 10 records (sessions in the range).
  const firstPast = raw.firstEver && raw.firstEver <= range.to ? raw.firstEver : null;
  const weeksOfClasses = firstPast ? daysBetween(firstPast, range.to) + 1 : 0;
  const state: ClassesModel["state"] = sessions.length === 0 ? "empty" : weeksOfClasses < 14 || sessions.length < 10 ? "early" : "data";
  const upcomingFirst = sessions.length === 0 && raw.firstEver && raw.firstEver > range.to ? raw.firstEver : null;

  const prevExists = prevSessions.length > 0;
  const compare = range.compare && state === "data" && prevExists;
  const prevPct = compare ? avg(prevSessions) : null;
  const deltaPts = prevPct === null ? null : pct - prevPct;

  // Breakdowns, highest first (AN3-001 rows 23-24).
  const group = (key: (s: Session) => string | null, label: (k: string, xs: Session[]) => string) => {
    const m = new Map<string, Session[]>();
    for (const s of sessions) {
      const k = key(s);
      if (k === null) continue;
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()]
      .map(([k, xs]) => ({
        key: k,
        label: label(k, xs),
        sub: tn(xs.length, "1 session", "{n} sessions"),
        pct: avg(xs),
        sessions: xs.length,
        booked: xs.reduce((s, x) => s + x.booked, 0),
        spots: xs.reduce((s, x) => s + x.cap, 0),
      }))
      .sort((a, b) => b.pct - a.pct || b.sessions - a.sessions || a.label.localeCompare(b.label));
  };
  const byType = group(
    (s) => (s.type?.trim() ? s.type.trim() : "Other"),
    (k) => (k === "Other" ? t("Other") : k)
  );
  const byInstructor = group(
    (s) => (s.proId && raw.names[s.proId] ? s.proId : null),
    (k) => raw.names[k]
  ).map((r) => ({ ...r, initial: (r.label[0] ?? "").toUpperCase() }));

  // How sessions are filled (AN3-001 row 25).
  const bandOf = (s: Session) => (s.full ? 4 : s.pct >= 90 ? 3 : s.pct >= 70 ? 2 : s.pct >= 40 ? 1 : 0);
  const bands: Band[] = [
    { short: t("Under 40"), long: t("Under 40% booked"), tone: "high", sessions: [] },
    { short: t("40 to 69"), long: t("40 to 69% booked"), tone: "caution", sessions: [] },
    { short: t("70 to 89"), long: t("70 to 89% booked"), tone: "primary", sessions: [] },
    { short: t("90 to 99"), long: t("90 to 99% booked"), tone: "pdark", sessions: [] },
    { short: tx("Full", "class"), long: t("Full, every spot booked"), tone: "full", sessions: [] },
  ];
  for (const s of sessions) bands[bandOf(s)].sessions.push(s);
  for (const b of bands) b.sessions.sort((a, c) => a.pct - c.pct || a.date.localeCompare(c.date));

  // Bookings, by class day (bookings on the sessions in the range).
  const ids = new Set(sessions.map((s) => s.id));
  const prevIds = new Set(prevSessions.map((s) => s.id));
  const inRange = raw.bookings.filter((b) => ids.has(b.classId));
  const bookingsN = inRange.length;
  const prevBookingsN = range.compare && prevExists ? raw.bookings.filter((b) => prevIds.has(b.classId)).length : null;
  const bookingsDeltaPct = state === "data" && prevBookingsN !== null && prevBookingsN > 0 ? Math.round(((bookingsN - prevBookingsN) / prevBookingsN) * 100) : null;

  // Over time: Monday weeks in the range; the dashed line is the previous
  // period's Monday weeks, aligned from the last week back.
  const weekStarts = (r: { from: string; to: string }) => {
    const out: string[] = [];
    for (let w = startOfWeekISO(r.from); w <= r.to; w = shiftDate(w, 7)) out.push(w);
    return out;
  };
  const countWeek = (xs: Session[], w: string) => xs.filter((s) => s.date >= w && s.date <= shiftDate(w, 6)).reduce((n, s) => n + s.booked, 0);
  const cur = weekStarts(range);
  const prv = range.compare && prevExists ? weekStarts(prev) : [];
  const weeks = cur.map((w, i) => {
    const j = prv.length - (cur.length - i);
    return {
      label: dayMonth(w < range.from ? range.from : w),
      n: countWeek(sessions, w),
      ghost: j >= 0 && j < prv.length ? countWeek(prevSessions, prv[j]) : null,
    };
  });

  // By day: average bookings per occurrence of each weekday in the range.
  const occurrences = Array(7).fill(0);
  for (let d = range.from; d <= range.to; d = shiftDate(d, 1)) occurrences[dayCol(d)] += 1;
  const dowSum = Array(7).fill(0);
  for (const s of sessions) dowSum[dayCol(s.date)] += s.booked;
  const dow = DAY_SHORT.map((label, i) => {
    const a = occurrences[i] ? dowSum[i] / occurrences[i] : 0;
    return { label: t(label), n: dowSum[i], avg: a };
  });

  // New vs returning and cancellations (B15 class_analytics): a booking is
  // new when it was the person's first ever with the business.
  const an = raw.analytics;
  const newCount = an ? an.reduce((n, x) => n + x.newClients, 0) : null;
  const returningCount = an ? an.reduce((n, x) => n + x.returningClients, 0) : null;
  const cancellations = an ? an.reduce((n, x) => n + x.cancellations, 0) : null;

  // How far ahead: calendar days from the booking to the class day (a
  // booking made on or after the class day counts as same day).
  const classDay = new Map(sessions.map((s) => [s.id, s.date]));
  const buckets = [0, 0, 0, 0];
  for (const b of inRange) {
    const d = classDay.get(b.classId);
    if (!d) continue;
    const days = daysBetween(localDayOf(b.createdAt), d);
    buckets[days <= 0 ? 0 : days <= 2 ? 1 : days <= 7 ? 2 : 3] += 1;
  }
  const lead = [t("Same day"), t("1 to 2 days"), t("3 to 7 days"), t("Over a week")].map((label, i) => ({
    label,
    pct: bookingsN ? Math.round((buckets[i] / bookingsN) * 100) : 0,
  }));

  // Top classes by bookings (class_analytics, one row per type + title,
  // summed per title); the instructors' first names from the sessions.
  const byTitle = new Map<string, { sessions: number; n: number }>();
  for (const x of an ?? []) {
    const tt = byTitle.get(x.title) ?? { sessions: 0, n: 0 };
    byTitle.set(x.title, { sessions: tt.sessions + x.sessions, n: tt.n + x.bookings });
  }
  const top = [...byTitle.entries()]
    .map(([title, tt]) => {
      const who = [...new Set(sessions.filter((x) => x.title === title).map((x) => x.who).filter(Boolean))] as string[];
      return { title, sub: [tn(tt.sessions, "1 session", "{n} sessions"), who.join(t(", "))].filter(Boolean).join(" · "), n: tt.n };
    })
    .sort((a, b) => b.n - a.n || a.title.localeCompare(b.title))
    .slice(0, 3);

  // Peak times: weekday × start-time slots.
  const slotMap = new Map<string, Session[]>();
  for (const s of sessions) {
    const k = `${dayCol(s.date)}|${hhmm(s.start)}`;
    slotMap.set(k, [...(slotMap.get(k) ?? []), s]);
  }
  const slots: Slot[] = [...slotMap.entries()].map(([key, xs]) => {
    const [c, st] = key.split("|");
    const col = Number(c);
    return { key, col, start: st, label: `${t(DAY_SHORT[col])} ${slotLabel(st)}`, sessions: xs, pct: avg(xs) };
  });
  const usedStarts = [...new Set(slots.map((s) => s.start))].sort();
  const rowStarts = usedStarts.length ? usedStarts : DEFAULT_ROWS;
  const heat = rowStarts.map((start) => ({
    start,
    label: slotLabel(start),
    cells: Array.from({ length: 7 }, (_, col) => {
      const sl = slotMap.get(`${col}|${start}`);
      return { key: `${col}|${start}`, pct: sl ? avg(sl) : null };
    }),
  }));

  return {
    state,
    upcomingFirst,
    sessions,
    booked,
    offered,
    pct,
    prevPct,
    prevExists,
    deltaPts,
    byType,
    byInstructor,
    bands,
    bookingsN,
    prevBookingsN,
    bookingsDeltaPct,
    weeks,
    dow,
    newCount,
    returningCount,
    cancellations,
    lead,
    top,
    slots,
    heat,
    firstEver: raw.firstEver,
    // Exact only when the business's first class is inside the fetched window.
    totalSessionsEver: !raw.firstEver || raw.firstEver >= lookbackFrom(range) ? all.filter((s) => s.date <= range.to).length : Number.POSITIVE_INFINITY,
  };
}

/** The heatmap rows with "Full day" on: the used rows plus the day's usual hours. */
export function fullDayRows(heat: HeatRow[]): HeatRow[] {
  const have = new Map(heat.map((r) => [r.start, r]));
  const starts = [...new Set([...heat.map((r) => r.start), ...FULL_DAY_ROWS])].sort();
  return starts.map(
    (start) => have.get(start) ?? { start, label: slotLabel(start), filler: true, cells: Array.from({ length: 7 }, (_, col) => ({ key: `${col}|${start}`, pct: null })) }
  );
}

/** "Same slot, last 4 weeks" for one session (AN3-001 S4). */
export function sameSlotHistory(s: SessionIn, raw: RawData, perClass: (id: string) => number): string {
  const from = shiftDate(s.date, -28);
  const xs = raw.sessions
    .filter((x) => x.id !== s.id && x.title === s.title && x.date >= from && x.date < s.date && dayCol(x.date) === dayCol(s.date) && hhmm(x.start) === hhmm(s.start))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!xs.length) return t("First session");
  const fills = xs.map((x) => {
    const cap = Math.max(1, x.cap);
    const b = perClass(x.id);
    return { full: b >= cap, pct: Math.round((Math.min(b, cap) / cap) * 100) };
  });
  if (fills.every((f) => f.full)) return tn(fills.length, "Full {n} of {n} weeks", "Full {n} of {n} weeks");
  return fills.map((f) => `${f.pct}%`).join(t(", "));
}

/** Session time span, 12-hour ("7:30 to 8:15 AM"). */
export const span12 = (s: SessionIn) => range12(s.start, s.end);
/** "Tuesday 6 PM" */
export const slotLong = (sl: Slot) => `${t(DAY_LONG[sl.col])} ${slotLabel(sl.start)}`;

/** Export CSV rows (AN3-001 S3): by type, by session, by instructor for the range. */
export function exportRows(m: ClassesModel, range: RangeIn): (string | number)[][] {
  const rows: (string | number)[][] = [[t("Classes"), t("{from} to {to}", { from: range.from, to: range.to })]];
  rows.push([]);
  rows.push([t("By type"), t("Sessions"), t("Booked"), t("Spots"), t("Fill %")]);
  for (const r of m.byType) rows.push([r.label, r.sessions, r.booked, r.spots, r.pct]);
  rows.push([]);
  rows.push([t("By session"), t("Date"), t("Time"), t("Instructor"), t("Booked"), t("Spots"), t("Fill %")]);
  for (const s of m.sessions) rows.push([s.title, s.date, span12(s), s.who ?? "", s.booked, s.cap, s.pct]);
  rows.push([]);
  rows.push([t("By instructor"), t("Sessions"), t("Booked"), t("Spots"), t("Fill %")]);
  for (const r of m.byInstructor) rows.push([r.label, r.sessions, r.booked, r.spots, r.pct]);
  return rows;
}
