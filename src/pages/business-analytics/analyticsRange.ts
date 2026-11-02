// The Analytics range (AN5-001 rows 6-7, AN5-061): This week / 4 weeks /
// 12 weeks / Custom, and the line under the tabs: "{from} to {to}, compared
// with the {n} weeks before". Weeks start on Monday (user rule). Dates are
// ISO "YYYY-MM-DD" on this device's calendar; the readers that take a range
// (BU5-13 p_from / p_to / p_compare) get exactly these.

import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";

export type RangeKey = "week" | "4w" | "12w" | "custom";

export interface AnalyticsRange {
  key: RangeKey;
  from: string;
  to: string;
  /** Compare with the same number of days immediately before (the Custom sheet's toggle; on for the presets). */
  compare: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dateOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso: string, n: number) => {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
/** Whole days from a to b (b - a). */
export const daysBetween = (a: string, b: string) => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86_400_000);

/** Monday of the week holding `iso`. */
export function mondayOf(iso: string): string {
  const d = dateOf(iso);
  const back = (d.getDay() + 6) % 7;
  return addDays(iso, -back);
}

/** The preset ranges, ending today (This week: Monday to Sunday of this week). */
export function presetRange(key: Exclude<RangeKey, "custom">, today: string = isoOf(new Date())): AnalyticsRange {
  if (key === "week") {
    const from = mondayOf(today);
    return { key, from, to: addDays(from, 6), compare: true };
  }
  const days = key === "4w" ? 28 : 84;
  return { key, from: addDays(today, -(days - 1)), to: today, compare: true };
}

/** Today (YYYY-MM-DD) on a timezone's calendar; the device's day when the zone is unknown. */
export function todayIn(timeZone: string | null, now: Date = new Date()): string {
  if (!timeZone) return isoOf(now);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return isoOf(now);
  }
}

/**
 * The range as days on the business's calendar, for readers that count days
 * in the business's timezone (store_sales_summary, store_top_products). A
 * preset ends on the business's today rather than the device's; Custom dates
 * are the days the user picked, so they stay as they are.
 */
export function businessRange(r: AnalyticsRange, timeZone: string | null, now: Date = new Date()): AnalyticsRange {
  if (r.key === "custom") return r;
  return { ...presetRange(r.key, todayIn(timeZone, now)), compare: r.compare };
}

/** "Sep 8", or "Sep 8, 2025" when the year differs from `today`'s. */
export function dayMonth(iso: string, today: string = isoOf(new Date())): string {
  const d = dateOf(iso);
  const sameYear = d.getFullYear() === dateOf(today).getFullYear();
  return d.toLocaleDateString(appLocale("en-US"), sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** The previous period: the same number of days immediately before. */
export function previousOf(r: AnalyticsRange): { from: string; to: string } {
  const len = daysBetween(r.from, r.to) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
}

/** The line under the range tabs. */
export function rangeLine(r: AnalyticsRange, today: string = isoOf(new Date())): string {
  const span = t("{from} to {to}", { from: dayMonth(r.from, today), to: dayMonth(r.to, today) });
  if (!r.compare) return span;
  if (r.key === "week") return t("{span}, compared with the week before", { span });
  if (r.key === "4w") return t("{span}, compared with the 4 weeks before", { span });
  if (r.key === "12w") return t("{span}, compared with the 12 weeks before", { span });
  const p = previousOf(r);
  return t("{span}, compared with {from} to {to}", { span, from: dayMonth(p.from, today), to: dayMonth(p.to, today) });
}

/** Words for the range inside a sentence ("the last 4 weeks"). */
export function rangeWords(r: AnalyticsRange, today: string = isoOf(new Date())): string {
  if (r.key === "week") return t("this week");
  if (r.key === "4w") return t("the last 4 weeks");
  if (r.key === "12w") return t("the last 12 weeks");
  return t("{from} to {to}", { from: dayMonth(r.from, today), to: dayMonth(r.to, today) });
}

/** The Custom sheet's selection: the two ends and which one the next tap sets. */
export interface RangePick {
  from: string;
  to: string | null;
  end: "from" | "to";
}

/**
 * One tap on a day of the Custom sheet's grid. Setting From clears To and
 * moves to To; on To, a day on or after From ends the range (and the next
 * tap starts over at From), and a day before From restarts with it as From.
 */
export function pickRangeDay(s: RangePick, iso: string): RangePick {
  if (s.end === "from" || iso < s.from) return { from: iso, to: null, end: "to" };
  return { from: s.from, to: iso, end: "from" };
}
