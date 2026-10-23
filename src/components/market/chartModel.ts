// Market + Share 3.0 · ChartCard / HeroStatCard geometry. Pure, ported
// literally from the screen files' script (Professional Marketplace Screens
// `lineGeo`, `scrub`, `barCard`, `lineCard`; Business Marketplace Screens
// `scrubber`, `lineCardData`, the B-MA.7 `red` bars and `rate` funnel). The
// only change is the width: the board draws a fixed 326 inside a 322 card
// body (it overflows by 4); the component passes the measured body width.

export interface LineGeo {
  line: string;
  area: string;
  px: (i: number) => number;
  py: (v: number) => number;
  max: number;
}

/** The board's chart padding: 10 above the top value and under the zero line. */
export const CHART_PAD = 10;

/**
 * `lineGeo(vals, w, h, max)` from the screen files: points spread across the
 * width (one point sits in the middle), the top at 1.1 × the largest value
 * (at least 1), 10 px padding top and bottom, coordinates to 1 decimal.
 */
export function lineGeo(vals: readonly number[], w: number, h: number, max?: number): LineGeo {
  const n = vals.length;
  const m = max || Math.max(1, ...vals) * 1.1;
  const px = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const py = (v: number) => h - CHART_PAD - (v / m) * (h - 2 * CHART_PAD);
  if (n === 0) return { line: "M0 0", area: "M0 0", px, py, max: m };
  const line = "M" + vals.map((v, i) => px(i).toFixed(1) + " " + py(v).toFixed(1)).join(" L");
  return { line, area: line + " L" + w + " " + h + " L0 " + h + " Z", px, py, max: m };
}

/**
 * The HeroStatCard sparkline (358 × 64). No data (or all zero) is the P-MA.1
 * "Empty · new listing" drawing: a flat line at y 54, dashed "4 5", no area.
 */
export function sparkline(series: readonly number[] | null | undefined, w = 358, h = 64): { line: string; area: string; dash: string | undefined } {
  if (!series || series.length === 0 || series.every((v) => !v)) return { line: `M0 ${h - 10} L${w} ${h - 10}`, area: `M0 ${h} L0 ${h} Z`, dash: "4 5" };
  const g = lineGeo(series, w, h);
  return { line: g.line, area: g.area, dash: undefined };
}

/** `scrub` / `scrubber`: the nearest point to a pointer x, clamped to 0..n-1. */
export function scrubIndex(x: number, width: number, n: number): number {
  if (n <= 0) return -1;
  return Math.max(0, Math.min(n - 1, Math.round((x / Math.max(1, width)) * (n - 1))));
}

/**
 * The bar under a pointer x (the board taps each bar; the component hit-tests
 * the whole plot so every bar has a full-height target): floor(x / slot).
 */
export function barIndexAt(x: number, width: number, n: number): number {
  if (n <= 0) return -1;
  return Math.max(0, Math.min(n - 1, Math.floor((x / Math.max(1, width)) * n)));
}

/** A bar's centre (the tooltip anchor): (i + 0.5) / n of the width. */
export const barCentre = (i: number, width: number, n: number): number => ((i + 0.5) / Math.max(1, n)) * width;

/** Bar heights: value / max × 96, at least 2 (rounded), as `barCard`. */
export function barHeights(vals: readonly number[], maxPx = 96, minPx = 2): number[] {
  const m = Math.max(1, ...vals);
  return vals.map((v) => Math.max(minPx, Math.round((v / m) * maxPx)));
}

/** The gap between bars by count: > 40 → 1, > 20 → 3, > 10 → 6, else 10. */
export const barGap = (n: number): number => (n > 40 ? 1 : n > 20 ? 3 : n > 10 ? 6 : 10);

/** The tooltip's left: centred on x (width 110), kept inside the plot. */
export function tooltipLeft(x: number, width: number, tipWidth = 110): number {
  return Math.max(0, Math.min(width - tipWidth, x - tipWidth / 2));
}

/**
 * A funnel bar's width in px: the fraction of the track, at least 6 px
 * (`min-width: 6px` on the board), never past the track.
 */
export function funnelWidth(fraction: number, trackPx: number, minPx = 6): number {
  const f = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
  return Math.min(trackPx, Math.max(minPx, f * trackPx));
}

/** The axis labels: first, middle (floor((n - 1) / 2)) and last. */
export function axisLabels(labels: readonly string[]): [string, string, string] {
  const n = labels.length;
  if (n === 0) return ["", "", ""];
  return [labels[0], labels[Math.floor((n - 1) / 2)], labels[n - 1]];
}

/** The expanded chart's bars as one path (B-MA.7 `ex.bars`): 70% of each slot, from the base up. */
export function barsPath(vals: readonly number[], w: number, h: number, max: number): string {
  const n = vals.length;
  if (!n) return "M0 0";
  const g = lineGeo(vals, w, h, max);
  const bw = w / n;
  const inner = Math.max(1, bw * 0.7);
  return vals
    .map((v, k) => {
      const x = k * bw + (bw - inner) / 2;
      return "M" + x.toFixed(1) + " " + h + "V" + g.py(v).toFixed(1) + "H" + (x + inner).toFixed(1) + "V" + h + "Z";
    })
    .join(" ");
}

/** The previous period over bars: a line through the slot centres (B-MA.7 `prevPath` for bars). */
export function centredLine(vals: readonly number[], w: number, h: number, max: number): string {
  const n = vals.length;
  if (!n) return "M0 0";
  const g = lineGeo(vals, w, h, max);
  const bw = w / n;
  return "M" + vals.map((v, k) => ((k + 0.5) * bw).toFixed(1) + " " + g.py(v).toFixed(1)).join(" L");
}
