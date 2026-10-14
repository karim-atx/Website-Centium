// Revenue and payments (AN14), the pure part. Every figure is computed from
// recorded payments only (V6-43: "Revenue" = the sum of recorded payments;
// BACKEND_REQUIREMENTS-v6 §4.2). Nothing here estimates or invents a value:
// a payment counts in a period only when its paid date is known, weeks run
// Monday to Sunday, and anything the database does not tell us yet stays out
// of the sums (and is named as such by the screen).
//
// Today's records are the cash fields on gym_memberships and
// business_class_bookings (price_agreed, payment_status, paid_at). B8's
// business_payments ledger replaces this reader later; the shapes below are
// the ledger's (source kind, method, status, amount, paid date, due date).

import {
  addDays,
  dateOf,
  daysBetween,
  isoOf,
  mondayOf,
} from "../../pages/business-analytics/analyticsRange";

export type PayMethod = "cash" | "whish";
export type PayStatus = "pending" | "paid" | "refunded";
export type PayKind = "membership" | "class";

export interface PaymentRecord {
  /** `${kind}:${id}` */
  key: string;
  kind: PayKind;
  id: string;
  gymId: string | null;
  /** Agreed price. Null for a booking with no price agreed (it is not money owed). */
  amount: number | null;
  status: PayStatus;
  method: PayMethod;
  /**
   * When the payment was recorded (ISO timestamp). Null when unpaid, or when
   * it is paid but the database does not share the date with Analytics yet
   * (memberships: venue_members has no paid_at; `paidUndated`).
   */
  paidAt: string | null;
  /** Paid, but no paid date is readable (counted nowhere in a period). */
  paidUndated: boolean;
  /** When the purchase or booking was made (ISO timestamp). */
  createdAt: string;
  /** When it was due (YYYY-MM-DD): a membership's start, a class's date. */
  dueOn: string | null;
  /** First name, or null when the reader gives none. */
  who: string | null;
  isMinor: boolean;
  /** Plan name or class title ("Membership" when a plan has no name). */
  item: string;
  /** Memberships: active / cancelled; bookings: "booked". */
  membershipStatus: string | null;
  startedOn: string | null;
  expiresOn: string | null;
}

export interface PlanLite {
  id: string;
  name: string;
  price: number;
  billing: string;
}

// ---------- money and dates ----------

