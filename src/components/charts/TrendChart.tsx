import React, { useEffect, useId, useRef, useState } from "react";
import { trendTicks } from "../../utils/chartTicks";

export interface TrendPoint {
  /** Milliseconds; points are placed along x by time. */
  t: number;
  value: number;
  /** The x-axis / scrubber date, e.g. "Sep 27". */
  label: string;
}

/**
 * Where things sit, in px from the chart's own box. Defaults are measured from
 * the WO16 frame; WO19 passes the geometry of its purple card.
 */
export interface TrendGeometry {
  /** The y labels' left edge. */
  labelX: number;
  /** The plot's left and right insets. */
  left: number;
  right: number;
  /** Baseline of the scrubber label. */
  scrubY: number;
  plotTop: number;
  plotH: number;
  /** Baseline of the date labels. */
  datesY: number;
  height: number;
}

const WO16_GEOMETRY: TrendGeometry = {
  labelX: 16,
  left: 46,
  right: 21,
  scrubY: 11,
  plotTop: 35,
  plotH: 56,
  datesY: 121,
  height: 125,
};

/**
 * "light": on white, everything in the one `color` (WO16).
 * "card": white on the History-purple hero card (02 "Hero card"; WO19, WO4.1),
 * measured from the WO19 frame.
 */
type Tone = "light" | "card";

const TONES = {
  light: { axis: "#A79E93", grid: "rgba(36,31,27,0.07)", fillTop: 0.18, lineW: 1.5 },
  card: { axis: "rgba(255,255,255,0.75)", grid: "rgba(255,255,255,0.1)", fillTop: 0.22, lineW: 2 },
} as const;

/**
 * The line chart shared by WO16 (measurement history), WO19 (a lift's 1RM)
 * and WO4.1 (the Metrics hero): y axis with three round ticks, the first,
 * middle and last dates below, a line with a gradient fill, a dot per point,
 * and a scrubber — drag or tap across the chart, or use the arrow keys — whose
 * label reads "<date> · <value> <unit>". `points` oldest first; the scrubber
 * starts on the newest.
 */
