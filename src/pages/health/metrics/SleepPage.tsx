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
import { GoalBarChart, LegendDash, LegendDot, LegendGhost, buildGoalBars, WEEK_LETTERS } from "../../../components/health/metric/StepsBarChart";
import {
  LegendBedBar,
  LegendBedGhost,
  SleepBedChart,
  YearBedtimeLine,
  bedtimeScale,
  clockFromNoon,
  minutesAfterNoon,
  type BedNight,
} from "../../../components/health/metric/SleepBedChart";
import { SyncedNoDevice } from "../../../components/health/metric/StepsNoDevice";
import { useSyncedRemove } from "../../../components/health/metric/SyncedRemove";
import { useSleepSessions } from "../../../services/health-metrics/b1";
import { clock12, hourLabel12, rangeClock12 } from "../../../utils/time12";
import { Toast } from "../../../components/ui/Toast";
import { SleepHero, SleepStagesCard, hm, type StageMinutes } from "../../../components/health/metric/SleepHero";

// HE1.3 Sleep (Week), HE1.3.d, HE1.3.m, HE1.3.y.
//
// DATA: healthSeries.sleep (hours asleep a night, filed on the day you wake)
// and sleepNights (score, stage totals, summary). Sleep is synced only
// (V6-20); with nothing on record the web shows the no-device state.
// Bed / wake times and the stage timeline (HA-06 / PB-H-07, Database stage
// B1 sleep_details bed_start / wake_end + sleep_segments): the hero arc takes
// the stage colours and the Bedtime / Wake row (month / year: the averages,
// "Avg bedtime" / "Avg wake"); the week and month charts are floating
// bedtime-to-wake bars with the usual-bedtime line (SleepBedChart) when every
// logged night of the range has its times, else the duration bars from a
// baseline (the handover fallback); the year chart adds the average-bedtime
// line on its own top scale and the "Avg bedtime" tile. Kept from the old sheet:
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
  // 21 days before the range as well, so the usual bedtime has its last 14 nights.
  const sessFrom = shiftDate(p0.start < today ? p0.start : today, -21);
  const sessions = useSleepSessions(sessFrom, p0.end > today ? p0.end : today).data;
  const sessionByDay = useMemo(() => Object.fromEntries(sessions.filter((x) => !x.isNap).map((x) => [x.day, x])), [sessions]);
  const timesOf = (d: string) => {
    const x = sessionByDay[d];
    return x?.bedStart && x?.wakeEnd ? { bed: clock12(x.bedStart), wake: clock12(x.wakeEnd), range: rangeClock12(x.bedStart, x.wakeEnd) } : null;
  };
  // Bed / wake as minutes after noon (bedtimes around midnight stay contiguous).
  const clockOf = (d: string): { bed: number; wake: number } | null => {
    const x = sessionByDay[d];
    return x?.bedStart && x?.wakeEnd ? { bed: minutesAfterNoon(x.bedStart), wake: minutesAfterNoon(x.wakeEnd) } : null;
  };
  // Usual bedtime / wake = the median of the last 14 nights with times (health-backend.md:109, naps left out).
  const usualClock = useMemo(() => {
    const recent = sessions
      .filter((x) => !x.isNap && x.bedStart && x.wakeEnd && x.day <= today)
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, 14);
    if (!recent.length) return null;
    const med = (v: number[]) => {
      const s = [...v].sort((a, b) => a - b);
      const m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    return { bed: med(recent.map((x) => minutesAfterNoon(x.bedStart as string))), wake: med(recent.map((x) => minutesAfterNoon(x.wakeEnd as string))) };
  }, [sessions, today]);

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

  // ---- bed / wake times in the range (B1 sleep_details) -------------------
  // Floating bars only when every logged night of the range has its times;
  // otherwise the duration bars (the handover fallback) stay.
  const timedRows = rows.filter((r) => clockOf(r.date) !== null);
  const floating = timedRows.length > 0 && timedRows.length === rows.length;
  const meanOf = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
  const avgBed = meanOf(timedRows.map((r) => (clockOf(r.date) as { bed: number }).bed));
  const avgWake = meanOf(timedRows.map((r) => (clockOf(r.date) as { wake: number }).wake));
  const monthBeds =
    range === "year"
      ? Array.from({ length: 12 }, (_, i) => meanOf(timedRows.filter((r) => Number(r.date.slice(5, 7)) === i + 1).map((r) => (clockOf(r.date) as { bed: number }).bed)))
      : [];

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
      // HE1.3.y #49-#51: "Avg bedtime" with B1 times; without them the nights count stays.
      avgBed !== null
        ? { icon: Activity, value: clockFromNoon(avgBed), label: "Avg bedtime" }
        : { icon: Moon, value: String(rows.length), label: `Nights logged in ${p.start.slice(0, 4)}` },
    ];
  })();

  // ---- chart: floating bedtime-to-wake bars (B1 times), else duration bars --
  const usual = avg(valuesIn(byDay, { range: "month", start: shiftDate(today, -29), end: today }).map((r) => r.value)) ?? 8;
  const chartTitle = current ? periodTitle(p, today) : range === "month" ? MONTH_LONG[Number(p.start.slice(5, 7)) - 1] : periodLabel(p);
  let foot: string | undefined;
  let summary = "";
  let legend: { label: string; swatch: React.ReactNode }[] = [];
  // HE1.3 #36-#38 / HE1.3.m #38-#39: bar pill, ghost, dashed usual line (1 wide, 3 2.5, #4F8F8A measured).
  const usualDash = { label: "Usual bedtime", swatch: <LegendDash color={mc("sleep", "accent")} strokeWidth={1} dash="3 2.5" /> };
  if (range === "week") {
    legend = floating
      ? [{ label: "Bedtime to wake", swatch: <LegendBedBar /> }, { label: "Nights ahead", swatch: <LegendBedGhost /> }, ...(usualClock ? [usualDash] : [])]
      : [
          { label: "Asleep", swatch: <LegendDot color={mc("sleep", "main")} radius={3} /> },
          { label: "Nights ahead", swatch: <LegendGhost /> },
        ];
    foot = empty ? "No sleep logged this week" : undefined;
    summary = `Sleep ${current ? "this week" : `in ${periodLabel(p)}`}. ${empty ? "Nothing recorded." : rows.map((r) => `${dayLabel(r.date).split(" ")[0]}, ${hm(r.value * 60).replace("h", " hours").replace("m", " minutes")} asleep${timesOf(r.date) ? `, ${timesOf(r.date)?.range}` : ""}`).join(". ") + "."}`;
  } else if (range === "month") {
    const y = Number(p.start.slice(0, 4));
    const m = Number(p.start.slice(5, 7));
    const span = current ? Number(today.slice(8)) : daysInMonth(y, m);
    legend = floating
      ? [{ label: "Bedtime to wake", swatch: <LegendBedBar /> }, ...(usualClock ? [usualDash] : [])]
      : [{ label: "Asleep", swatch: <LegendDot color={mc("sleep", "main", 0.75)} radius={3} /> }];
    foot = empty ? "No sleep logged this month" : `${rows.length} of ${span} nights logged`;
    summary = `Sleep in ${MONTH_LONG[m - 1]}. ${empty ? "Nothing recorded." : `Average ${hm((mean ?? 0) * 60)} asleep.`}`;
  } else if (range === "year") {
    const y = Number(p.start.slice(0, 4));
    const months = [...new Set(rows.map((r) => Number(r.date.slice(5, 7))))].sort((a, b) => a - b);
    const curM = Number(today.slice(5, 7));
    // HE1.3.y #38-#40: the bedtime line is on its own one-hour scale, said in the legend.
    const sc = bedtimeScale(monthBeds);
    legend = [
      { label: "Average asleep", swatch: <LegendDot color={mc("sleep", "main")} radius={3} /> },
      ...(avgBed !== null
        ? [{ label: `Average bedtime (top scale ${hourLabel12(((sc.from + 720) % 1440) / 60)} to ${hourLabel12(((sc.to + 720) % 1440) / 60)})`, swatch: <LegendDash color={mc("sleep", "accent")} strokeWidth={1} dash="3 2.5" /> }]
        : []),
      { label: "Months ahead", swatch: <LegendGhost /> },
    ];
    foot = empty
      ? "No sleep logged this year"
      : `${months.length === 1 ? monthShort(months[0]) : `${monthShort(months[0])} to ${monthShort(months[months.length - 1])}`}${current && months.includes(curM) ? ` · ${MONTH_LONG[curM - 1]} so far` : ""}`;
    summary = `Sleep in ${y}. ${empty ? "Nothing recorded." : `Average ${hm((mean ?? 0) * 60)} a night.${avgBed !== null ? ` Average bedtime ${clockFromNoon(avgBed)}.` : ""}`}`;
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
        bed={lastNight ? timesOf(lastNight)?.bed : avgBed !== null && hero.value ? clockFromNoon(avgBed) : null}
        wake={lastNight ? timesOf(lastNight)?.wake : avgWake !== null && hero.value ? clockFromNoon(avgWake) : null}
        bedLabel={lastNight ? undefined : "Avg bedtime"}
        wakeLabel={lastNight ? undefined : "Avg wake"}
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
            {floating && range !== "year" ? (
              <SleepBedChart
                mode={range}
                nights={buildGoalBars(p, byDay, today).map((b, i): BedNight => {
                  const c = clockOf(b.key);
                  return { key: b.key, label: range === "week" ? WEEK_LETTERS[i] : b.label, bed: c?.bed ?? null, wake: c?.wake ?? null, ghost: b.ghost, current: b.current };
                })}
                usualBed={usualClock?.bed ?? null}
                usualWake={usualClock?.wake ?? null}
                onBarTap={range === "month" ? openDay : undefined}
                barLabel={(n) => `${n.key}, ${timesOf(n.key)?.range ?? ""}`}
              />
            ) : (
              <GoalBarChart
                metric="sleep"
                mode={range}
                bars={buildGoalBars(p, byDay, today)}
                goal={null}
                ghostValue={usual}
                onBarTap={range === "month" ? openDay : undefined}
                barLabel={(b) => (b.value === null ? `${b.key}, nothing recorded` : `${b.key}, ${hm(b.value * 60)} asleep`)}
                plotTop={range === "year" && avgBed !== null ? 42 : undefined}
                overlay={range === "year" && avgBed !== null ? <YearBedtimeLine months={monthBeds} /> : undefined}
              />
            )}
          </ChartCard>
        ))}
      <StatCard metric="sleep" stats={stats} valueSize={17} style={{ marginTop: 10 }} />
      <CapsLabel>History</CapsLabel>
      <HistoryCard metric="sleep" icon={Moon} items={items} loading={loading} empty="No sleep recorded yet" />
      {picker}
    </MetricPage>
  );
}
