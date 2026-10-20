import React, { useMemo } from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";

// HE1.9.1 #27 (328.9 × 196) and HE1.9.3 #53 (310 × 96): every result as a
// point on a date axis, the reference range as a band (secondary tint) with
// the lower limit dashed, light gridlines and y labels on the full chart.
// V6-11: the trend colours (blue stable / red decreasing / green increasing,
// QA 8.0) are retired; status is read from the range, in the rows and hero.
// Line and points #7D6BB5 (dark #C3B3FB) as the PNG draws them (the table
// leaves them UNSPECIFIED): open points, the latest filled, the selected one
// larger. Grid #EDEDEF / rgba(238,239,242,0.08), axis text #8C8378 / #B8B3C7.

export interface ChartPoint {
  date: string;
  value: number;
}

const GRID = ["#EDEDEF", "rgba(238,239,242,0.08)"] as const;

function niceStep(max: number): number {
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

const t = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();

export const BiomarkerLineChart: React.FC<{
  points: ChartPoint[];
  low: number | null;
  high: number | null;
  width: number;
  height: number;
  /** "full" = HE1.9.1 (y labels, gridlines, labelled band); "small" = HE1.9.3. */
  variant?: "full" | "small";
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  /** Accessible summary. */
  label: string;
  /**
   * The chart is a drawing, not an icon: keep it out of Larger text's 1.15
   * icon scale (.larger-icons svg:not(.qa-shape) in index.css), so it stays
   * inside its card and the tooltip lines up with the points. Omitted: as before.
   */
  noIconScale?: boolean;
}> = ({ points, low, high, width, height, variant = "small", selected = null, onSelect, label, noIconScale = false }) => {
  const dark = useIsDark();
  const full = variant === "full";
  const ink = dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))";
  const card = "rgb(var(--c-cream-card))";
  const axis = "rgb(var(--c-charcoal-faint))";
  const grid = GRID[dark ? 1 : 0];
  const band = "rgb(var(--c-teal) / 0.22)";
  const limit = dark ? "rgb(var(--c-teal))" : "rgb(var(--c-teal-dark))";

  const geo = useMemo(() => {
    const pad = full ? { top: 8, right: 8, bottom: 22, left: 30 } : { top: 6, right: 6, bottom: 22, left: 6 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const values = points.map((p) => p.value);
    const top0 = Math.max(...values, high ?? 0, low ?? 0, 1) * 1.15;
    const step = niceStep(top0);
    const yMax = Math.ceil(top0 / step) * step;
    const times = points.map((p) => t(p.date));
    let t0 = Math.min(...times);
    let t1 = Math.max(...times);
    if (t1 === t0) {
      t0 -= 86400000 * 180;
      t1 += 86400000 * 180;
    }
    const span = t1 - t0;
    t0 -= span * 0.05;
    t1 += span * 0.05;
    const x = (ms: number) => pad.left + ((ms - t0) / (t1 - t0)) * plotW;
    const y = (v: number) => pad.top + plotH - (Math.min(v, yMax) / yMax) * plotH;
    const years: { x: number; label: string }[] = [];
    const y0 = new Date(t0).getUTCFullYear();
    const y1 = new Date(t1).getUTCFullYear();
    for (let yr = y0; yr <= y1; yr++) {
      const ms = Date.UTC(yr, 0, 1);
      const xx = x(Math.max(ms, t0));
      if (ms >= t0 - 1 || yr === y0) years.push({ x: xx, label: String(yr) });
    }
    const ticks: number[] = [];
    for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { pad, plotW, plotH, x, y, yMax, years, ticks };
  }, [points, low, high, width, height, full]);

  if (points.length === 0) return null;
  const { pad, plotW, plotH, x, y, years, ticks } = geo;
  const bandTop = high !== null ? y(high) : pad.top;
  const bandBottom = low !== null ? y(low) : pad.top + plotH;
  const hasBand = low !== null || high !== null;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(t(p.date)).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points.length - 1;
  const fs = (n: number) => ({ fontSize: textPx(n), fontWeight: 600 }) as React.CSSProperties;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={noIconScale ? "overflow-visible block qa-shape" : "overflow-visible block"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect?.(null);
      }}
    >
      {full &&
        ticks.map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke={grid} strokeWidth={1} />
            <text x={pad.left - 8} y={y(v) + 3.5} textAnchor="end" fill={axis} style={fs(9.5)}>
              {v}
            </text>
          </g>
        ))}
      {hasBand && (
        <rect x={pad.left} width={plotW} y={Math.min(bandTop, bandBottom)} height={Math.abs(bandBottom - bandTop)} fill={band} />
      )}
      {low !== null && (
        <line x1={pad.left} x2={width - pad.right} y1={y(low)} y2={y(low)} stroke={limit} strokeWidth={1.2} strokeDasharray="4 3" />
      )}
      {full && hasBand && (
        <text x={pad.left + 8} y={Math.min(bandTop, bandBottom) + 13} fill={dark ? "rgb(var(--c-teal))" : "rgb(var(--c-teal-dark))"} style={fs(9.5)}>
          {low !== null && high !== null ? `Reference ${low} to ${high}` : high !== null ? `Reference under ${high}` : `Reference above ${low}`}
        </text>
      )}
      <line x1={pad.left} x2={width - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke={grid} strokeWidth={1} />
      {years.map((yr) => (
        <text key={yr.label} x={yr.x} y={height - 4} textAnchor="middle" fill={axis} style={fs(9.5)}>
          {yr.label}
        </text>
      ))}
      {selected !== null && points[selected] && (
        <line
          x1={x(t(points[selected].date))}
          x2={x(t(points[selected].date))}
          y1={y(points[selected].value)}
          y2={pad.top + plotH}
          stroke={ink}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}
      <path d={path} fill="none" stroke={ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const on = i === selected;
        const filled = on || i === last;
        const cx = x(t(p.date));
        const cy = y(p.value);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={on ? 6.5 : full ? 5 : 4.5} fill={filled ? ink : card} stroke={ink} strokeWidth={1.6} />
            {onSelect && (
              <circle
                cx={cx}
                cy={cy}
                r={14}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${p.value}, ${p.date}`}
                style={{ cursor: "pointer", outline: "none" }}
                onClick={() => onSelect(on ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(on ? null : i);
                  }
                }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

/** Tooltip card (HE1.9.1 #23-#26): 124 wide r12 pad 7 10, white + 0.5px hairline + shadow (dark #1C1F28, none). */
export const ChartTooltip: React.FC<{ value: string; date: string; report: string; left: number; top: number; dark: boolean; hairline: string }> = ({
  value,
  date,
  report,
  left,
  top,
  dark,
  hairline,
}) => (
  <div
    className="absolute pointer-events-none text-center"
    style={{
      left,
      top,
      width: 124,
      borderRadius: 12,
      padding: "7px 10px",
      background: "rgb(var(--c-cream-card))",
      border: `0.5px solid ${hairline}`,
      boxShadow: dark ? "none" : "0 8px 24px rgba(36,31,27,0.12)",
    }}
  >
    <p style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>{value}</p>
    <p style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{date}</p>
    <p style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>{report}</p>
  </div>
);

/** Chart x of a point, for placing the tooltip (same scale as the chart). */
export function chartPointX(points: ChartPoint[], index: number, width: number, full: boolean): number {
  const pad = full ? { left: 30, right: 8 } : { left: 6, right: 6 };
  const plotW = width - pad.left - pad.right;
  const times = points.map((p) => t(p.date));
  let t0 = Math.min(...times);
  let t1 = Math.max(...times);
  if (t1 === t0) {
    t0 -= 86400000 * 180;
    t1 += 86400000 * 180;
  }
  const span = t1 - t0;
  t0 -= span * 0.05;
  t1 += span * 0.05;
  return pad.left + ((t(points[index].date) - t0) / (t1 - t0)) * plotW;
}
