// Release 3 · W9 Insights › Vitals › Sleep: the pure arithmetic behind the
// TR9 v5 sleep charts (gen/r14.js sleepStages14, bedtime14, hypno14 and the
// r12.js VIT12 Sleep boxes), kept free of React and of the database so each
// rule can be tested on its own (sleepModel.test.ts).
//
// - A night is one main sleep_details row (naps are not read). Its stage
//   minutes are the row's deep / rem / light / awake columns, else the sum
//   of its sleep_segments; asleep is asleep_min, else deep + REM + light.
// - Bed and wake times are bed_start / wake_end, else the timeline's first
//   start and last end, in the device's local time. On the bedtime axis a
//   time before noon belongs to the night before (minutes + 1440), as the
//   frame's 21:00 to 09:00 axis does.
// - The hypnogram levels are Awake, REM, Light, Deep from the top.
// - Insight lines are measured facts only (no cause, no advice); a template
//   whose data is missing returns null.

import type { Bucket } from "./insightsModel";

/** sleep_segments.stage (enum sleep_stage). */
export type SleepStage = "awake" | "light" | "deep" | "rem";

export interface SleepSegment {
  stage: SleepStage;
  startsAt: string;
  endsAt: string;
}

/** One main sleep_details row with its sleep_segments (services/pro/insights fetchSleepNights). */
export interface SleepNight {
  id: string;
  /** sleep_details.sleep_date. */
  date: string;
  bedStart: string | null;
  wakeEnd: string | null;
  asleepMin: number | null;
  inBedMin: number | null;
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  segments: SleepSegment[];
}

export const STAGES: SleepStage[] = ["deep", "rem", "light", "awake"];
export const STAGE_LABEL: Record<SleepStage, string> = { deep: "Deep", rem: "REM", light: "Light", awake: "Awake" };
/** sleepCols14: Deep, REM, Light, Awake (light / dark). */
export function stageColours(dark: boolean): Record<SleepStage, string> {
  return { deep: dark ? "#8E7FD0" : "#5F5093", rem: dark ? "#A991FE" : "#7D6BB5", light: dark ? "#C3B3FB" : "#C9C0EA", awake: "#D9A441" };
}
/** Hypnogram rows from the top (hypno14 lv). */
export const HYPNO_LEVELS: SleepStage[] = ["awake", "rem", "light", "deep"];
/** VIT12 "Nights under 6 h". */
export const SHORT_NIGHT_MIN = 360;

const MIN = 60000;
const minutesBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / MIN;

/** Local minutes since midnight of a timestamp (the device's clock). */
export function localMinuteOf(ts: string): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

/** A bedtime on the night axis: before noon counts as after midnight (+1440). */
export const nightMinute = (m: number) => (m < 720 ? m + 1440 : m);

export interface NightStats {
  date: string;
  deep: number | null;
  rem: number | null;
  light: number | null;
  awake: number | null;
  asleep: number | null;
  hasStages: boolean;
  /** Night-axis minutes (see nightMinute); null without a bed time. */
  bed: number | null;
  wake: number | null;
  segments: SleepSegment[];
}

export function nightStats(n: SleepNight): NightStats {
  const seg: Record<SleepStage, number> = { deep: 0, rem: 0, light: 0, awake: 0 };
  for (const s of n.segments) seg[s.stage] += Math.max(0, minutesBetween(s.startsAt, s.endsAt));
  const fromSeg = n.segments.length > 0;
  const pick = (col: number | null, k: SleepStage) => (col != null ? col : fromSeg ? Math.round(seg[k]) : null);
  const deep = pick(n.deepMin, "deep");
  const rem = pick(n.remMin, "rem");
  const light = pick(n.lightMin, "light");
  const awake = pick(n.awakeMin, "awake");
  const hasStages = (deep ?? 0) + (rem ?? 0) + (light ?? 0) > 0;
  const asleep = n.asleepMin ?? (hasStages ? (deep ?? 0) + (rem ?? 0) + (light ?? 0) : null);
  const bedTs = n.bedStart ?? n.segments[0]?.startsAt ?? null;
  const wakeTs = n.wakeEnd ?? n.segments[n.segments.length - 1]?.endsAt ?? null;
  const bed = bedTs ? nightMinute(localMinuteOf(bedTs)) : null;
  const wake = bed != null && bedTs && wakeTs ? bed + Math.max(0, Math.round(minutesBetween(bedTs, wakeTs))) : null;
  return { date: n.date, deep, rem, light, awake, asleep, hasStages, bed, wake, segments: n.segments };
}

export interface StageBucket {
  deep: number;
  rem: number;
  light: number;
  awake: number;
  asleep: number;
  n: number;
}

/** The mean stage minutes of the nights with stages in each bucket; null for a bucket without one. */
export function stagesByBucket(buckets: Bucket[], nights: NightStats[]): (StageBucket | null)[] {
  return buckets.map((b) => {
    const list = nights.filter((x) => x.hasStages && x.date >= b.start && x.date <= b.end);
    if (!list.length) return null;
    const m = (f: (x: NightStats) => number) => Math.round(list.reduce((s, x) => s + f(x), 0) / list.length);
    return { deep: m((x) => x.deep ?? 0), rem: m((x) => x.rem ?? 0), light: m((x) => x.light ?? 0), awake: m((x) => x.awake ?? 0), asleep: m((x) => x.asleep ?? 0), n: list.length };
  });
}

