import React, { useMemo, useState } from "react";
import { Award, CalendarDays, Droplet, History, Plus, Ruler, Target } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { Toast } from "../../../components/ui/Toast";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import { LogWaterSheet } from "../../../components/health/log/LogWaterSheet";
import { browserOffline, enqueueLog, isOfflineFailure, newQueueId, SAVED_ON_DEVICE } from "../../../services/health-log/offlineQueue";
import { removeDrink, sourceName, updateDrink, useDrinks, type Drink } from "../../../services/health-metrics/b1";
import { clock12 } from "../../../utils/time12";
import { useClientShare } from "../../../components/share/client/useClientShare";
import { ShareEntryButton } from "../../../components/share/client/ShareEntryButton";
import { waterCard } from "../../../components/share/client/clientCardModel";
import { t, tn } from "../../../i18n/core";
import {
  CapsLabel,
  ChartCard,
  ErrorCard,
  FreshnessLine,
  HistoryCard,
  MetricPage,
  OFFLINE_ACTION,
  OFFLINE_CACHED,
  SAVE_FAILED,
  StatCard,
  StatEmpty,
  mc,
  useMetricRangeState,
  type HistoryItem,
  type Stat,
  useMetricsLoad,
} from "../../../components/health/metric/MetricKit";
import {
  avg,
  daysOf,
  isCurrentPeriod,
  monthShort,
  periodLabel,
  periodOf,
  periodTitle,
  relativeDayTitle,
  shortDate,
  dayLabel,
  dayWord,
  longDate,
  monthLong,
  previousPeriod,
  stepAnchor,
  valuesIn,
  daysInMonth,
} from "../../../components/health/metric/periods";
import { GoalBarChart, LegendDash, LegendDot, LegendGhost, buildGoalBars } from "../../../components/health/metric/StepsBarChart";
import { WaterHero } from "../../../components/health/metric/WaterHero";
import { IntakeSwatch, WaterDayChart, WaterMonthGrid } from "../../../components/health/metric/WaterCharts";
import {
  WaterCustomPopup,
  WaterDeleteConfirm,
  WaterEditPopup,
  WaterGoalSheet,
  WaterUnitsSheet,
  useWaterUnit,
  volume,
  volumeText,
} from "../../../components/health/metric/WaterSheets";

// HE1.1 Water (Day), HE1.1.w, HE1.1.m, HE1.1.y: one route, the range switches
// in place (hero, chart and tiles follow; History and the CTA stay).
//
// DATA (V6-57; Database B1 water_intakes): every drink is a row with its own
// time. The page reads the drinks: History lists them (amount, time, the
// running total after it), the Day chart steps up at each drink. Backfilled
// rows (B1) are a pre-B1 day total, never a drink. Until B16 the
// health_metrics day total is still kept: a new drink writes both in one
// log_water call (logWaterDrink); an edit or delete adjusts it (addWater).
// A day with no intakes rows falls back to that total. Goals: B1
// metric_goals through AppContext (setWaterGoal, metricGoalOn). Units: the
// shared B3 preference.


const DAY_LIMIT_ML = 5000;
const pctOf = (ml: number, goal: number) => Math.round((ml / goal) * 100);

