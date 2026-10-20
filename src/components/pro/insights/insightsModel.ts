// Release 3 · W5 Insights: the pure arithmetic behind every Insights number
// (HANDOVER section i), kept free of React and of the database so each rule
// can be tested on its own (insightsModel.test.ts).
//
// - Ranges W M 3M Y: 7, 30, 91, 365 days; buckets are days (W, M), Monday
//   weeks (3M) and months (Y). The previous-period ghost is the same series
//   shifted one period.
// - Weight trend: exponentially weighted moving average, alpha 0.25, over
//   weigh-ins; fewer than 3 weigh-ins: points only, no trend line.
// - Leaf streak: one leaf per consecutive day meeting the rule; a today not
//   yet met doesn't break the run (it is still open); 14 slots on the
//   drawing, the last 4 weeks Monday first on the grid.
// - Meal timing clock: eating window = first to last log of the day,
//   overnight fast = 24 h - window, meals sized by share of the day's kcal,
//   averages over the range; fewer than 3 logged days with eaten_at: early.
// - Biomarker status: out of range = outside the lab range; borderline =
//   within 10% of a limit; change flag = more than 50% between tests.
// - Insight lines (FINAL_PLAN section 3, 1.8 "T"): measured facts only, no
//   cause, no advice; a template whose data is missing returns null.

import { DAY_LONG, mondayIndex } from "../../../utils/week";

export type ChartRange = "W" | "M" | "3M" | "Y";
export const RANGE_DAYS: Record<ChartRange, number> = { W: 7, M: 30, "3M": 91, Y: 365 };

// ---------------------------------------------------------------------------
// Dates (local yyyy-mm-dd strings; no time zone arithmetic beyond the day)
// ---------------------------------------------------------------------------

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 864e5);
}

/** Monday of the week holding `iso`. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return addDays(iso, -mondayIndex(d.getDay()));
}

export function weekdayIndex(iso: string): number {
  return mondayIndex(new Date(`${iso}T12:00:00`).getDay());
}

export interface Bucket {
  /** First day of the bucket (inclusive). */
  start: string;
  /** Last day (inclusive). */
  end: string;
}

/**
 * The buckets of a range ending today: one per day for W and M, Monday weeks
 * for 3M, calendar months for Y. `shift` moves the whole window back that
 * many periods (1 = the previous-period ghost).
 */
export function bucketsFor(range: ChartRange, today: string, shift = 0): Bucket[] {
  const days = RANGE_DAYS[range];
  const end = addDays(today, -days * shift);
  const start = addDays(end, -(days - 1));
  if (range === "W" || range === "M") {
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(start, i);
      return { start: d, end: d };
    });
  }
  if (range === "3M") {
    const out: Bucket[] = [];
    let s = mondayOf(start);
    while (s <= end) {
      out.push({ start: s < start ? start : s, end: addDays(s, 6) > end ? end : addDays(s, 6) });
      s = addDays(s, 7);
    }
    return out;
  }
  const out: Bucket[] = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  for (;;) {
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    const last = addDays(`${nextY}-${String(nextM).padStart(2, "0")}-01`, -1);
    if (first > end) break;
    out.push({ start: first < start ? start : first, end: last > end ? end : last });
    y = nextY;
    m = nextM;
  }
  return out;
}

export const bucketIndex = (buckets: Bucket[], day: string): number => buckets.findIndex((b) => day >= b.start && day <= b.end);

/** Mean of the values that fall in each bucket; null for an empty bucket. */
export function meanByBucket(buckets: Bucket[], rows: { day: string; value: number }[]): (number | null)[] {
  const sum = buckets.map(() => 0);
  const n = buckets.map(() => 0);
  for (const r of rows) {
    const i = bucketIndex(buckets, r.day);
    if (i < 0) continue;
    sum[i] += r.value;
    n[i] += 1;
  }
  return sum.map((s, i) => (n[i] ? s / n[i] : null));
}

