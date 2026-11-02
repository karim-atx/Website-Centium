import React from "react";
import type { MetricKey } from "../MetricWidget";
import { mc, useHealthMode } from "./MetricKit";
import { daysOf, monthLetter, monthlyAverages, weekLetter, type Period } from "./periods";
import { isRtl } from "../../../i18n/core";

// The rounded-bar range chart (HE1.2 week pattern), shared by Steps, Water,
// Sleep (duration fallback) and Calories burned. Geometry measured from the
// 2x PNGs (pt = px / 2) inside the handover's viewBox 0 0 326 146:
//   HE1.2-full.png week: baseline #EEEDED 1px at y 118; goal line dashed in
//   the metric ink at y 34.5 (goal = 83.5 tall); bars 20 wide r10, centres
//   25.5 + 46.2 i; day letters 10/700 centred at y 134.5 (today #241F1B
//   700, others #8C8378 600); "Goal 10,000" 10/700 metric ink right-aligned
//   at x 326, y 26; ghost bars 1px #241F1B@18% outline at goal height.
//   HE1.2.y-full.png year: 12 bars 14.5 wide (pitch 27), past months main@45%,
//   the current month full main. HE1.2.m-full.png month: one bar a day 4.5
//   wide (pitch 326/days), main@75%.
// Bars above the goal rescale the axis so the tallest bar tops at y 14.

export interface GoalBar {
  key: string;
  label?: string;
  /** null = nothing logged (no bar; a ghost when `ghost`). */
  value: number | null;
  /** Days / months ahead: outline at goal (or `ghostValue`) height. */
  ghost?: boolean;
  /** Today / this month: full main colour and the bold label. */
  current?: boolean;
}

const BASE = 118;
const GOAL_Y = 34.5;
const TOP = 14;
const X0 = 2.4;
const PLOT_W = 323.6;

export const GoalBarChart: React.FC<{
  metric: MetricKey;
  mode: "week" | "month" | "year";
  bars: GoalBar[];
  goal?: number | null;
  goalLabel?: string;
  /** Height reference for ghosts when there is no goal (Sleep's usual night). */
  ghostValue?: number | null;
  onBarTap?: (key: string) => void;
  /** Accessible label per tappable bar. */
  barLabel?: (bar: GoalBar) => string;
  /** Added (release gate, Sleep year): the reference (goal or ghost) and the tallest bar sit no higher than this y, leaving room above for `overlay`. */
  plotTop?: number;
  /** Added (release gate, Sleep year): extra marks drawn in the same 326-wide svg (the average-bedtime line). */
  overlay?: React.ReactNode;
}> = ({ metric, mode, bars, goal, goalLabel, ghostValue, onBarTap, barLabel, plotTop, overlay }) => {
  const { dark, hc } = useHealthMode();
  const ref = goal ?? ghostValue ?? 1;
  const maxVal = Math.max(0, ...bars.map((b) => b.value ?? 0));
  // Goal (or the ghost reference) sits at GOAL_Y unless a bar passes it.
  const pxPer = maxVal > ref ? (BASE - (plotTop ?? TOP)) / maxVal : (BASE - (plotTop ?? GOAL_Y)) / ref;
  const yOf = (v: number) => BASE - v * pxPer;
  const pitch = PLOT_W / bars.length;
  const width = mode === "week" ? 20 : mode === "year" ? 14.5 : 4.5;
  const rx = mode === "month" ? 2.25 : width / 2;
  const ghostStroke = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)";
  const baseStroke = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.08)";
  const ink = dark ? "#B8B3C7" : mc(metric, "ink");
  const ghostTop = yOf(goal ?? ghostValue ?? ref);
  const labelEvery = mode === "month" ? 7 : 1;
  // Round F (F10): in right to left, time runs from right to left. Every x on
  // the 326 grid is mirrored; SVG text anchors are logical, so the labels follow.
  const rtl = isRtl();
  const mx = (v: number) => (rtl ? 326 - v : v);

  return (
    <svg viewBox="0 0 326 146" width="100%" height={146} role="img" aria-hidden style={{ display: "block", overflow: "visible" }}>
      <line x1={mx(X0)} x2={mx(326)} y1={BASE + 0.5} y2={BASE + 0.5} stroke={baseStroke} strokeWidth={1} />
      {bars.map((b, i) => {
        const cx = mx(X0 + pitch * (i + 0.5));
        const x = cx - width / 2;
        let shape: React.ReactNode = null;
        if (b.value !== null && b.value > 0) {
          const top = Math.min(yOf(b.value), BASE - width);
          const fill = mode === "week" || b.current ? mc(metric, "main") : mc(metric, "main", mode === "month" ? 0.75 : 0.45);
          shape = <rect x={x} y={top} width={width} height={BASE - top} rx={rx} fill={fill} />;
        } else if (b.ghost) {
          shape = <rect x={x + 0.5} y={ghostTop + 0.5} width={width - 1} height={BASE - ghostTop - 1} rx={Math.max(0, rx - 0.5)} fill="none" stroke={ghostStroke} strokeWidth={1} />;
        }
        const showLabel = b.label && (labelEvery === 1 || i % labelEvery === 0);
        const content = (
          <>
            {shape}
            {showLabel && (
              <text
                x={cx}
                y={138}
                textAnchor="middle"
                fontSize={10}
                fontWeight={b.current ? 700 : 600}
                fill={b.current ? "rgb(var(--c-charcoal))" : hc ? "rgb(var(--c-charcoal))" : dark ? "#B8B3C7" : "#8C8378"}
              >
                {b.label}
              </text>
            )}
          </>
        );
        if (onBarTap && (b.value !== null || b.ghost)) {
          return (
            <g
              key={b.key}
              role="button"
              tabIndex={0}
              aria-label={barLabel?.(b)}
              style={{ cursor: "pointer", outline: "none" }}
              onClick={() => onBarTap(b.key)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onBarTap(b.key))}
            >
              <rect x={cx - pitch / 2} y={0} width={pitch} height={146} fill="transparent" />
              {content}
            </g>
          );
        }
        return <g key={b.key}>{content}</g>;
      })}
      {goal != null && (
        <>
          <line x1={mx(X0)} x2={mx(326)} y1={yOf(goal)} y2={yOf(goal)} stroke={ink} strokeWidth={1.5} strokeDasharray="4 4" />
          {goalLabel && (
            <text x={mx(326)} y={yOf(goal) - 6} textAnchor="end" fontSize={10} fontWeight={700} fill={ink}>
              {goalLabel}
            </text>
          )}
        </>
      )}
      {overlay}
    </svg>
  );
};

