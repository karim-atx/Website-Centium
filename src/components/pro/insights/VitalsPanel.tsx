import React, { useMemo, useState } from "react";
import { Activity, Droplets, Flame, Footprints, HeartPulse, Moon, Scale } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { INK } from "../proInk";
import { signedNum } from "../proRules";
import { textPx } from "../../../theme/textSize";
import { ProChart } from "../ProChart";
import { EmptyState } from "../EmptyState";
import { OfflineLine } from "../states";
import { fetchClientBloodPressure, type BloodPressureReading } from "../../../services/blood-pressure";
import { classifyBloodPressure, splitByTimeOfDay, averageReading } from "../../../services/blood-pressure/classify";
import { BP_CATEGORY_LABEL } from "../../../services/blood-pressure/guidance";
import { NO_READINGS } from "../../../services/health-metrics/series";
import { fetchActivityDays, fetchInsightTargets, fetchMetricRows, fetchSleepNights, fetchTrackedTypes, localDay, type MetricRow, type MetricType } from "../../../services/pro/insights";
import { SleepView } from "./SleepCharts";
import {
  addDays,
  bpByBucket,
  bucketLabel,
  bucketTitle,
  bucketsFor,
  dayLabel,
  daysBetween,
  heartByDay,
  hm,
  meanByBucket,
  RANGE_DAYS,
  tipDay,
  trendPerWeek,
  weightTrend,
  type ChartRange,
} from "./insightsModel";
import { ChipRow, InsightCard, NotShared, StatBoxes, type StatBox } from "./parts";
import { readGate, useRead, type ReadState } from "./reads";
import { PAGE_RANGE_DAYS } from "./panelProps";
import type { PanelProps } from "./panelProps";
import { appLocale } from "../../../i18n/format";
import { t, tk, tn, tx } from "../../../i18n/core";

/**
 * Release 3 · W5 Insights › Vitals (TR9 v5 "Blood pressure · dumbbells and
 * categories", "Heart rate · resting line, min to max band", "Weight ·
 * weigh-ins, trend, goal", "Sleep"; TR9 v4 empties; NU14 v2; source
 * gen/r14.js vitals14, bpChart14, hrChart14, wtChart14, vHead14, gen/r12.js
 * VIT12 boxes).
 *
 * Sub-tabs only for what the client tracks (HANDOVER i, services/health-
 * metrics/series.ts: weight, heart rate, sleep, steps, water, calories
 * burned; blood pressure from blood_pressure_readings): a tab shows when
 * its switch is on and at least one reading exists; Blood pressure, Heart
 * rate, Weight and Sleep also show when the switch is off, as the TR9 v4
 * "No … shared yet" state with Ask to share. W9: Sleep also shows when
 * sleep_details has a night, and draws the stages, bedtime and hypnogram
 * from sleep_details and sleep_segments (SleepCharts.tsx). HRV is not
 * tracked: no tab.
 *
 * Charts: BP buckets as dumbbells (systolic filled, diastolic hollow) over
 * the AHA categories (services/blood-pressure/classify.ts; an average of
 * several readings is not classified, so its points stay neutral);
 * heart rate as the resting line (resting readings, else the wearable's
 * resting bpm) inside the daily min to max band with 60 and 100 marked;
 * weight as weigh-ins on their true day with the EWMA trend (alpha 0.25,
 * points only under 3 weigh-ins) and the goal line only when the client's
 * target weight is readable (Progress shared).
 */

type Sub = "bp" | "hr" | "weight" | "sleep" | "steps" | "water" | "calories";
/** The blood pressure category word (BP_CATEGORY_LABEL's English), in the active language. */
const bpWord = (c: keyof typeof BP_CATEGORY_LABEL): string =>
  c === "normal" ? tx("Normal", "blood pressure") : c === "elevated" ? t("Elevated") : c === "stage1" ? t("Stage 1 high") : c === "stage2" ? t("Stage 2 high") : t("Very high");
const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));

