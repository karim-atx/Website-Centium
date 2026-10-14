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
    if (startKg !== null && allDays.length > 1) parts.push(`${deltaW(nowKg - startKg, unit)} ${unit} since start`);
    if (goalKg !== null) parts.push(`${fmtW(Math.abs(nowKg - goalKg), unit)} ${unit} to goal`);
    return {
      nowKg,
      context: parts.length ? parts.join(" · ") : null,
      progress: journey !== null ? `${Math.round(journey * 100)}% there` : null,
      startKg: allDays.length > 1 || hasGoal ? startKg : null,
      startLabel: startDay ? `Start · ${shortDate(startDay)}` : "Start",
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
  const compare = prevDay ? { day: prevDay, kg: byDay[prevDay], label: prevDay === yesterday ? "Yesterday" : dayLabel(prevDay) } : null;

  const stats: Stat[] = (() => {
    const v = (x: number | null) => (x === null ? "–" : fmtW(x, unit));
    if (range === "day")
      return [
        { icon: CalendarCheck, value: v(dayKg ?? null), label: anchor === today ? "Today" : dayLabel(anchor) },
        { icon: History, value: v(compare?.kg ?? null), label: "Last weigh-in" },
        { icon: TrendingDown, value: dayKg !== undefined && compare ? deltaW(dayKg - compare.kg, unit) : "–", label: compare ? `${unit} since ${compare.label === "Yesterday" ? "yesterday" : dayLabel(compare.day).split(" ")[0]}` : `${unit} change` },
      ];
    if (range === "week") {
      const prev = avg(valuesIn(byDay, previousPeriod(period)).map((r) => r.value));
      return [
        { icon: Activity, value: v(pAvg), label: `Week avg ${unit}` },
        { icon: ArrowDownToLine, value: v(pLow), label: `Lowest ${unit}` },
        { icon: TrendingDown, value: pAvg !== null && prev !== null ? deltaW(pAvg - prev, unit) : "–", label: "vs last week" },
      ];
    }
    if (range === "month") {
      const first = rows[0];
      const last = rows[rows.length - 1];
      const weeks = first && last ? (new Date(`${last.date}T12:00:00`).getTime() - new Date(`${first.date}T12:00:00`).getTime()) / (7 * 86400000) : 0;
      return [
        { icon: Activity, value: v(pAvg), label: `Avg ${unit}` },
        { icon: ArrowDownToLine, value: v(pLow), label: `Lowest ${unit}` },
        { icon: TrendingDown, value: weeks >= 1 ? deltaW((last.value - first.value) / weeks, unit) : "–", label: `${unit} per week` },
      ];
    }
    const since = startDay && startDay.startsWith(period.start.slice(0, 4)) ? monthShort(Number(startDay.slice(5, 7))) : null;
    return [
      { icon: TrendingDown, value: v(pAvg), label: since ? `Avg ${unit} since ${since}` : `Avg ${unit}` },
      { icon: ArrowDownToLine, value: v(pLow), label: `Lowest ${unit}` },
      { icon: TrendingDown, value: nowKg !== null && startKg !== null && allDays.length > 1 ? deltaW(nowKg - startKg, unit) : "–", label: `${unit} since start` },
    ];
  })();

  const foot = (() => {
    if (range === "day") {
      if (dayKg === undefined) return anchor === today ? "No weigh-in today" : "No weigh-in this day";
      if (!compare) return "Your first weigh-in";
      const d = `${deltaW(dayKg - compare.kg, unit)} ${unit}`;
      return compare.label === "Yesterday" ? `Compared with yesterday · ${d}` : `No weigh-in yesterday, so ${anchor === today ? "today" : "this day"} compares with your last one · ${d}`;
    }
    if (!n) return range === "week" ? "No weigh-ins this week" : range === "month" ? "No weigh-ins this month" : "No weigh-ins this year";
    const w = `${n} weigh-in${n === 1 ? "" : "s"}`;
    if (range === "week") return `${w} ${current ? "this week " : ""}· week average ${fmtW(pAvg as number, unit)} ${unit}`;
    if (range === "month") {
      const ch = rows[rows.length - 1].value - rows[0].value;
      const m = periodLabel(period).split(" ")[0];
      return n > 1 ? `${w} · ${ch === 0 ? "no change" : `${ch < 0 ? "down" : "up"} ${fmtW(Math.abs(ch), unit)} ${unit}`} in ${m}` : `${w} in ${m}`;
    }
    const firstM = Number(rows[0].date.slice(5, 7));
    const tracking = `Tracking since ${periodLabel(periodOf("month", rows[0].date)).split(" ")[0]}`;
    return current ? `${tracking} · ${periodLabel(periodOf("month", today)).split(" ")[0]} so far` : `${tracking} · to ${monthShort(Number(rows[rows.length - 1].date.slice(5, 7)))}`.replace(`to ${monthShort(firstM)}`, "").trim();
  })();

  const summary = (() => {
    const g = goalKg !== null ? ` Goal ${fmtW(goalKg, unit)}.` : "";
    const unitWord = unit === "kg" ? "kilograms" : "pounds";
    if (range === "day") return dayKg === undefined ? `Weight ${dayLabel(anchor)}. No weigh-in.` : `Weight ${anchor === today ? "today" : dayLabel(anchor)} ${fmtW(dayKg, unit)} ${unitWord}.${compare ? ` Last weigh-in ${dayLabel(compare.day)}, ${fmtW(compare.kg, unit)}. ${deltaW(dayKg - compare.kg, unit).replace("↓", "Down").replace("↑", "Up")}.` : ""}`;
    if (!n) return `Weight ${periodTitle(period, today).toLowerCase()}. No weigh-ins.${g}`;
    if (range === "week") return `Weight ${current ? "this week" : periodLabel(period)}. ${n} weigh-in${n === 1 ? "" : "s"}, average ${fmtW(pAvg as number, unit)} ${unitWord}.${g}`;
    return `Weight in ${periodLabel(period)}. ${fmtW(rows[0].value, unit)} ${unitWord} on ${shortDate(rows[0].date)} to ${fmtW(rows[n - 1].value, unit)} on ${shortDate(rows[n - 1].date)}.${g}`;
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
    const by = row && row.source !== "manual" ? row.deviceName ?? sourceName(row.source) : "Logged by you";
    const synced = !!row && row.source !== "manual";
    return {
      key: d,
      title: `${fmtW(byDay[d], unit)} ${unit}`,
      meta: isStart ? `${dayLabel(d)}${row ? ` ${clock12(row.recordedAt)}` : ""} · start` : `${when} · ${by}`,
      meta2: row?.note ?? undefined,
      icon: WeightScaleIcon,
      value: isStart ? "Start" : prev ? deltaW(byDay[d] - byDay[prev], unit) : "",
      sub: isStart || !prev ? undefined : unit,
      onClick: () => openDay(d),
      // Synced weigh-ins: Delete only ("Remove from Centium?", hidden_synced_readings, V6-169).
      onEdit: synced ? undefined : () => (offline ? setToast(OFFLINE_ACTION) : setEditing({ day: d, kg: byDay[d] })),
      onDelete: () => (offline ? setToast(OFFLINE_ACTION) : synced ? setRemoving(row!) : setDeleting(d)),
    };
  });

  const menu: MetricMenuItem[] = [
    { value: "goal", label: "Edit goal", icon: <Target size={17} />, onSelect: goToGoals },
    { value: "units", label: "Units", icon: <Ruler size={17} />, onSelect: () => setUnitsOpen(true) },
    { value: "date", label: "Go to date", icon: <CalendarDays size={17} />, onSelect: () => setGoToOpen(true) },
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
        title="Go to date"
        onDone={(d) => {
          setGoToOpen(false);
          openDay(iso(d));
        }}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );

  // --- recovery-sensitive: no number anywhere (OURS-health-empty-weight #5) ----------
  if (hidden) {
    return (
      <MetricPage metric="weight" title="Weight trend" range={range} onRangeChange={setRange} menu={menu.filter((m) => m.value !== "units")}>
        <MetricHero metric="weight" pattern={5} padding="16px" loading={recoveryModePending} ariaLabel="Weight numbers hidden">
          <div data-wt-recovery style={{ padding: "18px 0" }}>
            <p style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>Weight numbers are hidden while recovery-sensitive mode is on.</p>
            <button
              type="button"
              onClick={() => navigate("/app/profile")}
              className="tap relative before:absolute before:-inset-y-[13px] before:-inset-x-1 before:content-['']"
              style={{ marginTop: 8, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: ink }}
            >
              Change in Profile
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
      title="Weight trend"
      range={range}
      onRangeChange={setRange}
      menu={menu}
      cta={{ label: "Log weight", icon: <Plus size={16} />, onClick: () => (offline ? setToast(OFFLINE_ACTION) : setLogOpen(true)) }}
    >
      <WeightHero
        data={hero}
        loading={loading}
        onSetGoal={goToGoals}
        ariaLabel={hero ? `Weight ${fmtW(hero.nowKg, unit)} ${unit}.${hero.context ? ` ${hero.context}.` : ""}` : "Weight, no readings yet"}
        empty={
          <button type="button" onClick={() => setLogOpen(true)} className="tap block w-full text-center" style={{ padding: "48px 0" }}>
            <span className="block" style={{ fontSize: textPx(17), lineHeight: linePx(25.5), fontWeight: 800, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>No readings yet</span>
            <span className="block" style={{ marginTop: 2, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>Log your weight to start tracking</span>
          </button>
        }
      />
      {offline && allDays.length > 0 && <FreshnessLine offline>{OFFLINE_CACHED}</FreshnessLine>}
      {metricsError && !allDays.length ? (
        <ErrorCard onRetry={retryMetrics} />
      ) : (
        allDays.length > 0 && (
          <ChartCard
            metric="weight"
            title={range === "month" ? periodLabel(period).split(" ")[0] : periodTitle(period, today)}
            periodLabel={periodLabel(period)}
            onPrev={() => setAnchor(stepAnchor(range, anchor, -1))}
            onNext={() => setAnchor(stepAnchor(range, anchor, 1))}
            nextDisabled={current}
            legend={weightLegend(range, goalKg !== null, startDay && startDay.startsWith(period.start.slice(0, 4)) ? `Start, ${shortDate(startDay)}` : null, dark)}
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
          <CapsLabel>History</CapsLabel>
          <HistoryCard metric="weight" icon={WeightScaleIcon} items={history} loading={loading} />
        </>
      )}
      <LogWeightSheet open={logOpen} onClose={() => setLogOpen(false)} onSaved={reloadMetrics} />
      <LogWeightSheet open={editing !== null} onClose={() => setEditing(null)} day={editing?.day} initialKg={editing?.kg} onSaved={reloadMetrics} />
      <HealthPopup
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove from Centium?"
        body={<p>{`It stays in ${removing ? sourceName(removing.source) : "Apple Health"}. Centium won't import it again.`}</p>}
        secondary={{ label: "Cancel", onClick: () => setRemoving(null) }}
        primary={{
          label: "Remove",
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
        title="Delete this entry?"
        body={<p>This removes it from your history and totals.</p>}
        secondary={{ label: "Cancel", onClick: () => setDeleting(null) }}
        primary={{
          label: "Delete",
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