export default function WaterPage() {
  const { waterByDate, waterGoalMl, setWaterGoal, addWater, logWaterDrink, metricsError, authUserId, metricGoalOn } = useApp();
  const { range, setRange, anchor, setAnchor, openDay, today } = useMetricRangeState("day");
  const online = useOnline();
  const [unit, setUnit] = useWaterUnit();
  const [customOpen, setCustomOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [editDay, setEditDay] = useState<string | null>(null);
  const [deleteDay, setDeleteDay] = useState<string | null>(null);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [deletingDrink, setDeletingDrink] = useState<Drink | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);

  const goal = waterGoalMl;
  // Market + Share 3.0 C-SH.1: today's water, shareable once the goal is reached.
  const share = useClientShare();
  // The drinks covering this range and the week before it (the stat tiles).
  const p0 = periodOf(range, anchor);
  const lastWeek0 = previousPeriod(periodOf("week", anchor));
  const fetchFrom = lastWeek0.start < p0.start ? lastWeek0.start : p0.start;
  const fetchTo = p0.end > today ? p0.end : today;
  const drinksRead = useDrinks(fetchFrom, fetchTo);
  const drinks = drinksRead.data;
  // Logged days only: a zero total (cleared) is not a logged day. A day with
  // drink rows totals them; otherwise the health_metrics day total.
  const byDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [d, v] of Object.entries(waterByDate)) if (v > 0) out[d] = v;
    const fromDrinks: Record<string, number> = {};
    for (const k of drinks) fromDrinks[k.day] = (fromDrinks[k.day] ?? 0) + k.ml;
    for (const [d, v] of Object.entries(fromDrinks)) {
      if (v > 0) out[d] = v;
      else delete out[d];
    }
    return out;
  }, [waterByDate, drinks]);
  // At goal on a past day: the goal that stood then (B1 history).
  const goalOn = (d: string) => metricGoalOn("water", d);
  const lastDrink = drinks.filter((k) => k.day === anchor && !k.backfilled).pop() ?? null;
  const lastDrinkTime = lastDrink ? clock12(lastDrink.loggedAt) : null;
  const { loading, retry: retryMetrics } = useMetricsLoad();
  const hasAny = Object.keys(byDay).length > 0;
  const loadFailed = !!metricsError && !hasAny;

  const p = periodOf(range, anchor);
  const current = isCurrentPeriod(p, today);
  const rows = valuesIn(byDay, p);
  const vals = rows.map((r) => r.value);
  const mean = avg(vals);
  const vt = (ml: number, dp = 1) => volumeText(ml, unit, dp);

  // ---- writes -----------------------------------------------------------
  const write = async (deltaMl: number, day: string, success?: { message: string; undo?: () => void }) => {
    if (!online) {
      setToast({ message: OFFLINE_ACTION });
      return false;
    }
    const before = waterByDate[day] ?? 0;
    if (before + deltaMl > DAY_LIMIT_ML) {
      setToast({ message: t("That's more than {n} L today. Check the amount.", { n: DAY_LIMIT_ML / 1000 }) });
      return false;
    }
    const result = await addWater(deltaMl, day);
    if (!result.ok) {
      setToast({ message: SAVE_FAILED });
      return false;
    }
    drinksRead.reload();
    if (success) setToast(success);
    return true;
  };
  // A new drink: one log_water call (the B1 row and the day total).
  // Round D O4: offline, a new drink goes into the device queue (as the water
  // sheet does) instead of being refused. It has no Undo: taking it back
  // needs the server row it doesn't have yet.
  const queueDrink = (ml: number, requestId?: string) => {
    if (!authUserId) return;
    if ((waterByDate[today] ?? 0) + ml > DAY_LIMIT_ML) {
      setToast({ message: t("That's more than {n} L today. Check the amount.", { n: DAY_LIMIT_ML / 1000 }) });
      return;
    }
    enqueueLog(authUserId, { kind: "water", ml, day: today, loggedAt: new Date().toISOString() }, requestId);
    setToast({ message: SAVED_ON_DEVICE });
  };
  const addDrink = async (ml: number, success?: { message: string; undo?: () => void }) => {
    if (!authUserId) return null;
    // One id for this drink, reused by the queue if the answer is lost.
    const requestId = newQueueId();
    if (!online) {
      queueDrink(ml, requestId);
      return null;
    }
    if ((waterByDate[today] ?? 0) + ml > DAY_LIMIT_ML) {
      setToast({ message: t("That's more than {n} L today. Check the amount.", { n: DAY_LIMIT_ML / 1000 }) });
      return null;
    }
    const r = await logWaterDrink(ml, new Date(), requestId);
    if (!r.ok) {
      if (isOfflineFailure(r)) queueDrink(ml, requestId);
      // The server's cap message is "That's more than 5 L today. Check the amount." (services/health-log/waterIntakes); the same sentence from the catalogue.
      else setToast({ message: r.overCap ? t("That's more than {n} L today. Check the amount.", { n: DAY_LIMIT_ML / 1000 }) : SAVE_FAILED });
      return null;
    }
    drinksRead.reload();
    if (success) setToast(success);
    return r.id;
  };
  const quickAdd = (ml: number) => {
    let id: string | null = null;
    void addDrink(ml, {
      message: t("{n} ml added", { n: ml }),
      undo: () => {
        // Undo still needs a connection (the server row to remove).
        if (browserOffline()) return setToast({ message: OFFLINE_ACTION });
        if (id) void removeDrink(id).then(() => write(-ml, today));
      },
    }).then((x) => (id = x));
  };
  // Edit / delete one drink: the row, then the day total by the difference.
  const editDrink = async (k: Drink, ml: number) => {
    if (!online) return setToast({ message: OFFLINE_ACTION });
    if (!(await updateDrink(k.id, ml))) return setToast({ message: SAVE_FAILED });
    await write(ml - k.ml, k.day);
  };
  const deleteDrink = async (k: Drink) => {
    if (!online) return setToast({ message: OFFLINE_ACTION });
    if (!(await removeDrink(k.id))) return setToast({ message: SAVE_FAILED });
    await write(-k.ml, k.day);
  };

  // ---- hero ---------------------------------------------------------------
  const hero = (() => {
    if (range === "day") {
      const total = byDay[anchor] ?? 0;
      const reached = total >= goal;
      const v = volume(total, unit, 1);
      return {
        pct: total / goal,
        text: {
          value: v.num,
          unit: v.unit,
          lines: [t("of {n} goal", { n: vt(goal) }), t("{n} to go", { n: vt(Math.max(0, goal - total)) })],
          pill: reached ? t("Goal reached") : anchor === today ? t("{pct}% today", { pct: pctOf(total, goal) }) : t("{pct}% of goal", { pct: pctOf(total, goal) }),
        },
      };
    }
    const a = mean ?? 0;
    const v = volume(a, unit, 1);
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    let lines: string[];
    if (range === "week") {
      lines = [current ? t("avg a day this week") : t("avg a day in {period}", { period: periodLabel(p) }), t("{n} of {span} days logged", { n: rows.length, span: 7 })];
    } else if (range === "month") {
      const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
      lines = [t("avg a day in {month}", { month: monthLong(m) }), t("{n} of {span} days logged", { n: rows.length, span })];
    } else {
      const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a1, b1) => a1 - b1);
      lines = [
        t("avg a day in {year}", { year: y }),
        months.length === 0
          ? t("No days logged")
          : months.length === 1
            ? t("{month} logged", { month: monthShort(months[0]) })
            : t("{start} to {end} logged", { start: monthShort(months[0]), end: monthShort(months[months.length - 1]) }),
      ];
    }
    return {
      pct: a / goal,
      text: { value: v.num, unit: v.unit, lines, pill: a >= goal && a > 0 ? t("Goal reached") : t("{pct}% of goal", { pct: pctOf(a, goal) }) },
    };
  })();

  // ---- chart card ---------------------------------------------------------
  const chartTitle = current ? periodTitle(p, today) : range === "month" ? monthLong(Number(p.start.slice(5, 7))) : periodLabel(p);
  const inkSwatch = mc("water", "ink");
  const goalText = t("Goal {n}", { n: vt(goal) });
  const empty = rows.length === 0;
  const noWater = range === "week" ? t("No water logged this week") : range === "month" ? t("No water logged this month") : t("No water logged this year");
  let foot: string;
  let summary: string;
  let legend: { label: string; swatch: React.ReactNode }[];
  if (range === "day") {
    const total = byDay[anchor] ?? 0;
    const amount = { n: volume(total, unit, 1).num, goal: vt(goalOn(anchor)) };
    foot =
      total > 0
        ? `${anchor === today ? t("{n} of {goal} so far", amount) : t("{n} of {goal}", amount)}${lastDrinkTime ? ` · ${t("last drink {time}", { time: lastDrinkTime })}` : ""}`
        : anchor === today
          ? t("Nothing logged yet today")
          : t("Nothing logged this day");
    summary = [
      anchor === today ? t("Today's water.") : t("{day}'s water.", { day: dayLabel(anchor) }),
      t("{n} of {goal} litres.", { n: (total / 1000).toFixed(1), goal: (goal / 1000).toFixed(1) }),
    ].join(" ");
    legend = [
      { label: t("Intake so far"), swatch: <IntakeSwatch /> },
      ...(lastDrink ? [{ label: t("Drink, ml"), swatch: <LegendDot color={mc("water", "main")} /> }] : []),
      { label: t("Goal"), swatch: <LegendDash color={inkSwatch} /> },
    ];
  } else if (range === "month") {
    const atGoal = rows.filter((r) => r.value >= goalOn(r.date)).length;
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
    foot = empty ? noWater : `${t("{n} of {span} days logged", { n: rows.length, span })} · ${tn(atGoal, "{n} day at goal", "{n} days at goal")}`;
    const best = rows.reduce<{ date: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);
    summary = (
      empty
        ? [t("Water in {month}.", { month: monthLong(m) }), t("Nothing logged.")]
        : [
            t("Water in {month}.", { month: monthLong(m) }),
            t("Average {n} litres a day.", { n: ((mean ?? 0) / 1000).toFixed(1) }),
            t("Goal reached on {n} of {span} days.", { n: atGoal, span }),
            t("Best day {date}, {n} litres.", { date: longDate(best!.date), n: (best!.value / 1000).toFixed(1) }),
          ]
    ).join(" ");
    legend = [
      { label: t("At goal"), swatch: <LegendDot color={mc("water", "main")} /> },
      {
        label: t("Dot fills with % of goal"),
        swatch: (
          <span aria-hidden className="grid place-items-center rounded-full" style={{ width: 11, height: 11, border: `1px solid ${mc("water", "main")}` }}>
            <span className="rounded-full" style={{ width: 7, height: 7, background: mc("water", "main"), opacity: 0.6 }} />
          </span>
        ),
      },
    ];
  } else if (range === "week") {
    foot = empty ? noWater : t("{n} of 7 days logged · average {avg} a day", { n: rows.length, avg: vt(mean ?? 0) });
    const ahead = daysOf(p).filter((d) => d > today).length;
    summary = [
      current ? t("Water this week.") : t("Water in {period}.", { period: periodLabel(p) }),
      empty ? t("Nothing logged.") : rows.map((r) => t("{day} {n} litres", { day: dayWord(r.date), n: (r.value / 1000).toFixed(1) })).join(", ") + ".",
      t("Goal {n}.", { n: (goal / 1000).toFixed(1) }),
      ...(ahead ? [tn(ahead, "{n} day ahead.", "{n} days ahead.")] : []),
    ].join(" ");
    legend = [
      { label: t("Intake"), swatch: <LegendDot color={mc("water", "main")} /> },
      { label: t("Days ahead"), swatch: <LegendGhost /> },
      { label: t("Goal"), swatch: <LegendDash color={inkSwatch} /> },
    ];
  } else {
    const y = Number(p.start.slice(0, 4));
    const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a1, b1) => a1 - b1);
    const curM = Number(today.slice(5, 7));
    foot = empty
      ? noWater
      : `${months.length === 1 ? monthShort(months[0]) : t("{start} to {end}", { start: monthShort(months[0]), end: monthShort(months[months.length - 1]) })}${current && months.includes(curM) ? ` · ${t("{month} so far", { month: monthLong(curM) })}` : ""}`;
    summary = [t("Water in {year}.", { year: y }), empty ? t("Nothing logged.") : t("Average {n} litres a day.", { n: ((mean ?? 0) / 1000).toFixed(1) })].join(" ");
    legend = [
      { label: t("Average a day"), swatch: <LegendDot color={mc("water", "main")} /> },
      { label: t("Months ahead"), swatch: <LegendGhost /> },
      { label: t("Goal"), swatch: <LegendDash color={inkSwatch} /> },
    ];
  }

  // ---- stats --------------------------------------------------------------
  const stats: Stat[] = (() => {
    if (range === "day" || range === "week") {
      const last = previousPeriod(periodOf("week", anchor));
      const lr = valuesIn(byDay, last);
      const la = avg(lr.map((r) => r.value));
      return [
        { icon: History, value: la === null ? <StatEmpty /> : vt(la), label: t("Last week avg") },
        { icon: Target, value: lr.length === 0 ? <StatEmpty /> : t("{n} of {span}", { n: lr.filter((r) => r.value >= goalOn(r.date)).length, span: 7 }), label: t("Last week at goal") },
      ];
    }
    if (range === "month") {
      const m = monthLong(Number(p.start.slice(5, 7)));
      const best = rows.reduce<{ date: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);
      const k = rows.filter((r) => r.value >= goalOn(r.date)).length;
      return [
        { icon: Target, value: empty ? <StatEmpty /> : tn(k, "{n} day", "{n} days"), label: t("At goal in {month}", { month: m }) },
        { icon: Award, value: best ? vt(best.value) : <StatEmpty />, label: best ? t("Best day · {date}", { date: shortDate(best.date) }) : t("Best day") },
      ];
    }
    const y = Number(p.start.slice(0, 4));
    const monthAvgs = Array.from({ length: 12 }, (_, i) => avg(rows.filter((r) => Number(r.date.slice(5, 7)) === i + 1).map((r) => r.value)));
    let bi = -1;
    monthAvgs.forEach((v, i) => {
      if (v !== null && (bi < 0 || v > (monthAvgs[bi] as number))) bi = i;
    });
    return [
      { icon: Award, value: bi < 0 ? <StatEmpty /> : vt(monthAvgs[bi] as number), label: bi < 0 ? t("Best month") : t("Best month · {month}", { month: monthLong(bi + 1) }) },
      { icon: Target, value: String(rows.filter((r) => r.value >= goalOn(r.date)).length), label: t("Days at goal in {year}", { year: y }) },
    ];
  })();

  // ---- history: the drinks of the day shown (Day) or of today ---------------
  // Each drink: amount, time · source, the running total after it. A day with
  // no drink rows (only a day total, or a B1 backfilled row) shows that total.
  const historyDay = range === "day" ? anchor : today;
  const dayDrinks = drinks.filter((k) => k.day === historyDay);
  const items: HistoryItem[] = (() => {
    const real = dayDrinks.filter((k) => !k.backfilled);
    if (real.length > 0) {
      let run = 0;
      const withRun = dayDrinks.map((k) => ({ k, run: (run += k.ml) }));
      return withRun
        .filter(({ k }) => !k.backfilled)
        .reverse()
        .map(({ k, run: total }) => ({
          key: k.id,
          // A drink reads in ml (fl oz when chosen), as drawn ("250 ml"); totals follow the unit.
          title: volumeText(k.ml, unit === "floz" ? "floz" : "ml", 0),
          meta: `${clock12(k.loggedAt)} · ${sourceName(k.source)}`,
          value: vt(total, 1),
          sub: t("running total"),
          icon: Droplet,
          onEdit: k.source === "manual" ? () => setEditingDrink(k) : undefined,
          onDelete: k.source === "manual" ? () => setDeletingDrink(k) : undefined,
        }));
    }
    const total = byDay[historyDay];
    if (!total) return [];
    return [
      {
        key: historyDay,
        title: relativeDayTitle(historyDay, today),
        meta: `${dayLabel(historyDay)} · ${t("Logged by you")}`,
        value: vt(total, 2),
        sub: t("day total"),
        icon: Droplet,
        onEdit: () => setEditDay(historyDay),
        onDelete: () => setDeleteDay(historyDay),
      },
    ];
  })();
  const dayChartDrinks = drinks
    .filter((k) => k.day === anchor)
    .map((k) => {
      const t = new Date(k.loggedAt);
      return { hour: t.getHours() + t.getMinutes() / 60, ml: k.ml };
    });

  const waterToday = byDay[today] ?? null;
  const shareButton = (
    <ShareEntryButton
      label={t("Share your water")}
      disabledHint={waterToday === null ? t("Nothing to share yet. Log your water first.") : waterToday < goalOn(today) ? t("Nothing to share yet. Reach your water goal first.") : null}
      onPress={() =>
        waterToday !== null &&
        share.open(waterCard({ date: today, ml: waterToday, goalMl: goalOn(today), drinks: drinks.filter((k) => k.day === today).length || null, unit: unit === "floz" ? "floz" : "ml" }))
      }
    />
  );

  return (
    <MetricPage
      metric="water"
      title={t("Water")}
      headerAction={shareButton}
      range={range}
      onRangeChange={(r) => {
        setRange(r);
      }}
      menu={[
        { value: "goal", label: t("Edit daily goal"), icon: <Target size={17} style={{ color: "rgb(var(--th-7d6bb5))" }} />, onSelect: () => setGoalOpen(true) },
        { value: "units", label: t("Units"), icon: <Ruler size={17} style={{ color: "rgb(var(--th-7d6bb5))" }} />, onSelect: () => setUnitsOpen(true) },
        { value: "date", label: t("Go to date"), icon: <CalendarDays size={17} style={{ color: "rgb(var(--th-7d6bb5))" }} />, onSelect: () => setDateOpen(true) },
      ]}
      cta={{ label: t("Log water"), icon: <Plus size={16} />, onClick: () => setLogOpen(true) }}
    >
      <WaterHero
        pct={hero.pct}
        goalMl={goal}
        text={hero.text}
        loading={loading}
        onQuickAdd={quickAdd}
        onCustom={() => setCustomOpen(true)}
        ariaLabel={`${hero.text.value} ${unit === "l" ? t("litres") : hero.text.unit}, ${hero.text.lines.join(", ")}, ${hero.text.pill}`}
      />
      {!online && hasAny && <FreshnessLine offline>{t(OFFLINE_CACHED)}</FreshnessLine>}

      {loadFailed ? (
        <ErrorCard onRetry={retryMetrics} />
      ) : (
        <ChartCard
          metric="water"
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
          {range === "day" ? (
            <WaterDayChart totalMl={byDay[anchor] ?? 0} goalMl={goalOn(anchor)} isToday={anchor === today} label={vt(byDay[anchor] ?? 0)} goalLabel={t("Goal {n}", { n: vt(goalOn(anchor)) })} drinks={dayChartDrinks} />
          ) : range === "month" ? (
            <WaterMonthGrid
              period={p}
              byDay={byDay}
              goalMl={goal}
              today={today}
              onDay={openDay}
              dayLabel={(d, ml) =>
                ml === null ? t("{date}, nothing logged", { date: dayLabel(d) }) : t("{date}, {n}, {pct}% of goal", { date: dayLabel(d), n: vt(ml), pct: pctOf(ml, goal) })
              }
            />
          ) : (
            <GoalBarChart
              metric="water"
              mode={range}
              bars={buildGoalBars(p, byDay, today)}
              goal={goal}
              goalLabel={goalText}
              barLabel={(b) => (b.value === null ? t("{date}, nothing logged", { date: b.key }) : `${b.key}, ${vt(b.value)}`)}
            />
          )}
        </ChartCard>
      )}

      <StatCard metric="water" stats={stats} valueSize={17} style={{ marginTop: 10 }} />

      <CapsLabel>{t("History")}</CapsLabel>
      <HistoryCard metric="water" icon={Droplet} items={items} loading={loading} empty={historyDay === today ? t("No drinks yet today") : t("No drinks this day")} />

      <WaterCustomPopup
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onAdd={(ml) => {
          setCustomOpen(false);
          quickAdd(ml);
        }}
      />
      <WaterEditPopup
        open={editDay !== null}
        dayTitle={editDay ? dayLabel(editDay) : ""}
        total={editDay ? byDay[editDay] ?? 0 : 0}
        onClose={() => setEditDay(null)}
        onSave={(ml) => {
          const d = editDay!;
          setEditDay(null);
          void write(ml - (byDay[d] ?? 0), d);
        }}
      />
      <WaterEditPopup
        open={editingDrink !== null}
        title={t("Edit drink")}
        wheelLabel={t("Drink in ml")}
        dayTitle={editingDrink ? `${dayLabel(editingDrink.day)} · ${clock12(editingDrink.loggedAt)}` : ""}
        total={editingDrink?.ml ?? 0}
        onClose={() => setEditingDrink(null)}
        onSave={(ml) => {
          const k = editingDrink!;
          setEditingDrink(null);
          void editDrink(k, ml);
        }}
      />
      <WaterDeleteConfirm
        open={deletingDrink !== null}
        onClose={() => setDeletingDrink(null)}
        onDelete={() => {
          const k = deletingDrink!;
          setDeletingDrink(null);
          void deleteDrink(k);
        }}
      />
      <WaterDeleteConfirm
        open={deleteDay !== null}
        onClose={() => setDeleteDay(null)}
        onDelete={() => {
          const d = deleteDay!;
          setDeleteDay(null);
          void write(-(byDay[d] ?? 0), d);
        }}
      />
      <WaterGoalSheet
        open={goalOpen}
        goal={goal}
        onClose={() => setGoalOpen(false)}
        onSave={(ml) => {
          setWaterGoal(ml);
          setGoalOpen(false);
          setToast({ message: t("Water goal saved") });
        }}
      />
      <WaterUnitsSheet open={unitsOpen} unit={unit} onClose={() => setUnitsOpen(false)} onChange={setUnit} />
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
      <LogWaterSheet open={logOpen} onClose={() => setLogOpen(false)} onSaved={drinksRead.reload} />
      {share.sheet}
      <Toast open={!!toast} message={toast ? t(toast.message) : ""} onUndo={toast?.undo ? () => { toast.undo?.(); setToast(null); } : undefined} onExpire={() => setToast(null)} />
    </MetricPage>
  );
}
