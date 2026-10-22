// Market + Share 3.0 · W3 · B-MA.7 Offer Performance and P-MA.6 Performance:
// pure parsing and formatting for the DB5 readers (PLAN §2.2 DB5, api.md
// "Listing and performance", types.ts `PerformanceSeries`). No Supabase
// import, so it runs under node:test.
//
// Shapes (awaiting DB stage DB5): one row
//   { range, metric, total, delta_pct, points: [{ date, value }], previous }
// where `points` are daily for 7D / 30D and weekly for 90D / 12M, and
// `previous` is the previous period's points when p_compare is true.
//
// The screen files' script is the spec for what the charts show:
// - RANGES: 7D "week", 30D "30 days", 90D "90 days", 12M "12 months";
// - `pct(d)`: "+12%" / "−3%" (U+2212), rounded to a whole percent;
// - the points chart is cumulative (`acc += v`), the previous one too;
// - the rate funnel's second bar is max(0.5, rate)% of the track
//   (Business `rate.w`); the professional funnel scales its steps × 8
//   (Professional `steps[].w`), at least 1%;
// - dates are month first (D-02): "Oct 16".

import { num, rows, str } from "./parse";

export type PerfRange = "7D" | "30D" | "90D" | "12M";
export const PERF_RANGES: readonly PerfRange[] = ["7D", "30D", "90D", "12M"];
export const DEFAULT_RANGE: PerfRange = "30D";

/** "vs previous {unit}", "This {unit}" (RANGES[k].unit). */
export const RANGE_UNIT: Record<PerfRange, string> = { "7D": "week", "30D": "30 days", "90D": "90 days", "12M": "12 months" };

export const isPerfRange = (v: unknown): v is PerfRange => typeof v === "string" && (PERF_RANGES as readonly string[]).includes(v);

export type OfferMetric = "offer_views" | "redemptions" | "points_redeemed" | "conversion";
export type ProMetric = "profile_views" | "hire_requests" | "vouchers_redeemed" | "points_spent" | "conversion";
export const OFFER_METRICS: readonly OfferMetric[] = ["offer_views", "redemptions", "points_redeemed", "conversion"];
export const PRO_METRICS: readonly ProMetric[] = ["profile_views", "hire_requests", "vouchers_redeemed", "points_spent", "conversion"];

/** B-MA.7 expanded pages (performance/{segment}): the metric and the back header's title (the script's EX[k].title). */
export const EXPANDED: Record<string, { metric: OfferMetric; title: string }> = {
  views: { metric: "offer_views", title: "Views" },
  redemptions: { metric: "redemptions", title: "Redemptions" },
  points: { metric: "points_redeemed", title: "Points redeemed" },
  rate: { metric: "conversion", title: "Redemption rate" },
};
export const SEGMENT: Record<OfferMetric, string> = { offer_views: "views", redemptions: "redemptions", points_redeemed: "points", conversion: "rate" };

export interface PerfPoint {
  date: string;
  value: number;
}

export interface PerfSeries {
  range: PerfRange;
  metric: string;
  total: number;
  deltaPct: number | null;
  points: PerfPoint[];
  previous: PerfPoint[] | null;
  /** Optional funnel counts a conversion row may carry (views, requests, hired). */
  counts: Record<string, number>;
}

function points(v: unknown): PerfPoint[] {
  if (!Array.isArray(v)) return [];
  const out: PerfPoint[] = [];
  for (const p of v) {
    if (!p || typeof p !== "object") continue;
    const r = p as Record<string, unknown>;
    const date = typeof r.date === "string" ? r.date.slice(0, 10) : null;
    if (!date) continue;
    out.push({ date, value: num(r.value) ?? 0 });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

const KNOWN = new Set(["range", "metric", "total", "delta_pct", "points", "previous"]);

/** The first row of an offer_performance / professional_performance answer, or null. */
export function parsePerformance(data: unknown, fallbackRange: PerfRange = DEFAULT_RANGE): PerfSeries | null {
  const r = rows(data)[0];
  if (!r) return null;
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(r)) {
    if (KNOWN.has(k)) continue;
    const n = num(v);
    if (n !== null) counts[k] = n;
  }
  return {
    range: isPerfRange(r.range) ? r.range : fallbackRange,
    metric: typeof r.metric === "string" ? r.metric : "",
    total: num(r.total) ?? 0,
    deltaPct: num(r.delta_pct),
    points: points(r.points),
    previous: r.previous == null ? null : points(r.previous),
    counts,
  };
}

/** Nothing counted yet: no total and every point zero (api.md: "empty ranges return zeros"). */
export const isEmptySeries = (s: PerfSeries | null | undefined): boolean => !s || (!s.total && s.points.every((p) => !p.value));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-16" → "Oct 16" (D-02), read as a calendar date (no time zone shift). */
export function chartDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1] ?? ""} ${Number(m[3])}`;
}

/** "2026-11-01" → "Nov 1, 2026". */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1] ?? ""} ${Number(m[3])}, ${m[1]}`;
}

