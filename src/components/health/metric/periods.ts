// Calendar periods for the metric pages (health-handover.md "Page structure":
// weeks run Monday to Sunday, months and years are calendar periods, the
// period label reads "5 to 11 Oct"; averages and totals count logged days
// only). Pure: dates are local "YYYY-MM-DD" strings, like the rest of the app.

import { shiftDate } from "../../../utils/date";
import { startOfWeekISO } from "../../../utils/week";

export type MetricRange = "day" | "week" | "month" | "year";

export const RANGE_TABS: { key: MetricRange; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parts = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
};
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

export interface Period {
  range: MetricRange;
  /** First day (inclusive). */
  start: string;
  /** Last day (inclusive). */
  end: string;
}

/** The calendar period of `range` that contains `anchor`. */
export function periodOf(range: MetricRange, anchor: string): Period {
  const { y, m } = parts(anchor);
  if (range === "day") return { range, start: anchor, end: anchor };
  if (range === "week") {
    const start = startOfWeekISO(anchor);
    return { range, start, end: shiftDate(start, 6) };
  }
  if (range === "month") return { range, start: iso(y, m, 1), end: iso(y, m, daysInMonth(y, m)) };
  return { range, start: iso(y, 1, 1), end: iso(y, 12, 31) };
}

/** The anchor one period earlier (-1) or later (+1). */
export function stepAnchor(range: MetricRange, anchor: string, dir: -1 | 1): string {
  const { y, m, d } = parts(anchor);
  if (range === "day") return shiftDate(anchor, dir);
  if (range === "week") return shiftDate(anchor, 7 * dir);
  if (range === "month") {
    const nm = m + dir;
    const ny = nm < 1 ? y - 1 : nm > 12 ? y + 1 : y;
    const mm = ((nm + 11) % 12) + 1;
    return iso(ny, mm, Math.min(d, daysInMonth(ny, mm)));
  }
  return iso(y + dir, m, Math.min(d, daysInMonth(y + dir, m)));
}

/** True when `p` contains today (the "next" chevron is dimmed). */
export const isCurrentPeriod = (p: Period, today: string) => p.start <= today && today <= p.end;

/** Every day of a period, in order. */
export function daysOf(p: Period): string[] {
  const out: string[] = [];
  for (let d = p.start; d <= p.end; d = shiftDate(d, 1)) out.push(d);
  return out;
}

/** "Mon 5 Oct". */
export function dayLabel(day: string): string {
  const { y, m, d } = parts(day);
  return `${DOW_SHORT[new Date(y, m - 1, d).getDay()]} ${d} ${MONTH_SHORT[m - 1]}`;
}

/** "5 Oct". */
export const shortDate = (day: string) => {
  const { m, d } = parts(day);
  return `${d} ${MONTH_SHORT[m - 1]}`;
};

/** "Today", "Yesterday", or "Sun 4 Oct". */
export function relativeDayTitle(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === shiftDate(today, -1)) return "Yesterday";
  return dayLabel(day);
}

/**
 * The chart card's period label: Day "Mon 5 Oct", Week "5 to 11 Oct" (or
 * "28 Sep to 4 Oct" across a month), Month "October 2026", Year "2026".
 */
export function periodLabel(p: Period): string {
  const s = parts(p.start);
  const e = parts(p.end);
  if (p.range === "day") return dayLabel(p.start);
  if (p.range === "week")
    return s.m === e.m ? `${s.d} to ${e.d} ${MONTH_SHORT[e.m - 1]}` : `${s.d} ${MONTH_SHORT[s.m - 1]} to ${e.d} ${MONTH_SHORT[e.m - 1]}`;
  if (p.range === "month") return `${MONTH_LONG[s.m - 1]} ${s.y}`;
  return String(s.y);
}

/** The chart card title for the current period ("Today", "This week", "This month", "This year"), else the period label. */
export function periodTitle(p: Period, today: string): string {
  if (!isCurrentPeriod(p, today)) return periodLabel(p);
  return p.range === "day" ? "Today" : p.range === "week" ? "This week" : p.range === "month" ? "This month" : "This year";
}

export const monthShort = (m1: number) => MONTH_SHORT[m1 - 1];
export const monthLetter = (m1: number) => MONTH_LONG[m1 - 1][0];

/** Values of a day-keyed series inside a period (logged days only), in day order. */
export function valuesIn(series: Record<string, number> | { date: string; value: number }[], p: Period): { date: string; value: number }[] {
  const rows = Array.isArray(series) ? series : Object.entries(series).map(([date, value]) => ({ date, value }));
  return rows.filter((r) => r.date >= p.start && r.date <= p.end).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Year buckets: one per calendar month, average of logged days (null when none). */
export function monthlyAverages(rows: { date: string; value: number }[], year: number): (number | null)[] {
  const sums = Array.from({ length: 12 }, () => ({ s: 0, n: 0 }));
  for (const r of rows) {
    const { y, m } = parts(r.date);
    if (y !== year) continue;
    sums[m - 1].s += r.value;
    sums[m - 1].n += 1;
  }
  return sums.map((b) => (b.n ? b.s / b.n : null));
}

/** Average of logged days only; null with none. */
export const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);

/** The same period one step earlier (for "vs last week"). */
export const previousPeriod = (p: Period) => periodOf(p.range, stepAnchor(p.range, p.start, -1));
