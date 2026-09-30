import React, { useEffect, useId, useRef, useState } from "react";
import { trendTicks } from "../../utils/chartTicks";

export interface TrendPoint {
  /** Milliseconds; points are placed along x by time. */
  t: number;
  value: number;
  /** The x-axis / scrubber date, e.g. "Sep 27". */
  label: string;
}

// Measured from the WO16 frame (scale 1): the plot runs from 46px in from the
// left edge (the y labels' column) to 21px from the right; the scrubber label
// sits above it, the dates below it.
const LEFT = 46;
const RIGHT = 21;
const PLOT_TOP = 35;
const PLOT_H = 56;
const HEIGHT = 125;
const AXIS = "#A79E93";
const GRID = "rgba(36,31,27,0.07)";

/**
 * The line chart shared by WO16 (measurement history) and WO4.1 (the Metrics
 * hero): y axis with three ticks (the top one carries the unit), the first,
 * middle and last dates below, a line with a gradient fill, a dot per point,
 * and a scrubber — drag or tap across the chart, or use the arrow keys — whose
 * label reads "<date> · <value> <unit>". Everything takes one `color`.
 * `points` oldest first; the scrubber starts on the newest.
 */
export const TrendChart: React.FC<{
  points: TrendPoint[];
  color: string;
  unit: string;
  /** For the middle date label, which is a time and not always a point. */
  formatDate: (t: number) => string;
  ariaLabel: string;
}> = ({ points, color, unit, formatDate, ariaLabel }) => {
  const gradientId = useId();
  const box = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  // A picked point that no longer exists (deleted) falls back to the newest.
  const sel = picked !== null && picked < n ? picked : n - 1;
  const plotW = Math.max(0, width - LEFT - RIGHT);
  const t0 = n ? points[0].t : 0;
  const t1 = n ? points[n - 1].t : 0;
  const span = t1 - t0;
  const xAt = (i: number) =>
    LEFT + (n < 2 ? plotW : span > 0 ? ((points[i].t - t0) / span) * plotW : (i / (n - 1)) * plotW);
  const ticks = n ? trendTicks(points.map((p) => p.value)) : ([0, 1, 2] as const);
  const yAt = (v: number) => PLOT_TOP + PLOT_H - ((v - ticks[0]) / (ticks[2] - ticks[0])) * PLOT_H;

  const pickAt = (clientX: number) => {
    const el = box.current;
    if (!el || n === 0) return;
    const x = clientX - el.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(xAt(i) - x) < Math.abs(xAt(best) - x)) best = i;
    setPicked(best);
  };

  const line = points.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");
  const area = n > 1 ? `${line} L${xAt(n - 1).toFixed(1)},${PLOT_TOP + PLOT_H} L${xAt(0).toFixed(1)},${PLOT_TOP + PLOT_H} Z` : "";
  const sx = n ? xAt(sel) : 0;
  const scrubLabel = n ? `${points[sel].label} · ${points[sel].value} ${unit}` : "";
  // The label centres on the scrubber, kept inside the chart.
  const labelAnchor = sx > width - 60 ? "end" : sx < LEFT + 40 ? "start" : "middle";

  return (
    <div
      ref={box}
      className="relative select-none"
      style={{ height: HEIGHT, touchAction: "pan-y" }}
      tabIndex={0}
      role="img"
      aria-label={`${ariaLabel}. ${scrubLabel}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        pickAt(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons || e.pointerType === "mouse") pickAt(e.clientX);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPicked(Math.max(0, sel - 1));
        else if (e.key === "ArrowRight") setPicked(Math.min(n - 1, sel + 1));
      }}
    >
      {width > 0 && n > 0 && (
        <svg width={width} height={HEIGHT} className="block" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {ticks.map((v, i) => (
            <g key={i}>
              <line x1={LEFT} x2={width - RIGHT} y1={yAt(v)} y2={yAt(v)} stroke={GRID} strokeWidth={1} />
              <text x={16} y={yAt(v) + 3} fontSize={8.5} fill={AXIS}>
                {i === 2 ? `${v} ${unit}` : v}
              </text>
            </g>
          ))}

          {area && <path d={area} fill={`url(#${gradientId})`} />}
          {n > 1 && <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}

          <line x1={sx} x2={sx} y1={15} y2={PLOT_TOP + PLOT_H} stroke={color} strokeWidth={1} />
          <text x={sx} y={11} fontSize={9.5} fontWeight={700} fill={color} textAnchor={labelAnchor}>
            {scrubLabel}
          </text>

          {points.map((p, i) =>
            i === sel ? (
              <g key={i}>
                <circle cx={xAt(i)} cy={yAt(p.value)} r={6} fill={color} fillOpacity={0.2} />
                <circle cx={xAt(i)} cy={yAt(p.value)} r={4} fill="#FFFFFF" />
                <circle cx={xAt(i)} cy={yAt(p.value)} r={3} fill={color} />
              </g>
            ) : (
              <circle key={i} cx={xAt(i)} cy={yAt(p.value)} r={3} fill="#FFFFFF" stroke={color} strokeWidth={1.5} />
            )
          )}

          <text x={LEFT} y={121} fontSize={8.5} fill={AXIS}>
            {points[0].label}
          </text>
          {n > 2 && span > 0 && (
            <text x={LEFT + plotW / 2} y={121} fontSize={8.5} fill={AXIS} textAnchor="middle">
              {formatDate(t0 + span / 2)}
            </text>
          )}
          {n > 1 && (
            <text x={width - RIGHT} y={121} fontSize={8.5} fill={AXIS} textAnchor="end">
              {points[n - 1].label}
            </text>
          )}
        </svg>
      )}
    </div>
  );
};