/** Whole numbers with separators: "1,930". */
export const fmtCount = (n: number): string => Math.round(n).toLocaleString("en-US");

/** "1 voucher" / "46 vouchers". */
export const countOf = (n: number, one: string, many: string): string => `${fmtCount(n)} ${Math.round(n) === 1 ? one : many}`;

/** The board's `pct(d)` from a percent: "+12%", "−3%" (U+2212); null when there is nothing to compare. */
export function deltaText(pct: number | null | undefined): string | null {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null;
  const r = Math.round(Math.abs(pct));
  return `${pct >= 0 || r === 0 ? "+" : "−"}${r}%`;
}

/** A rate's change in percentage points: "+0.1 pt", "−0.3 pt". */
export function deltaPt(pt: number | null | undefined): string | null {
  if (pt === null || pt === undefined || !Number.isFinite(pt)) return null;
  const a = Math.abs(pt).toFixed(1);
  return `${pt >= 0 || a === "0.0" ? "+" : "−"}${a} pt`;
}

/** "2.4%" (one decimal, the board's `rateNow.toFixed(1) + "%"`). */
export const rateText = (r: number): string => `${(Number.isFinite(r) ? r : 0).toFixed(1)}%`;

/** Redemptions over views, as a percent (0 with no views). */
export const ratePct = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);

/** The running total (the points chart, `acc += v`). */
export function cumulative(vals: readonly number[]): number[] {
  let acc = 0;
  return vals.map((v) => (acc += v));
}

/** B-MA.7 funnel: the Redemptions bar's share of the track, max(0.5, rate)% (`rate.w`). */
export const offerRateFraction = (ratePercent: number): number => Math.max(0.5, ratePercent) / 100;

/** P-MA.6 funnel: a step's share, (part / views × 100 × 8)%, at least 1% and never past the track. */
export const proStepFraction = (part: number, views: number): number => Math.min(1, Math.max(1, views > 0 ? (part / views) * 100 * 8 : 0) / 100);

export interface ChartData {
  labels: string[];
  values: number[];
  prev: number[];
}

/** Labels and values for a ChartCard (cumulative for the points charts); the previous period aligned by position. */
export function chartData(s: PerfSeries | null | undefined, opts: { cumulative?: boolean } = {}): ChartData {
  if (!s) return { labels: [], values: [], prev: [] };
  const raw = s.points.map((p) => p.value);
  const prevRaw = (s.previous ?? []).map((p) => p.value).slice(-raw.length);
  const values = opts.cumulative ? cumulative(raw) : raw;
  const prev = opts.cumulative ? cumulative(prevRaw) : prevRaw;
  return { labels: s.points.map((p) => chartDate(p.date)), values, prev };
}

/** A scheduled offer (its start is after today) shows the board's "This offer starts on …" state. */
export function startsLater(startsOn: string | null | undefined, today: string): boolean {
  return !!startsOn && startsOn > today;
}

/** One of the owner's offers, as the header's selector lists it (my_offers, DB2). */
export interface OfferChoice {
  id: string;
  headline: string;
  status: string | null;
  startsOn: string | null;
}

export function parseOfferChoices(data: unknown): OfferChoice[] {
  return rows(data)
    .map((r) => ({ id: str(r.id) ?? "", headline: str(r.headline) ?? "", status: str(r.status), startsOn: str(r.starts_on)?.slice(0, 10) ?? null }))
    .filter((o) => o.id && o.headline);
}
