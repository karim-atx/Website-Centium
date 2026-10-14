import { dayMonth as shellDayMonth, daysBetween, previousOf, type AnalyticsRange } from "../analyticsRange";

// Range words the Team section needs on top of the shell's analyticsRange.ts.
export type { AnalyticsRange };

/** "8 Sep" (AN5-001 row 7: day-month). */
export const dayMonth = (iso: string): string => shellDayMonth(iso);

/** Inclusive day count. */
export const rangeDays = (r: { from: string; to: string }): number => daysBetween(r.from, r.to) + 1;

/** The period of the same length just before. */
export const previousRange = (r: AnalyticsRange): { from: string; to: string } => previousOf(r);

/** The hero card's right label (AN5-001 row 11, OURS strings). */
export function heroRangeLabel(r: AnalyticsRange): string {
  if (r.key === "week") return "This week";
  if (r.key === "4w") return "Last 4 weeks";
  if (r.key === "12w") return "Last 12 weeks";
  return `${dayMonth(r.from)} to ${dayMonth(r.to)}`;
}

/** "classes · 4 wk" on the scorecard (AN5-045 row 2, OURS). */
export function classesRangeLabel(r: AnalyticsRange): string {
  if (r.key === "week") return "classes · this week";
  if (r.key === "4w") return "classes · 4 wk";
  if (r.key === "12w") return "classes · 12 wk";
  return "classes in range";
}
