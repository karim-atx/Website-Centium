// Market + Share 3.0 · W3 · B-MA.7 Offer Performance and P-MA.6 Performance:
// pure parsing and formatting for the DB5 readers (PLAN §2.2 DB5, api.md
// "Listing and performance", types.ts `PerformanceSeries`). No Supabase
// import, so it runs under node:test.
//
// Shapes (Database PR #39, 20261214030000; the six column names are pinned
// by an assertion there): one row
//   { range, metric, total, delta_pct, points: [{ date, value }], previous }
// where `points` are daily for 7D / 30D and weekly for 90D / 12M (zeros, not
// gaps), `previous` is the previous period's points when p_compare is true
// (else null), and delta_pct is the RELATIVE change against the previous
// window (round(…, 1)), null when that window was empty. For a rate
// (conversion) the board shows the change in percentage points ("+0.1 pt"),
// which ratePtChange derives from the total and that relative change.
//
// The screen files' script is the spec for what the charts show:
// - RANGES: 7D "week", 30D "30 days", 90D "90 days", 12M "12 months";
// - `pct(d)`: "+12%" / "−3%" (U+2212), rounded to a whole percent;
// - the points chart is cumulative (`acc += v`), the previous one too;
// - the rate funnel's second bar is max(0.5, rate)% of the track
//   (Business `rate.w`); the professional funnel scales its steps × 8
//   (Professional `steps[].w`), at least 1%;
// - dates are month first (D-02): "Oct 16".
// Every date is the owner's own local day (Database PR #40, 20261215020000:
// business_timezone() / user_timezone() for the window, the buckets and the
// recorders), so a point's date is shown exactly as sent (chartDate reads it
// as a calendar date; no client time-zone shift).

import { num, rows } from "./parse";
import { appLocale } from "../../i18n/format";

export type PerfRange = "7D" | "30D" | "90D" | "12M";
export const PERF_RANGES: readonly PerfRange[] = ["7D", "30D", "90D", "12M"];
export const DEFAULT_RANGE: PerfRange = "30D";

/** "vs previous {unit}", "This {unit}" (RANGES[k].unit). */
export const RANGE_UNIT: Record<PerfRange, string> = { "7D": "week", "30D": "30 days", "90D": "90 days", "12M": "12 months" };

export const isPerfRange = (v: unknown): v is PerfRange => typeof v === "string" && (PERF_RANGES as readonly string[]).includes(v);

export type OfferMetric = "offer_views" | "redemptions" | "points_redeemed" | "conversion";
export type ProMetric = "profile_views" | "hire_requests" | "hired" | "vouchers_redeemed" | "points_spent" | "conversion";
export const OFFER_METRICS: readonly OfferMetric[] = ["offer_views", "redemptions", "points_redeemed", "conversion"];
export const PRO_METRICS: readonly ProMetric[] = ["profile_views", "hire_requests", "hired", "vouchers_redeemed", "points_spent", "conversion"];
/**
 * What P-MA.6 asks professional_performance for. `hired` (Database PR #40:
 * business_hires by hired_at, the funnel's third step; not part of
 * hire_requests) is the funnel's last step. Not `conversion`: the server's
 * is vouchers redeemed over views, while the screen's funnel is the hire rate
 * (hire requests over views), derived here (rateOverTime, proRatePt).
 */
export type ProFetched = Exclude<ProMetric, "conversion">;
export const PRO_FETCHED: readonly ProFetched[] = ["profile_views", "hire_requests", "hired", "vouchers_redeemed", "points_spent"];

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

/** The first row of an offer_performance / professional_performance answer (exactly the six columns), or null. */
export function parsePerformance(data: unknown, fallbackRange: PerfRange = DEFAULT_RANGE): PerfSeries | null {
  const r = rows(data)[0];
  if (!r) return null;
  return {
    range: isPerfRange(r.range) ? r.range : fallbackRange,
    metric: typeof r.metric === "string" ? r.metric : "",
    total: num(r.total) ?? 0,
    deltaPct: num(r.delta_pct),
    points: points(r.points),
    previous: r.previous == null ? null : points(r.previous),
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
export const fmtCount = (n: number): string => Math.round(n).toLocaleString(appLocale("en-US"));

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

/**
 * The previous window's total from this one and delta_pct: 0 when delta_pct
 * is null (the server sends null only when that window was empty); null when
 * it can't be known (−100%: this window is 0, so any earlier total fits).
 */
export function previousTotal(total: number, deltaPct: number | null | undefined): number | null {
  if (deltaPct === null || deltaPct === undefined) return 0;
  if (!Number.isFinite(deltaPct) || deltaPct <= -100) return null;
  return (total * 100) / (100 + deltaPct);
}

/**
 * A rate's change in percentage points (offer_performance 'conversion'),
 * from its total and the server's relative delta_pct; null with nothing to
 * compare (an empty previous window, as the server's null says).
 */
export function ratePtChange(rate: number, deltaPct: number | null | undefined): number | null {
  if (deltaPct === null || deltaPct === undefined) return null;
  const prev = previousTotal(rate, deltaPct);
  return prev === null ? null : rate - prev;
}

/**
 * P-MA.6's hire rate change in points: (hires / views) now minus before,
 * each previous total derived from its own delta_pct; null without previous
 * views to divide by.
 */
export function proRatePt(views: PerfSeries | null | undefined, hires: PerfSeries | null | undefined): number | null {
  if (!views || !hires) return null;
  const pv = previousTotal(views.total, views.deltaPct);
  const ph = previousTotal(hires.total, hires.deltaPct);
  if (!pv || ph === null) return null;
  return ratePct(hires.total, views.total) - ratePct(ph, pv);
}

/** A rate per bucket, part over whole × 100 (0 where the whole is 0), on the whole's dates (the board's `vH[j] / vV[j]`). */
export function rateOverTime(part: PerfSeries | null | undefined, whole: PerfSeries | null | undefined): PerfSeries | null {
  if (!whole) return null;
  const by = new Map((part?.points ?? []).map((p) => [p.date, p.value]));
  return {
    range: whole.range,
    metric: "rate",
    total: ratePct(part?.total ?? 0, whole.total),
    deltaPct: null,
    points: whole.points.map((p) => ({ date: p.date, value: ratePct(by.get(p.date) ?? 0, p.value) })),
    previous: null,
  };
}

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

/** One of the business's offers, as the header's selector lists it (DB2 `offers`). */
export interface OfferChoice {
  id: string;
  headline: string;
  startsOn: string | null;
}

