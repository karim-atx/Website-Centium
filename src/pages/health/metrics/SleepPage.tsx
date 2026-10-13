import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Award, CalendarDays, Gauge, History, Link2, Moon, RefreshCw } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { shiftDate } from "../../../utils/date";
import { useOnline } from "../../../hooks/useOnline";
import { CalendarPickerSheet } from "../../../components/dashboard/CalendarPickerSheet";
import {
  CapsLabel,
  ChartCard,
  ErrorCard,
  FreshnessLine,
  HistoryCard,
  MetricPage,
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
import { textPx, linePx } from "../../../theme/textSize";
import {
  avg,
  daysInMonth,
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
import { GoalBarChart, LegendDot, LegendGhost, buildGoalBars } from "../../../components/health/metric/StepsBarChart";
import { SyncedNoDevice } from "../../../components/health/metric/StepsNoDevice";
import { useSyncedRemove } from "../../../components/health/metric/SyncedRemove";
import { useSleepSessions } from "../../../services/health-metrics/b1";
import { clock12, rangeClock12 } from "../../../utils/time12";
import { Toast } from "../../../components/ui/Toast";
import { SleepHero, SleepStagesCard, hm, type StageMinutes } from "../../../components/health/metric/SleepHero";

// HE1.3 Sleep (Week), HE1.3.d, HE1.3.m, HE1.3.y.
//
// DATA: healthSeries.sleep (hours asleep a night, filed on the day you wake)
// and sleepNights (score, stage totals, summary). Sleep is synced only
// (V6-20); with nothing on record the web shows the no-device state.
// Bed / wake times and the stage timeline (HA-06 / PB-H-07, Database stage
// B1) are not stored: the hero arc has no clock labels, the week / month
// charts are duration bars from a baseline (the handover fallback), the Day
// timeline card is hidden, the usual-bedtime line and the year's bedtime
// line are hidden, and History rows show no times. Kept from the old sheet:
// the sleep score (third tile), the night summary, a History row opening
// that night's Day view.

const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iconInk = { color: "rgb(var(--th-7d6bb5))" };
const sumStages = (list: StageMinutes[]): StageMinutes | null =>
  list.length === 0
    ? null
    : {
        deepMin: list.reduce((s, x) => s + x.deepMin, 0) / list.length,
        lightMin: list.reduce((s, x) => s + x.lightMin, 0) / list.length,
        remMin: list.reduce((s, x) => s + x.remMin, 0) / list.length,
        awakeMin: list.reduce((s, x) => s + x.awakeMin, 0) / list.length,
      };
const inBedOf = (s: StageMinutes) => s.deepMin + s.lightMin + s.remMin + s.awakeMin;

export default function SleepPage() {
  const { healthSeries, sleepNights, metricsError } = useApp();
  const navigate = useNavigate();
  const online = useOnline();
  const { range, setRange, anchor, setAnchor, openDay, today } = useMetricRangeState("week");
  const [dateOpen, setDateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Database B1 sleep_details times and sleep_segments (HA-06): the main
  // sleep of each night (naps left out), for the range and the week before.
  const p0 = periodOf(range, anchor);
  const sessFrom = shiftDate(p0.start < today ? p0.start : today, -7);
  const sessions = useSleepSessions(sessFrom, p0.end > today ? p0.end : today).data;
  const sessionByDay = useMemo(() => Object.fromEntries(sessions.filter((x) => !x.isNap).map((x) => [x.day, x])), [sessions]);
  const timesOf = (d: string) => {
    const x = sessionByDay[d];
    return x?.bedStart && x?.wakeEnd ? { bed: clock12(x.bedStart), wake: clock12(x.wakeEnd), range: rangeClock12(x.bedStart, x.wakeEnd) } : null;
  };

  // Hours asleep per wake day; a night with stages but no duration row
  // counts its asleep stages.
  const byDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const pt of healthSeries.sleep.history) if (pt.value > 0) out[pt.date] = pt.value;
    for (const x of sessions) if (!x.isNap && x.asleepMin !== null && x.asleepMin > 0 && out[x.day] === undefined) out[x.day] = x.asleepMin / 60;
    for (const nt of sleepNights) {
      if (out[nt.date] === undefined && nt.stages) {
        const asleep = nt.stages.deepMin + nt.stages.lightMin + nt.stages.remMin;
        if (asleep > 0) out[nt.date] = asleep / 60;
      }
    }
    return out;
  }, [healthSeries.sleep.history, sleepNights, sessions]);
  const nightByDay = useMemo(() => Object.fromEntries(sleepNights.map((nt) => [nt.date, nt])), [sleepNights]);
  const hasAny = Object.keys(byDay).length > 0;
  // Still hydrating: the device copy of the latest reading says rows exist.
  const { loading, retry: retryMetrics } = useMetricsLoad();
  // HA-01 (B1): the connected source as the header tag and its freshness line; none on the web.
  const metricSource = useMetricSource();
  // HA-12 (B1 hidden_synced_readings): Delete on a synced night ("Remove from Centium?").
  const syncedRemove = useSyncedRemove("sleep", stepAnchor("month", today, -1), today, setToast);

  const p = periodOf(range, anchor);
  const current = isCurrentPeriod(p, today);
  const rows = valuesIn(byDay, p);
  const empty = rows.length === 0;
  const mean = avg(rows.map((r) => r.value));
  const stagesIn = (days: string[]) => days.map((d) => nightByDay[d]?.stages).filter((s): s is StageMinutes => !!s);

  const menu = [
    hasAny
      ? { value: "sources", label: "Sources", icon: <RefreshCw size={17} style={iconInk} />, onSelect: () => navigate("/app/settings/devices") }
      : { value: "connect", label: "Connect a source", icon: <Link2 size={17} style={iconInk} />, onSelect: () => navigate("/app/settings/devices") },
    { value: "date", label: "Go to date", icon: <CalendarDays size={17} style={iconInk} />, onSelect: () => setDateOpen(true) },
  ];
  const picker = (
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
  );

  if (!loading && !hasAny) {
    return (
      <MetricPage
        metric="sleep"
        title="Sleep"
        range={range}
        onRangeChange={setRange}
        menu={menu}
        cta={{ label: "Connect a source", icon: <Link2 size={16} />, onClick: () => navigate("/app/settings/devices") }}
      >
        {metricsError ? <ErrorCard onRetry={retryMetrics} /> : <SyncedNoDevice metric="sleep" icon={Moon} bodyName="Sleep data" footName="sleep" range={range} today={today} />}
        {picker}
      </MetricPage>
    );
  }

  // ---- the night the Day / Week views describe ----------------------------
  const nightDay = range === "day" ? anchor : current ? today : rows.length ? rows[rows.length - 1].date : p.end;
  const lastNight = range === "day" || range === "week" ? (range === "week" && rows.length ? (byDay[nightDay] !== undefined ? nightDay : rows[rows.length - 1].date) : nightDay) : null;
  const isLast = lastNight === today;

  // ---- hero ---------------------------------------------------------------
  const hero = (() => {
    if (lastNight !== null) {
      const v = byDay[lastNight];
      const st = nightByDay[lastNight]?.stages ?? null;
      if (v === undefined) return { value: null, sub: "", empty: isLast || range === "week" ? "No sleep recorded last night" : `No sleep recorded for ${dayLabel(lastNight)}` };
      const inBed = sessionByDay[lastNight]?.inBedMin ?? (st ? inBedOf(st) : null);
      return { value: hm(v * 60), sub: inBed !== null ? `asleep · ${hm(inBed)} in bed` : "asleep", empty: undefined };
    }
    if (empty) return { value: null, sub: "", empty: range === "month" ? "No sleep recorded this month" : "No sleep recorded this year" };
    const st = sumStages(stagesIn(rows.map((r) => r.date)));
    return { value: hm((mean ?? 0) * 60), sub: st ? `avg asleep · ${hm(inBedOf(st))} in bed` : "avg asleep", empty: undefined };
  })();

  // ---- stages card ------------------------------------------------------
  const stageCard = (() => {
    if (lastNight !== null) {
      if (byDay[lastNight] === undefined) return null;
      const st = nightByDay[lastNight]?.stages ?? null;
      return { stages: st, right: isLast ? "last night" : dayLabel(lastNight) };
    }
    if (empty) return null;
    return { stages: sumStages(stagesIn(rows.map((r) => r.date))), right: "avg a night" };
  })();
  const summaryText = lastNight !== null ? nightByDay[lastNight]?.summary ?? null : null;

  // ---- tiles ----------------------------------------------------------------
  const stats: Stat[] = (() => {
    if (range === "day" || range === "week") {
      const wk = periodOf("week", lastNight ?? anchor);
      const wr = valuesIn(byDay, wk);
      const la = avg(valuesIn(byDay, previousPeriod(wk)).map((r) => r.value));
      const wa = avg(wr.map((r) => r.value));
      const out: Stat[] = [
        { icon: Activity, value: wa === null ? <StatEmpty /> : hm(wa * 60), label: `Week avg · ${wr.length} ${wr.length === 1 ? "night" : "nights"}` },
        { icon: History, value: la === null ? <StatEmpty /> : hm(la * 60), label: "Last week avg" },
      ];
      const score = lastNight ? sessionByDay[lastNight]?.score ?? nightByDay[lastNight]?.score : null;
      if (score !== null && score !== undefined) out.push({ icon: Gauge, value: String(Math.round(score)), label: "Sleep score" });
      return out;
    }
    const best = rows.reduce<{ date: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);
    if (range === "month") {
      const y = Number(p.start.slice(0, 4));
      const m = Number(p.start.slice(5, 7));
      const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
      return [
        { icon: Moon, value: `${rows.length} of ${span}`, label: "Nights logged" },
        { icon: Award, value: best ? hm(best.value * 60) : <StatEmpty />, label: best ? `Best night · ${shortDate(best.date)}` : "Best night" },
      ];
    }
    const monthAvgs = Array.from({ length: 12 }, (_, i) => avg(rows.filter((r) => Number(r.date.slice(5, 7)) === i + 1).map((r) => r.value)));
    let bi = -1;
    monthAvgs.forEach((v, i) => {
      if (v !== null && (bi < 0 || v > (monthAvgs[bi] as number))) bi = i;
    });
    return [
      { icon: Award, value: bi < 0 ? <StatEmpty /> : hm((monthAvgs[bi] as number) * 60), label: bi < 0 ? "Best month" : `Best month · ${MONTH_LONG[bi]}` },
      { icon: Moon, value: String(rows.length), label: `Nights logged in ${p.start.slice(0, 4)}` },
    ];
  })();

  // ---- chart (duration fallback) ------------------------------------------
  const usual = avg(valuesIn(byDay, { range: "month", start: shiftDate(today, -29), end: today }).map((r) => r.value)) ?? 8;
  const chartTitle = current ? periodTitle(p, today) : range === "month" ? MONTH_LONG[Number(p.start.slice(5, 7)) - 1] : periodLabel(p);
  let foot: string | undefined;
  let summary = "";
  let legend: { label: string; swatch: React.ReactNode }[] = [];
  if (range === "week") {
    legend = [
      { label: "Asleep", swatch: <LegendDot color={mc("sleep", "main")} radius={3} /> },
      { label: "Nights ahead", swatch: <LegendGhost /> },
    ];
    foot = empty ? "No sleep logged this week" : undefined;
    summary = `Sleep ${current ? "this week" : `in ${periodLabel(p)}`}. ${empty ? "Nothing recorded." : rows.map((r) => `${dayLabel(r.date).split(" ")[0]}, ${hm(r.value * 60).replace("h", " hours").replace("m", " minutes")} asleep`).join(". ") + "."}`;
  } else if (range === "month") {
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
    legend = [{ label: "Asleep", swatch: <LegendDot color={mc("sleep", "main", 0.75)} radius={3} /> }];
    foot = empty ? "No sleep logged this month" : `${rows.length} of ${span} nights logged`;
    summary = `Sleep in ${MONTH_LONG[m - 1]}. ${empty ? "Nothing recorded." : `Average ${hm((mean ?? 0) * 60)} asleep.`}`;
  } else if (range === "year") {
    const y = Number(p.start.slice(0, 4));
    const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a, b) => a - b);
    const curM = Number(today.slice(5, 7));
    legend = [
      { label: "Average asleep", swatch: <LegendDot color={mc("sleep", "main")} radius={3} /> },
      { label: "Months ahead", swatch: <LegendGhost /> },
    ];
    foot = empty
      ? "No sleep logged this year"
      : `${months.length === 1 ? monthShort(months[0]) : `${monthShort(months[0])} to ${monthShort(months[months.length - 1])}`}${current && months.includes(curM) ? ` · ${MONTH_LONG[curM - 1]} so far` : ""}`;
    summary = `Sleep in ${y}. ${empty ? "Nothing recorded." : `Average ${hm((mean ?? 0) * 60)} a night.`}`;
  }

  // ---- history ------------------------------------------------------------
  const items: HistoryItem[] = Object.keys(byDay)
    .filter((d) => d <= today)
    .sort()
    .reverse()
    .slice(0, 7)
    .map((d) => {
      const st = nightByDay[d]?.stages;
      return {
        key: d,
        title: d === today ? "Last night" : relativeDayTitle(d, today),
        meta: [d === today ? dayLabel(d) : null, timesOf(d)?.range ?? (st ? `${hm(inBedOf(st))} in bed` : d === today ? null : "No stage detail"), syncedRemove.sourceOf(d) === "Logged by you" ? null : syncedRemove.sourceOf(d)].filter(Boolean).join(" · "),
        value: hm(byDay[d] * 60),
        sub: "asleep",
        onClick: () => openDay(d),
        onDelete: syncedRemove.onDelete(d),
      };
    });

  return (
    <MetricPage sourceTag={metricSource.tag} onSourceTag={() => navigate("/app/settings/devices")} metric="sleep" title="Sleep" range={range} onRangeChange={setRange} menu={menu}>
      <SleepHero
        value={hero.value}
        sub={hero.sub}
        emptyTitle={hero.empty}
        loading={loading}
        ariaLabel={hero.value ? `${hero.value} ${hero.sub}` : hero.empty ?? ""}
        bed={lastNight ? timesOf(lastNight)?.bed : null}
        wake={lastNight ? timesOf(lastNight)?.wake : null}
        segments={(() => {
          const x = lastNight ? sessionByDay[lastNight] : undefined;
          if (!x?.bedStart || !x?.wakeEnd || x.segments.length === 0) return undefined;
          const a = Date.parse(x.bedStart);
          const span = Date.parse(x.wakeEnd) - a;
          return span > 0 ? x.segments.map((g) => ({ stage: g.stage, from: Math.max(0, (Date.parse(g.startsAt) - a) / span), to: Math.min(1, (Date.parse(g.endsAt) - a) / span) })) : undefined;
        })()}
      />
      {syncedRemove.popup}
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
      {!online && <FreshnessLine offline>{OFFLINE_CACHED}</FreshnessLine>}
      {metricSource.freshness}
      {stageCard && (
        <SleepStagesCard stages={stageCard.stages} right={stageCard.right} note="Stages and a sleep score come from a connected device." />
      )}
      {summaryText && (
        <p style={{ marginTop: 8, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 400, color: "rgb(var(--c-charcoal-soft))" }}>{summaryText}</p>
      )}
      {range !== "day" &&
        (metricsError && !hasAny ? (
          <ErrorCard onRetry={retryMetrics} />
        ) : (
          <ChartCard
            metric="sleep"
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
              metric="sleep"
              mode={range}
              bars={buildGoalBars(p, byDay, today)}
              goal={null}
              ghostValue={usual}
              onBarTap={range === "month" ? openDay : undefined}
              barLabel={(b) => (b.value === null ? `${b.key}, nothing recorded` : `${b.key}, ${hm(b.value * 60)} asleep`)}
            />
          </ChartCard>
        ))}
      <StatCard metric="sleep" stats={stats} valueSize={17} style={{ marginTop: 10 }} />
      <CapsLabel>History</CapsLabel>
      <HistoryCard metric="sleep" icon={Moon} items={items} loading={loading} empty="No sleep recorded yet" />
      {picker}
    </MetricPage>
  );
}
