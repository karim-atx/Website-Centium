import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowDownToLine, CalendarCheck, CalendarDays, History, Plus, Ruler, Target, TrendingDown } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { textPx, linePx } from "../../../theme/textSize";
import {
  CapsLabel,
  ChartCard,
  ErrorCard,
  FreshnessLine,
  HistoryCard,
  MetricHero,
  MetricPage,
  OFFLINE_ACTION,
  OFFLINE_CACHED,
  StatCard,
  metricTextInk,
  useHealthMode,
  useMetricRangeState,
  type HistoryItem,
  type MetricMenuItem,
  type Stat,
  useMetricsLoad,
  SAVE_FAILED,
} from "../../../components/health/metric/MetricKit";
import {
  avg,
  dayLabel,
  dayWord,
  isCurrentPeriod,
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
import {
  BMI_NEEDS_HEIGHT,
  WeightChart,
  WeightHero,
  WeightUnitsSheet,
  deltaW,
  fmtW,
  useWeightUnit,
  weightLegend,
  type BmiState,
  type WeightHeroData,
} from "../../../components/health/metric/WeightParts";
import { HealthPopup } from "../../../components/health/metric/HealthPopup";
import { hideSyncedReading, sourceName, useMetricRows, type RawMetricRow } from "../../../services/health-metrics/b1";
import { clock12 } from "../../../utils/time12";
import { LogWeightSheet } from "../../../components/health/log/LogWeightSheet";
import { MeasuredOnPopup } from "../../../components/health/log/LogSheetParts";
import { Toast } from "../../../components/ui/Toast";
import { WeightScaleIcon } from "../../../components/icons/PartBIcons";
import { bmiApplies } from "../../../services/pregnancy/weight";
import { BMI_NOT_USED } from "../../../services/pregnancy/guidance";
import { t, tn, tx } from "../../../i18n/core";
import type { WeightUnit } from "../../../services/preferences/units";

/** The unit word shown ("kg" / "lb", translated; call at render time). */
const unitWord = (u: WeightUnit) => (u === "lb" ? t("lb") : t("kg"));
/** "74.0 kg" / "163.1 lb" (translated). */
const wText = (kg: number, u: WeightUnit) => (u === "lb" ? t("{n} lb", { n: fmtW(kg, u) }) : t("{n} kg", { n: fmtW(kg, u) }));

// HE1.7 Weight trend (opens on Month) with HE1.7.d / .w / .y.
//
// SAFETY / KEPT:
// - Recovery-sensitive mode (and while it is still being read) hides every
//   weight number on every range: hero, journey, BMI, chart, tiles and
//   History; the page says so and links to Profile (OURS-health-empty-weight
//   #5). The Log weight sheet (Health B) renders nothing in that mode, so the
//   pinned CTA is hidden too.
// - BMI (V6-06): only here, handover green / red, wording "normal weight";
//   during a pregnancy or the postpartum window BMI_NOT_USED verbatim
//   (bmiApplies); without a height the repo line.
// - Start = the first weigh-in in the metric window; goal =
//   nutrition_goals.desired_weight_kg; journey % = (start - now) / (start -
//   goal) (handover note).
// - One weigh-in a day (V6-58); its time, note and device (B1) are not
//   stored, so rows read "Logged by you" without a time.

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function WeightPage() {
  const navigate = useNavigate();
  const { healthSeries, metricValues, nutritionGoal, user, pregnancy, lastEndedPregnancy, recoverySensitive, recoveryModePending, metricsError, deleteWeighIn, authUserId, reloadMetrics } = useApp();
  const { dark } = useHealthMode();
  const { range, setRange, anchor, setAnchor, openDay, today } = useMetricRangeState("month");
  const [unit, setUnit] = useWeightUnit();
  const [logOpen, setLogOpen] = useState(false);
  // History Edit: the row being edited (its day and kg), null for a new weigh-in.
  const [editing, setEditing] = useState<{ day: string; kg: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [goToOpen, setGoToOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const byDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of healthSeries.weight.history) out[p.date] = p.value;
    return out;
  }, [healthSeries.weight.history]);
  const allDays = Object.keys(byDay).sort();
  const weighInRead = useMetricRows("weight", allDays[0] ?? today, today);
  const weighIns = weighInRead.data;
  const [removing, setRemoving] = useState<RawMetricRow | null>(null);
  const hidden = recoverySensitive || recoveryModePending;
  const { loading: metricsLoading, retry: retryMetrics } = useMetricsLoad();
  // Recovery-sensitive mode is a safety setting: hold the page while it loads.
  const loading = metricsLoading || recoveryModePending;

  const startDay = allDays[0] ?? null;
  const startKg = startDay ? byDay[startDay] : null;
  const nowKg = metricValues.weight ?? (allDays.length ? byDay[allDays[allDays.length - 1]] : null);
  const goalKg = nutritionGoal.desiredWeightKg ?? null;
  const ink = metricTextInk("weight", dark);
  const goToGoals = () => navigate("/app/food", { state: { tab: "goals" } });

  // --- hero -------------------------------------------------------------------
  const bmi: BmiState = (() => {
    if (!bmiApplies({ pregnancyActive: pregnancy !== null, postpartumUntil: lastEndedPregnancy?.postpartumUntil ?? null }, today)) return { kind: "text", text: BMI_NOT_USED };
    const h = user.heightCm && user.heightCm > 0 ? user.heightCm / 100 : null;
    if (h === null || nowKg === null) return { kind: "text", text: BMI_NEEDS_HEIGHT };
    return { kind: "value", bmi: nowKg / (h * h) };
  })();
  const hero: WeightHeroData | null = (() => {
    if (nowKg === null) return null;
    const hasGoal = goalKg !== null && startKg !== null && startKg !== goalKg;
    const journey = hasGoal ? Math.max(0, Math.min(1, ((startKg as number) - nowKg) / ((startKg as number) - (goalKg as number)))) : null;
    const parts: string[] = [];
    if (startKg !== null && allDays.length > 1) parts.push(t("{delta} {unit} since start", { delta: deltaW(nowKg - startKg, unit), unit: unitWord(unit) }));
    if (goalKg !== null) parts.push(t("{n} {unit} to goal", { n: fmtW(Math.abs(nowKg - goalKg), unit), unit: unitWord(unit) }));
    return {
      nowKg,
      context: parts.length ? parts.join(" · ") : null,
      progress: journey !== null ? t("{pct}% there", { pct: Math.round(journey * 100) }) : null,
      startKg: allDays.length > 1 || hasGoal ? startKg : null,
      startLabel: startDay ? t("Start · {date}", { date: shortDate(startDay) }) : t("Start"),
      goalKg: hasGoal ? goalKg : null,
      journey,
      bmi,
      unit,
    };
  })();

  // --- period ---------------------------------------------------------------------
  const period = periodOf(range, anchor);
  const current = isCurrentPeriod(period, today);
  const rows = valuesIn(byDay, period);
  const vals = rows.map((r) => r.value);
  const pAvg = avg(vals);
  const pLow = vals.length ? Math.min(...vals) : null;
  const n = rows.length;
  const earlierDay = (d: string) => [...allDays].reverse().find((x) => x < d) ?? null;

  // Day: the day's weigh-in against the one before it (HE1.7.d).
  const dayKg = byDay[anchor];
  const prevDay = earlierDay(anchor);
  const yesterday = periodOf("day", stepAnchor("day", anchor, -1)).start;
  const compare = prevDay ? { day: prevDay, kg: byDay[prevDay], label: prevDay === yesterday ? t("Yesterday") : dayLabel(prevDay), yesterday: prevDay === yesterday } : null;
  const u = unitWord(unit);

  const stats: Stat[] = (() => {
    const v = (x: number | null) => (x === null ? "–" : fmtW(x, unit));
    if (range === "day")
      return [
        { icon: CalendarCheck, value: v(dayKg ?? null), label: anchor === today ? t("Today") : dayLabel(anchor) },
        { icon: History, value: v(compare?.kg ?? null), label: t("Last weigh-in") },
        {
          icon: TrendingDown,
          value: dayKg !== undefined && compare ? deltaW(dayKg - compare.kg, unit) : "–",
          label: compare ? (compare.yesterday ? t("{unit} since yesterday", { unit: u }) : t("{unit} since {day}", { unit: u, day: dayWord(compare.day) })) : t("{unit} change", { unit: u }),
        },
      ];
    if (range === "week") {
      const prev = avg(valuesIn(byDay, previousPeriod(period)).map((r) => r.value));
      return [
        { icon: Activity, value: v(pAvg), label: t("Week avg {unit}", { unit: u }) },
        { icon: ArrowDownToLine, value: v(pLow), label: t("Lowest {unit}", { unit: u }) },
        { icon: TrendingDown, value: pAvg !== null && prev !== null ? deltaW(pAvg - prev, unit) : "–", label: t("vs last week") },
      ];
    }
    if (range === "month") {
      const first = rows[0];
      const last = rows[rows.length - 1];
      const weeks = first && last ? (new Date(`${last.date}T12:00:00`).getTime() - new Date(`${first.date}T12:00:00`).getTime()) / (7 * 86400000) : 0;
      return [
        { icon: Activity, value: v(pAvg), label: t("Avg {unit}", { unit: u }) },
        { icon: ArrowDownToLine, value: v(pLow), label: t("Lowest {unit}", { unit: u }) },
        { icon: TrendingDown, value: weeks >= 1 ? deltaW((last.value - first.value) / weeks, unit) : "–", label: t("{unit} per week", { unit: u }) },
      ];
    }
    const since = startDay && startDay.startsWith(period.start.slice(0, 4)) ? monthShort(Number(startDay.slice(5, 7))) : null;
    return [
      { icon: TrendingDown, value: v(pAvg), label: since ? t("Avg {unit} since {month}", { unit: u, month: since }) : t("Avg {unit}", { unit: u }) },
      { icon: ArrowDownToLine, value: v(pLow), label: t("Lowest {unit}", { unit: u }) },
      { icon: TrendingDown, value: nowKg !== null && startKg !== null && allDays.length > 1 ? deltaW(nowKg - startKg, unit) : "–", label: t("{unit} since start", { unit: u }) },
    ];
  })();

  const foot = (() => {
    if (range === "day") {
      if (dayKg === undefined) return anchor === today ? t("No weigh-in today") : t("No weigh-in this day");
      if (!compare) return t("Your first weigh-in");
      const d = `${deltaW(dayKg - compare.kg, unit)} ${u}`;
      return compare.yesterday
        ? t("Compared with yesterday · {change}", { change: d })
        : anchor === today
          ? t("No weigh-in yesterday, so today compares with your last one · {change}", { change: d })
          : t("No weigh-in yesterday, so this day compares with your last one · {change}", { change: d });
    }
    if (!n) return range === "week" ? t("No weigh-ins this week") : range === "month" ? t("No weigh-ins this month") : t("No weigh-ins this year");
    if (range === "week") {
      const a = { avg: wText(pAvg as number, unit) };
      return current
        ? tn(n, "{n} weigh-in this week · week average {avg}", "{n} weigh-ins this week · week average {avg}", a)
        : tn(n, "{n} weigh-in · week average {avg}", "{n} weigh-ins · week average {avg}", a);
    }
    if (range === "month") {
      const ch = rows[rows.length - 1].value - rows[0].value;
      const month = monthLong(Number(period.start.slice(5, 7)));
      const amount = wText(Math.abs(ch), unit);
      if (n === 1) return tn(n, "{n} weigh-in in {month}", "{n} weigh-ins in {month}", { month });
      return ch === 0
        ? tn(n, "{n} weigh-in · no change in {month}", "{n} weigh-ins · no change in {month}", { month })
        : ch < 0
          ? tn(n, "{n} weigh-in · down {amount} in {month}", "{n} weigh-ins · down {amount} in {month}", { month, amount })
          : tn(n, "{n} weigh-in · up {amount} in {month}", "{n} weigh-ins · up {amount} in {month}", { month, amount });
    }
    const firstM = Number(rows[0].date.slice(5, 7));
    const lastM = Number(rows[rows.length - 1].date.slice(5, 7));
    const tracking = t("Tracking since {month}", { month: monthLong(firstM) });
    // A single month leaves "Tracking since January ·" (the earlier English, kept).
    return current ? `${tracking} · ${t("{month} so far", { month: monthLong(Number(today.slice(5, 7))) })}` : lastM === firstM ? `${tracking} ·` : `${tracking} · ${t("to {month}", { month: monthShort(lastM) })}`;
  })();

  const summary = (() => {
    // Whole sentences, joined by a space.
    const g = goalKg !== null ? [t("Goal {n}.", { n: fmtW(goalKg, unit) })] : [];
    const spokenUnit = unit === "kg" ? t("kilograms") : t("pounds");
    const spokenDelta = (kg: number) => {
      const d = deltaW(kg, unit);
      return d.startsWith("↓") ? t("Down {n}.", { n: d.slice(2) }) : d.startsWith("↑") ? t("Up {n}.", { n: d.slice(2) }) : `${d}.`;
    };
    if (range === "day")
      return (
        dayKg === undefined
          ? [t("Weight {day}.", { day: dayLabel(anchor) }), t("No weigh-in.")]
          : [
              anchor === today
                ? t("Weight today {n} {unit}.", { n: fmtW(dayKg, unit), unit: spokenUnit })
                : t("Weight {day} {n} {unit}.", { day: dayLabel(anchor), n: fmtW(dayKg, unit), unit: spokenUnit }),
              ...(compare ? [t("Last weigh-in {day}, {n}.", { day: dayLabel(compare.day), n: fmtW(compare.kg, unit) }), spokenDelta(dayKg - compare.kg)] : []),
            ]
      ).join(" ");
    if (!n) return [t("Weight {period}.", { period: periodTitle(period, today).toLowerCase() }), t("No weigh-ins."), ...g].join(" ");
    if (range === "week")
      return [
        current ? t("Weight this week.") : t("Weight {period}.", { period: periodLabel(period) }),
        tn(n, "{n} weigh-in, average {avg} {unit}.", "{n} weigh-ins, average {avg} {unit}.", { avg: fmtW(pAvg as number, unit), unit: spokenUnit }),
        ...g,
      ].join(" ");
    return [
      t("Weight in {period}.", { period: periodLabel(period) }),
      t("{first} {unit} on {start} to {last} on {end}.", { first: fmtW(rows[0].value, unit), unit: spokenUnit, start: shortDate(rows[0].date), last: fmtW(rows[n - 1].value, unit), end: shortDate(rows[n - 1].date) }),
      ...g,
    ].join(" ");
  })();

  // --- history: every weigh-in, newest first ---------------------------------------
  // Edit = the shared Log weight sheet (Health B) opened on that row's day and
  // kg (its day / initialKg props); Delete = confirm, then deleteWeighIn (all
  // of that day's manual weight rows; AppContext re-reads health_metrics).
  // One weigh-in a day (V6-58), so a row is a day.
  const history: HistoryItem[] = [...allDays].reverse().map((d) => {
    const prev = earlierDay(d);
    const isStart = d === startDay && allDays.length > 1;
    // B1 (PB-H-11, PB-HB-43): the day's weigh-in (the last of the day wins,
    // V6-58) with its own time, note and device name ("Withings via Apple
    // Health"); manual rows read "Logged by you".
    const row = [...weighIns].reverse().find((r) => r.day === d);
    const when = row ? `${relativeDayTitle(d, today)} ${clock12(row.recordedAt)}` : relativeDayTitle(d, today);
    const by = row && row.source !== "manual" ? row.deviceName ?? sourceName(row.source) : t("Logged by you");
    const synced = !!row && row.source !== "manual";
    return {
      key: d,
      title: wText(byDay[d], unit),
      meta: isStart ? `${dayLabel(d)}${row ? ` ${clock12(row.recordedAt)}` : ""} · ${t("start")}` : `${when} · ${by}`,
      meta2: row?.note ?? undefined,
      icon: WeightScaleIcon,
      value: isStart ? t("Start") : prev ? deltaW(byDay[d] - byDay[prev], unit) : "",
      sub: isStart || !prev ? undefined : u,
      onClick: () => openDay(d),
      // Synced weigh-ins: Delete only ("Remove from Centium?", hidden_synced_readings, V6-169).
      onEdit: synced ? undefined : () => (offline ? setToast(OFFLINE_ACTION) : setEditing({ day: d, kg: byDay[d] })),
      onDelete: () => (offline ? setToast(OFFLINE_ACTION) : synced ? setRemoving(row!) : setDeleting(d)),
    };
  });

  const menu: MetricMenuItem[] = [
    { value: "goal", label: t("Edit goal"), icon: <Target size={17} />, onSelect: goToGoals },
    { value: "units", label: t("Units"), icon: <Ruler size={17} />, onSelect: () => setUnitsOpen(true) },
    { value: "date", label: t("Go to date"), icon: <CalendarDays size={17} />, onSelect: () => setGoToOpen(true) },
  ];

  const common = (
    <>
      <WeightUnitsSheet open={unitsOpen} unit={unit} onClose={() => setUnitsOpen(false)} onChange={(u) => setUnit(u)} />
      <MeasuredOnPopup
        open={goToOpen}
        onClose={() => setGoToOpen(false)}
        value={new Date(`${anchor}T12:00:00`)}
        today={today}
        dateOnly
        title={t("Go to date")}
        onDone={(d) => {
          setGoToOpen(false);
          openDay(iso(d));
        }}
      />
      <Toast open={!!toast} message={toast ? t(toast) : ""} onExpire={() => setToast(null)} />
    </>
  );

  // --- recovery-sensitive: no number anywhere (OURS-health-empty-weight #5) ----------
  if (hidden) {
    return (
      <MetricPage metric="weight" title={t("Weight trend")} range={range} onRangeChange={setRange} menu={menu.filter((m) => m.value !== "units")}>
        <MetricHero metric="weight" pattern={5} padding="16px" loading={recoveryModePending} ariaLabel={t("Weight numbers hidden")}>
          <div data-wt-recovery style={{ padding: "18px 0" }}>
            <p style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{t("Weight numbers are hidden while recovery-sensitive mode is on.")}</p>
            <button
              type="button"
              onClick={() => navigate("/app/profile")}
              className="tap relative before:absolute before:-inset-y-[13px] before:-inset-x-1 before:content-['']"
              style={{ marginTop: 8, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: ink }}
            >
              {t("Change in Profile")}
            </button>
          </div>
        </MetricHero>
        {common}
      </MetricPage>
    );
  }

  return (
    <MetricPage
      metric="weight"
      title={t("Weight trend")}
      range={range}
      onRangeChange={setRange}
      menu={menu}
      // Round D O4: the sheet queues a new weight offline, so it opens either way.
      cta={{ label: t("Log weight"), icon: <Plus size={16} />, onClick: () => setLogOpen(true) }}
    >
      <WeightHero
        data={hero}
        loading={loading}
        onSetGoal={goToGoals}
        ariaLabel={hero ? `${t("Weight {weight}.", { weight: wText(hero.nowKg, unit) })}${hero.context ? ` ${hero.context}.` : ""}` : t("Weight, no readings yet")}
        empty={
          <button type="button" onClick={() => setLogOpen(true)} className="tap block w-full text-center" style={{ padding: "48px 0" }}>
            <span className="block" style={{ fontSize: textPx(17), lineHeight: linePx(25.5), fontWeight: 800, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>{t("No readings yet")}</span>
            <span className="block" style={{ marginTop: 2, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{t("Log your weight to start tracking")}</span>
          </button>
        }
      />
      {offline && allDays.length > 0 && <FreshnessLine offline>{t(OFFLINE_CACHED)}</FreshnessLine>}
      {metricsError && !allDays.length ? (
        <ErrorCard onRetry={retryMetrics} />
      ) : (
        allDays.length > 0 && (
          <ChartCard
            metric="weight"
            title={range === "month" ? monthLong(Number(period.start.slice(5, 7))) : periodTitle(period, today)}
            periodLabel={periodLabel(period)}
            onPrev={() => setAnchor(stepAnchor(range, anchor, -1))}
            onNext={() => setAnchor(stepAnchor(range, anchor, 1))}
            nextDisabled={current}
            legend={weightLegend(range, goalKg !== null, startDay && startDay.startsWith(period.start.slice(0, 4)) ? t("Start, {date}", { date: shortDate(startDay) }) : null, dark)}
            foot={foot}
            loading={loading}
            summary={summary}
          >
            <WeightChart range={range} period={period} byDay={byDay} today={today} goalKg={goalKg} unit={unit} compare={compare} startDay={startDay} />
          </ChartCard>
        )
      )}
      {allDays.length > 0 && <StatCard metric="weight" stats={stats} style={{ marginTop: 10, minHeight: 56 }} />}
      {allDays.length > 0 && (
        <>
          <CapsLabel>{t("History")}</CapsLabel>
          <HistoryCard metric="weight" icon={WeightScaleIcon} items={history} loading={loading} />
        </>
      )}
      <LogWeightSheet open={logOpen} onClose={() => setLogOpen(false)} onSaved={reloadMetrics} />
      <LogWeightSheet open={editing !== null} onClose={() => setEditing(null)} day={editing?.day} initialKg={editing?.kg} onSaved={reloadMetrics} />
      <HealthPopup
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("Remove from Centium?")}
        body={<p>{t("It stays in {source}. Centium won't import it again.", { source: removing ? sourceName(removing.source) : "Apple Health" })}</p>}
        secondary={{ label: t("Cancel"), onClick: () => setRemoving(null) }}
        primary={{
          label: t("Remove"),
          tone: "destructive",
          onClick: async () => {
            const r = removing;
            setRemoving(null);
            if (!r || !authUserId) return;
            if (!(await hideSyncedReading(authUserId, r))) setToast(SAVE_FAILED);
            weighInRead.reload();
            reloadMetrics();
          },
        }}
      />
      {/* OURS-health-delete-confirm (manual weigh-in). */}
      <HealthPopup
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={tx("Delete this entry?", "health")}
        body={<p>{t("This removes it from your history and totals.")}</p>}
        secondary={{ label: t("Cancel"), onClick: () => setDeleting(null) }}
        primary={{
          label: t("Delete"),
          tone: "destructive",
          onClick: async () => {
            const day = deleting;
            setDeleting(null);
            if (!day) return;
            const r = await deleteWeighIn(day);
            if (!r.ok) setToast(SAVE_FAILED);
          },
        }}
      />
      {common}
    </MetricPage>
  );
}
