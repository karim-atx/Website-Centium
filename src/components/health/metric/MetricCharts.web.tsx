import React from "react";
import { hourLabel12 } from "../../../utils/time12";
import { t } from "../../../i18n/core";
import type { MetricKey } from "../MetricWidget";
import { daysOf, type MetricRange, type Period } from "./periods";
import { axisLabel, hourAxisLabel, rangeTicks } from "./webAxis";
import { AxisBarsWeb, FloatBarsWeb, PlotLineWeb, WebPlotFrame, type FloatBar, type PlotPoint, type PlotRefLine } from "./WebAxisChart";
import type { HrChartUnit } from "./HeartRateParts";
import type { BpChartProps } from "./BloodPressureParts";
import type { BedNight } from "./SleepBedChart";
import { bedtimeScale, clockFromNoon } from "./SleepBedChart";
import { fmtW, inUnit, type WeightUnit } from "./WeightParts";

// Website viewport v1 · the Health metric pages' remaining charts, drawn on
// the web axis frame (WebAxisChart.tsx) instead of the mobile 326-wide SVG
// scaled up (WC-HE Health Web v5, the chart <section> of each
// "<metric>-<range>" screen: 40 gutter, tick rules with 11 600 labels, x
// labels under each column, gap 12 / r8, gap 4 / r3 above 20 columns; the
// day view's tick labels blank except Weight's).

const mc = (metric: MetricKey, part: "main" | "accent" | "ink") => `rgb(var(--metric-${metric}-${part}))`;
const gapOf = (n: number) => (n > 20 ? 4 : 12);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** x labels for a range's columns: weekday names, every 5th day, month names, every 3rd hour. */
function columnLabels(range: MetricRange, keys: string[]): string[] {
  if (range === "day") return keys.map((_, h) => hourAxisLabel(h));
  return keys.map((k, i) => axisLabel(range, k, i));
}

/** The columns of a period: 24 hours, the days, or the 12 "YYYY-MM" months. */
function columnKeys(range: MetricRange, p: Period): string[] {
  if (range === "day") return Array.from({ length: 24 }, (_, h) => String(h));
  if (range === "year") {
    const y = p.start.slice(0, 4);
    return Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
  }
  return daysOf(p);
}

// ---------------------------------------------------------------------------
// Heart rate (WC-HE.5): bars from 40 bpm (reference CFG heart: min 40, max
// 180, ticks 160 / 120 / 80 / 40), one a day (a month for Year) at the day's
// resting value (else its latest / average, the mobile dot); the current
// column in the accent, columns ahead as outlines at full height. The dashed
// period average keeps the mobile's average line (in the reference's goal
// rule style). Day: no hourly samples are stored, so the day's one value is a
// dashed level with a dot at the time elapsed; hours ahead as outlines.

const HR = { min: 40, max: 180, ticks: [160, 120, 80, 40] };
const hrY = (v: number) => (1 - (clamp(v, HR.min, HR.max) - HR.min) / (HR.max - HR.min)) * 100;

export const HeartRateChartWeb: React.FC<{
  range: MetricRange;
  units: HrChartUnit[];
  average: number | null;
  averageLabel: string;
  day?: { value: number | null; elapsed: number };
}> = ({ range, units, average, averageLabel, day }) => {
  const K = "heart-rate" as const;
  const accent = mc(K, "accent");
  if (range === "day") {
    const v = day?.value ?? null;
    const elapsed = day?.elapsed ?? 1;
    const nowCol = Math.min(23, Math.floor(elapsed * 24));
    const bars: FloatBar[] = Array.from({ length: 24 }, (_, h) => ({ key: String(h), from: null, to: null, ghost: elapsed < 1 && h > nowCol ? { from: HR.min, to: HR.max } : null }));
    return (
      <WebPlotFrame
        ticks={HR.ticks.map((x) => ({ v: x, label: "" }))}
        y={hrY}
        labels={bars.map((_, h) => hourAxisLabel(h))}
        gap={4}
        refLines={v !== null ? [{ v, ink: accent }] : undefined}
      >
        <FloatBarsWeb metric={K} bars={bars} y={hrY} gap={4} emptyStubs={v === null} />
        {v !== null && <PlotLineWeb points={[{ pos: clamp(elapsed * 24 - 0.5, 0, 23), v, kind: "fill", fill: mc(K, "main") }]} y={hrY} stroke={mc(K, "main")} />}
      </WebPlotFrame>
    );
  }
  const gap = gapOf(units.length);
  const bars: FloatBar[] = units.map((u) => {
    const v = u.dot ?? u.high;
    return v !== null ? { key: u.key, from: HR.min, to: v, current: u.current } : { key: u.key, from: null, to: null, ghost: u.ahead ? { from: HR.min, to: HR.max } : null };
  });
  return (
    <WebPlotFrame
      ticks={HR.ticks.map((x) => ({ v: x, label: String(x) }))}
      y={hrY}
      labels={columnLabels(range, units.map((u) => u.key))}
      gap={gap}
      refLines={average !== null ? [{ v: average, label: averageLabel, ink: accent }] : undefined}
    >
      <FloatBarsWeb metric={K} bars={bars} y={hrY} gap={gap} />
    </WebPlotFrame>
  );
};

