import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Award, CalendarDays, Flame, History, Link2, RefreshCw, Sigma, Target } from "lucide-react";
import { HourlyBars } from "../../../components/health/metric/HourlyBars";
import { useSyncedRemove } from "../../../components/health/metric/SyncedRemove";
import { activityByDay, useActivityDaily, useActivityHourly, useWorkoutSessionsKcal } from "../../../services/health-metrics/b1";
import { FromWorkoutsCard } from "../../../components/health/metric/FromWorkoutsCard";
import { hourLabel12 } from "../../../utils/time12";
import { Toast } from "../../../components/ui/Toast";
import { shiftDate } from "../../../utils/date";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { textPx, linePx } from "../../../theme/textSize";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import {
  CapsLabel,
  ChartCard,
  ErrorCard,
  FreshnessLine,
  HistoryCard,
  MetricHero,
  MetricPage,
  metricTextInk,
  useHealthMode,
  OFFLINE_CACHED,
  StatCard,
  StatEmpty,
  mc,
  useMetricRangeState,
  type HistoryItem,
  type Stat,
  useMetricsLoad,
  useMetricSource,
} from "../../../components/health/metric/MetricKit";
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
import { SyncedNoDevice } from "../../../components/health/metric/StepsNoDevice";
import { CaloriesHero, ESTIMATED_INCL_WORKOUTS } from "../../../components/health/metric/CaloriesHero";
import { appLocale } from "../../../i18n/format";
import { t, tk, tn } from "../../../i18n/core";

// HE1.4 Calories burned (Week), HE1.4.d, HE1.4.m, HE1.4.y.
//
// DATA: healthSeries.caloriesBurned (synced only, V6-20; the web shows the
// no-device state with nothing on record). Goal = the 2,600 kcal app
// constant (backend Q4). Kcal per workout (HA-07 / PB-H-08) and per hour
// (HA-05 / PB-H-13) come from Database stage B1 (workout_sessions.kcal,
// activity_hourly): the "From workouts" card, the hero's workouts share and
// workouts / rest-of-day legend (Day / Week), the month's workouts line and
// the Day "Today by hour" chart card; each hides with no data.
// Source tag, freshness line and Delete on synced rows are native.

const KCAL_GOAL = 2600;

const n = (v: number) => Math.round(v).toLocaleString(appLocale("en-GB"));
const iconInk = { color: "rgb(var(--th-7d6bb5))" };

