import React, { useMemo, useState } from "react";
import { Award, CalendarDays, Droplet, History, Plus, Ruler, Target } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { Toast } from "../../../components/ui/Toast";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import { LogWaterSheet } from "../../../components/health/log/LogWaterSheet";
import { logDrink } from "../../../services/health-log/waterIntakes";
import { browserOffline, enqueueLog, isOfflineFailure, SAVED_ON_DEVICE } from "../../../services/health-log/offlineQueue";
import { removeDrink, sourceName, updateDrink, useDrinks, type Drink } from "../../../services/health-metrics/b1";
import { clock12 } from "../../../utils/time12";
import { useClientShare } from "../../../components/share/client/useClientShare";
import { ShareEntryButton } from "../../../components/share/client/ShareEntryButton";
import { waterCard } from "../../../components/share/client/clientCardModel";
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
// rows (B1) are a pre-B1 day total, never a drink. Two-phase until B16: the
// health_metrics day total is still written beside each drink (addWater),
// and a day with no intakes rows falls back to that total. Goals: B1
// metric_goals through AppContext (setWaterGoal, metricGoalOn). Units: the
// shared B3 preference.

const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LIMIT_ML = 5000;
const pctOf = (ml: number, goal: number) => Math.round((ml / goal) * 100);

export default function WaterPage() {
  const { waterByDate, waterGoalMl, setWaterGoal, addWater, metricsError, authUserId, metricGoalOn } = useApp();
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
      setToast({ message: `That's more than ${DAY_LIMIT_ML / 1000} L today. Check the amount.` });
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
  // A new drink: the B1 row (its own time) and, two-phase, the day total.
  // Round D O4: offline, a new drink goes into the device queue (as the water
  // sheet does) instead of being refused. It has no Undo: taking it back
  // needs the server row it doesn't have yet.
  const queueDrink = (ml: number) => {
    if (!authUserId) return;
    if ((waterByDate[today] ?? 0) + ml > DAY_LIMIT_ML) {
      setToast({ message: `That's more than ${DAY_LIMIT_ML / 1000} L today. Check the amount.` });
      return;
    }
    enqueueLog(authUserId, { kind: "water", ml, day: today, loggedAt: new Date().toISOString() });
    setToast({ message: SAVED_ON_DEVICE });
  };
  const addDrink = async (ml: number, success?: { message: string; undo?: () => void }) => {
    if (!authUserId) return null;
    if (!online) {
      queueDrink(ml);
      return null;
    }
    const r = await logDrink(authUserId, ml, new Date());
    if (!r.ok) {
      if (isOfflineFailure(r)) queueDrink(ml);
      else setToast({ message: r.overCap ? r.message : SAVE_FAILED });
      return null;
    }
    const ok = await write(ml, today, success);
    if (!ok) {
      await removeDrink(r.id);
      drinksRead.reload();
      return null;
    }
    return r.id;
  };
  const quickAdd = (ml: number) => {
    let id: string | null = null;
    void addDrink(ml, {
      message: `${ml} ml added`,
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
          lines: [`of ${vt(goal)} goal`, `${vt(Math.max(0, goal - total))} to go`],
          pill: reached ? "Goal reached" : anchor === today ? `${pctOf(total, goal)}% today` : `${pctOf(total, goal)}% of goal`,
        },
      };
    }
    const a = mean ?? 0;
    const v = volume(a, unit, 1);
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    let lines: string[];
    if (range === "week") {
      lines = [current ? "avg a day this week" : `avg a day in ${periodLabel(p)}`, `${rows.length} of 7 days logged`];
    } else if (range === "month") {
      const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
      lines = [`avg a day in ${MONTH_LONG[m - 1]}`, `${rows.length} of ${span} days logged`];
    } else {
      const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a1, b1) => a1 - b1);
      lines = [
        `avg a day in ${y}`,
        months.length === 0 ? "No days logged" : months.length === 1 ? `${monthShort(months[0])} logged` : `${monthShort(months[0])} to ${monthShort(months[months.length - 1])} logged`,
      ];
    }
    return {
      pct: a / goal,
      text: { value: v.num, unit: v.unit, lines, pill: a >= goal && a > 0 ? "Goal reached" : `${pctOf(a, goal)}% of goal` },
    };
  })();

  // ---- chart card ---------------------------------------------------------
  const chartTitle = current ? periodTitle(p, today) : range === "month" ? MONTH_LONG[Number(p.start.slice(5, 7)) - 1] : periodLabel(p);
  const inkSwatch = mc("water", "ink");
  const goalText = `Goal ${vt(goal)}`;
  const empty = rows.length === 0;
  const periodWord = range === "week" ? "week" : range === "month" ? "month" : "year";
  let foot: string;
  let summary: string;
  let legend: { label: string; swatch: React.ReactNode }[];
  if (range === "day") {
    const total = byDay[anchor] ?? 0;
    foot = total > 0 ? `${volume(total, unit, 1).num} of ${vt(goalOn(anchor))}${anchor === today ? " so far" : ""}${lastDrinkTime ? ` · last drink ${lastDrinkTime}` : ""}` : anchor === today ? "Nothing logged yet today" : "Nothing logged this day";
    summary = `${anchor === today ? "Today's" : `${dayLabel(anchor)}'s`} water. ${(total / 1000).toFixed(1)} of ${(goal / 1000).toFixed(1)} litres.`;
    legend = [
      { label: "Intake so far", swatch: <IntakeSwatch /> },
      ...(lastDrink ? [{ label: "Drink, ml", swatch: <LegendDot color={mc("water", "main")} /> }] : []),
      { label: "Goal", swatch: <LegendDash color={inkSwatch} /> },
    ];
  } else if (range === "month") {
    const atGoal = rows.filter((r) => r.value >= goalOn(r.date)).length;
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
    foot = empty ? `No water logged this ${periodWord}` : `${rows.length} of ${span} days logged · ${atGoal} ${atGoal === 1 ? "day" : "days"} at goal`;
    const best = rows.reduce<{ date: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);
    summary = empty
      ? `Water in ${MONTH_LONG[m - 1]}. Nothing logged.`
      : `Water in ${MONTH_LONG[m - 1]}. Average ${((mean ?? 0) / 1000).toFixed(1)} litres a day. Goal reached on ${atGoal} of ${span} days. Best day ${MONTH_LONG[m - 1]} ${Number(best!.date.slice(8))}, ${(best!.value / 1000).toFixed(1)} litres.`;
    legend = [
      { label: "At goal", swatch: <LegendDot color={mc("water", "main")} /> },
      {
        label: "Dot fills with % of goal",
        swatch: (
          <span aria-hidden className="grid place-items-center rounded-full" style={{ width: 11, height: 11, border: `1px solid ${mc("water", "main")}` }}>
            <span className="rounded-full" style={{ width: 7, height: 7, background: mc("water", "main"), opacity: 0.6 }} />
          </span>
        ),
      },
    ];
  } else if (range === "week") {
    foot = empty ? `No water logged this ${periodWord}` : `${rows.length} of 7 days logged · average ${vt(mean ?? 0)} a day`;
    const ahead = daysOf(p).filter((d) => d > today).length;
    summary = `Water ${current ? "this week" : `in ${periodLabel(p)}`}. ${
      empty ? "Nothing logged." : rows.map((r) => `${dayLabel(r.date).split(" ")[0]} ${(r.value / 1000).toFixed(1)} litres`).join(", ") + "."
    } Goal ${(goal / 1000).toFixed(1)}.${ahead ? ` ${ahead} ${ahead === 1 ? "day" : "days"} ahead.` : ""}`;
    legend = [
      { label: "Intake", swatch: <LegendDot color={mc("water", "main")} /> },
      { label: "Days ahead", swatch: <LegendGhost /> },
      { label: "Goal", swatch: <LegendDash color={inkSwatch} /> },
    ];
  } else {
    const y = Number(p.start.slice(0, 4));
    const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a1, b1) => a1 - b1);
    const curM = Number(today.slice(5, 7));
    foot = empty
      ? `No water logged this ${periodWord}`
      : `${months.length === 1 ? monthShort(months[0]) : `${monthShort(months[0])} to ${monthShort(months[months.length - 1])}`}${current && months.includes(curM) ? ` · ${MONTH_LONG[curM - 1]} so far` : ""}`;
    summary = `Water in ${y}. ${empty ? "Nothing logged." : `Average ${((mean ?? 0) / 1000).toFixed(1)} litres a day.`}`;
    legend = [
      { label: "Average a day", swatch: <LegendDot color={mc("water", "main")} /> },
      { label: "Months ahead", swatch: <LegendGhost /> },
      { label: "Goal", swatch: <LegendDash color={inkSwatch} /> },
    ];
  }

  // ---- stats --------------------------------------------------------------
  const stats: Stat[] = (() => {
    if (range === "day" || range === "week") {
      const last = previousPeriod(periodOf("week", anchor));
      const lr = valuesIn(byDay, last);
      const la = avg(lr.map((r) => r.value));
      return [
        { icon: History, value: la === null ? <StatEmpty /> : vt(la), label: "Last week avg" },
        { icon: Target, value: lr.length === 0 ? <StatEmpty /> : `${lr.filter((r) => r.value >= goalOn(r.date)).length} of 7`, label: "Last week at goal" },
      ];
    }
    if (range === "month") {
      const m = MONTH_LONG[Number(p.start.slice(5, 7)) - 1];
      const best = rows.reduce<{ date: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);
      const k = rows.filter((r) => r.value >= goalOn(r.date)).length;
      return [
        { icon: Target, value: empty ? <StatEmpty /> : `${k} ${k === 1 ? "day" : "days"}`, label: `At goal in ${m}` },
        { icon: Award, value: best ? vt(best.value) : <StatEmpty />, label: best ? `Best day · ${shortDate(best.date)}` : "Best day" },
      ];
    }
    const y = Number(p.start.slice(0, 4));
    const monthAvgs = Array.from({ length: 12 }, (_, i) => avg(rows.filter((r) => Number(r.date.slice(5, 7)) === i + 1).map((r) => r.value)));
    let bi = -1;
    monthAvgs.forEach((v, i) => {
      if (v !== null && (bi < 0 || v > (monthAvgs[bi] as number))) bi = i;
    });
    return [
      { icon: Award, value: bi < 0 ? <StatEmpty /> : vt(monthAvgs[bi] as number), label: bi < 0 ? "Best month" : `Best month · ${MONTH_LONG[bi]}` },
      { icon: Target, value: String(rows.filter((r) => r.value >= goalOn(r.date)).length), label: `Days at goal in ${y}` },
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
          sub: "running total",
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
        meta: `${dayLabel(historyDay)} · Logged by you`,
        value: vt(total, 2),
        sub: "day total",
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
      label="Share your water"
      disabledHint={waterToday === null ? "Nothing to share yet. Log your water first." : waterToday < goalOn(today) ? "Nothing to share yet. Reach your water goal first." : null}
      onPress={() =>
        waterToday !== null &&
        share.open(waterCard({ date: today, ml: waterToday, goalMl: goalOn(today), drinks: drinks.filter((k) => k.day === today).length || null, unit: unit === "floz" ? "floz" : "ml" }))
      }
    />
  );

  return (
    <MetricPage
      metric="water"
      title="Water"
      headerAction={shareButton}
      range={range}
      onRangeChange={(r) => {
        setRange(r);
      }}
      menu={[
        { value: "goal", label: "Edit daily goal", icon: <Target size={17} style={{ color: "rgb(var(--th-7d6bb5))" }} />, onSelect: () => setGoalOpen(true) },
        { value: "units", label: "Units", icon: <Ruler size={17} style={{ color: "rgb(var(--th-7d6bb5))" }} />, onSelect: () => setUnitsOpen(true) },
        { value: "date", label: "Go to date", icon: <CalendarDays size={17} style={{ color: "rgb(var(--th-7d6bb5))" }} />, onSelect: () => setDateOpen(true) },
      ]}
      cta={{ label: "Log water", icon: <Plus size={16} />, onClick: () => setLogOpen(true) }}
    >
      <WaterHero
        pct={hero.pct}
        goalMl={goal}
        text={hero.text}
        loading={loading}
        onQuickAdd={quickAdd}
        onCustom={() => setCustomOpen(true)}
        ariaLabel={`${hero.text.value} ${hero.text.unit === "L" ? "litres" : hero.text.unit}, ${hero.text.lines.join(", ")}, ${hero.text.pill}`}
      />
      {!online && hasAny && <FreshnessLine offline>{OFFLINE_CACHED}</FreshnessLine>}

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
            <WaterDayChart totalMl={byDay[anchor] ?? 0} goalMl={goalOn(anchor)} isToday={anchor === today} label={vt(byDay[anchor] ?? 0)} goalLabel={`Goal ${vt(goalOn(anchor))}`} drinks={dayChartDrinks} />
          ) : range === "month" ? (
            <WaterMonthGrid
              period={p}
              byDay={byDay}
              goalMl={goal}
              today={today}
              onDay={openDay}
              dayLabel={(d, ml) => `${dayLabel(d)}, ${ml === null ? "nothing logged" : `${vt(ml)}, ${pctOf(ml, goal)}% of goal`}`}
            />
          ) : (
            <GoalBarChart
              metric="water"
              mode={range}
              bars={buildGoalBars(p, byDay, today)}
              goal={goal}
              goalLabel={goalText}
              barLabel={(b) => (b.value === null ? `${b.key}, nothing logged` : `${b.key}, ${vt(b.value)}`)}
            />
          )}
        </ChartCard>
      )}

      <StatCard metric="water" stats={stats} valueSize={17} style={{ marginTop: 10 }} />

      <CapsLabel>History</CapsLabel>
      <HistoryCard metric="water" icon={Droplet} items={items} loading={loading} empty={historyDay === today ? "No drinks yet today" : "No drinks this day"} />

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
        title="Edit drink"
        wheelLabel="Drink in ml"
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
          setToast({ message: "Water goal saved" });
        }}
      />
      <WaterUnitsSheet open={unitsOpen} unit={unit} onClose={() => setUnitsOpen(false)} onChange={setUnit} />
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
      <LogWaterSheet open={logOpen} onClose={() => setLogOpen(false)} onSaved={drinksRead.reload} />
      {share.sheet}
      <Toast open={!!toast} message={toast?.message ?? ""} onUndo={toast?.undo ? () => { toast.undo?.(); setToast(null); } : undefined} onExpire={() => setToast(null)} />
    </MetricPage>
  );
}
