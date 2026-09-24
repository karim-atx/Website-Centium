import type { HealthMetricPoint } from "../../types";
import { averageOf, HEALTH_METRIC_META, withinDays, type MetricReadings } from "./series";

// Day / Week / Month / Year, aggregated from readings that exist.
//
// WHAT THIS REPLACES, and it is worth naming precisely. MetricDetailSheet
// built its longer periods from a sine function:
//
//   const wobble = (i, spread = 0.08) => 1 + Math.sin(i * 1.7) * spread;
//   const monthOfWeekAvgs = Array.from({ length: 4 }, (_, i) => weeklyAvg * wobble(i));
//   const yearOfMonthAvgs = Array.from({ length: 12 }, (_, i) => weeklyAvg * wobble(i, 0.12));
//
// So "Month" was one week's average nudged four ways, "Year" the same nudged
// twelve, and every bar in those charts was a number nobody had measured. The
// calendar picker was worse: `valueForDate` hashed the date string and scaled
// the current reading by it, so picking any day in history produced a
// confident, stable, entirely invented figure.
//
// Buckets here hold real readings or they do not appear.

export type Period = "daily" | "weekly" | "monthly" | "yearly";

/** How far back each period looks. */
export const PERIOD_DAYS: Record<Period, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

export const PERIOD_LABEL: Record<Period, string> = {
  daily: "Today",
  weekly: "Weekly average",
  monthly: "Monthly average",
  yearly: "Yearly average",
};

export interface PeriodBucket {
  label: string;
  value: number;
  /** The days this bucket averaged, so a caller can say "1 reading" honestly. */
  readings: number;
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-US", { month: "short" })
);

/**
 * The chart's bars for a period: one per day, week or month that HAS readings.
 *
 * NO EMPTY BARS. A month with three weigh-ins draws three bars, not four with
 * one invented; a year with two months of data draws two, not twelve. Drawing
 * a zero-height bar for an unmeasured week would read as a week of zeros,
 * which for weight is nonsense and for steps is a lie.
 */
export function bucketReadings(
  readings: MetricReadings,
  period: Period,
  today: string
): PeriodBucket[] {
  if (period === "daily") return [];
  const window = withinDays(readings, PERIOD_DAYS[period], today);
  if (window.history.length === 0) return [];

  const precision = HEALTH_METRIC_META[readings.type].precision;
  const groups = new Map<string, { label: string; values: number[] }>();

  for (const point of window.history) {
    const { key, label } = bucketOf(point, period);
    const group = groups.get(key) ?? { label, values: [] };
    group.values.push(point.value);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, group]) => ({
      label: group.label,
      value: round(group.values.reduce((s, v) => s + v, 0) / group.values.length, precision),
      readings: group.values.length,
    }));
}

function bucketOf(point: HealthMetricPoint, period: Period): { key: string; label: string } {
  const [y, m, d] = point.date.split("-").map(Number);
  if (period === "weekly") {
    return {
      key: point.date,
      label: new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" }),
    };
  }
  if (period === "monthly") {
    // Calendar weeks within the month, so "Week 2" means the second week of
    // that month rather than the second bucket that happened to have data.
    const weekOfMonth = Math.floor((d - 1) / 7) + 1;
    return { key: `${y}-${String(m).padStart(2, "0")}-w${weekOfMonth}`, label: `Week ${weekOfMonth}` };
  }
  return { key: `${y}-${String(m).padStart(2, "0")}`, label: MONTH_NAMES[m - 1] };
}

/**
 * The headline figure for a period, or null when nothing was recorded in it.
 *
 * Daily is the latest reading itself, not an average of one. The rest are
 * means over the days that carry a reading — see averageOf for why the divisor
 * is days measured rather than days elapsed.
 */
export function periodValue(
  readings: MetricReadings,
  period: Period,
  today: string
): number | null {
  const window = withinDays(readings, PERIOD_DAYS[period], today);
  if (period === "daily") return window.current;
  return averageOf(window);
}

/** How many real readings back a period's figure, for an honest caption. */
export function periodReadingCount(
  readings: MetricReadings,
  period: Period,
  today: string
): number {
  return withinDays(readings, PERIOD_DAYS[period], today).history.length;
}

/**
 * The reading on one specific day, or null.
 *
 * NULL IS THE COMMON ANSWER and the screen has to be able to say it. This
 * replaces `valueForDate`, which hashed the date into a multiplier so that
 * every day in history — including days before the account existed — returned
 * a plausible number.
 */
export function valueOn(readings: MetricReadings, date: string): number | null {
  const point = readings.history.find((p) => p.date === date);
  return point ? point.value : null;
}

/** "3 readings" / "1 reading" / null when there are none. */
export function readingCountLabel(count: number): string | null {
  if (count <= 0) return null;
  return `${count} reading${count === 1 ? "" : "s"}`;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
