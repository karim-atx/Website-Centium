import React from "react";
import { ArrowDownToLine, ArrowUpToLine, Heart, HeartPulse } from "lucide-react";
import { textPx, linePx } from "../../../theme/textSize";
import { useLoopWhileVisible } from "../useLoopWhileVisible";
import { MetricHero, HeroPill, hairline, mc, metricIconInk, metricTextInk, useHealthMode, type Stat } from "./MetricKit";
import { daysOf, monthLetter, type MetricRange, type Period } from "./periods";
import { HR_ALERT_COPY } from "../../../services/health-metrics/clinicalCopy";

// Heart rate (HE1.5 family) hero, charts and the HE1.5.a notice card.
// Literal values from health-handover.md HE1.5 / .d / .m / .y / .a; chart
// geometry measured from the 2x PNGs (pt = px / 2), recorded in the
// checklists. Resting (B1 HA-08: activity_daily.resting_bpm, else a sample
// with context rest) drives the "resting" labels; with no resting value in
// the range they read "Latest" (day / week) or "Average" (month / year)
// (V6-21); V6-07: never a rhythm label.

const K = "heart-rate" as const;

// --- Chart geometry (HE1.5-full.png, HE1.5.m-full.png, HE1.5.y-full.png) ---
// Plot area: y 8 (180 bpm) to 118.9 (40 bpm, the axis line); labels at 139.
// Week capsules 18 wide r9 on a 46.6 pitch from x 25.4; month 6 wide from x 8
// to 318; year 12 wide on a 27.2 pitch from x 16.2. Past units main @45%
// (#E4AFAF measured), the current unit full main, ahead units a 1px outline
// #241F1B@18% (#D7D7D6 measured). Dot = accent r3.5 in a 1.5 white ring.
// Dashed average line 1.5 #962F2F, dash 4 4.
export const HR_AXIS = { min: 40, max: 180, top: 8, base: 118.9 } as const;
export const hrY = (bpm: number) => {
  const b = Math.max(HR_AXIS.min, Math.min(HR_AXIS.max, bpm));
  return HR_AXIS.base - ((b - HR_AXIS.min) / (HR_AXIS.max - HR_AXIS.min)) * (HR_AXIS.base - HR_AXIS.top);
};

const LABEL_Y = 139;

/** Strip axis 40 to 180 bpm (HE1.5 handover note). */
const stripX = (bpm: number) => ((Math.max(40, Math.min(180, bpm)) - 40) / 140) * 326;

// ---------------------------------------------------------------------------
// Hero

export interface HrHeroData {
  value: number;
  /** "bpm latest" (Day / Week) or "bpm average" (Month / Year). */
  unit: string;
  /** "Today's range 54 to 128 bpm" / "1 reading today" (OURS) / "September range 50 to 168 bpm". */
  rangeText: string;
  /** "↓ 2 bpm", "↓ 1 bpm vs Aug"; null hides the pill. */
  change: string | null;
  low: number;
  high: number;
  /** The marked value on the strip and its label ("Latest 62"). */
  marker: number;
  markerLabel: string;
}

/**
 * HE1.5 #10-#24: tint card 358 × 190.3 r22 pad 16 with p3.svg; value 40/40
 * 800 ls-1.6; unit 13/19.5 700 metric ink; range text 12/18 600 #5B5349 m-top
 * 6; change pill top right; the 326 × 60 graphic m-top 20 holds the strip
 * (track 326 × 14 r7 #FFFFFF@85%, fill main, dot 20 accent with a 2.7 white
 * border; label 10.5/15.8 700 above the dot, low / high 11/16.5 600 with the
 * number 900). A day with one reading shows the dot only.
 *
 * Motion (centium-he1.5-hero.gif, motion-specs "loop 2.9 s"): an ECG trace
 * draws left to right across the graphic, three beats per loop at the shown
 * bpm, tail fading; a heart after the unit scales to 1.14 on each beat. Runs
 * only while on screen and in the foreground (useLoopWhileVisible), static
 * faint trace under Reduce motion.
 */
