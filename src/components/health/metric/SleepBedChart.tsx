import React from "react";
import { formatMinutes12, hourLabel12 } from "../../../utils/time12";
import { mc, metricTextInk, useHealthMode } from "./MetricKit";
import { isRtl, t } from "../../../i18n/core";

// HE1.3 #35 (Week) and HE1.3.m #37 (Month): floating bedtime-to-wake bars on
// a clock axis with the usual-bedtime line (Database B1 sleep_details
// bed_start / wake_end). The layout tables give only the SVG box (week
// viewBox 0 0 326 144, month 0 0 326 146); everything below is measured from
// HE1.3-full.png and HE1.3.m-full.png (2x, pt = px / 2, origin = the
// graphic's top left at 31.1, 633.6):
//   Clock axis, time running down: 22:00 at y 10.4, 10.4 per hour (06:42 =
//   y 100.9). Week gridlines 0.5 #241F1B@6% (#F2F2F2 measured) at 22:00,
//   02:00, 06:00 from x 40.4 to 326, their labels 10/600 #8C8378 at x 2.4,
//   centred on the line (12-hour here: "10 PM", "2 AM", "6 AM", X-14).
//   Week bars 16 wide r8 on a 40.8 pitch from x 40.4 (Monday centre 60.8),
//   main #A2C8C2; nights ahead are 1px #241F1B@18% outlines at the usual
//   bedtime-to-wake span. Month bars 5.5 wide r2.75, pitch 323.6 / days from
//   x 2.4, main@45% (#D5E6E4 measured), baseline #241F1B@8% at y 118.5.
//   Usual bedtime: dashed 1.5 (4 4) #4F8F8A, week from x 40.4, month from
//   x 2.4, to 326; its label "Usual bedtime 11:15 PM" 10/700 #3E716D,
//   right-aligned at 326, 4.5 above the line. Day letters as GoalBarChart
//   (10/600 #8C8378, today 700 #241F1B, y 138).
// The axis starts at 10 PM and spans 10 hours unless a night falls outside;
// then it widens to whole two-hour steps and the hour height shrinks so the
// window still ends at y 114.4.

/** Minutes after noon of the evening before (10 PM = 600, 6:42 AM = 1122): bedtimes around midnight stay contiguous. */
export const minutesAfterNoon = (iso: string) => {
  const d = new Date(iso);
  return (d.getHours() * 60 + d.getMinutes() - 720 + 1440) % 1440;
};
/** "11:15 PM" from minutes after noon. */
export const clockFromNoon = (m: number) => formatMinutes12((Math.round(m) + 720) % 1440);

export interface BedNight {
  key: string;
  label?: string;
  /** Minutes after noon; null = nothing recorded that night. */
  bed: number | null;
  wake: number | null;
  /** Nights ahead: the usual span as an outline. */
  ghost?: boolean;
  current?: boolean;
}

const TOP = 10.4;
const BOTTOM = 114.4;
const DEFAULT_START = 600; // 10 PM
const DEFAULT_SPAN = 600; // 10 hours
const X0 = 2.4;
const WEEK_X0 = 40.4;
/** Round F (F10): in right to left, time runs from right to left: every x on the 326 grid is mirrored (SVG text anchors are logical, so the labels follow). */
const mirrorX = () => {
  const rtl = isRtl();
  return (x: number) => (rtl ? 326 - x : x);
};