const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "$1,234" (whole dollars, the handover's money()), "−$90" for a negative. */
export function money(v: number): string {
  const n = Math.round(Math.abs(v));
  return (
    (v < 0 && n !== 0 ? "−" : "") +
    "$" +
    String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
}

/** The chart's axis format ("$1.2k"). */
export const moneyK = (v: number) =>
  "$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v));

/** The device-calendar day (YYYY-MM-DD) of an ISO timestamp. */
export const dayOf = (ts: string) => isoOf(new Date(ts));

export const dMon = (iso: string) => {
  const d = dateOf(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
export const ddd = (iso: string) => DOW[dateOf(iso).getDay()];
/** "Mon 21 Sep" */
export const dddDMon = (iso: string) => `${ddd(iso)} ${dMon(iso)}`;
/** "Saturday 1 November" */
export const longDay = (iso: string) => {
  const d = dateOf(iso);
  return `${DAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
};
/** "March 2025" */
export const monthYear = (iso: string) => {
  const d = dateOf(iso);
  return `${MONTH[d.getMonth()]} ${d.getFullYear()}`;
};

/** "6 to 12 Oct", "27 Oct to 2 Nov" */
export function spanLabel(from: string, to: string): string {
  const a = dateOf(from);
  const b = dateOf(to);
  return `${a.getDate()}${a.getMonth() !== b.getMonth() ? " " + MON[a.getMonth()] : ""} to ${b.getDate()} ${MON[b.getMonth()]}`;
}

const inRange = (day: string, from: string, to: string) =>
  day >= from && day <= to;

/** Paid with a known date. */
export const dated = (r: PaymentRecord) =>
  r.status === "paid" && !!r.paidAt && r.amount !== null;

// ---------- Overview ----------

export interface Period {
  from: string;
  to: string;
}

export interface StreamDef {
  key: PayKind;
  label: string;
}

export const STREAMS: StreamDef[] = [
  { key: "membership", label: "Memberships" },
  { key: "class", label: "Class bookings" },
];

export interface DaySeries {
  days: string[];
  total: number[];
  byKind: Record<PayKind, number[]>;
  count: number[];
}

export function dailySeries(records: PaymentRecord[], p: Period): DaySeries {
  const len = daysBetween(p.from, p.to) + 1;
  const days = Array.from({ length: len }, (_, i) => addDays(p.from, i));
  const index = new Map(days.map((d, i) => [d, i]));
  const total = new Array(len).fill(0);
  const count = new Array(len).fill(0);
  const byKind: Record<PayKind, number[]> = {
    membership: new Array(len).fill(0),
    class: new Array(len).fill(0),
  };
  for (const r of records) {
    if (!dated(r)) continue;
    const i = index.get(dayOf(r.paidAt as string));
    if (i === undefined) continue;
    total[i] += r.amount as number;
    byKind[r.kind][i] += r.amount as number;
    count[i] += 1;
  }
  return { days, total, byKind, count };
}

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Revenue collected in a period (dated, paid). */
export function collected(
  records: PaymentRecord[],
  p: Period,
  kind?: PayKind,
): number {
  let s = 0;
  for (const r of records)
    if (
      dated(r) &&
      (!kind || r.kind === kind) &&
      inRange(dayOf(r.paidAt as string), p.from, p.to)
    )
      s += r.amount as number;
  return s;
}

export function paidCount(
  records: PaymentRecord[],
  p: Period,
  kind?: PayKind,
): number {
  return records.filter(
    (r) =>
      dated(r) &&
      (!kind || r.kind === kind) &&
      inRange(dayOf(r.paidAt as string), p.from, p.to),
  ).length;
}

/** The first recorded (dated) payment day, or null. */
export function firstPaidDay(records: PaymentRecord[]): string | null {
  let first: string | null = null;
  for (const r of records)
    if (dated(r)) {
      const d = dayOf(r.paidAt as string);
      if (!first || d < first) first = d;
    }
  return first;
}

/** Paid memberships whose paid date the database does not share yet. */
export function undatedPaid(records: PaymentRecord[]): {
  n: number;
  amount: number;
} {
  const u = records.filter((r) => r.paidUndated && r.amount !== null);
  return { n: u.length, amount: sum(u.map((r) => r.amount as number)) };
}

/** "+9%" / "−4%" / "0%"; null when there is nothing to compare with. */
export function pctDelta(cur: number, prev: number): string | null {
  if (prev <= 0) return null;
  const p = Math.round(((cur - prev) / prev) * 100);
  return (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p) + "%";
}

/** "+$6" / "−$6" */
export function moneyDelta(cur: number, prev: number): string {
  const d = Math.round(cur - prev);
  return (d >= 0 ? "+" : "−") + money(Math.abs(d)).replace("−", "");
}

/** Recurring each month: active, paid, not-expired memberships of a month or longer, each price per month of its own period. */
export function recurringMonthly(
  records: PaymentRecord[],
  today: string,
): number {
  let s = 0;
  for (const r of records) {
    if (
      r.kind !== "membership" ||
      r.status !== "paid" ||
      r.membershipStatus !== "active" ||
      r.amount === null
    )
      continue;
    if (!r.startedOn || !r.expiresOn || r.expiresOn < today) continue;
    const days = daysBetween(r.startedOn, r.expiresOn);
    if (days < 28) continue;
    s += r.amount / Math.max(1, Math.round(days / 30.4375));
  }
  return s;
}

/** Active memberships today (not cancelled, not expired). */
export function activeMembers(records: PaymentRecord[], today: string): number {
  return records.filter(
    (r) =>
      r.kind === "membership" &&
      r.membershipStatus === "active" &&
      (!r.expiresOn || r.expiresOn >= today),
  ).length;
}

/** The Monday week (by its Monday) with the most collected in the period, when the period holds 2 weeks or more. */
export function bestWeek(series: DaySeries): string | null {
  if (series.days.length < 14) return null;
  const weeks = new Map<string, number>();
  series.days.forEach((d, i) =>
    weeks.set(mondayOf(d), (weeks.get(mondayOf(d)) ?? 0) + series.total[i]),
  );
  let best: string | null = null;
  let bestV = 0;
  for (const [w, v] of weeks)
    if (v > bestV) {
      best = w;
      bestV = v;
    }
  return best;
}

// ---------- Money owed ----------

export interface OwedRow {
  rec: PaymentRecord;
  /** Days past due (0 = due today, negative = not due yet). */
  overdue: number;
}

/**
 * The one "money owed" rule, shared by Revenue › Payments and Analytics ›
 * Client outcomes: unpaid, with an agreed price above zero, and for a
 * membership only while it is active. A booking with no price agreed is not
 * money owed.
 */
export function isOwed(
  r: Pick<PaymentRecord, "kind" | "status" | "amount" | "membershipStatus">,
): boolean {
  return (
    r.status === "pending" &&
    r.amount !== null &&
    r.amount > 0 &&
    (r.kind === "class" || r.membershipStatus === "active")
  );
}

/** Unpaid items with an agreed price: active memberships awaiting payment, unpaid class bookings. */
export function owed(records: PaymentRecord[], today: string): OwedRow[] {
  return records
    .filter(isOwed)
    .map((rec) => ({
      rec,
      overdue: rec.dueOn ? daysBetween(rec.dueOn, today) : 0,
    }));
}

export type OwedSort = "amount" | "overdue";
export function sortOwed(rows: OwedRow[], sort: OwedSort): OwedRow[] {
  const out = rows.slice();
  if (sort === "amount")
    out.sort(
      (a, b) =>
        (b.rec.amount ?? 0) - (a.rec.amount ?? 0) || b.overdue - a.overdue,
    );
  else
    out.sort(
      (a, b) =>
        b.overdue - a.overdue || (b.rec.amount ?? 0) - (a.rec.amount ?? 0),
    );
  return out;
}

// ---------- Renewals (Monday weeks) ----------

export interface RenewalRow {
  rec: PaymentRecord;
  /** The day the membership's period ends (gym_memberships.expires_on). */
  on: string;
}

export interface RenewalWeek {
  label: string;
  from: string;
  to: string;
  rows: RenewalRow[];
  total: number;
}

/** Active memberships whose period ends in the next 30 days (today + 29). */
export function renewals(
  records: PaymentRecord[],
  today: string,
): RenewalRow[] {
  const end = addDays(today, 29);
  return records
    .filter(
      (r) =>
        r.kind === "membership" &&
        r.membershipStatus === "active" &&
        r.expiresOn &&
        r.expiresOn >= today &&
        r.expiresOn <= end &&
        r.amount !== null,
    )
    .map((rec) => ({ rec, on: rec.expiresOn as string }))
    .sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0));
}

/**
 * The 30-day window in Monday-to-Sunday weeks (AN14-028 row 5): "This week"
 * holds today's week (renewals from today), then Week 2, 3, 4, and a fifth
 * column only when the window reaches it.
 */
export function renewalWeeks(rows: RenewalRow[], today: string): RenewalWeek[] {
  const end = addDays(today, 29);
  const weeks: RenewalWeek[] = [];
  for (
    let mon = mondayOf(today), i = 0;
    mon <= end;
    mon = addDays(mon, 7), i++
  ) {
    const from = i === 0 ? today : mon;
    const sunday = addDays(mon, 6);
    const list = rows.filter(
      (r) => r.on >= from && r.on <= sunday && r.on <= end,
    );
    weeks.push({
      label: i === 0 ? "This week" : `Week ${i + 1}`,
      from: mon,
      to: sunday,
      rows: list,
      total: sum(list.map((r) => r.rec.amount ?? 0)),
    });
  }
  return weeks;
}

/** The busiest renewal day (with 2 or more), or null. */
export function busiestDay(
  rows: RenewalRow[],
): { day: string; n: number } | null {
  const by = new Map<string, number>();
  rows.forEach((r) => by.set(r.on, (by.get(r.on) ?? 0) + 1));
  let best: { day: string; n: number } | null = null;
  for (const [day, n] of by)
    if (n >= 2 && (!best || n > best.n)) best = { day, n };
  return best;
}

// ---------- Streams ----------

export interface StreamRow {
  key: PayKind;
  label: string;
  value: number;
  details: { label: string; value: number }[];
}

export function streams(records: PaymentRecord[], p: Period): StreamRow[] {
  return STREAMS.map((s) => {
    const list = records.filter(
      (r) =>
        r.kind === s.key &&
        dated(r) &&
        inRange(dayOf(r.paidAt as string), p.from, p.to),
    );
    const by = new Map<string, number>();
    list.forEach((r) =>
      by.set(r.item, (by.get(r.item) ?? 0) + (r.amount as number)),
    );
    return {
      key: s.key,
      label: s.label,
      value: sum(list.map((r) => r.amount as number)),
      details: [...by]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    };
  });
}

export interface PlanRow {
  label: string;
  value: number;
  n: number;
  each: number | null;
}

/** Membership revenue by plan in the period (dated payments only), with class drop-ins as their own row. */
export function byPlan(records: PaymentRecord[], p: Period): PlanRow[] {
  const by = new Map<
    string,
    { value: number; n: number; prices: Set<number> }
  >();
  for (const r of records) {
    if (!dated(r) || !inRange(dayOf(r.paidAt as string), p.from, p.to))
      continue;
    const label = r.kind === "membership" ? r.item : "Drop-ins (no plan)";
    const cur = by.get(label) ?? { value: 0, n: 0, prices: new Set<number>() };
    cur.value += r.amount as number;
    cur.n += 1;
    cur.prices.add(r.amount as number);
    by.set(label, cur);
  }
  return [...by]
    .map(([label, v]) => ({
      label,
      value: v.value,
      n: v.n,
      each: v.prices.size === 1 ? [...v.prices][0] : null,
    }))
    .sort((a, b) => b.value - a.value);
}

// ---------- Transactions ----------

export type TxStatus = "Paid" | "Owed" | "Refunded";
export interface TxRow {
  rec: PaymentRecord;
  status: TxStatus;
  /** The record's day: paid date when paid and dated, else the purchase / booking day. */
  day: string;
}

export function txStatus(r: PaymentRecord): TxStatus {
  return r.status === "paid"
    ? "Paid"
    : r.status === "refunded"
      ? "Refunded"
      : "Owed";
}

/** Every record with an agreed price whose day falls in the period, newest first. */
export function transactions(records: PaymentRecord[], p: Period): TxRow[] {
  return records
    .filter((r) => r.amount !== null)
    .map((rec) => ({
      rec,
      status: txStatus(rec),
      day: dated(rec) ? dayOf(rec.paidAt as string) : dayOf(rec.createdAt),
    }))
    .filter((t) => inRange(t.day, p.from, p.to))
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

export const today = () => isoOf(new Date());

/** Two initials from a first name ("Max" → "M"), or null. */
export function initials(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  return parts
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
