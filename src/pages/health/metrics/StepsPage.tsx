import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Building2, CalendarDays, Footprints, Link2, RefreshCw, Route, Sigma, Target, Timer } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { Toast } from "../../../components/ui/Toast";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import {
  CapsLabel,
  ChartCard,
  ErrorCard,
  FreshnessLine,
  HistoryCard,
  MetricPage,
  OFFLINE_CACHED,
  mc,
  useMetricRangeState,
  type HistoryItem,
  type Stat,
  useMetricsLoad,
  useMetricSource,
} from "../../../components/health/metric/MetricKit";
import { textPx, linePx } from "../../../theme/textSize";
import {
  avg,
  daysInMonth,
  daysOf,
  dayLabel,
  isCurrentPeriod,
  monthShort,
  periodLabel,
  periodOf,
  periodTitle,
  previousPeriod,
  relativeDayTitle,
  shortDate,
  stepAnchor,
  valuesIn,
} from "../../../components/health/metric/periods";
import { GoalBarChart, LegendDash, LegendDot, LegendGhost, buildGoalBars } from "../../../components/health/metric/StepsBarChart";
import { StepsHero } from "../../../components/health/metric/StepsHero";
import { StepsGoalSheet } from "../../../components/health/metric/StepsGoalSheet";
import { SyncedNoDevice } from "../../../components/health/metric/StepsNoDevice";
import { useSyncedRemove } from "../../../components/health/metric/SyncedRemove";
import { HourlyBars } from "../../../components/health/metric/HourlyBars";
import { activityByDay, sourceName, useActivityDaily, useActivityHourly } from "../../../services/health-metrics/b1";
import { hourLabel12 } from "../../../utils/time12";

// HE1.2 Steps (Week), HE1.2.s, HE1.2.e, HE1.2.1, HE1.2.d, HE1.2.m, HE1.2.y.
//
// DATA: healthSeries.steps (one value a day, synced only: no manual steps,
// V6-20). With no readings the web shows the no-device state
// (OURS-health-no-device-web on the HE1.2.e layout). Distance, active time
// and floors (HA-05 / PB-H-05) and hourly buckets (PB-H-13) wait for
// Database stage B1: the tiles show the handover fallback (Goal · To go ·
// Best day; month Total · Best day · Days at goal) and the Day card shows
// the total with "Hourly detail comes from your connected source.". The
// source tag, freshness line and Delete on synced rows are native (sync and
// HA-01 / HA-12, B1; V6-169), so none of them shows on the web. The goal
// is localStorage until B1 (V6-59).

const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const n = (v: number) => Math.round(v).toLocaleString("en-GB");
const abbrev = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : n(v));
const change = (now: number | null, before: number | null, what: string) => {
  if (now === null || before === null || before <= 0) return null;
  const pc = Math.round(((now - before) / before) * 100);
  return pc === 0 ? `Same as ${what}` : `${pc > 0 ? "↑" : "↓"} ${Math.abs(pc)}% vs ${what}`;
};
const iconInk = { color: "rgb(var(--th-7d6bb5))" };

