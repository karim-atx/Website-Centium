// Round J · J-2a: the one-source readers of Database DB-Z4 (20261226510000,
// HANDOVER_API "Mobile round Z · DB-Z4"), mapped here. Pure, so it is tested
// without a server; the calls are in readers.ts.
//
// When two sources have the same day, night or hour, the server picks one:
// manual first, then the providers by health_integrations.priority. So the
// rows below are already one per day (per hour, per night), and `sources`
// names which source each field came from. In recovery-sensitive mode the
// member's own readers return kcal as null (and leave it out of `sources`).

export type ReaderSource = "manual" | "apple_health" | "android_health" | "whoop";

/** Each reader's longest range: p_to - p_from may be at most this many days. */
export const DAYS_MAX = 400;
export const HOURS_MAX = 31;

/** "2026-03-09" + n days, as a local calendar day (no time zone drift). */
export function addDay(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return x.toISOString().slice(0, 10);
}

/**
 * [from, to] split into ranges the server accepts (to - from ≤ maxSpan),
 * oldest first. Empty when from > to.
 */
export function dayChunks(from: string, to: string, maxSpan: number): [string, string][] {
  const out: [string, string][] = [];
  let start = from;
  while (start <= to) {
    const end = addDay(start, maxSpan) < to ? addDay(start, maxSpan) : to;
    out.push([start, end]);
    start = addDay(end, 1);
  }
  return out;
}

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

const sourceOf = (v: unknown): ReaderSource | null =>
  v === "manual" || v === "apple_health" || v === "android_health" || v === "whoop" ? v : null;

/** `sources` as sent: {"steps": "manual", "resting_bpm": "apple_health"}; anything unreadable is dropped. */
export function parseSources(v: unknown): Partial<Record<string, ReaderSource>> {
  const out: Partial<Record<string, ReaderSource>> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
    const src = sourceOf(s);
    if (src) out[k] = src;
  }
  return out;
}

export interface ReaderDay {
  day: string;
  steps: number | null;
  distanceM: number | null;
  activeMinutes: number | null;
  floors: number | null;
  restingBpm: number | null;
  kcalBurned: number | null;
  sources: Partial<Record<string, ReaderSource>>;
}

/** One row of my_activity_days / client_activity_days. */
export function parseActivityDay(r: Record<string, unknown>): ReaderDay {
  return {
    day: String(r.local_date),
    steps: num(r.steps),
    distanceM: num(r.distance_m),
    activeMinutes: num(r.active_minutes),
    floors: num(r.floors),
    restingBpm: num(r.resting_bpm),
    kcalBurned: num(r.kcal_burned),
    sources: parseSources(r.sources),
  };
}

export interface ReaderHour {
  day: string;
  hour: number;
  steps: number | null;
  kcal: number | null;
  hrMin: number | null;
  hrAvg: number | null;
  hrMax: number | null;
  sources: Partial<Record<string, ReaderSource>>;
}

/** One row of my_activity_hours / client_activity_hours. */
export function parseActivityHour(r: Record<string, unknown>): ReaderHour {
  return {
    day: String(r.local_date),
    hour: Number(r.hour),
    steps: num(r.steps),
    kcal: num(r.kcal),
    hrMin: num(r.hr_min),
    hrAvg: num(r.hr_avg),
    hrMax: num(r.hr_max),
    sources: parseSources(r.sources),
  };
}

export type SleepStage = "awake" | "light" | "deep" | "rem";

export interface ReaderNight {
  id: string;
  day: string;
  source: ReaderSource;
  bedStart: string | null;
  wakeEnd: string | null;
  asleepMin: number | null;
  inBedMin: number | null;
  score: number | null;
  remMin: number | null;
  deepMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  summary: string | null;
  segments: { stage: SleepStage; startsAt: string; endsAt: string }[];
  /** How many other sources had a main night that date. */
  otherSources: number;
}

const STAGES = new Set<SleepStage>(["awake", "light", "deep", "rem"]);

/** One row of my_sleep_nights / client_sleep_nights. */
export function parseSleepNight(r: Record<string, unknown>): ReaderNight {
  const segs = Array.isArray(r.segments) ? (r.segments as Record<string, unknown>[]) : [];
  return {
    id: String(r.id),
    day: String(r.sleep_date),
    source: sourceOf(r.source) ?? "manual",
    bedStart: (r.bed_start as string | null) ?? null,
    wakeEnd: (r.wake_end as string | null) ?? null,
    asleepMin: num(r.asleep_min),
    inBedMin: num(r.in_bed_min),
    score: num(r.score),
    remMin: num(r.rem_min),
    deepMin: num(r.deep_min),
    lightMin: num(r.light_min),
    awakeMin: num(r.awake_min),
    summary: (r.summary as string | null) ?? null,
    segments: segs
      .filter((s) => STAGES.has(s.stage as SleepStage) && typeof s.starts_at === "string" && typeof s.ends_at === "string")
      .map((s) => ({ stage: s.stage as SleepStage, startsAt: s.starts_at as string, endsAt: s.ends_at as string }))
      .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1)),
    otherSources: num(r.other_sources) ?? 0,
  };
}

/** The middle of a local hour, in ms, so an hour sorts where it happened. */
export function hourTime(day: string, hour: number): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 30).getTime();
}

/**
 * A day's heart rate as one list of values, oldest first: readings logged by
 * hand, and for each synced hour its min and max (so the day's range is
 * right) followed by its average (so the last value is the last hour's
 * average). Hours without a heart rate add nothing.
 */
export function hourSamples(logged: { at: string; value: number }[], hours: ReaderHour[]): number[] {
  const items: { t: number; v: number }[] = logged.map((l) => ({ t: new Date(l.at).getTime(), v: l.value }));
  for (const h of hours) {
    if (h.hrAvg === null) continue;
    const t = hourTime(h.day, h.hour);
    items.push({ t, v: h.hrMin ?? h.hrAvg }, { t, v: h.hrMax ?? h.hrAvg }, { t, v: h.hrAvg });
  }
  return items.sort((a, b) => a.t - b.t).map((i) => i.v);
}

/** The kinds remove_synced_reading takes. */
export type SyncedKind = "metric" | "blood_pressure" | "water" | "sleep" | "workout" | "mindful";

/** Whether a row came from a phone source (and so can be removed, never edited). */
export const isSynced = (source: string | null | undefined): boolean => !!source && source !== "manual";