export const TrendChart: React.FC<{
  points: TrendPoint[];
  /** The line, fill, dots and scrubber ("light" tone). */
  color: string;
  unit: string;
  /** For the middle date label, which is a time and not always a point. */
  formatDate: (t: number) => string;
  ariaLabel: string;
  tone?: Tone;
  geometry?: TrendGeometry;
  /** WO16 puts the unit on the top tick ("98 cm"); WO19 doesn't. */
  unitOnAxis?: boolean;
  /** WO4.1: points evenly spaced (one per workout / week) rather than by time. */
  evenX?: boolean;
  /** WO4.1 draws only the selected point's dot. */
  dots?: "all" | "selected";
  /**
   * Fixed ticks (WO4.1: 0 / 1k / 2k). Values above the top tick still fit:
   * the plot reaches the higher of the two.
   */
  ticks?: [number, number, number];
  formatTick?: (v: number) => string;
  /** The scrubber label; default "<date> · <value> <unit>". */
  scrubText?: (p: TrendPoint) => string;
  /** How many dates under the axis: first / middle / last, or four evenly spaced (WO4.1). */
  dateCount?: 3 | 4;
  /** With no points, the grid is drawn with this in the middle. */
  emptyText?: string;
  /** Controlled selection (WO4.1's stats row follows the scrubber). */
  selected?: number | null;
  onSelect?: (index: number) => void;
}> = ({
  points,
  color,
  unit,
  formatDate,
  ariaLabel,
  tone = "light",
  geometry = WO16_GEOMETRY,
  unitOnAxis = true,
  evenX = false,
  dots = "all",
  ticks: fixedTicks,
  formatTick = String,
  scrubText,
  dateCount = 3,
  emptyText,
  selected,
  onSelect,
}) => {
  const gradientId = useId();
  const box = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [ownPick, setOwnPick] = useState<number | null>(null);
  const picked = selected !== undefined ? selected : ownPick;
  const setPicked = (i: number) => {
    setOwnPick(i);
    onSelect?.(i);
  };
  const g = geometry;
  const t = TONES[tone];
  const ink = tone === "card" ? "#FFFFFF" : color;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  // A picked point that no longer exists (deleted, filtered) falls back to the newest.
  const sel = picked !== null && picked < n ? picked : n - 1;
  const plotW = Math.max(0, width - g.left - g.right);
  const t0 = n ? points[0].t : 0;
  const t1 = n ? points[n - 1].t : 0;
  const span = t1 - t0;
  const xAt = (i: number) =>
    g.left + (n < 2 ? plotW : span > 0 && !evenX ? ((points[i].t - t0) / span) * plotW : (i / (n - 1)) * plotW);
  const ticks = fixedTicks ?? (n ? trendTicks(points.map((p) => p.value)) : ([0, 1, 2] as const));
  const top = Math.max(ticks[2], ...points.map((p) => p.value));
  const bottom = g.plotTop + g.plotH;
  // Fixed ticks sit on their own scale; a point above the top tick uses the headroom.
  const yAt = (v: number) => bottom - ((v - ticks[0]) / (top - ticks[0])) * g.plotH;
  const tickY = yAt;

  const pickAt = (clientX: number) => {
    const el = box.current;
    if (!el || n === 0) return;
    const x = clientX - el.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(xAt(i) - x) < Math.abs(xAt(best) - x)) best = i;
    setPicked(best);
  };

  const line = points.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");
  const area = n > 1 ? `${line} L${xAt(n - 1).toFixed(1)},${bottom} L${xAt(0).toFixed(1)},${bottom} Z` : "";
  const sx = n ? xAt(sel) : 0;
  const scrubLabel = n ? (scrubText ? scrubText(points[sel]) : `${points[sel].label} · ${points[sel].value} ${unit}`) : "";
  // The label centres on the scrubber, kept inside the chart.
  const labelAnchor = sx > width - 60 ? "end" : sx < g.left + 40 ? "start" : "middle";

  return (
    <div
      ref={box}
      className="relative select-none"
      style={{ height: g.height, touchAction: "pan-y" }}
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
      {width > 0 && n === 0 && emptyText && (
        <svg width={width} height={g.height} className="block" aria-hidden>
          {ticks.map((v, i) => (
            <g key={i}>
              <line x1={g.left} x2={width - g.right} y1={tickY(v)} y2={tickY(v)} stroke={t.grid} strokeWidth={1} />
              <text x={g.labelX} y={tickY(v) + 3} fontSize={8.5} fill={t.axis}>
                {formatTick(v)}
              </text>
            </g>
          ))}
          <text x={(g.left + width - g.right) / 2} y={g.plotTop + g.plotH / 2 + 4} fontSize={12} fontWeight={700} fill={tone === "card" ? "#FFFFFF" : t.axis} textAnchor="middle">
            {emptyText}
          </text>
        </svg>
      )}
      {width > 0 && n > 0 && (
        <svg width={width} height={g.height} className="block" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ink} stopOpacity={t.fillTop} />
              <stop offset="100%" stopColor={ink} stopOpacity={0} />
            </linearGradient>
          </defs>

          {ticks.map((v, i) => (
            <g key={i}>
              <line x1={g.left} x2={width - g.right} y1={yAt(v)} y2={yAt(v)} stroke={t.grid} strokeWidth={1} />
              <text x={g.labelX} y={yAt(v) + 3} fontSize={8.5} fill={t.axis}>
                {i === 2 && unitOnAxis ? `${formatTick(v)} ${unit}` : formatTick(v)}
              </text>
            </g>
          ))}

          {area && <path d={area} fill={`url(#${gradientId})`} />}
          {n > 1 && (
            <path d={line} fill="none" stroke={ink} strokeWidth={t.lineW} strokeLinejoin="round" strokeLinecap="round" />
          )}

          <line x1={sx} x2={sx} y1={g.scrubY + 4} y2={bottom} stroke={ink} strokeWidth={tone === "card" ? 1.5 : 1} />
          <text x={sx} y={g.scrubY} fontSize={9.5} fontWeight={700} fill={ink} textAnchor={labelAnchor}>
            {scrubLabel}
          </text>

          {points.map((p, i) => {
            const cx = xAt(i);
            const cy = yAt(p.value);
            if (dots === "selected" && i !== sel) return null;
            if (tone === "card")
              return i === sel ? (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={9} fill="#FFFFFF" fillOpacity={0.3} />
                  <circle cx={cx} cy={cy} r={5} fill="#FFFFFF" stroke="#7D67D9" strokeWidth={2} />
                </g>
              ) : (
                <circle key={i} cx={cx} cy={cy} r={3} fill="#FFFFFF" />
              );
            return i === sel ? (
              <g key={i}>
                <circle cx={cx} cy={cy} r={6} fill={color} fillOpacity={0.2} />
                <circle cx={cx} cy={cy} r={4} fill="#FFFFFF" />
                <circle cx={cx} cy={cy} r={3} fill={color} />
              </g>
            ) : (
              <circle key={i} cx={cx} cy={cy} r={3} fill="#FFFFFF" stroke={color} strokeWidth={1.5} />
            );
          })}

          {dateCount === 4 && n > 1 ? (
            [0, 1, 2, 3].map((k) => {
              const i = Math.round((k * (n - 1)) / 3);
              return (
                <text key={k} x={xAt(i)} y={g.datesY} fontSize={8.5} fill={t.axis} textAnchor={k === 0 ? "start" : k === 3 ? "end" : "middle"}>
                  {points[i].label}
                </text>
              );
            })
          ) : (
            <>
              {/* A single point sits at the right edge; its date goes under it. */}
              <text x={n < 2 ? xAt(0) : g.left} y={g.datesY} fontSize={8.5} fill={t.axis} textAnchor={n < 2 ? "end" : "start"}>
                {points[0].label}
              </text>
              {n > 2 && span > 0 && (
                <text x={g.left + plotW / 2} y={g.datesY} fontSize={8.5} fill={t.axis} textAnchor="middle">
                  {formatDate(t0 + span / 2)}
                </text>
              )}
              {n > 1 && (
                <text x={width - g.right} y={g.datesY} fontSize={8.5} fill={t.axis} textAnchor="end">
                  {points[n - 1].label}
                </text>
              )}
            </>
          )}
        </svg>
      )}
    </div>
  );
};
