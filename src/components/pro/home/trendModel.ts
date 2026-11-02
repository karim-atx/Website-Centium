// Release 3 · CL1 trend ring: the numbers, from hub_trend rows (HANDOVER i
// "Hub headline", "Trend bars", "Last period ghost"; follow-up "the today bar
// by lane", Karim's answer 6). Pure, so the node tests load it.

import type { ProLane } from "../subtypeLanes";
import { t, tk, tn } from "../../../i18n/core";

export type HubRange = "today" | "week" | "month";

export interface Bucket {
  pct: number | null;
  previousPct: number | null;
  planned: number;
}

/** CL1 Today: the ring shows 7 AM to 8 PM, one bar per hour (gen/hub5.js ringData5). */
export const DAY_FIRST_HOUR = 7;
export const DAY_LAST_HOUR = 20;

export interface RingBar {
  /** Bar height value; null draws no bar (a dashed slot when in the future). */
  value: number | null;
  /** The previous period's value for the ghost line. */
  ghost: number | null;
}

export interface Headline {
  /** "82%", "4", or the dash. */
  big: string;
  caption: string;
  /** Delta in points (week, month), or the "of n planned" line (today). */
  delta: number | null;
  line: string | null;
  /** Fewer than 3 days of data (HANDOVER i "Early data"). */
  early: boolean;
  /** No sharing client counted anything: "No shared data yet". */
  noData: boolean;
}

export interface RingModel {
  bars: RingBar[];
  max: number;
  todayIdx: number;
  headline: Headline;
}

const TODAY_CAPTION: Record<ProLane, string> = {
  full_coaching: tk("workouts logged so far"),
  nutrition: tk("meals logged so far"),
  clinical_overview: tk("appointments and follow-ups done"),
};

const PERIOD_CAPTION: Record<ProLane, string> = {
  full_coaching: tk("workouts on plan"),
  nutrition: tk("meal-plan adherence"),
  clinical_overview: tk("on plan"),
};

/** Legend for the bars (CL1 "Workouts logged", "Meals logged"; Clinical per the follow-up). */
export const TODAY_LEGEND: Record<ProLane, string> = {
  full_coaching: tk("Workouts logged"),
  nutrition: tk("Meals logged"),
  clinical_overview: tk("Appointments and follow-ups"),
};

export const NO_SHARED_DATA = tk("No shared data yet");
export const EARLY_CAPTION = tk("trends start after a week of logs");

/** Completed items by the end of an hour bucket (hub_trend('today') pct is cumulative). */
const doneBy = (b: Bucket | undefined) => (b && b.pct !== null && b.planned > 0 ? Math.round((b.pct * b.planned) / 100) : 0);

export function todayModel(rows: Bucket[], lane: ProLane, nowHour: number): RingModel {
  const planned = rows.reduce((m, r) => Math.max(m, r.planned), 0);
  const bars: RingBar[] = [];
  for (let h = DAY_FIRST_HOUR; h <= DAY_LAST_HOUR; h++) {
    const v = h === DAY_FIRST_HOUR ? doneBy(rows[h]) : doneBy(rows[h]) - doneBy(rows[h - 1]);
    bars.push({ value: h <= nowHour && planned > 0 ? Math.max(0, v) : null, ghost: null });
  }
  const done = doneBy(rows[Math.min(23, Math.max(0, nowHour))]);
  const max = Math.max(1, ...bars.map((b) => b.value ?? 0));
  return {
    bars,
    max,
    todayIdx: Math.min(DAY_LAST_HOUR, Math.max(DAY_FIRST_HOUR, nowHour)) - DAY_FIRST_HOUR,
    headline: {
      big: String(done),
      caption: t(TODAY_CAPTION[lane]),
      delta: null,
      line: planned > 0 ? (lane === "nutrition" ? t("of {planned} main meals today", { planned }) : lane === "clinical_overview" ? t("of {planned} today", { planned }) : t("of {planned} planned today", { planned })) : t("Nothing planned today"),
      early: false,
      noData: false,
    },
  };
}

/** Week (7 days, Monday first) or month: the share of planned items done per day; the headline is the planned-weighted mean. */
export function periodModel(rows: Bucket[], lane: ProLane, todayIdx: number): RingModel {
  const bars = rows.map((r, i) => ({ value: i <= todayIdx && r.planned > 0 ? r.pct : null, ghost: r.previousPct }));
  const counted = rows.filter((r, i) => i <= todayIdx && r.planned > 0 && r.pct !== null);
  const plannedSum = counted.reduce((s, r) => s + r.planned, 0);
  const cur = plannedSum > 0 ? Math.round(counted.reduce((s, r) => s + (r.pct ?? 0) * r.planned, 0) / plannedSum) : null;
  const prevs = rows.map((r) => r.previousPct).filter((v): v is number => v !== null);
  const prev = prevs.length ? Math.round(prevs.reduce((s, v) => s + v, 0) / prevs.length) : null;
  const noData = cur === null && prevs.length === 0;
  const early = !noData && counted.length < 3;
  return {
    bars: early ? bars.map(() => ({ value: null, ghost: null })) : bars,
    max: 100,
    todayIdx,
    headline: {
      big: cur === null || early ? "–" : `${cur}%`,
      caption: t(noData ? NO_SHARED_DATA : early ? EARLY_CAPTION : PERIOD_CAPTION[lane]),
      delta: !early && cur !== null && prev !== null ? cur - prev : null,
      line: null,
      early,
      noData,
    },
  };
}

/** "9 up · 4 down · 2 steady" (CL1) or "2 new clients" (CL1 Early data). */
export function stripCounts(trends: ("up" | "down" | "flat" | "new" | null)[], noun = "client"): string {
  const n = (k: string) => trends.filter((x) => x === k).length;
  if (trends.length > 0 && trends.every((x) => x === "new")) return noun === "patient" ? tn(trends.length, "{n} new patient", "{n} new patients") : tn(trends.length, "{n} new client", "{n} new clients");
  return t("{up} up · {down} down · {flat} steady", { up: n("up"), down: n("down"), flat: n("flat") });
}