/** Legend swatches (HE1.2 #36-#38): filled 10 dot, ghost 10 r3 outline, dashed goal 14. */
export const LegendDot: React.FC<{ color: string; radius?: number }> = ({ color, radius = 9999 }) => (
  <span aria-hidden className="inline-block shrink-0" style={{ width: 10, height: 10, borderRadius: radius, background: color }} />
);
export const LegendGhost: React.FC = () => {
  const { dark } = useHealthMode();
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{ width: 10, height: 10, borderRadius: 3, border: `1px solid ${dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)"}` }}
    />
  );
};
export const LegendDash: React.FC<{ color: string; strokeWidth?: number; dash?: string }> = ({ color, strokeWidth = 1.5, dash = "3 2" }) => (
  <svg aria-hidden width={14} height={10} viewBox="0 0 14 10">
    <line x1={0} x2={14} y1={5} y2={5} stroke={color} strokeWidth={strokeWidth} strokeDasharray={dash} />
  </svg>
);


/**
 * Bars for a week / month / year period from a day-keyed series (logged days
 * only; a zero or missing day is not logged). Days or months after today are
 * ghosts; today / this month is `current`.
 */
export function buildGoalBars(
  p: Period,
  series: Record<string, number>,
  today: string
): GoalBar[] {
  const logged = (d: string) => (series[d] !== undefined && series[d] > 0 ? series[d] : null);
  if (p.range === "week" || p.range === "month") {
    return daysOf(p).map((d, i) => ({
      key: d,
      label: p.range === "week" ? weekLetter(i) : String(Number(d.slice(8))),
      value: logged(d),
      ghost: d > today,
      current: d === today,
    }));
  }
  const year = Number(p.start.slice(0, 4));
  const rows = Object.entries(series)
    .filter(([, v]) => v > 0)
    .map(([date, value]) => ({ date, value }));
  const months = monthlyAverages(rows, year);
  const thisMonth = today.slice(0, 7);
  return months.map((v, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { key, label: monthLetter(i + 1), value: v, ghost: key > thisMonth, current: key === thisMonth };
  });
}