/** Mean bed and wake (night-axis minutes) of the nights with times in each bucket. */
export function bedtimeByBucket(buckets: Bucket[], nights: NightStats[]): ({ bed: number; wake: number; n: number } | null)[] {
  return buckets.map((b) => {
    const list = nights.filter((x) => x.bed != null && x.wake != null && x.date >= b.start && x.date <= b.end);
    if (!list.length) return null;
    const m = (f: (x: NightStats) => number) => Math.round(list.reduce((s, x) => s + f(x), 0) / list.length);
    return { bed: m((x) => x.bed as number), wake: m((x) => x.wake as number), n: list.length };
  });
}

/** Minutes asleep per day: sleep_details first, else the health_metrics sleep duration (hours). */
export function asleepByDay(nights: NightStats[], durationRows: { day: string; value: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of durationRows) out.set(r.day, Math.round(r.value * 60));
  for (const n of nights) if (n.asleep != null) out.set(n.date, n.asleep);
  return out;
}

/** The bedtime axis in night minutes: 9 PM to 9 AM, widened by 3-hour steps to fit the data. */
export function bedtimeAxis(rows: { bed: number; wake: number }[]): { from: number; to: number } {
  let from = 21 * 60;
  let to = 33 * 60;
  for (const r of rows) {
    if (r.bed < from) from = Math.floor(r.bed / 180) * 180;
    if (r.wake > to) to = Math.ceil(r.wake / 180) * 180;
  }
  return { from, to };
}

/** "Bedtime varies by 90 minutes." over at least two nights. */
export function bedtimeLine(beds: number[]): string | null {
  if (beds.length < 2) return null;
  const spread = Math.max(...beds) - Math.min(...beds);
  return `Bedtime varies by ${spread} minute${spread === 1 ? "" : "s"}.`;
}

/**
 * The stages chart's insight: deep sleep compared between nights that start
 * after midnight and before (at least two of each), else the average deep
 * and REM a night.
 */
export function stagesLine(nights: NightStats[], hm: (min: number) => string): string | null {
  const staged = nights.filter((n) => n.hasStages);
  if (!staged.length) return null;
  const after = staged.filter((n) => n.bed != null && n.bed >= 1440);
  const before = staged.filter((n) => n.bed != null && n.bed < 1440);
  const mean = (l: NightStats[], f: (x: NightStats) => number) => l.reduce((s, x) => s + f(x), 0) / l.length;
  if (after.length >= 2 && before.length >= 2 && mean(after, (x) => x.deep ?? 0) < mean(before, (x) => x.deep ?? 0)) return "Deep sleep is shortest on the nights with a bedtime after midnight.";
  return `Deep ${hm(mean(staged, (x) => x.deep ?? 0))} and REM ${hm(mean(staged, (x) => x.rem ?? 0))} a night on average.`;
}

export interface Hypnogram {
  /** First segment's start (ms). */
  start: number;
  /** Minutes from the first start to the last end. */
  total: number;
  blocks: { level: number; stage: SleepStage; from: number; to: number }[];
}

export function hypnogramOf(segments: SleepSegment[]): Hypnogram | null {
  if (!segments.length) return null;
  const start = new Date(segments[0].startsAt).getTime();
  const end = Math.max(...segments.map((s) => new Date(s.endsAt).getTime()));
  const total = Math.max(1, (end - start) / MIN);
  return {
    start,
    total,
    blocks: segments.map((s) => ({ level: HYPNO_LEVELS.indexOf(s.stage), stage: s.stage, from: (new Date(s.startsAt).getTime() - start) / MIN, to: (new Date(s.endsAt).getTime() - start) / MIN })),
  };
}

/** "Woke twice; only one deep block in the second half of the night." */
export function hypnogramLine(h: Hypnogram | null): string | null {
  if (!h || !h.blocks.length) return null;
  const last = h.blocks.length - 1;
  const wakes = h.blocks.filter((b, i) => b.stage === "awake" && i !== 0 && i !== last).length;
  const half = h.total / 2;
  const deepLate = h.blocks.filter((b) => b.stage === "deep" && b.from >= half).length;
  const woke = wakes === 0 ? "No wake-ups during the night" : wakes === 1 ? "Woke once" : wakes === 2 ? "Woke twice" : `Woke ${wakes} times`;
  const deep = deepLate === 0 ? "no deep block" : deepLate === 1 ? "only one deep block" : `${deepLate} deep blocks`;
  return `${woke}; ${deep} in the second half of the night.`;
}

/** The night whose timeline the hypnogram draws: the latest night with segments in the bucket, else in all. */
export function hypnogramNight(nights: NightStats[], bucket: Bucket | null): NightStats | null {
  const withSeg = nights.filter((n) => n.segments.length > 0);
  const inBucket = bucket ? withSeg.filter((n) => n.date >= bucket.start && n.date <= bucket.end) : [];
  const pool = inBucket.length ? inBucket : withSeg;
  return pool.length ? pool.reduce((a, b) => (b.date > a.date ? b : a)) : null;
}