export default function CaloriesPage() {
  const { healthSeries, metricsError, recoveryModePending } = useApp();
  const hideNumbers = useHideNumbers();
  const { dark } = useHealthMode();
  const navigate = useNavigate();
  const online = useOnline();
  const { range, setRange, anchor, setAnchor, openDay, today } = useMetricRangeState("week");
  const [dateOpen, setDateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Database B1 (HA-05 / HA-07): activity_daily kcal_burned per day (priority
  // source), activity_hourly kcal for the Day chart, workout_sessions.kcal for
  // "From workouts".
  const p0 = periodOf(range, anchor);
  const b1From = shiftDate(p0.start < today ? p0.start : today, -7);
  const b1To = p0.end > today ? p0.end : today;
  const activity = activityByDay(useActivityDaily(b1From, b1To).data);
  const hourly = useActivityHourly(anchor).data;
  const byDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const pt of healthSeries.caloriesBurned.history) if (pt.value > 0) out[pt.date] = pt.value;
    for (const [d, a] of Object.entries(activity)) if (a.kcalBurned !== null && a.kcalBurned > 0) out[d] = a.kcalBurned;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthSeries.caloriesBurned.history, JSON.stringify(activity)]);
  // HA-07: the day the hero describes (Day: the day shown; Week: today, else the week's last logged day).
  const weekDays = Object.keys(byDay).filter((d) => d >= p0.start && d <= p0.end).sort();
  const workoutDay = range === "day" ? anchor : p0.start <= today && today <= p0.end ? today : weekDays.length ? weekDays[weekDays.length - 1] : p0.end;
  const workouts = useWorkoutSessionsKcal(workoutDay).data;
  // HE1.4.m #22: the month's workouts ("workouts 22 sessions, 9,240 kcal").
  const monthWorkouts = useWorkoutSessionsKcal(range === "month" ? p0.start : workoutDay, range === "month" ? p0.end : workoutDay).data;
  const hasAny = Object.keys(byDay).length > 0;
  // Still hydrating: the device copy of the latest reading says rows exist.
  const { loading, retry: retryMetrics } = useMetricsLoad();
  // HA-01 (B1): the connected source as the header tag and its freshness line; none on the web.
  const metricSource = useMetricSource();
  // HA-12 (B1 hidden_synced_readings): Delete on a synced day ("Remove from Centium?").
  const syncedRemove = useSyncedRemove("calories_burned", stepAnchor("month", today, -1), today, setToast);
  const goal = KCAL_GOAL;
  const p = periodOf(range, anchor);
  const current = isCurrentPeriod(p, today);
  const rows = valuesIn(byDay, p);
  const empty = rows.length === 0;
  const mean = avg(rows.map((r) => r.value));
  const best = (list: { date: string; value: number }[]) => list.reduce<{ date: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);

  const menu = [
    hasAny
      ? { value: "sources", label: t("Sources"), icon: <RefreshCw size={17} style={iconInk} />, onSelect: () => navigate("/app/settings/devices") }
      : { value: "connect", label: t("Connect a source"), icon: <Link2 size={17} style={iconInk} />, onSelect: () => navigate("/app/settings/devices") },
    { value: "date", label: t("Go to date"), icon: <CalendarDays size={17} style={iconInk} />, onSelect: () => setDateOpen(true) },
  ];
  const picker = (
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
  );

  // --- recovery-sensitive: no number anywhere (AJ R4, the Weight page's state) ----------
  // Held while the setting is still being read, so a kcal figure never flashes.
  if (hideNumbers) {
    return (
      <MetricPage metric="calories" title={t("Calories burned")} range={range} onRangeChange={setRange} menu={menu.filter((m) => m.value !== "date")}>
        <MetricHero metric="calories" pattern={2} padding="16px" loading={recoveryModePending} ariaLabel={t("Calorie numbers hidden")}>
          <div data-cal-recovery style={{ padding: "18px 0" }}>
            <p style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{t("Calorie numbers are hidden while recovery-sensitive mode is on.")}</p>
            <button
              type="button"
              onClick={() => navigate("/app/profile")}
              className="tap relative before:absolute before:-inset-y-[13px] before:-inset-x-1 before:content-['']"
              style={{ marginTop: 8, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: metricTextInk("calories", dark) }}
            >
              {t("Change in Profile")}
            </button>
          </div>
        </MetricHero>
      </MetricPage>
    );
  }

  if (!loading && !hasAny) {
    return (
      <MetricPage
        metric="calories"
        title={t("Calories burned")}
        range={range}
        onRangeChange={setRange}
        menu={menu}
        cta={{ label: t("Connect a source"), icon: <Link2 size={16} />, onClick: () => navigate("/app/settings/devices") }}
      >
        {metricsError ? (
          <ErrorCard onRetry={retryMetrics} />
        ) : (
          <SyncedNoDevice metric="calories" icon={Flame} bodyName={tk("Calories burned")} footName="calories" range={range} today={today} />
        )}
        {picker}
      </MetricPage>
    );
  }

  // ---- hero ---------------------------------------------------------------
  const heroValue = (() => {
    if (range === "day") return byDay[anchor] ?? 0;
    if (range === "week") return byDay[current ? today : rows.length ? rows[rows.length - 1].date : p.end] ?? 0;
    return mean ?? 0;
  })();
  const reached = heroValue >= goal;
  const sub =
    range === "month"
      ? t("avg a day in {month}", { month: monthLong(Number(p.start.slice(5, 7))) })
      : range === "year"
        ? t("avg a day in {year}", { year: p.start.slice(0, 4) })
        : t("of {n} kcal", { n: n(goal) });
  // HE1.4.m hero pill: the month counts days at goal ("4 days at goal"); the other ranges show the share of the goal.
  const daysAtGoal = rows.filter((r) => r.value >= goal).length;
  const pills = [
    range === "month"
      ? tn(daysAtGoal, "{n} day at goal", "{n} days at goal")
      : reached
        ? t("Goal reached")
        : t("{pct}% of goal", { pct: Math.round((heroValue / goal) * 100) }),
    t(ESTIMATED_INCL_WORKOUTS),
  ];
  // HE1.4 / HE1.4.d hero: the workouts share of the day and its legend (B1 workout_sessions.kcal).
  const workoutKcal = workouts.reduce((a, w) => a + w.kcal, 0);
  const heroWorkouts =
    (range === "day" || range === "week") && workoutKcal > 0 && heroValue > 0
      ? { pct: workoutKcal / goal, workoutsLabel: t("Workouts {n}", { n: n(workoutKcal) }), restLabel: t("Rest of day {n}", { n: n(Math.max(0, heroValue - workoutKcal)) }) }
      : null;

  // ---- tiles ----------------------------------------------------------------
  const stats: Stat[] = (() => {
    if (range === "day" || range === "week") {
      const wk = periodOf("week", anchor);
      const wr = valuesIn(byDay, wk);
      const wa = avg(wr.map((r) => r.value));
      const la = avg(valuesIn(byDay, previousPeriod(wk)).map((r) => r.value));
      return [
        { icon: Activity, value: wa === null ? <StatEmpty /> : t("{n} kcal", { n: n(wa) }), label: tn(wr.length, "Week avg · {n} day logged", "Week avg · {n} days logged") },
        { icon: History, value: la === null ? <StatEmpty /> : t("{n} kcal", { n: n(la) }), label: t("Last week avg") },
      ];
    }
    if (range === "month") {
      const k = rows.filter((r) => r.value >= goal).length;
      const b = best(rows);
      return [
        { icon: Target, value: empty ? <StatEmpty /> : tn(k, "{n} day", "{n} days"), label: t("At goal in {month}", { month: monthLong(Number(p.start.slice(5, 7))) }) },
        { icon: Award, value: b ? t("{n} kcal", { n: n(b.value) }) : <StatEmpty />, label: b ? t("Best day · {date}", { date: shortDate(b.date) }) : t("Best day") },
      ];
    }
    const monthAvgs = Array.from({ length: 12 }, (_, i) => avg(rows.filter((r) => Number(r.date.slice(5, 7)) === i + 1).map((r) => r.value)));
    let bi = -1;
    monthAvgs.forEach((v, i) => {
      if (v !== null && (bi < 0 || v > (monthAvgs[bi] as number))) bi = i;
    });
    const total = rows.reduce((s, r) => s + r.value, 0);
    return [
      { icon: Award, value: bi < 0 ? <StatEmpty /> : t("{n} kcal", { n: n(monthAvgs[bi] as number) }), label: bi < 0 ? t("Best month") : t("Best month · {month}", { month: monthLong(bi + 1) }) },
      { icon: Sigma, value: n(total), label: t("kcal in {year}", { year: p.start.slice(0, 4) }) },
    ];
  })();

  // ---- chart --------------------------------------------------------------
  const ink = mc("calories", "ink");
  const chartTitle = current ? periodTitle(p, today) : range === "month" ? monthLong(Number(p.start.slice(5, 7))) : periodLabel(p);
  let foot: string | undefined;
  let summary = "";
  let legend: { label: string; swatch: React.ReactNode }[] = [];
  if (range === "week") {
    const ahead = daysOf(p).filter((d) => d > today).length;
    foot = empty ? t("No calories synced this week") : undefined;
    summary = [
      current ? t("Calories burned this week.") : t("Calories burned in {period}.", { period: periodLabel(p) }),
      empty ? t("Nothing synced.") : rows.map((r) => t("{day} {n} of {goal}", { day: dayWord(r.date), n: n(r.value), goal: n(goal) })).join(", ") + ".",
      ...(ahead ? [tn(ahead, "{n} day ahead.", "{n} days ahead.")] : []),
    ].join(" ");
    legend = [
      { label: t("Burned"), swatch: <LegendDot color={mc("calories", "main")} /> },
      { label: t("Days ahead"), swatch: <LegendGhost /> },
      { label: t("Goal"), swatch: <LegendDash color={ink} /> },
    ];
  } else if (range === "month") {
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
    const k = rows.filter((r) => r.value >= goal).length;
    const b = best(rows);
    const mw = monthWorkouts.reduce((a, w) => a + w.kcal, 0);
    foot = empty
      ? t("No calories synced this month")
      : `${t("{n} of {span} days logged", { n: rows.length, span })}${monthWorkouts.length ? ` · ${tn(monthWorkouts.length, "workouts {n} session, {kcal} kcal", "workouts {n} sessions, {kcal} kcal", { kcal: n(mw) })}` : ""}`;
    summary = (
      empty
        ? [t("Calories burned in {month}.", { month: monthLong(m) }), t("Nothing synced.")]
        : [
            t("Calories burned in {month}.", { month: monthLong(m) }),
            t("Average {n} a day.", { n: n(mean ?? 0) }),
            tn(k, "Goal reached on {n} day.", "Goal reached on {n} days."),
            t("Best day {date}, {n}.", { date: longDate(b!.date), n: n(b!.value) }),
          ]
    ).join(" ");
    legend = [
      { label: t("Burned a day"), swatch: <LegendDot color={mc("calories", "main", 0.75)} /> },
      { label: t("Goal"), swatch: <LegendDash color={ink} /> },
    ];
  } else if (range === "year") {
    const y = Number(p.start.slice(0, 4));
    const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a, b) => a - b);
    const curM = Number(today.slice(5, 7));
    const total = rows.reduce((s, r) => s + r.value, 0);
    foot = empty
      ? t("No calories synced this year")
      : `${months.length === 1 ? monthShort(months[0]) : t("{start} to {end}", { start: monthShort(months[0]), end: monthShort(months[months.length - 1]) })}${current && months.includes(curM) ? ` · ${t("{month} so far", { month: monthLong(curM) })}` : ""}`;
    summary = (
      empty
        ? [t("Calories burned in {year}.", { year: y }), t("Nothing synced.")]
        : [t("Calories burned in {year}.", { year: y }), t("Average {n} a day.", { n: n(mean ?? 0) }), t("{n} so far.", { n: n(total) })]
    ).join(" ");
    legend = [
      { label: t("Average a day"), swatch: <LegendDot color={mc("calories", "main")} /> },
      { label: t("Months ahead"), swatch: <LegendGhost /> },
      { label: t("Goal"), swatch: <LegendDash color={ink} /> },
    ];
  }

  // ---- history ------------------------------------------------------------
  const items: HistoryItem[] = Object.keys(byDay)
    .filter((d) => d <= today)
    .sort()
    .reverse()
    .slice(0, 7)
    .map((d) => {
      const rel = relativeDayTitle(d, today);
      return {
        key: d,
        title: rel,
        meta: [rel === dayLabel(d) ? t("Day total") : dayLabel(d), syncedRemove.sourceOf(d) === t("Logged by you") ? null : syncedRemove.sourceOf(d)].filter(Boolean).join(" · "),
        value: n(byDay[d]),
        sub: t("kcal"),
        onClick: () => openDay(d),
        onDelete: syncedRemove.onDelete(d),
      };
    });

  return (
    <MetricPage sourceTag={metricSource.tag} onSourceTag={() => navigate("/app/settings/devices")} metric="calories" title={t("Calories burned")} range={range} onRangeChange={setRange} menu={menu}>
      <CaloriesHero
        pct={heroValue / goal}
        value={n(heroValue)}
        sub={sub}
        goalLabel={n(goal)}
        pills={pills}
        workouts={heroWorkouts}
        loading={loading}
        ariaLabel={`${range === "month" || range === "year" ? t("{n} kcal {sub}", { n: n(heroValue), sub }) : t("{n} kcal of {goal}", { n: n(heroValue), goal: n(goal) })}. ${pills.join(". ")}${heroWorkouts ? `. ${heroWorkouts.workoutsLabel}. ${heroWorkouts.restLabel}` : ""}`}
      />
      {!online && <FreshnessLine offline>{t(OFFLINE_CACHED)}</FreshnessLine>}
      {metricSource.freshness}
      {(range === "day" || range === "week") && (
        <FromWorkoutsCard sessions={workouts} dayTotal={byDay[workoutDay] ?? 0} onOpen={() => navigate("/app/workout?tab=history")} />
      )}
      {range === "day" && hourly.some((h) => h.kcal !== null) && (
        <ChartCard
          metric="calories"
          title={anchor === today ? t("Today by hour") : t("{day} by hour", { day: dayLabel(anchor) })}
          periodLabel={periodLabel(p)}
          onPrev={() => setAnchor(stepAnchor(range, anchor, -1))}
          onNext={() => setAnchor(stepAnchor(range, anchor, 1))}
          nextDisabled={current}
          summary={t("Calories burned by hour, {day}.", { day: dayLabel(anchor) })}
        >
          <HourlyBars
            metric="calories"
            values={Array.from({ length: 24 }, (_, h) => hourly.find((x) => x.hour === h)?.kcal ?? null)}
            nowHour={anchor === today ? new Date().getHours() : null}
            label={(h, v) => (v === null ? t("{hour}, nothing synced", { hour: hourLabel12(h) }) : t("{hour}, {n} kcal", { hour: hourLabel12(h), n: n(v) }))}
          />
        </ChartCard>
      )}
      {range !== "day" &&
        (metricsError && !hasAny ? (
          <ErrorCard onRetry={retryMetrics} />
        ) : (
          <ChartCard
            metric="calories"
            title={chartTitle}
            periodLabel={periodLabel(p)}
            onPrev={() => setAnchor(stepAnchor(range, anchor, -1))}
            onNext={() => setAnchor(stepAnchor(range, anchor, 1))}
            nextDisabled={current}
            legend={legend}
            foot={foot}
            loading={loading}
            summary={summary}
          >
            <GoalBarChart
              metric="calories"
              mode={range}
              bars={buildGoalBars(p, byDay, today)}
              goal={goal}
              goalLabel={t("Goal {n}", { n: n(goal) })}
              onBarTap={range === "month" ? openDay : undefined}
              barLabel={(b) => (b.value === null ? t("{date}, nothing synced", { date: b.key }) : t("{date}, {n} kcal", { date: b.key, n: n(b.value) }))}
            />
          </ChartCard>
        ))}
      <StatCard metric="calories" stats={stats} valueSize={17} style={{ marginTop: 10 }} />
      <CapsLabel>{t("History")}</CapsLabel>
      <HistoryCard metric="calories" icon={Flame} items={items} loading={loading} empty={t("No calories synced yet")} />
      {picker}
      {syncedRemove.popup}
      <Toast open={!!toast} message={toast ? t(toast) : ""} onExpire={() => setToast(null)} />
    </MetricPage>
  );
}
