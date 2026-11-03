import React from "react";
import type { MetricKey } from "../MetricWidget";
import { PLOT_H, PlotGeomContext, colX, niceTicks, usePlotGeom, type PlotGeom } from "./webAxis";
import { isRtl } from "../../../i18n/core";

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
  /** A strip above the plot on the same columns (Sleep year's bedtime line). */
  band?: React.ReactNode;
}> = ({ metric, bars, goal, goalLabel, tickLabel, onBarTap, band }) => {
  const top = Math.max(goal ?? 0, ...bars.map((b) => b.value ?? 0));
  const { max, ticks } = niceTicks(top);
  const y = (v: number) => (1 - v / max) * 100;
  const many = bars.length > 20;
  // Nothing in the whole period (the reference's empty state): every column a 2 tall #241F1B@6% stub.
  const none = bars.every((b) => !(b.value !== null && b.value > 0));
  const gap = many ? 4 : 12;
  const radius = many ? 3 : 8;
  return (
    <div data-web-axis-chart>
      {band && (
        <PlotBand n={bars.length} gap={gap}>
          {band}
        </PlotBand>
      )}
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
            const style: React.CSSProperties = none
              ? { height: 2, background: "rgba(36,31,27,0.06)" }
              : b.value !== null && b.value > 0
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

// ---------------------------------------------------------------------------
// The same axis frame for charts that are not bars from zero: the reference's
// line charts (Blood pressure, Weight: "isLine", a 2px main polyline through
// the points with white dots and the latest filled in the accent), and the
// repo's own shapes drawn on it (Heart rate bars from 40 bpm, Sleep's
// bedtime-to-wake bars on a clock axis). Columns share the width as the bars
// do (flex 1, the gap between), so x labels sit under each column's centre.

/** Measured width of an element (0 until measured). */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** A strip above a plot (48 tall, m-bottom 8, 40 in), sharing its columns. */
const PlotBand: React.FC<{ n: number; gap: number; height?: number; children: React.ReactNode }> = ({ n, gap, height = 48, children }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    <PlotGeomContext.Provider value={{ width, n, gap }}>
      <div ref={ref} className="relative" style={{ height, marginInlineStart: 40, marginBottom: 8 }} data-web-plot-band>
        {children}
      </div>
    </PlotGeomContext.Provider>
  );
};

export interface PlotRefLine {
  v: number;
  label?: string;
  ink: string;
  /** Label under the rule instead of above it. */
  below?: boolean;
  /** Label at the start edge instead of the end. */
  start?: boolean;
  solid?: boolean;
}

/**
 * The frame: plot PLOT_H tall, 40 in from the start edge; tick rules 1px
 * #241F1B@6% with labels 11 600 #8C8378 (32 wide, end-aligned, top -9);
 * reference rules 1.5 dashed in their ink, the label 11 700 20 above the rule
 * at the end (the reference's goal rule); x labels 11/16 600 #8C8378 centred
 * under each column (m-top 8).
 */
export const WebPlotFrame: React.FC<{
  ticks: { v: number; label: string }[];
  /** % from the plot's top. */
  y: (v: number) => number;
  labels: string[];
  gap: number;
  refLines?: PlotRefLine[];
  children?: React.ReactNode;
}> = ({ ticks, y, labels, gap, refLines, children }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const geom: PlotGeom = { width, n: labels.length, gap };
  return (
    <PlotGeomContext.Provider value={geom}>
      <div data-web-axis-chart>
        <div ref={ref} className="relative" style={{ height: PLOT_H, marginInlineStart: 40 }}>
          {ticks.map((tk) => (
            <div key={tk.v} className="absolute" style={{ insetInline: 0, top: `${y(tk.v)}%`, borderTop: "1px solid rgba(36,31,27,0.06)" }} data-tick>
              {tk.label && (
                <span className="absolute" style={{ insetInlineStart: -40, top: -9, width: 32, textAlign: "end", fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "#8C8378", whiteSpace: "nowrap" }}>
                  {tk.label}
                </span>
              )}
            </div>
          ))}
          {children}
          {refLines?.map((r) => (
            <div key={`${r.v}-${r.label ?? ""}`} className="absolute pointer-events-none" style={{ insetInline: 0, top: `${y(r.v)}%`, borderTop: `1.5px ${r.solid ? "solid" : "dashed"} ${r.ink}` }} data-ref-line>
              {r.label && (
                <span
                  className="absolute whitespace-nowrap"
                  style={{ ...(r.start ? { insetInlineStart: 0 } : { insetInlineEnd: 0 }), top: r.below ? 4 : -20, fontSize: 11, lineHeight: "16px", fontWeight: 700, color: r.ink }}
                >
                  {r.label}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="flex" style={{ gap, margin: "8px 0 0", marginInlineStart: 40 }} aria-hidden>
          {labels.map((l, i) => (
            <span key={i} className="flex-1 min-w-0 text-center whitespace-nowrap" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "#8C8378" }}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </PlotGeomContext.Provider>
  );
};

export interface FloatBar {
  key: string;
  /** Both ends in the scale's units; null = nothing in that column. */
  from: number | null;
  to: number | null;
  /** Columns ahead: an outline (1px #241F1B@12%) over this span. */
  ghost?: { from: number; to: number } | null;
  current?: boolean;
  ariaLabel?: string;
}

/** Bars between two values (r8; r3 above 20 columns): past in the metric main, the current column in the accent. */
export const FloatBarsWeb: React.FC<{
  metric: MetricKey;
  bars: FloatBar[];
  y: (v: number) => number;
  gap: number;
  onBarTap?: (key: string) => void;
  /** false: no stubs when no column has a bar (a day drawn by other marks). */
  emptyStubs?: boolean;
}> = ({ metric, bars, y, gap, onBarTap, emptyStubs = true }) => {
  const radius = bars.length > 20 ? 3 : 8;
  const none = emptyStubs && bars.every((b) => b.from === null || b.to === null);
  const span = (a: number, b: number): React.CSSProperties => {
    const top = Math.min(y(a), y(b));
    const bottom = Math.max(y(a), y(b));
    return { top: `${top}%`, height: `max(2px, ${bottom - top}%)` };
  };
  return (
    <div className="absolute inset-0 flex" style={{ gap }}>
      {bars.map((b) => {
        const has = b.from !== null && b.to !== null;
        const shape = none ? (
          <span aria-hidden className="absolute inset-x-0 bottom-0" style={{ height: 2, borderRadius: radius, background: "rgba(36,31,27,0.06)" }} data-stub />
        ) : has ? (
          <span aria-hidden className="absolute inset-x-0" style={{ ...span(b.from as number, b.to as number), borderRadius: radius, background: b.current ? mc(metric, "accent") : mc(metric, "main") }} data-bar={b.key} />
        ) : b.ghost ? (
          <span aria-hidden className="absolute inset-x-0" style={{ ...span(b.ghost.from, b.ghost.to), borderRadius: radius, border: "1px solid rgba(36,31,27,0.12)", boxSizing: "border-box" }} data-ghost />
        ) : null;
        return onBarTap && has ? (
          <button
            key={b.key}
            type="button"
            onClick={() => onBarTap(b.key)}
            aria-label={b.ariaLabel}
            className="relative flex-1 min-w-0 h-full hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ borderRadius: radius }}
          >
            {shape}
          </button>
        ) : (
          <span key={b.key} className="relative flex-1 min-w-0 h-full" role={b.ariaLabel ? "img" : undefined} aria-label={b.ariaLabel}>
            {shape}
          </span>
        );
      })}
    </div>
  );
};

export interface PlotPoint {
  /** Column position (column i's centre at i; fractions in between). */
  pos: number;
  v: number;
  /** "dot": white with a ring in the line's colour; "fill": filled (the latest); "none": on the line only. */
  kind?: "dot" | "fill" | "none";
  fill?: string;
  r?: number;
  /** A value label 11 700 #241F1B, 12 above the dot. */
  label?: string;
}

/**
 * A line through points on the frame's columns: `width` (2) in `stroke`,
 * round joins; dots r4 white with a 1.5 ring in the stroke, the latest r6
 * filled (`fill`, default the stroke) in a 2 white ring (none under r4). The reference draws
 * its line in a stretched 100 × 100 box (its dots come out as ellipses); here
 * the box is the plot's own pixels, so the dot sizes are ours (unspecified).
 * `height`: the box's height (PLOT_H; a band's own height).
 */
export const PlotLineWeb: React.FC<{
  points: PlotPoint[];
  y: (v: number) => number;
  stroke: string;
  dash?: string;
  width?: number;
  height?: number;
}> = ({ points, y, stroke, dash, width = 2, height = PLOT_H }) => {
  const g = usePlotGeom();
  if (!g || g.width <= 0 || !points.length) return null;
  const rtl = isRtl();
  const X = (pos: number) => {
    const x = colX(g, pos);
    return rtl ? g.width - x : x;
  };
  const Y = (v: number) => (y(v) / 100) * height;
  return (
    <svg className="absolute inset-0 pointer-events-none" width={g.width} height={height} viewBox={`0 0 ${g.width} ${height}`} style={{ overflow: "visible" }} aria-hidden data-plot-line>
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${X(p.pos).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={dash}
        />
      )}
      {points.map((p, i) =>
        p.kind === "none" ? null : (
          <g key={i}>
            <circle
              cx={X(p.pos)}
              cy={Y(p.v)}
              r={p.r ?? (p.kind === "fill" ? 6 : 4)}
              fill={p.kind === "fill" ? (p.fill ?? stroke) : "#FFFFFF"}
              stroke={p.kind === "fill" ? "#FFFFFF" : stroke}
              strokeWidth={p.kind === "fill" ? ((p.r ?? 6) < 4 ? 0 : 2) : 1.5}
              data-dot={p.kind ?? "dot"}
            />
            {p.label && (
              <text x={X(p.pos)} y={Y(p.v) - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#241F1B">
                {p.label}
              </text>
            )}
          </g>
        )
      )}
    </svg>
  );
};