export default function StepsPage() {
  const { healthSeries, stepsGoal, setStepsGoal, metricsError, metricGoalOn } = useApp();
  const navigate = useNavigate();
  const online = useOnline();
  const { range, setRange, anchor, setAnchor, openDay, today } = useMetricRangeState("week");
  const [goalOpen, setGoalOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Database B1 activity_daily (HA-05): steps, distance, active minutes and
  // floors per local day, one source per row (priority wins); a day it
  // covers takes its steps from there, other days keep health_metrics.
  const p0 = periodOf(range, anchor);
  const actFrom = p0.start < stepAnchor("week", today, -1) ? p0.start : stepAnchor("week", today, -1);
  const activity = activityByDay(useActivityDaily(actFrom, today > p0.end ? today : p0.end).data);
  const hourly = useActivityHourly(anchor).data;
  const byDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const pt of healthSeries.steps.history) if (pt.value > 0) out[pt.date] = pt.value;
    for (const [d, a] of Object.entries(activity)) if (a.steps !== null && a.steps > 0) out[d] = a.steps;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthSeries.steps.history, JSON.stringify(activity)]);
  // B1 metric_goals: "at goal" on a past day uses the goal that stood then.
  const goalOn = (d: string) => metricGoalOn("steps", d);
  const hasAny = Object.keys(byDay).length > 0;
  // Still hydrating: the device copy of the latest reading says rows exist
  // but the series has not arrived yet (no metrics-loaded flag in context).
  const { loading, retry: retryMetrics } = useMetricsLoad();
  // HA-01 (B1): the connected source as the header tag and its freshness line; none on the web.
  const metricSource = useMetricSource();
  // HA-12 (B1 hidden_synced_readings): Delete on a synced day ("Remove from Centium?").
  const syncedRemove = useSyncedRemove("steps", stepAnchor("month", today, -1), today, setToast);
  const goal = stepsGoal;
  const p = periodOf(range, anchor);
  const current = isCurrentPeriod(p, today);
  const rows = valuesIn(byDay, p);
  const empty = rows.length === 0;
  const mean = avg(rows.map((r) => r.value));
  const best = (list: { date: string; value: number }[]) => list.reduce<{ date: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);
  const allRows = valuesIn(byDay, { range: "year", start: "0000-01-01", end: today });

  const menu = [
    { value: "goal", label: "Edit goal", icon: <Target size={17} style={iconInk} />, onSelect: () => setGoalOpen(true) },
    hasAny
      ? { value: "sources", label: "Sources", icon: <RefreshCw size={17} style={iconInk} />, onSelect: () => navigate("/app/settings/devices") }
      : { value: "connect", label: "Connect a source", icon: <Link2 size={17} style={iconInk} />, onSelect: () => navigate("/app/settings/devices") },
    { value: "date", label: "Go to date", icon: <CalendarDays size={17} style={iconInk} />, onSelect: () => setDateOpen(true) },
  ];
  const sheets = (
    <>
      <StepsGoalSheet
        open={goalOpen}
        goal={goal}
        todaySteps={byDay[today] ?? (hasAny ? 0 : null)}
        onClose={() => setGoalOpen(false)}
        onSave={(g) => {
          setStepsGoal(g);
          setGoalOpen(false);
          setToast("Step goal saved");
        }}
      />
      <CalendarPickerSheet
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        selectedDate={anchor}
        today={today}
        maxDate={today}
        title="Go to date"
        variant="partB"
        markers={Object.keys(byDay)}
        onSelect={(d) => {
          setDateOpen(false);
          openDay(d);
        }}
      />
      {syncedRemove.popup}
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );

  // ---- web, nothing synced: HE1.2.e layout with the web copy -------------
  if (!loading && !hasAny) {
    return (
      <MetricPage
        metric="steps"
        title="Steps"
        range={range}
        onRangeChange={setRange}
        menu={menu}
        cta={{ label: "Connect a source", icon: <Link2 size={16} />, onClick: () => navigate("/app/settings/devices") }}
      >
        {metricsError ? <ErrorCard onRetry={retryMetrics} /> : <SyncedNoDevice metric="steps" icon={Footprints} bodyName="Steps" footName="steps" range={range} today={today} />}
        {sheets}
      </MetricPage>
    );
  }

  // ---- hero ---------------------------------------------------------------
  const dayHero = (day: string) => {
    const v = byDay[day] ?? 0;
    const goal = goalOn(day);
    const lastWeekSame = byDay[stepAnchor("week", day, -1)] ?? null;
    const pills = [`${Math.round((v / goal) * 100)}% of goal`];
    const c = change(v || null, lastWeekSame, `last ${dayLabel(day).split(" ")[0]}`);
    if (c) pills.push(c);
    return { pct: v / goal, value: n(v), sub: `of ${n(goal)} steps`, pills };
  };
  const hero = (() => {
    if (range === "day") return dayHero(anchor);
    if (range === "week") return dayHero(current ? today : rows.length ? rows[rows.length - 1].date : p.end);
    const prev = previousPeriod(p);
    const prevMean = avg(valuesIn(byDay, prev).map((r) => r.value));
    if (range === "month") {
      const m = Number(p.start.slice(5, 7));
      const k = rows.filter((r) => r.value >= goalOn(r.date)).length;
      const pills = [`${k} ${k === 1 ? "day" : "days"} at goal`];
      const c = change(mean, prevMean, MONTH_LONG[(m + 10) % 12]);
      if (c) pills.push(c);
      return { pct: (mean ?? 0) / goal, value: n(mean ?? 0), sub: `avg a day in ${MONTH_LONG[m - 1]}`, pills };
    }
    const y = Number(p.start.slice(0, 4));
    const total = rows.reduce((s, r) => s + r.value, 0);
    const pills = [`avg ${n(mean ?? 0)} a day`];
    const c = change(mean, prevMean, String(y - 1));
    if (c) pills.push(c);
    return { pct: (mean ?? 0) / goal, value: abbrev(total), sub: `steps in ${y}`, pills };
  })();

  // ---- tiles: distance / active time / floors (B1 activity_daily, HA-05)
  // when a source reported them for the day; the handover fallback otherwise.
  const stats: Stat[] = (() => {
    if (range === "day" || range === "week") {
      const day = range === "day" ? anchor : current ? today : p.end;
      const a = activity[day];
      if (a && (a.distanceM !== null || a.activeMinutes !== null || a.floors !== null))
        return [
          { icon: Route, value: a.distanceM === null ? "—" : `${(a.distanceM / 1000).toFixed(1)} km`, label: "Distance" },
          { icon: Timer, value: a.activeMinutes === null ? "—" : `${Math.round(a.activeMinutes)} min`, label: "Active time" },
          { icon: Building2, value: a.floors === null ? "—" : String(Math.round(a.floors)), label: "Floors" },
        ];
      const b = best(allRows);
      return [
        { icon: Target, value: n(goal), label: "Goal" },
        { icon: Footprints, value: byDay[day] !== undefined ? n(Math.max(0, goal - byDay[day])) : "—", label: "To go" },
        { icon: Award, value: b ? n(b.value) : "—", label: "Best day" },
      ];
    }
    const total = rows.reduce((s, r) => s + r.value, 0);
    const k = rows.filter((r) => r.value >= goalOn(r.date)).length;
    if (range === "month") {
      const b = best(rows);
      return [
        { icon: Sigma, value: empty ? "—" : n(total), label: "Total steps" },
        { icon: Award, value: b ? n(b.value) : "—", label: b ? `Best day · ${shortDate(b.date)}` : "Best day" },
        { icon: Target, value: empty ? "—" : String(k), label: "Days at goal" },
      ];
    }
    const y = Number(p.start.slice(0, 4));
    const monthAvgs = Array.from({ length: 12 }, (_, i) => avg(rows.filter((r) => Number(r.date.slice(5, 7)) === i + 1).map((r) => r.value)));
    let bi = -1;
    monthAvgs.forEach((v, i) => {
      if (v !== null && (bi < 0 || v > (monthAvgs[bi] as number))) bi = i;
    });
    return [
      { icon: Sigma, value: empty ? "—" : abbrev(total), label: `Total in ${y}` },
      { icon: Award, value: bi < 0 ? "—" : n(monthAvgs[bi] as number), label: bi < 0 ? "Best month" : `Best month · ${monthShort(bi + 1)}` },
      { icon: Target, value: empty ? "—" : String(k), label: "Days at goal" },
    ];
  })();

  // ---- chart --------------------------------------------------------------
  const ink = mc("steps", "ink");
  const title = range === "day" ? (anchor === today ? "Today by hour" : `${dayLabel(anchor)} by hour`) : current ? periodTitle(p, today) : range === "month" ? MONTH_LONG[Number(p.start.slice(5, 7)) - 1] : periodLabel(p);
  let foot: string | undefined;
  let summary: string;
  let legend: { label: string; swatch: React.ReactNode }[] | undefined;
  if (range === "day") {
    const v = byDay[anchor];
    summary = `Steps ${anchor === today ? "today" : `on ${dayLabel(anchor)}`}. ${v !== undefined ? `${n(v)} steps.` : "Nothing synced."} Hourly detail comes from your connected source.`;
  } else if (range === "week") {
    const ahead = daysOf(p).filter((d) => d > today).length;
    foot = empty ? "No steps this week" : `${rows.length} of 7 days logged · average ${n(mean ?? 0)} a day`;
    summary = `Steps ${current ? "this week" : `in ${periodLabel(p)}`}. ${empty ? "Nothing synced." : rows.map((r) => `${dayLabel(r.date).split(" ")[0]} ${n(r.value)}`).join(", ") + "."} Goal ${n(goal)}.${ahead ? ` ${ahead} ${ahead === 1 ? "day" : "days"} ahead.` : ""}`;
    legend = [
      { label: "Steps", swatch: <LegendDot color={mc("steps", "main")} /> },
      { label: "Days ahead", swatch: <LegendGhost /> },
      { label: "Goal", swatch: <LegendDash color={ink} /> },
    ];
  } else if (range === "month") {
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
    const total = rows.reduce((s, r) => s + r.value, 0);
    const k = rows.filter((r) => r.value >= goalOn(r.date)).length;
    const b = best(rows);
    foot = empty ? "No steps this month" : `${rows.length} of ${span} days logged · total ${n(total)}`;
    summary = empty
      ? `Steps in ${MONTH_LONG[m - 1]}. Nothing synced.`
      : `Steps in ${MONTH_LONG[m - 1]}. Average ${n(mean ?? 0)} a day. Goal reached on ${k} ${k === 1 ? "day" : "days"}. Best day ${Number(b!.date.slice(8))} ${MONTH_LONG[m - 1]}, ${n(b!.value)}.`;
    legend = [
      { label: "Steps a day", swatch: <LegendDot color={mc("steps", "main", 0.75)} /> },
      { label: "Goal", swatch: <LegendDash color={ink} /> },
    ];
  } else {
    const y = Number(p.start.slice(0, 4));
    const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a, b) => a - b);
    const curM = Number(today.slice(5, 7));
    const total = rows.reduce((s, r) => s + r.value, 0);
    foot = empty
      ? "No steps this year"
      : `${months.length === 1 ? monthShort(months[0]) : `${monthShort(months[0])} to ${monthShort(months[months.length - 1])}`}${current && months.includes(curM) ? ` · ${MONTH_LONG[curM - 1]} so far` : ""}`;
    summary = empty ? `Steps in ${y}. Nothing synced.` : `Steps in ${y}. ${n(total)} so far, average ${n(mean ?? 0)} a day.`;
    legend = [
      { label: "Average a day", swatch: <LegendDot color={mc("steps", "main")} /> },
      { label: "Months ahead", swatch: <LegendGhost /> },
      { label: "Goal", swatch: <LegendDash color={ink} /> },
    ];
  }

  // ---- history (synced rows: no Edit; Delete is native, V6-169) -----------
  const items: HistoryItem[] = Object.keys(byDay)
    .filter((d) => d <= today)
    .sort()
    .reverse()
    .slice(0, 7)
    .map((d) => {
      const rel = relativeDayTitle(d, today);
      const v = byDay[d];
      return {
        key: d,
        title: rel,
        meta: [rel === dayLabel(d) ? "Day total" : dayLabel(d), activity[d] ? sourceName(activity[d].source) : syncedRemove.sourceOf(d)].filter(Boolean).join(" · "),
        value: n(v),
        sub: v >= goal ? "Goal" : `${Math.round((v / goal) * 100)}%`,
        onClick: () => openDay(d),
        onDelete: syncedRemove.onDelete(d),
      };
    });

  return (
    <MetricPage sourceTag={metricSource.tag} onSourceTag={() => navigate("/app/settings/devices")}
      metric="steps"
      title="Steps"
      range={range}
      onRangeChange={setRange}
      menu={menu}
      cta={{ label: "Set step goal", icon: <Target size={16} />, onClick: () => setGoalOpen(true) }}
    >
      <StepsHero
        pct={hero.pct}
        value={hero.value}
        sub={hero.sub}
        pills={hero.pills}
        stats={stats}
        loading={loading}
        ariaLabel={`${hero.value} ${hero.sub}. ${hero.pills.join(". ")}`}
      />
      {!online && <FreshnessLine offline>{OFFLINE_CACHED}</FreshnessLine>}
      {metricSource.freshness}
      {metricsError && !hasAny ? (
        <ErrorCard onRetry={retryMetrics} />
      ) : (
        <ChartCard
          metric="steps"
          title={title}
          periodLabel={periodLabel(p)}
          onPrev={() => setAnchor(stepAnchor(range, anchor, -1))}
          onNext={() => setAnchor(stepAnchor(range, anchor, 1))}
          nextDisabled={current}
          legend={legend}
          foot={foot}
          loading={loading}
          summary={summary}
        >
          {range === "day" && hourly.some((h) => h.steps !== null) ? (
            <HourlyBars
              metric="steps"
              values={Array.from({ length: 24 }, (_, h) => hourly.find((x) => x.hour === h)?.steps ?? null)}
              nowHour={anchor === today ? new Date().getHours() : null}
              label={(h, v) => `${hourLabel12(h)}, ${v === null ? "nothing synced" : `${n(v)} steps`}`}
            />
          ) : range === "day" ? (
            <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 120, gap: 4 }}>
              <span style={{ fontSize: textPx(15), lineHeight: linePx(17.3), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>
                {byDay[anchor] !== undefined ? `${n(byDay[anchor])} steps` : "No steps synced"}
              </span>
              <span style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>Hourly detail comes from your connected source.</span>
            </div>
          ) : (
            <GoalBarChart
              metric="steps"
              mode={range}
              bars={buildGoalBars(p, byDay, today)}
              goal={goal}
              goalLabel={`Goal ${n(goal)}`}
              onBarTap={range === "month" ? openDay : undefined}
              barLabel={(b) => (b.value === null ? `${b.key}, nothing synced` : `${b.key}, ${n(b.value)} steps`)}
            />
          )}
        </ChartCard>
      )}
      <CapsLabel>History</CapsLabel>
      <HistoryCard metric="steps" icon={Footprints} items={items} loading={loading} empty="No steps synced yet" />
      {sheets}
    </MetricPage>
  );
}