// ---------------------------------------------------------------------------
// Blood pressure (WC-HE.6): the reference's line chart (CFG bp: 60 to 160,
// ticks 160 / 130 / 100 / 70), widened when a reading falls outside, as on
// mobile. Two lines: systolic in the main, diastolic in the accent (the
// mobile's dot colours, said in its legend), a point a day (the day's
// average; a month's average for Year; each reading at its time for Day);
// the latest filled. The reference lines (120 / 80, or the pregnancy levels)
// stay as dashed rules labelled at the end.

export const BloodPressureChartWeb: React.FC<BpChartProps> = ({ range, period, readings, reference }) => {
  const K = "blood-pressure" as const;
  const vals = readings.flatMap((r) => [r.systolic, r.diastolic]);
  const lo = Math.min(60, ...(vals.length ? [Math.min(...vals) - 5] : []), reference[1] - 20);
  const hi = Math.max(160, ...(vals.length ? [Math.max(...vals) + 5] : []), reference[0] + 20);
  const y = (v: number) => (1 - (v - lo) / (hi - lo)) * 100;
  const ticks: number[] = [];
  for (let v = 70 - 30 * Math.floor((70 - lo) / 30); v <= hi; v += 30) if (v >= lo) ticks.push(v);
  const keys = columnKeys(range, period);
  const pairs: { pos: number; s: number; d: number }[] = [];
  if (range === "day") {
    for (const r of [...readings].sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1))) {
      const at = new Date(r.recordedAt);
      pairs.push({ pos: clamp(at.getHours() + at.getMinutes() / 60 - 0.5, 0, 23), s: r.systolic, d: r.diastolic });
    }
  } else {
    keys.forEach((k, i) => {
      const rs = readings.filter((r) => (range === "year" ? r.day.startsWith(k) : r.day === k));
      if (!rs.length) return;
      pairs.push({ pos: i, s: Math.round(mean(rs.map((r) => r.systolic)) as number), d: Math.round(mean(rs.map((r) => r.diastolic)) as number) });
    });
  }
  const line = (pick: "s" | "d", ink: string): PlotPoint[] => pairs.map((p, i) => ({ pos: p.pos, v: p[pick], kind: i === pairs.length - 1 ? "fill" : "dot", fill: ink }));
  const accent = mc(K, "accent");
  const refLines: PlotRefLine[] = reference.map((v, i) => ({ v, label: String(v), ink: accent, below: i === 1 }));
  return (
    <WebPlotFrame ticks={ticks.map((v) => ({ v, label: range === "day" ? "" : String(v) }))} y={y} labels={columnLabels(range, keys)} gap={gapOf(keys.length)} refLines={refLines}>
      <PlotLineWeb points={line("d", accent)} y={y} stroke={accent} />
      <PlotLineWeb points={line("s", mc(K, "main"))} y={y} stroke={mc(K, "main")} />
    </WebPlotFrame>
  );
};

// ---------------------------------------------------------------------------
// Weight (WC-HE.7): the reference's line chart on a kg (lb) scale fitted to
// the weigh-ins ± 1 (ticks a round step apart, its CFG weight 104 to 108 by 1),
// labels kept on every range. No goal rule (reference CFG weight: goal null;
// the goal is in the hero). Week: the weigh-ins joined, the latest filled in
// the accent. Month: the mobile's smoothed trend (7-day trailing average) as
// the line, the weigh-ins as dots on it. Year: monthly averages, this month
// filled, and the start weigh-in (filled, "Start 107.0"). Day: the compared
// weigh-in and this day's, side by side, with their values.

