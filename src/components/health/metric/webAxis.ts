import { createContext, useContext } from "react";
import { hourLabel12 } from "../../../utils/time12";
import { dayWord, monthShort } from "./periods";

// Website viewport v1: the tick and label helpers of the web axis chart (WebAxisChart.tsx).

/** The plot's height. The reference grows it to fill the viewport (flex: 1); a fixed height is not specified there. */
export const PLOT_H = 280;

/** Ticks from 0 at a round step (1, 2, 2.5 or 5 × 10^n), about four, with room above the top value. */
export function niceTicks(top: number): { max: number; ticks: number[] } {
  if (!(top > 0)) return { max: 1, ticks: [0] };
  const raw = top / 3;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
  const n = Math.ceil(top / step);
  const ticks = Array.from({ length: n + 1 }, (_, i) => i * step);
  // The plot tops out a sixth of a step above the highest tick.
  return { max: n * step + step / 6, ticks };
}

/** "12k" / "3k" / "800" style tick labels. */
export const kLabel = (v: number) => (v >= 1000 ? `${Number.isInteger(v / 1000) ? v / 1000 : (v / 1000).toFixed(1)}k` : String(Math.round(v)));

/** x label for a week / month / year bar keyed by day ("YYYY-MM-DD") or month ("YYYY-MM"). */
export function axisLabel(mode: "week" | "month" | "year", key: string, i: number): string {
  if (mode === "week") return dayWord(key).replace(/,$/, "");
  if (mode === "year") return monthShort(Number(key.slice(5, 7)));
  return i % 5 === 0 ? String(Number(key.slice(8, 10))) : "";
}

/** x label for hour `h` of a day: every 3rd hour ("12 AM", "3 AM" …). */
export const hourAxisLabel = (h: number) => (h % 3 === 0 ? hourLabel12(h) : "");

/** Ticks over [lo, hi] at a round step (1, 2 or 5 × 10^n), about `target` of them; the scale ends on ticks. */
export function rangeTicks(lo: number, hi: number, target = 4): { min: number; max: number; ticks: number[] } {
  if (!(hi > lo)) return rangeTicks(lo - 1, lo + 1, target);
  const raw = (hi - lo) / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const n = Math.round((max - min) / step);
  return { min, max, ticks: Array.from({ length: n + 1 }, (_, i) => +(min + i * step).toFixed(6)) };
}

/** The column geometry of a web plot: its measured width (0 until measured), the number of columns and the gap between them. */
export interface PlotGeom {
  width: number;
  n: number;
  gap: number;
}
export const PlotGeomContext = createContext<PlotGeom | null>(null);
export const usePlotGeom = () => useContext(PlotGeomContext);

/** Column width of a plot. */
export const colWidth = (g: PlotGeom) => (g.width - g.gap * Math.max(0, g.n - 1)) / Math.max(1, g.n);
/** x of column position `pos` (column i's centre at pos = i; fractions in between), from the start edge. */
export const colX = (g: PlotGeom, pos: number) => colWidth(g) / 2 + pos * (colWidth(g) + g.gap);