export const SleepBedChart: React.FC<{
  mode: "week" | "month";
  nights: BedNight[];
  usualBed: number | null;
  usualWake: number | null;
  onBarTap?: (key: string) => void;
  barLabel?: (n: BedNight) => string;
}> = ({ mode, nights, usualBed, usualWake, onBarTap, barLabel }) => {
  const { dark, hc } = useHealthMode();
  const H = mode === "week" ? 144 : 146;
  const times = nights.flatMap((n) => (n.bed !== null && n.wake !== null ? [n.bed, n.wake] : []));
  if (usualBed !== null) times.push(usualBed);
  if (usualWake !== null) times.push(usualWake);
  const lo = times.length ? Math.min(...times) : DEFAULT_START;
  const hi = times.length ? Math.max(...times) : DEFAULT_START + DEFAULT_SPAN;
  const start = Math.min(DEFAULT_START, Math.floor(lo / 120) * 120);
  const end = Math.max(start + DEFAULT_SPAN, Math.ceil(hi / 120) * 120);
  const y = (m: number) => TOP + ((m - start) / (end - start)) * (BOTTOM - TOP);

  const mx = mirrorX();
  const x0 = mode === "week" ? WEEK_X0 : X0;
  const pitch = (326 - x0) / Math.max(1, nights.length);
  const w = mode === "week" ? 16 : 5.5;
  const r = w / 2;
  const grid = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.06)" : "rgba(36,31,27,0.06)";
  const base = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.08)";
  const ghost = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)";
  const faint = hc ? "rgb(var(--c-charcoal))" : dark ? "#B8B3C7" : "#8C8378";
  const line = mc("sleep", "accent");
  const labelInk = metricTextInk("sleep", dark);
  const gridTimes: number[] = [];
  if (mode === "week") for (let t = start; t < end; t += 240) gridTimes.push(t);
  const labelEvery = mode === "month" ? 7 : 1;

  return (
    <svg viewBox={`0 0 326 ${H}`} width="100%" height={H} aria-hidden style={{ display: "block", overflow: "visible" }} data-sleep-chart={mode}>
      {gridTimes.map((t) => (
        <g key={t}>
          <line x1={mx(WEEK_X0)} x2={mx(326)} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={0.5} />
          <text x={mx(X0)} y={y(t)} dominantBaseline="central" fontSize={10} fontWeight={600} fill={faint}>
            {hourLabel12(((t + 720) % 1440) / 60)}
          </text>
        </g>
      ))}
      {mode === "month" && <line x1={mx(X0)} x2={mx(326)} y1={118.5} y2={118.5} stroke={base} strokeWidth={1} />}
      {nights.map((n, i) => {
        const cx = mx(x0 + pitch * (i + 0.5));
        let shape: React.ReactNode = null;
        if (n.bed !== null && n.wake !== null) {
          const top = y(n.bed);
          const h = Math.max(w, y(n.wake) - top);
          shape = <rect x={cx - r} y={top} width={w} height={h} rx={r} fill={mode === "week" ? mc("sleep", "main") : mc("sleep", "main", 0.45)} data-bed-bar />;
        } else if (n.ghost && mode === "week" && usualBed !== null && usualWake !== null) {
          const top = y(usualBed);
          shape = <rect x={cx - r + 0.5} y={top + 0.5} width={w - 1} height={Math.max(w, y(usualWake) - top) - 1} rx={r - 0.5} fill="none" stroke={ghost} strokeWidth={1} data-ghost />;
        }
        const showLabel = n.label && (labelEvery === 1 || i % labelEvery === 0);
        const content = (
          <>
            {shape}
            {showLabel && (
              <text x={cx} y={138} textAnchor="middle" fontSize={10} fontWeight={n.current ? 700 : 600} fill={n.current ? "rgb(var(--c-charcoal))" : faint}>
                {n.label}
              </text>
            )}
          </>
        );
        if (onBarTap && n.bed !== null) {
          return (
            <g
              key={n.key}
              role="button"
              tabIndex={0}
              aria-label={barLabel?.(n)}
              style={{ cursor: "pointer", outline: "none" }}
              onClick={() => onBarTap(n.key)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onBarTap(n.key))}
            >
              <rect x={cx - pitch / 2} y={0} width={pitch} height={H} fill="transparent" />
              {content}
            </g>
          );
        }
        return <g key={n.key}>{content}</g>;
      })}
      {usualBed !== null && (
        <g data-usual-line>
          <line x1={mx(x0)} x2={mx(326)} y1={y(usualBed)} y2={y(usualBed)} stroke={line} strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={mx(326)} y={y(usualBed) - 4.5} textAnchor="end" fontSize={10} fontWeight={700} fill={labelInk}>
            {t("Usual bedtime {time}", { time: clockFromNoon(usualBed) })}
          </text>
        </g>
      )}
    </svg>
  );
};

/**
 * HE1.3.y #37: the average-bedtime line over the year bars, on its own scale
 * at the top (measured from HE1.3.y-full.png: dots r2.5 #4F8F8A at each month
 * centre, dashed 1.5 (4 3) line through them, "Avg bedtime" 10/700 #3E716D
 * right-aligned at 326 on y 19). The scale is one hour (11 PM to 12 AM, said
 * in the legend) on y 20 to 44 unless a month falls outside it; then it
 * widens to whole hours. Rendered inside GoalBarChart's svg (same 326 grid).
 */
export function bedtimeScale(values: (number | null)[]): { from: number; to: number } {
  const v = values.filter((x): x is number => x !== null);
  const lo = v.length ? Math.min(...v) : 660;
  const hi = v.length ? Math.max(...v) : 720;
  return { from: Math.min(660, Math.floor(lo / 60) * 60), to: Math.max(720, Math.ceil(hi / 60) * 60) };
}

export const YearBedtimeLine: React.FC<{ months: (number | null)[] }> = ({ months }) => {
  const { dark } = useHealthMode();
  const { from, to } = bedtimeScale(months);
  const yOf = (m: number) => 20 + ((m - from) / (to - from)) * 24;
  const pitch = 323.6 / 12;
  const mx = mirrorX();
  const pts = months.map((m, i) => (m === null ? null : { x: mx(X0 + pitch * (i + 0.5)), y: yOf(m) })).filter((p): p is { x: number; y: number } => p !== null);
  if (!pts.length) return null;
  const ink = mc("sleep", "accent");
  return (
    <g data-bedtime-line>
      {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={ink} strokeWidth={1.5} strokeDasharray="4 3" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={ink} />
      ))}
      <text x={mx(326)} y={19} textAnchor="end" fontSize={10} fontWeight={700} fill={metricTextInk("sleep", dark)}>
        {t("Avg bedtime")}
      </text>
    </g>
  );
};

/** Legend swatches for the floating chart: bar pill 8 x 14 r4, ghost 10 x 12 r3 (HE1.3 #36-#38, measured). */
export const LegendBedBar: React.FC = () => (
  <span aria-hidden className="inline-block shrink-0" style={{ width: 8, height: 14, borderRadius: 4, background: mc("sleep", "main") }} />
);
export const LegendBedGhost: React.FC = () => {
  const { dark, hc } = useHealthMode();
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{ width: 10, height: 12, borderRadius: 3, border: `1px solid ${hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)"}` }}
    />
  );
};