/** Sum of the values per bucket; null for a bucket with no row. */
export function sumByBucket(buckets: Bucket[], rows: { day: string; value: number }[]): (number | null)[] {
  const out: (number | null)[] = buckets.map(() => null);
  for (const r of rows) {
    const i = bucketIndex(buckets, r.day);
    if (i < 0) continue;
    out[i] = (out[i] ?? 0) + r.value;
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthShort = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
/** "Oct 8" */
export const dayLabel = (iso: string) => `${monthShort(iso)} ${Number(iso.slice(8, 10))}`;
/** "Oct 8, 2026" */
export const dateLong = (iso: string) => `${dayLabel(iso)}, ${iso.slice(0, 4)}`;
/** "Thu 8 Oct" (the tooltip caps line). */
export const tipDay = (iso: string) => `${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][weekdayIndex(iso)]} ${Number(iso.slice(8, 10))} ${monthShort(iso)}`;

/** The x label for a bucket: weekday letter (W), day (M), week start (3M), month (Y). */
export function bucketLabel(range: ChartRange, b: Bucket): string {
  if (range === "W") return ["M", "T", "W", "T", "F", "S", "S"][weekdayIndex(b.start)];
  if (range === "Y") return monthShort(b.start);
  return dayLabel(b.start);
}

export function bucketTitle(range: ChartRange, b: Bucket): string {
  if (range === "W" || range === "M") return tipDay(b.start);
  if (range === "Y") return `${monthShort(b.start)} ${b.start.slice(0, 4)}`;
  return `Week of ${dayLabel(b.start)}`;
}

// ---------------------------------------------------------------------------
// Weight trend (HANDOVER i)
// ---------------------------------------------------------------------------

export const WEIGHT_ALPHA = 0.25;
export const MIN_WEIGH_INS_FOR_TREND = 3;

/** EWMA over the values in order; the first value seeds it. */
export function ewma(values: number[], alpha = WEIGHT_ALPHA): number[] {
  const out: number[] = [];
  let e: number | null = null;
  for (const v of values) {
    e = e == null ? v : e + alpha * (v - e);
    out.push(e);
  }
  return out;
}

/** The trend over weigh-ins, or null when there are fewer than 3 (points only). */
export function weightTrend(weighIns: { day: string; kg: number }[]): number[] | null {
  if (weighIns.length < MIN_WEIGH_INS_FOR_TREND) return null;
  return ewma(weighIns.map((w) => w.kg));
}

/** kg a week of the trend between its first and last weigh-in; null under 7 days apart. */
export function trendPerWeek(weighIns: { day: string; kg: number }[], trend: number[] | null): number | null {
  if (!trend || weighIns.length < 2) return null;
  const span = daysBetween(weighIns[0].day, weighIns[weighIns.length - 1].day);
  if (span < 7) return null;
  return ((trend[trend.length - 1] - trend[0]) / span) * 7;
}

// ---------------------------------------------------------------------------
// Leaf streak (HANDOVER i)
// ---------------------------------------------------------------------------

export interface StreakModel {
  current: number;
  best: number;
  /** 28 cells, Monday first, ending the current week: 2 today done, 1 done, 0 missed, null not yet. */
  days: (0 | 1 | 2 | null)[];
}

export function streakOf(done: Set<string>, today: string, lookbackDays = 400): StreakModel {
  // Current: count back from today (or yesterday when today isn't done yet).
  let current = 0;
  let d = done.has(today) ? today : addDays(today, -1);
  while (done.has(d)) {
    current += 1;
    d = addDays(d, -1);
  }
  let best = 0;
  let run = 0;
  for (let i = lookbackDays; i >= 0; i--) {
    const day = addDays(today, -i);
    if (done.has(day)) {
      run += 1;
      if (run > best) best = run;
    } else if (day !== today) run = 0;
  }
  best = Math.max(best, current);
  const start = addDays(mondayOf(today), -21);
  const days = Array.from({ length: 28 }, (_, i) => {
    const day = addDays(start, i);
    if (day > today) return null;
    if (day === today) return done.has(day) ? 2 : null;
    return done.has(day) ? 1 : 0;
  }) as StreakModel["days"];
  return { current, best, days };
}

// ---------------------------------------------------------------------------
// Meal timing clock (NU7 v4, J8: only rows with eaten_at)
// ---------------------------------------------------------------------------

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

export interface TimedEntry {
  day: string;
  /** Minutes since local midnight of eaten_at. */
  minute: number;
  meal: MealSlot;
  kcal: number;
}

export interface MealClock {
  early: boolean;
  days: number;
  /** Average first and last log of the day, minutes since midnight. */
  windowStart: number;
  windowEnd: number;
  windowMinutes: number;
  fastMinutes: number;
  /** Per slot: average time and share of all kcal in the range. */
  meals: { meal: MealSlot; minute: number; share: number }[];
  /** Entries after 22:00. */
  late: number;
  /** Share of kcal eaten after 18:00. */
  afterSixShare: number;
  points: TimedEntry[];
}

export const MIN_TIMED_DAYS = 3;

export function mealClockOf(entries: TimedEntry[]): MealClock {
  const byDay = new Map<string, TimedEntry[]>();
  for (const e of entries) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const days = byDay.size;
  const firsts: number[] = [];
  const lasts: number[] = [];
  for (const list of byDay.values()) {
    firsts.push(Math.min(...list.map((e) => e.minute)));
    lasts.push(Math.max(...list.map((e) => e.minute)));
  }
  const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const windowStart = avg(firsts);
  const windowEnd = avg(lasts);
  const windowMinutes = Math.max(0, avg(lasts.map((l, i) => l - firsts[i])));
  const total = entries.reduce((s, e) => s + Math.max(0, e.kcal), 0);
  const slots: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
  const meals = slots
    .map((meal) => {
      const list = entries.filter((e) => e.meal === meal);
      if (!list.length) return null;
      const kcal = list.reduce((s, e) => s + Math.max(0, e.kcal), 0);
      return { meal, minute: avg(list.map((e) => e.minute)), share: total ? kcal / total : 0 };
    })
    .filter((m): m is { meal: MealSlot; minute: number; share: number } => !!m);
  const after = entries.filter((e) => e.minute >= 18 * 60).reduce((s, e) => s + Math.max(0, e.kcal), 0);
  return {
    early: days < MIN_TIMED_DAYS,
    days,
    windowStart,
    windowEnd,
    windowMinutes,
    fastMinutes: Math.max(0, 1440 - windowMinutes),
    meals,
    late: entries.filter((e) => e.minute >= 22 * 60).length,
    afterSixShare: total ? after / total : 0,
    points: entries,
  };
}

/** "14h 10m" */
export function hm(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m % 60}m`;
}

// ---------------------------------------------------------------------------
// Macros
// ---------------------------------------------------------------------------

/** Share of kcal from protein, carbs and fat (4, 4, 9 kcal a gram), rounded to sum 100. */
export function macroSplit(p: number, c: number, f: number): [number, number, number] | null {
  const k = [p * 4, c * 4, f * 9];
  const t = k[0] + k[1] + k[2];
  if (t <= 0) return null;
  const raw = k.map((x) => (x / t) * 100);
  const r = raw.map((x) => Math.floor(x));
  let left = 100 - r.reduce((s, x) => s + x, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    r[i] += 1;
    left -= 1;
  }
  return [r[0], r[1], r[2]];
}

/** Macro grams from target kcal and split (HANDOVER i: ÷ 4 protein and carbs, ÷ 9 fat). */
export function macroGrams(kcal: number, pct: [number, number, number]): [number, number, number] {
  return [(kcal * pct[0]) / 100 / 4, (kcal * pct[1]) / 100 / 4, (kcal * pct[2]) / 100 / 9];
}

export interface DayTotals {
  day: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  meals: number;
}

/** Best and worst day against the macro targets: the mean absolute share off each target. */
export function bestWorst(days: DayTotals[], target: [number, number, number]): { best: DayTotals; worst: DayTotals; bestOnTarget: boolean } | null {
  if (days.length < 2) return null;
  const off = (d: DayTotals) => (Math.abs(d.p - target[0]) / (target[0] || 1) + Math.abs(d.c - target[1]) / (target[1] || 1) + Math.abs(d.f - target[2]) / (target[2] || 1)) / 3;
  const sorted = [...days].sort((a, b) => off(a) - off(b) || (a.day < b.day ? 1 : -1));
  const best = sorted[0];
  const onTarget = [best.p, best.c, best.f].every((g, i) => Math.abs(g - target[i]) <= target[i] * 0.1);
  return { best, worst: sorted[sorted.length - 1], bestOnTarget: onTarget };
}

/** The on-target band around a calorie target: ±5%, rounded to 50 kcal (unspecified in the handover; see the W5 report). */
export function calorieBand(target: number): { low: number; high: number } {
  const d = Math.max(50, Math.round((target * 0.05) / 50) * 50);
  return { low: target - d, high: target + d };
}

// ---------------------------------------------------------------------------
// Blood pressure, heart rate
// ---------------------------------------------------------------------------

export interface BpReading {
  day: string;
  systolic: number;
  diastolic: number;
}

export function bpByBucket(buckets: Bucket[], readings: BpReading[]): ({ systolic: number; diastolic: number; n: number } | null)[] {
  return buckets.map((b) => {
    const list = readings.filter((r) => r.day >= b.start && r.day <= b.end);
    if (!list.length) return null;
    return {
      systolic: Math.round(list.reduce((s, r) => s + r.systolic, 0) / list.length),
      diastolic: Math.round(list.reduce((s, r) => s + r.diastolic, 0) / list.length),
      n: list.length,
    };
  });
}

/** Per day: resting (min of resting readings, else the wearable's resting bpm) and the min to max band. */
export function heartByDay(
  rows: { day: string; bpm: number; rest: boolean }[],
  daily: { day: string; restingBpm: number | null }[]
): Map<string, { resting: number | null; min: number | null; max: number | null }> {
  const out = new Map<string, { resting: number | null; min: number | null; max: number | null }>();
  for (const r of rows) {
    const cur = out.get(r.day) ?? { resting: null, min: null, max: null };
    cur.min = cur.min == null ? r.bpm : Math.min(cur.min, r.bpm);
    cur.max = cur.max == null ? r.bpm : Math.max(cur.max, r.bpm);
    if (r.rest) cur.resting = cur.resting == null ? r.bpm : Math.min(cur.resting, r.bpm);
    out.set(r.day, cur);
  }
  for (const d of daily) {
    if (d.restingBpm == null) continue;
    const cur = out.get(d.day) ?? { resting: null, min: null, max: null };
    if (cur.resting == null) cur.resting = d.restingBpm;
    out.set(d.day, cur);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Biomarkers
// ---------------------------------------------------------------------------

export type MarkerStatus = "in" | "border" | "out" | "none";

/** Out of range: outside the lab range. Borderline: within 10% of a limit (HANDOVER i). */
export function markerStatus(v: number, low: number | null, high: number | null): MarkerStatus {
  if (low == null && high == null) return "none";
  if ((low != null && v < low) || (high != null && v > high)) return "out";
  const span = low != null && high != null ? high - low : null;
  if (high != null) {
    const near = span != null ? span * 0.1 : Math.abs(high) * 0.1;
    if (v > high - near) return "border";
  }
  if (low != null && low > 0) {
    const near = span != null ? span * 0.1 : Math.abs(low) * 0.1;
    if (v < low + near) return "border";
  }
  return "in";
}

export type MarkerPattern = "one" | "returning" | "rising_out" | "falling_out" | "out" | "stable" | "rising" | "falling";

/**
 * The trend chip on a marker row (TR16 v3). Rules written for W5 (the
 * handover draws the words, not the rule; see the report):
 * - one test: "One test";
 * - latest out of range: "Rising, out of range" when the last change moved
 *   further out, else "Out of range";
 * - latest in range after an earlier result out of range: "Returning to range";
 * - change between first and latest within 5%: "Stable", else Rising / Falling.
 */
export function markerPattern(points: { value: number }[], low: number | null, high: number | null): MarkerPattern {
  if (points.length <= 1) return "one";
  const last = points[points.length - 1].value;
  const prev = points[points.length - 2].value;
  const first = points[0].value;
  const st = markerStatus(last, low, high);
  if (st === "out") {
    const above = high != null && last > high;
    if (above && last > prev) return "rising_out";
    if (!above && last < prev) return "falling_out";
    return "out";
  }
  if (points.slice(0, -1).some((p) => markerStatus(p.value, low, high) === "out")) return "returning";
  const rel = first !== 0 ? Math.abs(last - first) / Math.abs(first) : Math.abs(last - first);
  if (rel <= 0.05) return "stable";
  return last > first ? "rising" : "falling";
}

export const PATTERN_LABEL: Record<MarkerPattern, string> = {
  one: "One test",
  returning: "Returning to range",
  rising_out: "Rising, out of range",
  falling_out: "Falling, out of range",
  out: "Out of range",
  stable: "Stable",
  rising: "Rising",
  falling: "Falling",
};

/** Change flag (HANDOVER i): more than 50% between consecutive tests. */
export function changeFlag(points: { value: number }[]): boolean {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].value;
    if (a !== 0 && Math.abs(points[i].value - a) / Math.abs(a) > 0.5) return true;
  }
  return false;
}

/** Position in a lab range: 0 the lower limit, 100 the upper (compare, against range). */
export function rangePosition(v: number, low: number | null, high: number): number {
  const lo = low ?? 0;
  return ((v - lo) / (high - lo || 1)) * 100;
}

/** Round as the board does: 1 decimal under 20, whole above. */
export function roundMarker(v: number): number {
  return Math.abs(v) >= 20 ? Math.round(v) : Math.round(v * 10) / 10;
}

// ---------------------------------------------------------------------------
// Insight lines (T rules: facts only; null when the data isn't there)
// ---------------------------------------------------------------------------

const plural = (w: string) => `${w}s`;

/** The weekday most of the misses share: ≥ 2 misses and ≥ 50% of them on that weekday. */
export function commonWeekday(days: string[]): string | null {
  if (days.length < 2) return null;
  const n = Array(7).fill(0);
  for (const d of days) n[weekdayIndex(d)] += 1;
  const max = Math.max(...n);
  if (max < 2 || max / days.length < 0.5) return null;
  return DAY_LONG[n.indexOf(max)];
}

/** "{n} of {n} days above goal." + "Dips fall on {weekday}s." */
export function aboveGoalLine(values: { day: string; value: number }[], goal: number): string | null {
  if (!values.length) return null;
  const above = values.filter((v) => v.value >= goal).length;
  const dips = values.filter((v) => v.value < goal).map((v) => v.day);
  const wd = commonWeekday(dips);
  return `${above} of ${values.length} days above goal.${wd ? ` Dips fall on ${plural(wd)}.` : ""}`;
}

/** "On plan {n} of {n} logged days." + "{n} misses, most on {weekday}s." */
export function onPlanLine(days: { day: string; kcal: number }[], band: { low: number; high: number }): string | null {
  if (!days.length) return null;
  const on = days.filter((d) => d.kcal >= band.low && d.kcal <= band.high);
  const misses = days.filter((d) => !on.includes(d)).map((d) => d.day);
  const wd = misses.length >= 2 ? commonWeekday(misses) : null;
  return `On plan ${on.length} of ${days.length} logged days.${wd ? ` ${misses.length} misses, most on ${plural(wd)}.` : ""}`;
}

/** "{n} of {n} days in the band; {weekday}s run {n} to {n} over." */
export function inBandLine(days: { day: string; kcal: number }[], band: { low: number; high: number }): string | null {
  if (!days.length) return null;
  const inBand = days.filter((d) => d.kcal >= band.low && d.kcal <= band.high).length;
  const over = days.filter((d) => d.kcal > band.high);
  const wd = commonWeekday(over.map((d) => d.day));
  let tail = "";
  if (wd) {
    const target = (band.low + band.high) / 2;
    const amounts = over.filter((d) => DAY_LONG[weekdayIndex(d.day)] === wd).map((d) => Math.round((d.kcal - target) / 10) * 10);
    tail = `; ${plural(wd)} run ${Math.min(...amounts).toLocaleString("en-GB")} to ${Math.max(...amounts).toLocaleString("en-GB")} over`;
  }
  return `${inBand} of ${days.length} days in the band${tail}.`;
}

/** "{weekday}s have the fewest logged meals ({n} on average)." Needs 2 weeks of data. */
export function fewestMealsLine(days: { day: string; meals: number }[]): string | null {
  if (days.length < 14) return null;
  const sum = Array(7).fill(0);
  const n = Array(7).fill(0);
  for (const d of days) {
    sum[weekdayIndex(d.day)] += d.meals;
    n[weekdayIndex(d.day)] += 1;
  }
  const avg = sum.map((s, i) => (n[i] ? s / n[i] : Infinity));
  const min = Math.min(...avg);
  if (!Number.isFinite(min)) return null;
  const others = avg.filter((a) => a !== min && Number.isFinite(a));
  if (!others.length || others.every((a) => a === min)) return null;
  return `${plural(DAY_LONG[avg.indexOf(min)])} have the fewest logged meals (${Math.round(min * 10) / 10} on average).`;
}

/** "{food_name} tops fat; {food_name} tops protein" (top contributor in range). */
export function topFoods(entries: { name: string; p: number; f: number; c: number }[]): { protein: { name: string; share: number } | null; carbs: { name: string; share: number } | null; fat: { name: string; share: number } | null } {
  const top = (k: "p" | "c" | "f") => {
    const by = new Map<string, number>();
    let total = 0;
    for (const e of entries) {
      const v = Math.max(0, e[k]);
      total += v;
      by.set(e.name, (by.get(e.name) ?? 0) + v);
    }
    if (total <= 0) return null;
    const [name, v] = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
    return { name, share: v / total };
  };
  return { protein: top("p"), carbs: top("c"), fat: top("f") };
}