export const WeightChartWeb: React.FC<{
  range: MetricRange;
  period: Period;
  byDay: Record<string, number>;
  today: string;
  unit: WeightUnit;
  compare?: { day: string; kg: number; label: string } | null;
  startDay?: string | null;
}> = ({ range, period, byDay, today, unit, compare, startDay }) => {
  const K = "weight" as const;
  const main = mc(K, "main");
  const accent = mc(K, "accent");
  const u = (kg: number) => inUnit(kg, unit);
  const frame = (shown: number[], labels: string[], body: (y: (v: number) => number) => React.ReactNode) => {
    const { min, max, ticks } = shown.length ? rangeTicks(Math.min(...shown) - 1, Math.max(...shown) + 1) : { min: 0, max: 1, ticks: [] as number[] };
    const y = (v: number) => (1 - (v - min) / (max - min || 1)) * 100;
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
    return (
      <WebPlotFrame ticks={ticks.map((v) => ({ v, label: v.toFixed(step < 1 ? 1 : 0) }))} y={y} labels={labels} gap={gapOf(labels.length)}>
        {body(y)}
      </WebPlotFrame>
    );
  };

  if (range === "day") {
    const todayKg = byDay[period.start];
    const pts: PlotPoint[] = [];
    const labels: string[] = [];
    if (compare) {
      labels.push(compare.label);
      pts.push({ pos: 0, v: u(compare.kg), kind: "dot", label: fmtW(compare.kg, unit) });
    }
    if (todayKg !== undefined) {
      labels.push(period.start === today ? t("Today") : t("This day"));
      pts.push({ pos: labels.length - 1, v: u(todayKg), kind: "fill", fill: accent, label: fmtW(todayKg, unit) });
    }
    if (!labels.length) labels.push(period.start === today ? t("Today") : t("This day"));
    return frame(
      pts.map((p) => p.v),
      labels,
      (y) => <PlotLineWeb points={pts} y={y} stroke={main} />
    );
  }

  const keys = columnKeys(range, period);
  const labels = columnLabels(range, keys);
  if (range === "week") {
    const pts: PlotPoint[] = [];
    keys.forEach((d, i) => byDay[d] !== undefined && pts.push({ pos: i, v: u(byDay[d]) }));
    if (pts.length) pts[pts.length - 1] = { ...pts[pts.length - 1], kind: "fill", fill: accent };
    return frame(
      pts.map((p) => p.v),
      labels,
      (y) => <PlotLineWeb points={pts} y={y} stroke={main} />
    );
  }
  if (range === "month") {
    const days = keys.filter((d) => byDay[d] !== undefined);
    const trend: PlotPoint[] = days.map((d) => {
      const from = new Date(`${d}T12:00:00`).getTime() - 6 * 86400000;
      const win = Object.entries(byDay)
        .filter(([k]) => k <= d && new Date(`${k}T12:00:00`).getTime() >= from)
        .map(([, v]) => v);
      return { pos: keys.indexOf(d), v: u(mean(win) as number), kind: "none" };
    });
    const dots: PlotPoint[] = days.map((d) => ({ pos: keys.indexOf(d), v: u(byDay[d]) }));
    return frame(
      [...trend.map((p) => p.v), ...dots.map((p) => p.v)],
      labels,
      (y) => (
        <>
          <PlotLineWeb points={trend} y={y} stroke={main} />
          {dots.map((p) => (
            <PlotLineWeb key={p.pos} points={[p]} y={y} stroke={main} />
          ))}
        </>
      )
    );
  }
  // Year
  const months = keys.map((k, i) => {
    const vs = Object.entries(byDay)
      .filter(([d]) => d.startsWith(k))
      .map(([, v]) => v);
    return { i, v: vs.length ? u(mean(vs) as number) : null, current: today.startsWith(k) };
  });
  const pts: PlotPoint[] = months.filter((m) => m.v !== null).map((m) => ({ pos: m.i, v: m.v as number, kind: m.current ? "fill" : "dot", fill: main }));
  const yr = period.start.slice(0, 4);
  const startKg = startDay && startDay.startsWith(yr) && byDay[startDay] !== undefined ? byDay[startDay] : null;
  const start: PlotPoint | null =
    startKg !== null && startDay ? { pos: Number(startDay.slice(5, 7)) - 1 - 0.3, v: u(startKg), kind: "fill", fill: accent, r: 5, label: t("Start {n}", { n: fmtW(startKg, unit) }) } : null;
  return frame(
    [...pts.map((p) => p.v), ...(start ? [start.v] : [])],
    labels,
    (y) => (
      <>
        <PlotLineWeb points={pts} y={y} stroke={main} />
        {start && <PlotLineWeb points={[start]} y={y} stroke={accent} />}
      </>
    )
  );
};

// ---------------------------------------------------------------------------
// Sleep bedtime-to-wake (repo-only, B1 sleep_details): the web axis frame
// with a clock scale running down (10 PM at the top, 10 hours unless a night
// falls outside, widened to two-hour steps as on mobile), ticks every two
// hours labelled "10 PM", bars from bedtime to wake in the sleep main (last
// night in the accent), nights ahead as outlines over the usual span, the
// usual bedtime as the dashed rule labelled at the end.

