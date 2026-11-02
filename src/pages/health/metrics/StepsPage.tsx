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
  dayWord,
  isCurrentPeriod,
  longDate,
  monthLong,
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
import { useClientShare } from "../../../components/share/client/useClientShare";
import { ShareEntryButton } from "../../../components/share/client/ShareEntryButton";
import { stepsCard } from "../../../components/share/client/clientCardModel";
import { appLocale } from "../../../i18n/format";
import { t, tk, tn } from "../../../i18n/core";

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
// is B1's metric_goals (V6-59).

const n = (v: number) => Math.round(v).toLocaleString(appLocale("en-GB"));
const abbrev = (v: number) => (v >= 1_000_000 ? t("{n}M", { n: (v / 1_000_000).toFixed(2) }) : n(v));
/** `what` is translated ("last Mon,", a month name, a year). */
const change = (now: number | null, before: number | null, what: string) => {
  if (now === null || before === null || before <= 0) return null;
  const pc = Math.round(((now - before) / before) * 100);
  return pc === 0 ? t("Same as {what}", { what }) : t("{arrow} {pc}% vs {what}", { arrow: pc > 0 ? "↑" : "↓", pc: Math.abs(pc), what });
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
  // Market + Share 3.0 C-SH.1 e7Steps: today's steps, shareable once the goal is reached.
  const share = useClientShare();
  const stepsToday = byDay[today] ?? null;
  const shareButton = (
    <ShareEntryButton
      label={t("Share your steps")}
      disabledHint={stepsToday === null ? t("Nothing to share yet. Sync your steps first.") : stepsToday < goalOn(today) ? t("Nothing to share yet. Reach your step goal first.") : null}
      onPress={() =>
        stepsToday !== null &&
        share.open(stepsCard({ date: today, steps: stepsToday, goal: goalOn(today), distanceM: activity[today]?.distanceM ?? null, activeMin: activity[today]?.activeMinutes ?? null }))
      }
    />
  );
  const p = periodOf(range, anchor);
  const current = isCurrentPeriod(p, today);
  const rows = valuesIn(byDay, p);
  const empty = rows.length === 0;
  const mean = avg(rows.map((r) => r.value));
  const best = (list: { date: string; value: number }[]) => list.reduce<{ date: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);
  const allRows = valuesIn(byDay, { range: "year", start: "0000-01-01", end: today });

  const menu = [
    { value: "goal", label: t("Edit goal"), icon: <Target size={17} style={iconInk} />, onSelect: () => setGoalOpen(true) },
    hasAny
      ? { value: "sources", label: t("Sources"), icon: <RefreshCw size={17} style={iconInk} />, onSelect: () => navigate("/app/settings/devices") }
      : { value: "connect", label: t("Connect a source"), icon: <Link2 size={17} style={iconInk} />, onSelect: () => navigate("/app/settings/devices") },
    { value: "date", label: t("Go to date"), icon: <CalendarDays size={17} style={iconInk} />, onSelect: () => setDateOpen(true) },
  ];
  const sheets = (
    <>
      {share.sheet}
      <StepsGoalSheet
        open={goalOpen}
        goal={goal}
        todaySteps={byDay[today] ?? (hasAny ? 0 : null)}
        onClose={() => setGoalOpen(false)}
        onSave={(g) => {
          setStepsGoal(g);
          setGoalOpen(false);
          setToast(tk("Step goal saved"));
        }}
      />
      <CalendarPickerSheet
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        selectedDate={anchor}
        today={today}
        maxDate={today}
        title={t("Go to date")}
        variant="partB"
        markers={Object.keys(byDay)}
        onSelect={(d) => {
          setDateOpen(false);
          openDay(d);
        }}
      />
      {syncedRemove.popup}
      <Toast open={!!toast} message={toast ? t(toast) : ""} onExpire={() => setToast(null)} />
    </>
  );

  // ---- web, nothing synced: HE1.2.e layout with the web copy -------------
  if (!loading && !hasAny) {
    return (
      <MetricPage
        metric="steps"
        title={t("Steps")}
        range={range}
        onRangeChange={setRange}
        menu={menu}
        headerAction={shareButton}
        cta={{ label: t("Connect a source"), icon: <Link2 size={16} />, onClick: () => navigate("/app/settings/devices") }}
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
    const pills = [t("{pct}% of goal", { pct: Math.round((v / goal) * 100) })];
    const c = change(v || null, lastWeekSame, t("last {day}", { day: dayWord(day) }));
    if (c) pills.push(c);
    return { pct: v / goal, value: n(v), sub: t("of {n} steps", { n: n(goal) }), pills };
  };
  const hero = (() => {
    if (range === "day") return dayHero(anchor);
    if (range === "week") return dayHero(current ? today : rows.length ? rows[rows.length - 1].date : p.end);
    const prev = previousPeriod(p);
    const prevMean = avg(valuesIn(byDay, prev).map((r) => r.value));
    if (range === "month") {
      const m = Number(p.start.slice(5, 7));
      const k = rows.filter((r) => r.value >= goalOn(r.date)).length;
      const pills = [tn(k, "{n} day at goal", "{n} days at goal")];
      const c = change(mean, prevMean, monthLong(((m + 10) % 12) + 1));
      if (c) pills.push(c);
      return { pct: (mean ?? 0) / goal, value: n(mean ?? 0), sub: t("avg a day in {month}", { month: monthLong(m) }), pills };
    }
    const y = Number(p.start.slice(0, 4));
    const total = rows.reduce((s, r) => s + r.value, 0);
    const pills = [t("avg {n} a day", { n: n(mean ?? 0) })];
    const c = change(mean, prevMean, String(y - 1));
    if (c) pills.push(c);
    return { pct: (mean ?? 0) / goal, value: abbrev(total), sub: t("steps in {year}", { year: y }), pills };
  })();

  // ---- tiles: distance / active time / floors (B1 activity_daily, HA-05)
  // when a source reported them for the day; the handover fallback otherwise.
  const stats: Stat[] = (() => {
    if (range === "day" || range === "week") {
      const day = range === "day" ? anchor : current ? today : p.end;
      const a = activity[day];
      if (a && (a.distanceM !== null || a.activeMinutes !== null || a.floors !== null))
        return [
          { icon: Route, value: a.distanceM === null ? "—" : t("{n} km", { n: (a.distanceM / 1000).toFixed(1) }), label: t("Distance") },
          { icon: Timer, value: a.activeMinutes === null ? "—" : t("{n} min", { n: Math.round(a.activeMinutes) }), label: t("Active time") },
          { icon: Building2, value: a.floors === null ? "—" : String(Math.round(a.floors)), label: t("Floors") },
        ];
      const b = best(allRows);
      return [
        { icon: Target, value: n(goal), label: t("Goal") },
        { icon: Footprints, value: byDay[day] !== undefined ? n(Math.max(0, goal - byDay[day])) : "—", label: t("To go") },
        { icon: Award, value: b ? n(b.value) : "—", label: t("Best day") },
      ];
    }
    const total = rows.reduce((s, r) => s + r.value, 0);
    const k = rows.filter((r) => r.value >= goalOn(r.date)).length;
    if (range === "month") {
      const b = best(rows);
      return [
        { icon: Sigma, value: empty ? "—" : n(total), label: t("Total steps") },
        { icon: Award, value: b ? n(b.value) : "—", label: b ? t("Best day · {date}", { date: shortDate(b.date) }) : t("Best day") },
        { icon: Target, value: empty ? "—" : String(k), label: t("Days at goal") },
      ];
    }
    const y = Number(p.start.slice(0, 4));
    const monthAvgs = Array.from({ length: 12 }, (_, i) => avg(rows.filter((r) => Number(r.date.slice(5, 7)) === i + 1).map((r) => r.value)));
    let bi = -1;
    monthAvgs.forEach((v, i) => {
      if (v !== null && (bi < 0 || v > (monthAvgs[bi] as number))) bi = i;
    });
    return [
      { icon: Sigma, value: empty ? "—" : abbrev(total), label: t("Total in {year}", { year: y }) },
      { icon: Award, value: bi < 0 ? "—" : n(monthAvgs[bi] as number), label: bi < 0 ? t("Best month") : t("Best month · {month}", { month: monthShort(bi + 1) }) },
      { icon: Target, value: empty ? "—" : String(k), label: t("Days at goal") },
    ];
  })();

  // ---- chart --------------------------------------------------------------
  const ink = mc("steps", "ink");
  const title = range === "day" ? (anchor === today ? t("Today by hour") : t("{day} by hour", { day: dayLabel(anchor) })) : current ? periodTitle(p, today) : range === "month" ? monthLong(Number(p.start.slice(5, 7))) : periodLabel(p);
  let foot: string | undefined;
  let summary: string;
  let legend: { label: string; swatch: React.ReactNode }[] | undefined;
  if (range === "day") {
    const v = byDay[anchor];
    // Screen-reader summaries: whole sentences, joined by a space.
    summary = [
      anchor === today ? t("Steps today.") : t("Steps on {day}.", { day: dayLabel(anchor) }),
      v !== undefined ? t("{n} steps.", { n: n(v) }) : t("Nothing synced."),
      t("Hourly detail comes from your connected source."),
    ].join(" ");
  } else if (range === "week") {
    const ahead = daysOf(p).filter((d) => d > today).length;
    foot = empty ? t("No steps this week") : t("{n} of 7 days logged · average {avg} a day", { n: rows.length, avg: n(mean ?? 0) });
    summary = [
      current ? t("Steps this week.") : t("Steps in {period}.", { period: periodLabel(p) }),
      empty ? t("Nothing synced.") : rows.map((r) => `${dayWord(r.date)} ${n(r.value)}`).join(", ") + ".",
      t("Goal {n}.", { n: n(goal) }),
      ...(ahead ? [tn(ahead, "{n} day ahead.", "{n} days ahead.")] : []),
    ].join(" ");
    legend = [
      { label: t("Steps"), swatch: <LegendDot color={mc("steps", "main")} /> },
      { label: t("Days ahead"), swatch: <LegendGhost /> },
      { label: t("Goal"), swatch: <LegendDash color={ink} /> },
    ];
  } else if (range === "month") {
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
    const total = rows.reduce((s, r) => s + r.value, 0);
    const k = rows.filter((r) => r.value >= goalOn(r.date)).length;
    const b = best(rows);
    foot = empty ? t("No steps this month") : t("{n} of {span} days logged · total {total}", { n: rows.length, span, total: n(total) });
    summary = (
      empty
        ? [t("Steps in {month}.", { month: monthLong(m) }), t("Nothing synced.")]
        : [
            t("Steps in {month}.", { month: monthLong(m) }),
            t("Average {n} a day.", { n: n(mean ?? 0) }),
            tn(k, "Goal reached on {n} day.", "Goal reached on {n} days."),
            t("Best day {date}, {n}.", { date: longDate(b!.date), n: n(b!.value) }),
          ]
    ).join(" ");
    legend = [
      { label: t("Steps a day"), swatch: <LegendDot color={mc("steps", "main", 0.75)} /> },
      { label: t("Goal"), swatch: <LegendDash color={ink} /> },
    ];
  } else {
    const y = Number(p.start.slice(0, 4));
    const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a, b) => a - b);
    const curM = Number(today.slice(5, 7));
    const total = rows.reduce((s, r) => s + r.value, 0);
    foot = empty
      ? t("No steps this year")
      : `${months.length === 1 ? monthShort(months[0]) : t("{start} to {end}", { start: monthShort(months[0]), end: monthShort(months[months.length - 1]) })}${current && months.includes(curM) ? ` · ${t("{month} so far", { month: monthLong(curM) })}` : ""}`;
    summary = (empty ? [t("Steps in {year}.", { year: y }), t("Nothing synced.")] : [t("Steps in {year}.", { year: y }), t("{n} so far, average {avg} a day.", { n: n(total), avg: n(mean ?? 0) })]).join(" ");
    legend = [
      { label: t("Average a day"), swatch: <LegendDot color={mc("steps", "main")} /> },
      { label: t("Months ahead"), swatch: <LegendGhost /> },
      { label: t("Goal"), swatch: <LegendDash color={ink} /> },
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
        meta: [rel === dayLabel(d) ? t("Day total") : dayLabel(d), activity[d] ? sourceName(activity[d].source) : syncedRemove.sourceOf(d)].filter(Boolean).join(" · "),
        value: n(v),
        sub: v >= goal ? t("Goal") : `${Math.round((v / goal) * 100)}%`,
        onClick: () => openDay(d),
        onDelete: syncedRemove.onDelete(d),
      };
    });

  return (
    <MetricPage sourceTag={metricSource.tag} onSourceTag={() => navigate("/app/settings/devices")}
      metric="steps"
      title={t("Steps")}
      range={range}
      onRangeChange={setRange}
      menu={menu}
      headerAction={shareButton}
      cta={{ label: t("Set step goal"), icon: <Target size={16} />, onClick: () => setGoalOpen(true) }}
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
      {!online && <FreshnessLine offline>{t(OFFLINE_CACHED)}</FreshnessLine>}
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
              label={(h, v) => (v === null ? t("{hour}, nothing synced", { hour: hourLabel12(h) }) : t("{hour}, {n} steps", { hour: hourLabel12(h), n: n(v) }))}
            />
          ) : range === "day" ? (
            <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 120, gap: 4 }}>
              <span style={{ fontSize: textPx(15), lineHeight: linePx(17.3), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>
                {byDay[anchor] !== undefined ? t("{n} steps", { n: n(byDay[anchor]) }) : t("No steps synced")}
              </span>
              <span style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{t("Hourly detail comes from your connected source.")}</span>
            </div>
          ) : (
            <GoalBarChart
              metric="steps"
              mode={range}
              bars={buildGoalBars(p, byDay, today)}
              goal={goal}
              goalLabel={t("Goal {n}", { n: n(goal) })}
              onBarTap={range === "month" ? openDay : undefined}
              barLabel={(b) => (b.value === null ? t("{date}, nothing synced", { date: b.key }) : t("{date}, {n} steps", { date: b.key, n: n(b.value) }))}
            />
          )}
        </ChartCard>
      )}
      <CapsLabel>{t("History")}</CapsLabel>
      <HistoryCard metric="steps" icon={Footprints} items={items} loading={loading} empty={t("No steps synced yet")} />
      {sheets}
    </MetricPage>
  );
}