export const VitalsPanel: React.FC<PanelProps> = (p) => {
  const { clientId, firstName, access, range, onRange, today, pageRange } = p;
  const bpOn = access.has("blood_pressure");
  const hmOn = access.has("health_metrics");
  const wOn = access.has("weight");
  const bmOn = access.has("body_measurements");
  const span = RANGE_DAYS[range];
  const since = addDays(today, -(span * 2));

  const bp = useRead(bpOn, async () => {
    const r = await fetchClientBloodPressure([clientId], "2000-01-01");
    return r.ok ? { ok: true as const, data: r.byClient[clientId] ?? [] } : { ok: false as const, offline: /connection|offline|reach/i.test(r.message) };
  }, [clientId]);
  const tracked = useRead(hmOn, () => fetchTrackedTypes(clientId, ["heart_rate", "sleep", "steps", "water", "calories_burned"]), [clientId]);
  const vit = useRead(hmOn, () => fetchMetricRows(clientId, ["heart_rate", "sleep", "steps", "water", "calories_burned"], since), [clientId, since]);
  const daily = useRead(hmOn, () => fetchActivityDays(clientId, since), [clientId, since]);
  const sleep = useRead(hmOn, () => fetchSleepNights(clientId, since), [clientId, since]);
  const weight = useRead(wOn, () => fetchMetricRows(clientId, ["weight"], "2000-01-01"), [clientId]);
  const body = useRead(bmOn, () => fetchMetricRows(clientId, ["waist", "body_fat_pct"], addDays(today, -400)), [clientId, today]);
  const targets = useRead(wOn && access.has("progress"), () => fetchInsightTargets(clientId, true), [clientId]);

  const has = (t: MetricType) => !!tracked.data?.includes(t);
  const hrTracked = has("heart_rate") || !!daily.data?.some((d) => d.restingBpm != null);
  const subs = useMemo(() => {
    const out: { key: Sub; label: string }[] = [];
    if (!bpOn || (bp.data?.length ?? 0) > 0) out.push({ key: "bp", label: t("Blood pressure") });
    if (!hmOn || hrTracked) out.push({ key: "hr", label: t("Heart rate") });
    if (!wOn || (weight.data?.length ?? 0) > 0) out.push({ key: "weight", label: t("Weight") });
    if (!hmOn || has("sleep") || (sleep.data?.length ?? 0) > 0 || sleep.error) out.push({ key: "sleep", label: t("Sleep") });
    if (hmOn && has("steps")) out.push({ key: "steps", label: t("Steps") });
    if (hmOn && has("water")) out.push({ key: "water", label: t("Water") });
    if (hmOn && has("calories_burned")) out.push({ key: "calories", label: t("Calories burned") });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpOn, hmOn, wOn, bp.data, weight.data, tracked.data, hrTracked, sleep.data, sleep.error]);
  const [chosen, setChosen] = useState<Sub | null>(null);
  const sub = subs.find((s) => s.key === chosen)?.key ?? subs[0]?.key ?? null;

  const waiting = (bpOn && bp.loading) || (hmOn && (tracked.loading || daily.loading || sleep.loading)) || (wOn && weight.loading);
  if (waiting) return <>{readGate({ data: undefined, loading: true, error: false, offline: false, retry: () => undefined })}</>;
  const failed = ([bpOn && bp, hmOn && tracked, wOn && weight] as (ReadState<unknown> | false)[]).find((r): r is ReadState<unknown> => !!r && r.error && r.data === undefined);
  if (failed) return <>{readGate(failed)}</>;
  if (!sub) return <EmptyState icon={HeartPulse} title={t(NO_READINGS)} line={t("{firstName} shares vitals with you, but nothing has been logged yet.", { firstName })} />;

  const ask = (c: "health_metrics" | "weight" | "blood_pressure") => ({ asked: p.asked.includes(c), onAsk: () => p.onAsk(c), askLabel: t("Ask {firstName} to share", { firstName }) });
  const shift = (r: ChartRange) => onRange(r);
  const winStart = addDays(today, -(PAGE_RANGE_DAYS[pageRange] - 1));

  return (
    <>
      {(bp.offline || vit.offline || weight.offline || sleep.offline) && <OfflineLine />}
      <ChipRow label={t("Vitals")} items={subs} active={sub} onChange={(k) => setChosen(k as Sub)} />
      {sub === "bp" &&
        (!bpOn ? (
          <NotShared icon={HeartPulse} title={t("No blood pressure shared yet")} line={t("This fills in when {firstName} shares blood pressure with you.", { firstName })} {...ask("blood_pressure")} />
        ) : (
          <BpView readings={bp.data ?? []} range={range} onRange={shift} today={today} winStart={winStart} />
        ))}
      {sub === "hr" &&
        (!hmOn ? (
          <NotShared icon={HeartPulse} title={t("No heart rate shared yet")} line={t("This fills in when {firstName} shares Activity and vitals with you.", { firstName })} {...ask("health_metrics")} />
        ) : (
          readGate(vit) ?? <HrView rows={(vit.data ?? []).filter((r) => r.type === "heart_rate")} daily={daily.data ?? []} range={range} onRange={shift} today={today} winStart={winStart} />
        ))}
      {sub === "weight" &&
        (!wOn ? (
          <NotShared icon={Scale} title={t("No weight shared yet")} line={t("This fills in when {firstName} shares weight with you.", { firstName })} {...ask("weight")} />
        ) : (
          <WeightView rows={weight.data ?? []} body={body.data ?? []} bodyOn={bmOn} goalKg={targets.data?.goalWeightKg ?? null} range={range} onRange={shift} today={today} />
        ))}
      {sub === "sleep" &&
        (!hmOn ? (
          <NotShared icon={Moon} title={t("No sleep shared yet")} line={t("This fills in when {firstName} shares Activity and vitals with you.", { firstName })} {...ask("health_metrics")} />
        ) : (
          readGate(vit) ?? (
            <SleepView
              nights={sleep}
              durationRows={(vit.data ?? []).filter((r) => r.type === "sleep")}
              duration={(rows) => <SimpleView kind="sleep" rows={rows} range={range} onRange={shift} today={today} winStart={winStart} firstName={firstName} />}
              range={range}
              onRange={shift}
              today={today}
              winStart={winStart}
              firstName={firstName}
            />
          )
        ))}
      {sub === "steps" && (readGate(vit) ?? <SimpleView kind="steps" rows={(vit.data ?? []).filter((r) => r.type === "steps")} range={range} onRange={shift} today={today} winStart={winStart} firstName={firstName} />)}
      {sub === "water" && (readGate(vit) ?? <SimpleView kind="water" rows={(vit.data ?? []).filter((r) => r.type === "water")} range={range} onRange={shift} today={today} winStart={winStart} firstName={firstName} />)}
      {sub === "calories" && (readGate(vit) ?? <SimpleView kind="calories" rows={(vit.data ?? []).filter((r) => r.type === "calories_burned")} range={range} onRange={shift} today={today} winStart={winStart} firstName={firstName} />)}
    </>
  );
};