export const SleepBedChartWeb: React.FC<{
  mode: "week" | "month";
  nights: BedNight[];
  usualBed: number | null;
  usualWake: number | null;
  onBarTap?: (key: string) => void;
  barLabel?: (n: BedNight) => string;
}> = ({ mode, nights, usualBed, usualWake, onBarTap, barLabel }) => {
  const times = nights.flatMap((n) => (n.bed !== null && n.wake !== null ? [n.bed, n.wake] : []));
  if (usualBed !== null) times.push(usualBed);
  if (usualWake !== null) times.push(usualWake);
  const lo = times.length ? Math.min(...times) : 600;
  const hi = times.length ? Math.max(...times) : 1200;
  const start = Math.min(600, Math.floor(lo / 120) * 120);
  const end = Math.max(start + 600, Math.ceil(hi / 120) * 120);
  const y = (m: number) => ((m - start) / (end - start)) * 100;
  const ticks: number[] = [];
  for (let m = start; m <= end; m += end - start > 720 ? 240 : 120) ticks.push(m);
  const gap = gapOf(nights.length);
  const usual = usualBed !== null && usualWake !== null ? { from: usualBed, to: usualWake } : null;
  const bars: FloatBar[] = nights.map((n) => ({ key: n.key, from: n.bed, to: n.wake, current: n.current, ghost: n.ghost ? usual : null, ariaLabel: n.bed !== null ? barLabel?.(n) : undefined }));
  return (
    <WebPlotFrame
      ticks={ticks.map((m) => ({ v: m, label: hourLabel12(((m + 720) % 1440) / 60) }))}
      y={y}
      labels={nights.map((n, i) => axisLabel(mode, n.key, i))}
      gap={gap}
      refLines={usualBed !== null ? [{ v: usualBed, label: t("Usual bedtime {time}", { time: clockFromNoon(usualBed) }), ink: mc("sleep", "ink") }] : undefined}
    >
      <FloatBarsWeb metric="sleep" bars={bars} y={y} gap={gap} onBarTap={onBarTap} />
    </WebPlotFrame>
  );
};

/**
 * Sleep year's average-bedtime line on the web: a 48 strip above the bars on
 * the same columns (its own one-hour scale, said in the legend): dots r2.5
 * in the sleep accent at each month, joined by a 1.5 dashed (4 3) line;
 * "Avg bedtime" 11 700 in the sleep ink at the end, top.
 */
export const YearBedtimeBandWeb: React.FC<{ months: (number | null)[] }> = ({ months }) => {
  const { from, to } = bedtimeScale(months);
  const H = 48;
  const y = (m: number) => ((22 + ((m - from) / (to - from)) * 22) / H) * 100;
  const pts: PlotPoint[] = months.flatMap((m, i) => (m === null ? [] : [{ pos: i, v: m, kind: "fill" as const, r: 2.5, fill: mc("sleep", "accent") }]));
  if (!pts.length) return null;
  return (
    <>
      <span className="absolute whitespace-nowrap" style={{ insetInlineEnd: 0, top: 0, fontSize: 11, lineHeight: "16px", fontWeight: 700, color: mc("sleep", "ink") }}>
        {t("Avg bedtime")}
      </span>
      <PlotLineWeb points={pts} y={y} stroke={mc("sleep", "accent")} dash="4 3" width={1.5} height={H} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Water day (WC-HE.1 day): the reference's 24 bars by hour, the drinks summed
// into their hour (B1 water_intakes); the hour now in the accent, hours ahead
// as outlines. A day total without drink rows sits in the last hour reached.

export const WaterDayChartWeb: React.FC<{
  totalMl: number;
  isToday: boolean;
  drinks?: { hour: number; ml: number }[];
}> = ({ totalMl, isToday, drinks }) => {
  const nowHour = isToday ? new Date().getHours() : null;
  const values: (number | null)[] = Array.from({ length: 24 }, () => null);
  for (const k of drinks ?? []) {
    const h = clamp(Math.floor(k.hour), 0, 23);
    values[h] = (values[h] ?? 0) + k.ml;
  }
  if (!(drinks && drinks.length) && totalMl > 0) values[nowHour ?? 23] = totalMl;
  return (
    <AxisBarsWeb
      metric="water"
      tickLabel={null}
      bars={values.map((v, h) => {
        const ahead = nowHour !== null && h > nowHour;
        return { key: String(h), value: ahead ? null : v, ghost: ahead, current: h === nowHour, label: hourAxisLabel(h) };
      })}
    />
  );
};
