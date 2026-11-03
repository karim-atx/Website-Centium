import React from "react";
import type { MetricKey } from "../MetricWidget";
import { PLOT_H, niceTicks } from "./webAxis";

// Website viewport v1 · the axis-labelled bar chart of the Health metric pages
// (WC-HE Health Web v5, the chart <section> of each "<metric>-<range>" screen),
// drawn in HTML at the card's width instead of the mobile 326-wide SVG:
// - the plot sits 40 in from the start edge (m 12 0 0 40); each tick is a
//   1px #241F1B@6% rule across it with its label 11 600 #8C8378, 32 wide,
//   end-aligned in that 40 gutter (top -9);
// - the goal is a 1.5px dashed rule in the metric ink, its label 11 700 in
//   the ink at the end, 20 above the rule;
// - bars share the width (flex 1) with gap 12 and r8 (gap 4 and r3 above 20
//   bars); past bars in the metric main, today / this month in the accent;
//   bars ahead are outlines (1px #241F1B@12%) at full height;
// - x labels 11/16 600 #8C8378 centred under each bar (m-top 8): weekday
//   names for a week, every 5th day for a month, month names for a year,
//   every 3rd hour for a day.
// The plot height is fixed (PLOT_H in webAxis.ts).

const mc = (metric: MetricKey, part: "main" | "accent" | "ink") => `rgb(var(--metric-${metric}-${part}))`;

export interface AxisBar {
  key: string;
  value: number | null;
  ghost?: boolean;
  current?: boolean;
  /** x label ("" = none). */
  label: string;
  ariaLabel?: string;
}

export const AxisBarsWeb: React.FC<{
  metric: MetricKey;
  bars: AxisBar[];
  goal?: number | null;
  goalLabel?: string;
  /** null = gridlines without labels (the day view). */
  tickLabel: ((v: number) => string) | null;
  onBarTap?: (key: string) => void;
}> = ({ metric, bars, goal, goalLabel, tickLabel, onBarTap }) => {
  const top = Math.max(goal ?? 0, ...bars.map((b) => b.value ?? 0));
  const { max, ticks } = niceTicks(top);
  const y = (v: number) => (1 - v / max) * 100;
  const many = bars.length > 20;
  const gap = many ? 4 : 12;
  const radius = many ? 3 : 8;
  return (
    <div data-web-axis-chart>
      <div className="relative" style={{ height: PLOT_H, marginInlineStart: 40 }}>
        {ticks.map((v) => (
          <div key={v} className="absolute" style={{ insetInline: 0, top: `${y(v)}%`, borderTop: "1px solid rgba(36,31,27,0.06)" }} data-tick>
            {tickLabel && (
              <span className="absolute" style={{ insetInlineStart: -40, top: -9, width: 32, textAlign: "end", fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "#8C8378", whiteSpace: "nowrap" }}>
                {tickLabel(v)}
              </span>
            )}
          </div>
        ))}
        <div className="absolute inset-0 flex items-end" style={{ gap }}>
          {bars.map((b) => {
            const style: React.CSSProperties =
              b.value !== null && b.value > 0
                ? { height: `${Math.max(2, 100 - y(b.value))}%`, background: b.current ? mc(metric, "accent") : mc(metric, "main") }
                : b.ghost
                  ? { height: "100%", background: "transparent", border: "1px solid rgba(36,31,27,0.12)" }
                  : { height: 0 };
            const shape = <span aria-hidden className="block w-full" style={{ ...style, borderRadius: radius, boxSizing: "border-box" }} data-bar={b.key} />;
            return onBarTap && (b.value !== null || b.ghost) ? (
              <button
                key={b.key}
                type="button"
                onClick={() => onBarTap(b.key)}
                aria-label={b.ariaLabel}
                className="flex-1 min-w-0 h-full flex items-end hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                style={{ borderRadius: radius }}
              >
                {shape}
              </button>
            ) : (
              <span key={b.key} className="flex-1 min-w-0 h-full flex items-end" role="img" aria-label={b.ariaLabel}>
                {shape}
              </span>
            );
          })}
        </div>
        {goal != null && goal > 0 && (
          <div className="absolute pointer-events-none" style={{ insetInline: 0, top: `${y(goal)}%`, borderTop: `1.5px dashed ${mc(metric, "ink")}` }} data-goal>
            {goalLabel && (
              <span className="absolute whitespace-nowrap" style={{ insetInlineEnd: 0, top: -20, fontSize: 11, lineHeight: "16px", fontWeight: 700, color: mc(metric, "ink") }}>
                {goalLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex" style={{ gap, margin: "8px 0 0", marginInlineStart: 40 }} aria-hidden>
        {bars.map((b) => (
          <span key={b.key} className="flex-1 min-w-0 text-center whitespace-nowrap" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "#8C8378" }}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
};