// ---------------------------------------------------------------------------
// Blood pressure
// ---------------------------------------------------------------------------

const BpView: React.FC<{ readings: BloodPressureReading[]; range: ChartRange; onRange: (r: ChartRange) => void; today: string; winStart: string }> = ({ readings, range, onRange, today, winStart }) => {
  const dark = useIsDark();
  const b = bucketsFor(range, today);
  const rows = readings.map((r) => ({ day: localDay(r.recordedAt), systolic: r.systolic, diastolic: r.diastolic }));
  const agg = bpByBucket(b, rows);
  const amber = dark ? "#E7A07A" : "#D2704B";
  const cs = (v: number) => (v >= 140 ? INK.hi : v >= 130 ? amber : v >= 120 ? INK.gold : INK.good);
  const cd = (v: number) => (v >= 90 ? INK.hi : v >= 80 ? amber : INK.good);
  const maxSys = Math.max(176, ...agg.map((a) => (a ? a.systolic + 8 : 0)));
  const minDia = Math.min(60, ...agg.map((a) => (a ? a.diastolic - 8 : 999)));
  const s1 = dark ? "rgba(240,154,142,0.14)" : "#FDF1EF";
  const inWin = readings.filter((r) => localDay(r.recordedAt) >= winStart && localDay(r.recordedAt) <= today);
  const prevWin = readings.filter((r) => localDay(r.recordedAt) >= addDays(winStart, -(daysBetween(winStart, today) + 1)) && localDay(r.recordedAt) < winStart);
  const avg = averageReading(inWin);
  const prev = averageReading(prevWin);
  const normal = inWin.filter((r) => classifyBloodPressure(r.systolic, r.diastolic) === "normal").length;
  const tod = splitByTimeOfDay(inWin);
  const am = averageReading(tod.morning);
  const pm = averageReading(tod.evening);
  const filled = agg.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  const firstI = filled[0];
  const lastI = filled[filled.length - 1];
  const spanDays = rows.length ? daysBetween(rows.map((r) => r.day).sort()[0], today) : 0;
  const latestCat = readings.length ? classifyBloodPressure(readings[0].systolic, readings[0].diastolic) : null;

  const boxes: StatBox[] = [
    { label: t("Average"), value: avg ? `${avg.systolic}/${avg.diastolic}` : "–", unit: avg ? t("mmHg") : undefined, delta: avg && prev && avg.systolic !== prev.systolic ? signedNum(avg.systolic - prev.systolic) : null, dir: avg && prev ? (avg.systolic < prev.systolic ? "up" : avg.systolic > prev.systolic ? "down" : null) : null, sub: tn(inWin.length, "{n} reading", "{n} readings") },
    { label: t("In the normal band"), value: String(normal), unit: t("of {n}", { n: inWin.length }), sub: t("Readings in this range") },
    ...(am && pm ? [{ label: t("Mornings"), value: signedNum(am.systolic - pm.systolic), unit: t("mmHg"), sub: am.systolic >= pm.systolic ? t("Higher than evenings") : t("Lower than evenings") } as StatBox] : []),
  ];

  if (spanDays < 14 && readings.length < 6) {
    return (
      <>
        <InsightCard title={t("Blood pressure")}>
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{tn(readings.length, "{n} reading so far. Trends appear after 2 weeks.", "{n} readings so far. Trends appear after 2 weeks.")}</p>
        </InsightCard>
        <StatBoxes boxes={boxes} />
      </>
    );
  }
  return (
    <>
      <ProChart
        title={t("Blood pressure")}
        question={latestCat === "stage1" || latestCat === "stage2" ? t("Is blood pressure coming down out of Stage {n}?", { n: latestCat === "stage1" ? 1 : 2 }) : t("Is blood pressure staying within a healthy range?")}
        range={range}
        onRangeChange={onRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={minDia}
        max={maxSys}
        height={170}
        bands={[
          { low: 140, high: 165, fill: INK.hiBg, label: t("Stage 2") },
          { low: 130, high: 140, fill: s1, label: t("Stage 1") },
          { low: 120, high: 130, fill: INK.goldPale, label: t("Elevated") },
          { low: 110, high: 120, fill: INK.tealPale, label: tx("Normal", "blood pressure") },
          { low: 90, high: 100, fill: INK.hiBg, label: t("Stage 2") },
          { low: 80, high: 90, fill: s1, label: t("Stage 1") },
          { low: 60, high: 80, fill: INK.tealPale, label: tx("Normal", "blood pressure") },
        ]}
        bandsLabel={t("Categories")}
        series={[
          {
            key: "bp",
            label: t("Systolic and diastolic"),
            type: "dumbbell",
            color: INK.chS,
            values: agg.map((a) => a?.systolic ?? null),
            low: agg.map((a) => a?.diastolic ?? null),
            pointColor: (i, v) => (agg[i]?.n === 1 ? cs(v) : INK.chS),
            lowColor: (i, v) => (agg[i]?.n === 1 ? cd(v) : INK.chS),
          },
        ]}
        tooltip={(i) => {
          const a = agg[i];
          if (!a) return { title: bucketTitle(range, b[i]), lines: [t("No readings")] };
          return { title: bucketTitle(range, b[i]), lines: [`${a.systolic}/${a.diastolic} · ${a.n === 1 ? t("1 reading") : tn(a.n, "avg of {n} readings", "avg of {n} readings")}`, ...(a.n === 1 ? [bpWord(classifyBloodPressure(a.systolic, a.diastolic))] : [])] };
        }}
        insight={
          firstI != null && lastI != null && firstI !== lastI && agg[firstI] && agg[lastI] && agg[firstI]!.systolic !== agg[lastI]!.systolic
            ? t(agg[lastI]!.systolic < agg[firstI]!.systolic ? "Systolic down {n} mmHg since {date}." : "Systolic up {n} mmHg since {date}.", { n: Math.abs(agg[lastI]!.systolic - agg[firstI]!.systolic), date: dayLabel(b[firstI].start) })
            : undefined
        }
        summary={avg ? tn(inWin.length, "Blood pressure {value} mmHg on average, {n} readings.", "Blood pressure {value} mmHg on average, {n} readings.", { value: `${avg.systolic}/${avg.diastolic}` }) : undefined}
      />
      <StatBoxes boxes={boxes} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Heart rate
// ---------------------------------------------------------------------------

const HrView: React.FC<{ rows: MetricRow[]; daily: { day: string; restingBpm: number | null }[]; range: ChartRange; onRange: (r: ChartRange) => void; today: string; winStart: string }> = ({ rows, daily, range, onRange, today, winStart }) => {
  const dark = useIsDark();
  const line = dark ? "#C3B3FB" : "#5F5093";
  const byDay = heartByDay(rows.map((r) => ({ day: r.day, bpm: r.value, rest: r.rest })), daily);
  const b = bucketsFor(range, today);
  const g = bucketsFor(range, today, 1);
  const list = [...byDay.entries()].map(([day, v]) => ({ day, ...v }));
  const rest = meanByBucket(b, list.filter((x) => x.resting != null).map((x) => ({ day: x.day, value: x.resting as number })));
  const ghost = meanByBucket(g, list.filter((x) => x.resting != null).map((x) => ({ day: x.day, value: x.resting as number })));
  const mins = b.map((x) => {
    const v = list.filter((d) => d.day >= x.start && d.day <= x.end && d.min != null).map((d) => d.min as number);
    return v.length ? Math.min(...v) : null;
  });
  const maxs = b.map((x) => {
    const v = list.filter((d) => d.day >= x.start && d.day <= x.end && d.max != null).map((d) => d.max as number);
    return v.length ? Math.max(...v) : null;
  });
  const all = [...rest, ...ghost, ...mins, ...maxs].filter((v): v is number => v != null);
  const lo = Math.min(40, ...all) - 5;
  const hi = Math.max(110, ...all) + 5;
  const r = (v: number | null) => (v == null ? null : Math.round(v));
  const winRest = list.filter((x) => x.day >= winStart && x.resting != null).map((x) => x.resting as number);
  const prevRest = list.filter((x) => x.day < winStart && x.day >= addDays(winStart, -(daysBetween(winStart, today) + 1)) && x.resting != null).map((x) => x.resting as number);
  const mean = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null);
  const restAvg = mean(winRest);
  const restPrev = mean(prevRest);
  const todayMax = byDay.get(today)?.max ?? null;
  const weekMins = list.filter((x) => x.day >= addDays(today, -6) && x.min != null).map((x) => x.min as number);
  const filled = rest.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0);
  const f0 = filled[0];
  const f1 = filled[filled.length - 1];
  return (
    <>
      <ProChart
        title={t("Heart rate")}
        question={t("Is resting heart rate settling while daily range stays healthy?")}
        range={range}
        onRangeChange={onRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={lo}
        max={hi}
        height={150}
        refs={[
          { value: 60, label: "60", side: "left" },
          { value: 100, label: "100", side: "left" },
        ]}
        goalLegend={t("Normal resting 60 to 100")}
        series={[
          { key: "band", label: t("Min to max"), type: "range", color: dark ? "rgba(169,145,254,0.16)" : "#ECE8F8", values: maxs, low: mins, swatch: "fill" },
          { key: "prev", label: t("Previous period"), type: "line", color: INK.chT, ghost: true, values: ghost },
          { key: "rest", label: t("Resting"), type: "line", color: line, values: rest.map(r) },
        ]}
        tooltip={(i) => ({ title: bucketTitle(range, b[i]), lines: [rest[i] != null ? t("Resting {n} bpm", { n: r(rest[i]) as number }) : t("No resting reading"), ...(mins[i] != null && maxs[i] != null ? [t("Range {min} to {max}", { min: mins[i] as number, max: maxs[i] as number })] : [])] })}
        insight={f0 != null && f1 != null && f0 !== f1 && r(rest[f0]) !== r(rest[f1]) ? t((rest[f1] as number) < (rest[f0] as number) ? "Resting down {n} bpm since {date}." : "Resting up {n} bpm since {date}.", { n: Math.abs((r(rest[f1]) as number) - (r(rest[f0]) as number)), date: dayLabel(b[f0].start) }) : undefined}
        summary={restAvg != null ? t("Resting heart rate {n} bpm on average.", { n: restAvg }) : undefined}
      />
      <StatBoxes
        boxes={[
          { label: t("Resting heart rate"), value: restAvg != null ? String(restAvg) : "–", unit: restAvg != null ? t("bpm") : undefined, delta: restAvg != null && restPrev != null && restAvg !== restPrev ? signedNum(restAvg - restPrev) : null, dir: restAvg != null && restPrev != null ? (restAvg < restPrev ? "up" : restAvg > restPrev ? "down" : null) : null, sub: t("{n}-day average", { n: daysBetween(winStart, today) + 1 }) },
          { label: t("Highest today"), value: todayMax != null ? String(todayMax) : "–", unit: todayMax != null ? t("bpm") : undefined, sub: t("From shared readings") },
          { label: t("Lowest this week"), value: weekMins.length ? String(Math.min(...weekMins)) : "–", unit: weekMins.length ? t("bpm") : undefined, sub: t("From shared readings") },
        ]}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Weight
// ---------------------------------------------------------------------------

export const WeightView: React.FC<{ rows: MetricRow[]; body: MetricRow[]; bodyOn: boolean; goalKg: number | null; range: ChartRange; onRange: (r: ChartRange) => void; today: string }> = ({ rows, body, bodyOn, goalKg, range, onRange, today }) => {
  const dark = useIsDark();
  const c = dark ? "#C3B3FB" : "#5F5093";
  // One weigh-in a day (the day's last), in order.
  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(r.day, r.value);
  const weighIns = [...perDay.entries()].map(([day, kg]) => ({ day, kg })).sort((a, b) => (a.day < b.day ? -1 : 1));
  const trend = weightTrend(weighIns);
  const span = RANGE_DAYS[range];
  const start = addDays(today, -(span - 1));
  const idx = weighIns.map((w, i) => (w.day >= start ? i : -1)).filter((i) => i >= 0);
  const shown = idx.map((i) => weighIns[i]);
  const shownTrend = trend ? idx.map((i) => Math.round(trend[i] * 10) / 10) : null;
  const xPos = shown.map((w) => (daysBetween(start, w.day) + 0.5) / span);
  const vals = [...shown.map((w) => w.kg), ...(shownTrend ?? []), ...(goalKg != null ? [goalKg] : [])];
  const lo = vals.length ? Math.floor(Math.min(...vals) - 1) : 0;
  const hi = vals.length ? Math.ceil(Math.max(...vals) + 1) : 1;
  const rate = trendPerWeek(weighIns.filter((w) => w.day >= start), trend ? trend.filter((_, i) => weighIns[i].day >= start) : null);
  const latest = weighIns[weighIns.length - 1] ?? null;
  const earlier = latest ? [...weighIns].reverse().find((w) => w.day <= addDays(latest.day, -30)) ?? weighIns[0] : null;
  const ticks = Array.from({ length: 5 }, (_, i) => ({ pos: i / 4, label: dayLabel(addDays(start, Math.round(((span - 1) * i) / 4))) }));
  const latestOf = (t: MetricType) => {
    const l = body.filter((r) => r.type === t);
    if (!l.length) return null;
    const last = l[l.length - 1];
    const before = [...l].reverse().find((r) => r.day <= addDays(last.day, -30)) ?? l[0];
    return { v: last.value, d: last === before ? null : Math.round((last.value - before.value) * 10) / 10 };
  };
  const waist = latestOf("waist");
  const fat = latestOf("body_fat_pct");
  const signed = (n: number) => signedNum(n);

  return (
    <>
      {shown.length ? (
        <ProChart
          title={t("Weight")}
          question={goalKg != null ? t("Is weight trending toward the {n} kg goal?", { n: goalKg }) : t("How is weight changing over time?")}
          range={range}
          onRangeChange={onRange}
          x={shown.map((w) => w.day)}
          xPos={xPos}
          xTicks={ticks}
          min={lo}
          max={hi}
          goal={goalKg ?? undefined}
          goalLabel={goalKg != null ? t("Goal {n} kg", { n: goalKg }) : undefined}
          goalLegend={goalKg != null ? t("Goal") : undefined}
          defaultPin={shown.length - 1}
          series={[
            { key: "w", label: t("Weigh-ins"), type: "points", color: INK.pr, values: shown.map((w) => w.kg) },
            ...(shownTrend ? [{ key: "t", label: t("Smoothed trend"), type: "line" as const, color: c, values: shownTrend, smooth: true, noPoints: true }] : []),
          ]}
          tooltip={(i) => ({
            title: tipDay(shown[i].day),
            lines: [shownTrend ? t("{kg} kg · trend {trend}", { kg: shown[i].kg, trend: shownTrend[i] }) : t("{kg} kg", { kg: shown[i].kg }), ...(goalKg != null ? [t("{kg} kg to goal", { kg: Math.round(Math.abs(shown[i].kg - goalKg) * 10) / 10 })] : [])],
          })}
          insight={rate != null && Math.abs(rate) >= 0.05 ? t(rate < 0 ? "The trend is down {kg} kg a week." : "The trend is up {kg} kg a week.", { kg: Math.round(Math.abs(rate) * 10) / 10 }) : undefined}
          summary={latest ? (trend ? t("Weight {kg} kg, {n} weigh-ins in this range.", { kg: latest.kg, n: shown.length }) : t("Weight {kg} kg, {n} weigh-ins in this range; the trend line starts at 3 weigh-ins.", { kg: latest.kg, n: shown.length })) : undefined}
        />
      ) : (
        <InsightCard title={t("Weight")}>
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{t("No weigh-ins in this range.")}</p>
        </InsightCard>
      )}
      <StatBoxes
        boxes={[
          { label: t("Weight"), value: latest ? String(latest.kg) : "–", unit: latest ? t("kg") : undefined, delta: latest && earlier && earlier !== latest ? signed(Math.round((latest.kg - earlier.kg) * 10) / 10) : null, dir: null, sub: latest ? t("Since {date}", { date: dayLabel(earlier?.day ?? latest.day) }) : t(NO_READINGS) },
          { label: t("Waist"), value: bodyOn && waist ? String(Math.round(waist.v)) : "–", unit: bodyOn && waist ? t("cm") : undefined, delta: bodyOn && waist?.d ? signed(waist.d) : null, dir: null, sub: bodyOn ? (waist ? t("Body measurements") : t(NO_READINGS)) : t("Body measurements, if shared") },
          { label: t("Body fat"), value: bodyOn && fat ? String(Math.round(fat.v)) : "–", unit: bodyOn && fat ? "%" : undefined, delta: bodyOn && fat?.d ? signed(fat.d) : null, dir: null, sub: bodyOn ? t("From body measurements") : t("Body measurements, if shared") },
        ]}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Sleep duration (SleepView adds the boxes, stages, bedtime and hypnogram),
// steps, water, calories burned
// ---------------------------------------------------------------------------

const SIMPLE: Record<"sleep" | "steps" | "water" | "calories", { title: string; unit: string; icon: typeof Activity }> = {
  sleep: { title: tk("Sleep per night"), unit: tk("h"), icon: Moon },
  steps: { title: tk("Steps"), unit: tk("steps"), icon: Footprints },
  water: { title: tk("Water"), unit: tk("ml"), icon: Droplets },
  calories: { title: tk("Calories burned"), unit: tk("kcal"), icon: Flame },
};

const SimpleView: React.FC<{ kind: "sleep" | "steps" | "water" | "calories"; rows: MetricRow[]; range: ChartRange; onRange: (r: ChartRange) => void; today: string; winStart: string; firstName: string }> = ({ kind, rows, range, onRange, today, winStart, firstName }) => {
  const raw = SIMPLE[kind];
  // English keys (tk) in SIMPLE, shown in the active language.
  const meta = { ...raw, title: t(raw.title), unit: t(raw.unit) };
  // One value a day: sleep and steps are the day's total reading; water and calories add up.
  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(r.day, kind === "water" || kind === "calories" ? (perDay.get(r.day) ?? 0) + r.value : r.value);
  const list = [...perDay.entries()].map(([day, value]) => ({ day, value }));
  const b = bucketsFor(range, today);
  const g = bucketsFor(range, today, 1);
  const v = meanByBucket(b, list);
  const gv = meanByBucket(g, list);
  const max = Math.max(1, ...v.map((x) => x ?? 0), ...gv.map((x) => x ?? 0)) * 1.15;
  const show = (x: number) => (kind === "sleep" ? hm(x * 60) : `${fmt(x)} ${meta.unit}`);
  const win = list.filter((x) => x.day >= winStart && x.day <= today).map((x) => x.value);
  const prev = list.filter((x) => x.day < winStart && x.day >= addDays(winStart, -(daysBetween(winStart, today) + 1))).map((x) => x.value);
  const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const m = mean(win);
  const pm = mean(prev);
  const delta = m != null && pm != null ? m - pm : null;
  return (
    <>
      <ProChart
        title={meta.title}
        question={kind === "sleep" ? t("How long does {firstName} sleep?", { firstName }) : undefined}
        range={range}
        onRangeChange={onRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={0}
        max={max}
        series={[
          { key: "v", label: meta.title, type: "bar", color: INK.pr, values: v },
          { key: "g", label: t("Previous period"), type: "line", color: INK.chT, ghost: true, values: gv },
        ]}
        tooltip={(i) => ({ title: bucketTitle(range, b[i]), lines: [v[i] != null ? (kind === "sleep" ? t("{time} asleep", { time: show(v[i] as number) }) : show(v[i] as number)) : t("No reading")] })}
        summary={m != null ? t("{title} {value} on average.", { title: meta.title, value: show(m) }) : undefined}
      />
      {kind !== "sleep" && (
        <StatBoxes
          boxes={[
            {
              label: t("{title} a day", { title: meta.title }),
              value: m != null ? fmt(m) : "–",
              unit: m != null ? meta.unit : undefined,
              delta: delta != null && Math.abs(delta) > 1e-9 ? signedNum(delta, fmt) : null,
              dir: delta == null || Math.abs(delta) < 1e-9 ? null : delta > 0 ? "up" : "down",
              sub: tn(daysBetween(winStart, today) + 1, "{count} of {n} days", "{count} of {n} days", { count: win.length }),
            },
          ]}
        />
      )}
    </>
  );
};