export const HeartRateHero: React.FC<{ data: HrHeroData | null; loading?: boolean; ariaLabel?: string; empty?: React.ReactNode }> = ({
  data,
  loading,
  ariaLabel,
  empty,
}) => {
  const { dark } = useHealthMode();
  const [ref, running] = useLoopWhileVisible<HTMLDivElement>();
  if (!data) {
    return (
      <MetricHero metric={K} pattern={3} padding="16px" loading={loading} ariaLabel={ariaLabel}>
        {empty}
      </MetricHero>
    );
  }
  const single = data.low === data.high;
  const beat = 60 / Math.max(30, Math.min(220, data.value));
  const loop = beat * 3;
  const ink = metricTextInk(K, dark);
  return (
    <MetricHero metric={K} pattern={3} padding="16px" loading={loading} ariaLabel={ariaLabel} style={{ minHeight: 190.3 }}>
      <div ref={ref} data-hr-hero>
        <style>{`
          @keyframes hrTrace { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -760; } }
          @keyframes hrBeat { 0% { transform: scale(1); } 12% { transform: scale(1.14); } 40%, 100% { transform: scale(1); } }
        `}</style>
        <div className="flex items-start justify-between" style={{ gap: 10 }}>
          <div className="flex items-baseline min-w-0" style={{ gap: 5 }}>
            <span style={{ fontSize: 40, lineHeight: "40px", fontWeight: 800, letterSpacing: -1.6, color: "rgb(var(--c-charcoal))", fontVariantNumeric: "tabular-nums" }}>
              {data.value}
            </span>
            <span className="whitespace-nowrap" style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: ink }}>
              {data.unit}
            </span>
            <Heart
              aria-hidden
              size={13}
              fill="currentColor"
              strokeWidth={0}
              data-hr-heart
              style={{
                color: metricIconInk(K, dark),
                alignSelf: "center",
                transformOrigin: "50% 60%",
                animation: running ? `hrBeat ${beat}s ease-out infinite` : "none",
              }}
            />
          </div>
          {data.change && <HeroPill metric={K}>{data.change}</HeroPill>}
        </div>
        <p style={{ marginTop: 6, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{data.rangeText}</p>
        <div className="relative" style={{ marginTop: 20, height: 60 }} data-hr-strip>
          <svg aria-hidden viewBox="0 0 326 60" width="100%" height={60} preserveAspectRatio="none" className="absolute inset-0 overflow-visible">
            <path d={ECG_PATH} fill="none" stroke={mc(K, "main", 0.22)} strokeWidth={1.2} strokeLinejoin="round" />
            {running && (
              <path
                d={ECG_PATH}
                fill="none"
                stroke={mc(K, "main")}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="70 690"
                style={{ animation: `hrTrace ${loop}s linear infinite` }}
              />
            )}
          </svg>
          <div className="absolute" style={{ left: 0, right: 0, top: 26, height: 14, borderRadius: 7, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)" }} />
          {!single && (
            <div
              className="absolute"
              data-hr-fill
              style={{
                top: 26,
                height: 14,
                borderRadius: 7,
                left: `${(stripX(data.low) / 326) * 100}%`,
                width: `${((stripX(data.high) - stripX(data.low)) / 326) * 100}%`,
                background: mc(K, "main"),
              }}
            />
          )}
          <div
            className="absolute"
            data-hr-dot
            style={{
              top: 23,
              width: 20,
              height: 20,
              marginLeft: -10,
              left: `${(stripX(data.marker) / 326) * 100}%`,
              borderRadius: 9999,
              background: dark ? mc(K, "main") : mc(K, "accent"),
              border: `2.7px solid ${dark ? "#1C1F28" : "#FFFFFF"}`,
              boxSizing: "border-box",
            }}
          />
          <span
            className="absolute whitespace-nowrap"
            style={{ top: -4, left: `${(stripX(data.marker) / 326) * 100}%`, transform: "translateX(-50%)", fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 700, color: ink }}
          >
            {data.markerLabel}
          </span>
          {!single && (
            <>
              {/* Close low / high (under ~90 apart): low ends at its mark, high starts at its mark, so they never overlap (OURS). */}
              <span
                className="absolute whitespace-nowrap"
                style={{
                  top: 48,
                  ...(stripX(data.high) - stripX(data.low) < 90 ? { right: `${100 - (stripX(data.low) / 326) * 100}%`, marginRight: -6 } : { left: `${(stripX(data.low) / 326) * 100}%` }),
                  ...lowHigh,
                }}
              >
                <b style={{ fontWeight: 900, color: "rgb(var(--c-charcoal))" }}>{data.low}</b> low
              </span>
              <span
                className="absolute whitespace-nowrap"
                style={{
                  top: 48,
                  ...(stripX(data.high) - stripX(data.low) < 90 ? { left: `${(stripX(data.high) / 326) * 100}%`, marginLeft: -6 } : { right: `${100 - (stripX(data.high) / 326) * 100}%` }),
                  ...lowHigh,
                }}
              >
                <b style={{ fontWeight: 900, color: "rgb(var(--c-charcoal))" }}>{data.high}</b> high
              </span>
            </>
          )}
        </div>
      </div>
    </MetricHero>
  );
};

const lowHigh: React.CSSProperties = { fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" };

/** Three ECG beats across 326 × 60, centred on the strip (y 33). */
const ECG_PATH = (() => {
  const beatW = 326 / 3;
  let d = "M0 33";
  for (let i = 0; i < 3; i++) {
    const x = i * beatW;
    d += ` L${x + 22} 33 Q${x + 27} 28 ${x + 32} 33 L${x + 40} 33 L${x + 43} 37 L${x + 47} 6 L${x + 51} 50 L${x + 55} 33 L${x + 64} 33 Q${x + 72} 24 ${x + 80} 33 L${x + beatW} 33`;
  }
  return d;
})();

// ---------------------------------------------------------------------------
// Chart

export interface HrChartUnit {
  key: string;
  label: string;
  low: number | null;
  high: number | null;
  /** The dot (latest of the day, or the month's average). */
  dot: number | null;
  /** Bold axis label and full colour (today / this month). */
  current: boolean;
  ahead: boolean;
}

/**
 * Build the chart units for a period from the day-keyed readings. With B1
 * (HA-08) `samples` gives each day its low to high (every sample is kept)
 * and `resting` the dot: the day's resting value, or a month's average
 * resting (HE1.5 #32 "range capsules with resting dots"). Without them the
 * capsule is the day's one value and the dot the latest / the average.
 */
export function hrUnits(
  range: MetricRange,
  p: Period,
  byDay: Record<string, number>,
  today: string,
  samples: Record<string, number[]> = {},
  resting: Record<string, number> = {}
): HrChartUnit[] {
  const lowOf = (d: string) => (samples[d]?.length ? Math.min(...samples[d]) : byDay[d]);
  const highOf = (d: string) => (samples[d]?.length ? Math.max(...samples[d]) : byDay[d]);
  const mean = (v: number[]) => (v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null);
  if (range === "year") {
    const y = Number(p.start.slice(0, 4));
    return Array.from({ length: 12 }, (_, i) => {
      const prefix = `${y}-${String(i + 1).padStart(2, "0")}`;
      const days = Object.keys(byDay).filter((d) => d.startsWith(prefix));
      const vals = days.map((d) => byDay[d]);
      const rest = Object.entries(resting).filter(([d]) => d.startsWith(prefix)).map(([, v]) => v);
      const cur = today.startsWith(prefix);
      return {
        key: prefix,
        label: monthLetter(i + 1),
        low: days.length ? Math.min(...days.map(lowOf)) : null,
        high: days.length ? Math.max(...days.map(highOf)) : null,
        dot: rest.length ? mean(rest) : mean(vals),
        current: cur,
        ahead: `${prefix}-01` > today,
      };
    });
  }
  return daysOf(p).map((d) => {
    const v = byDay[d];
    const has = typeof v === "number";
    return { key: d, label: d, low: has ? lowOf(d) : null, high: has ? highOf(d) : null, dot: has ? (resting[d] ?? v) : null, current: d === today, ahead: d > today };
  });
}

const DOW_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Week (HE1.5 #32): 7 range capsules + latest dots + dashed week-average line
 * labelled at the right; Month (HE1.5.m #32): a thin capsule per day + the
 * month average line; Year (HE1.5.y #32): a capsule per month + the year
 * average line; Day (HE1.5.d #32, fallback until samples, B1): the day's one
 * stored reading as a dot on a dashed level line across 12am to 12am (the
 * reading's own time is not stored yet).
 */
export const HeartRateChart: React.FC<{
  range: MetricRange;
  units: HrChartUnit[];
  average: number | null;
  averageLabel: string;
  /** Day view: the stored value, and the fraction of the day elapsed (today) or 1. */
  day?: { value: number | null; elapsed: number };
}> = ({ range, units, average, averageLabel, day }) => {
  const { dark, hc } = useHealthMode();
  const axis = hairline(dark, hc, 0.08);
  const ghost = dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)";
  const dotFill = dark ? mc(K, "main") : mc(K, "accent");
  const ring = dark ? "#1C1F28" : "#FFFFFF";
  const avgInk = dark ? mc(K, "main") : mc(K, "accent");
  const labelStyle = (bold: boolean): React.CSSProperties => ({
    fontSize: `calc(10.5px + var(--text-boost, 0px))`,
    fontWeight: bold ? 800 : 600,
    fill: bold ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-faint))",
  });

  if (range === "day") {
    const v = day?.value ?? null;
    const xEnd = 326 * (day?.elapsed ?? 1);
    return (
      <svg viewBox="0 0 326 146" width="100%" style={{ display: "block", height: "auto" }} data-hr-chart="day">
        {xEnd < 326 && <rect x={xEnd} y={0} width={326 - xEnd} height={HR_AXIS.base} fill={dark ? "rgba(255,255,255,0.03)" : "#FAFAFA"} />}
        <line x1={0} x2={326} y1={HR_AXIS.base} y2={HR_AXIS.base} stroke={axis} strokeWidth={1} />
        {v !== null && (
          <>
            <line x1={0} x2={326} y1={hrY(v)} y2={hrY(v)} stroke={avgInk} strokeWidth={1.5} strokeDasharray="4 4" />
            <circle cx={Math.max(6, xEnd - 6)} cy={hrY(v)} r={4} fill={mc(K, "main")} stroke={ring} strokeWidth={1.5} />
          </>
        )}
        {["12am", "6am", "12pm", "6pm"].map((t, i) => (
          <text key={t} x={i * 81.5} y={LABEL_Y} textAnchor="start" style={labelStyle(false)}>
            {t}
          </text>
        ))}
      </svg>
    );
  }

  const n = units.length;
  const geo =
    range === "week"
      ? { w: 18, x: (i: number) => 25.4 + 46.6 * i }
      : range === "month"
        ? { w: 6, x: (i: number) => 8 + (i * 310) / Math.max(1, n - 1) }
        : { w: 12, x: (i: number) => 16.2 + 27.2 * i };
  const r = geo.w / 2;
  // Ghost capsules: last period's usual span (handover), else 55 to 130.
  const vals = units.filter((u) => u.low !== null);
  const gLow = vals.length ? Math.min(...vals.map((u) => u.low as number)) : 55;
  const gHigh = vals.length ? Math.max(...vals.map((u) => u.high as number)) : 130;
  const monthTicks = new Set([0, 7, 14, 21, 28]);

  return (
    <svg viewBox="0 0 326 146" width="100%" style={{ display: "block", height: "auto" }} data-hr-chart={range}>
      <line x1={0} x2={326} y1={HR_AXIS.base} y2={HR_AXIS.base} stroke={axis} strokeWidth={1} />
      {units.map((u, i) => {
        const cx = geo.x(i);
        if (u.low === null || u.high === null) {
          if (!u.ahead || range === "month") return null;
          const top = hrY(gHigh) - r;
          const bottom = hrY(gLow) + r;
          return <rect key={u.key} x={cx - r + 0.5} y={top} width={geo.w - 1} height={Math.max(geo.w, bottom - top)} rx={r} fill="none" stroke={ghost} strokeWidth={1} data-ghost />;
        }
        const top = hrY(u.high) - r;
        const bottom = hrY(u.low) + r;
        // Today / this month in the full main colour, the rest at 45% (#E4AFAF).
        return (
          <g key={u.key}>
            <rect x={cx - r} y={top} width={geo.w} height={Math.max(geo.w, bottom - top)} rx={r} fill={mc(K, "main", u.current ? 1 : 0.45)} data-capsule />
            {u.dot !== null && <circle cx={cx} cy={hrY(u.dot)} r={range === "month" ? 2.5 : 3.5} fill={dotFill} stroke={ring} strokeWidth={1.5} />}
          </g>
        );
      })}
      {average !== null && (
        <>
          <line x1={0} x2={326} y1={hrY(average)} y2={hrY(average)} stroke={avgInk} strokeWidth={1.5} strokeDasharray="4 4" data-avg-line />
          <text x={326} y={hrY(average) - 6} textAnchor="end" style={{ fontSize: `calc(10.5px + var(--text-boost, 0px))`, fontWeight: 700, fill: metricTextInk(K, dark) }}>
            {averageLabel}
          </text>
        </>
      )}
      {units.map((u, i) =>
        range === "month" && !monthTicks.has(i) ? null : (
          <text key={`l${u.key}`} x={geo.x(i)} y={LABEL_Y} textAnchor="middle" style={labelStyle(u.current)}>
            {range === "week" ? DOW_LETTER[new Date(`${u.key}T12:00:00`).getDay()] : range === "month" ? String(i + 1) : u.label}
          </text>
        )
      )}
    </svg>
  );
};

/**
 * Legend swatches (HE1.5 #33): capsule, dot, ghost, dash. `resting` (B1,
 * HA-08) switches to the handover labels: "Resting" dots and the
 * "Week avg resting" / "Avg resting" line; Day: "Resting level".
 */
export function hrLegend(range: MetricRange, dark: boolean, resting = false): { label: string; swatch: React.ReactNode }[] {
  const capsule = <span style={{ width: 8, height: 14, borderRadius: 4, background: mc(K, "main"), display: "inline-block" }} />;
  const dot = <span style={{ width: 8, height: 8, borderRadius: 9999, background: dark ? mc(K, "main") : mc(K, "accent"), display: "inline-block" }} />;
  const ghost = (
    <span style={{ width: 10, height: 12, borderRadius: 3, border: `1px solid ${dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)"}`, display: "inline-block" }} />
  );
  const dash = <span style={{ width: 14, borderTop: `1.5px dashed ${dark ? mc(K, "main") : mc(K, "accent")}`, display: "inline-block" }} />;
  const line = <span style={{ width: 14, height: 1.6, background: mc(K, "main"), display: "inline-block" }} />;
  if (range === "day")
    return [
      { label: "Heart rate", swatch: line },
      { label: resting ? "Resting level" : "Latest level", swatch: dash },
    ];
  if (range === "week")
    return [
      { label: "Daily range", swatch: capsule },
      { label: resting ? "Resting" : "Latest", swatch: dot },
      { label: "Days ahead", swatch: ghost },
      { label: resting ? "Week avg resting" : "Week average", swatch: dash },
    ];
  if (range === "month")
    return [
      { label: "Daily range", swatch: capsule },
      { label: resting ? "Resting" : "Latest", swatch: dot },
      { label: resting ? "Avg resting" : "Average", swatch: dash },
    ];
  return [
    { label: "Monthly range", swatch: capsule },
    { label: resting ? "Resting" : "Month average", swatch: dot },
    { label: "Months ahead", swatch: ghost },
    { label: resting ? "Avg resting" : "Year average", swatch: dash },
  ];
}

/** The split stat card (HE1.5 #34-#43): Avg resting (B1, HA-08; "Average" without resting values) · Lowest · Highest. */
export function hrStats(avg: number | null, low: number | null, high: number | null, resting = false): Stat[] {
  const n = (v: number | null) => (v === null ? "–" : String(Math.round(v)));
  return [
    { icon: HeartPulse, value: n(avg), label: resting ? "Avg resting" : "Average" },
    { icon: ArrowDownToLine, value: n(low), label: "Lowest" },
    { icon: ArrowUpToLine, value: n(high), label: "Highest" },
  ];
}

// ---------------------------------------------------------------------------
// HE1.5.a notice card (V6-03: rendered only while clinicalCopy.REVIEWED is
// true AND an alert event exists; events need B1, so nothing renders today).

export interface HrAlertEvent {
  kind: "high" | "low";
  bpm: number;
  minutes: number;
  /** ISO start of the event. */
  at: string;
}

/**
 * HE1.5.a #10-#17: white card r18 pad 14 + 0.5px hairline, m-bottom 12; tile
 * 32 r10 tint with HeartPulse 17; title 13.5/20.3 700; body 12/18 400 #5B5349
 * m-top 3; emergency line 12/18 400 m-top 6; actions 12/18 700 #7D6BB5 (dark
 * #C3B3FB, High contrast #4B3BA0) gap 16 (hit 44).
 */
export const HeartRateAlertCard: React.FC<{ event: HrAlertEvent; time: string; onGotIt: () => void; onSettings: () => void }> = ({ event, time, onGotIt, onSettings }) => {
  const { dark, hc } = useHealthMode();
  const link = hc && !dark ? "#4B3BA0" : dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-7d6bb5))";
  const body = event.kind === "high" ? HR_ALERT_COPY.highBody(event.bpm, event.minutes, time) : HR_ALERT_COPY.lowBody(event.bpm, event.minutes, time);
  const action = "tap relative before:absolute before:-inset-y-[13px] before:-inset-x-1 before:content-['']";
  return (
    <section role="status" className="flex" style={{ marginBottom: 12, gap: 11, borderRadius: 18, padding: 14, background: dark ? "#1C1F28" : "#FFFFFF", border: `0.5px solid ${hairline(dark, hc)}` }}>
      <span className="shrink-0 grid place-items-center" style={{ width: 32, height: 32, borderRadius: 10, background: mc(K, "tint") }} aria-hidden>
        <HeartPulse size={17} strokeWidth={1.5} style={{ color: metricIconInk(K, dark) }} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
          {event.kind === "high" ? HR_ALERT_COPY.highTitle : HR_ALERT_COPY.lowTitle}
        </h2>
        <p style={{ marginTop: 3, fontSize: textPx(12), lineHeight: linePx(18), color: "rgb(var(--c-charcoal-soft))" }}>{body}</p>
        <p style={{ marginTop: 6, fontSize: textPx(12), lineHeight: linePx(18), color: "rgb(var(--c-charcoal-soft))" }}>{HR_ALERT_COPY.emergency}</p>
        <div className="flex" style={{ marginTop: 10, gap: 16 }}>
          <button type="button" onClick={onGotIt} className={action} style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: link }}>
            Got it
          </button>
          <button type="button" onClick={onSettings} className={action} style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: link }}>
            Alert settings
          </button>
        </div>
      </div>
    </section>
  );
};
