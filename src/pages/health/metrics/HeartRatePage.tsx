import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarDays, HeartPulse, Link2, RefreshCw } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { textPx, linePx } from "../../../theme/textSize";
import {
  CapsLabel,
  ChartCard,
  ErrorCard,
  FreshnessLine,
  HistoryCard,
  MetricPage,
  NoDeviceCard,
  OFFLINE_CACHED,
  StatCard,
  metricTextInk,
  useHealthMode,
  useMetricRangeState,
  type HistoryItem,
  type MetricMenuItem,
  useMetricsLoad,
  useMetricSource,
} from "../../../components/health/metric/MetricKit";
import {
  avg,
  dayLabel,
  daysOf,
  isCurrentPeriod,
  monthLong,
  monthShort,
  periodLabel,
  periodOf,
  periodTitle,
  previousPeriod,
  relativeDayTitle,
  stepAnchor,
  valuesIn,
  type Period,
} from "../../../components/health/metric/periods";
import { shiftDate } from "../../../utils/date";
import { HeartRateChart, HeartRateHero, hrLegend, hrStats, hrUnits, type HrHeroData } from "../../../components/health/metric/HeartRateParts";
import { MeasuredOnPopup } from "../../../components/health/log/LogSheetParts";
import { REVIEWED } from "../../../services/health-metrics/clinicalCopy";
import { activityByDay, useActivityDaily, useMetricRows } from "../../../services/health-metrics/b1";
import { useSyncedRemove } from "../../../components/health/metric/SyncedRemove";
import { Toast } from "../../../components/ui/Toast";
import { t, tk, tn } from "../../../i18n/core";

// HE1.5 Heart rate (opens on Week) with HE1.5.d / .m / .y in place.
//
// WEB TODAY: heart rate only arrives from a phone source, which the web has
// none of (OURS-health-no-device-web), so an account with no rows sees the
// HE1.2.e layout with web copy. With rows (one value a day, latest wins:
// services/health-metrics getHealthMetrics) the page draws them honestly:
// - Resting (HA-08, Database B1): activity_daily.resting_bpm, else a sample
//   marked context = rest. The period's average resting drives "Avg resting"
//   (tile, dashed line, month / year hero, legend "Resting" dots); without
//   any the hero says "latest" (V6-21) and the averages say "average";
//   V6-07: no rhythm words.
// - The day's samples (health_metrics keeps every sample) give the day's
//   range and the strip's low / high.
// - HE1.5.a (alert card) and Alert settings are V6-03 clinical copy: hidden
//   while clinicalCopy.REVIEWED is false; alert events also need B1, so the
//   card has nothing to show on the web either way.
// - Source tag, freshness line, pull to sync and synced-row Delete are native
//   (B1 sources / hidden_synced_readings); none render on the web.

const NO_DEVICE_BODY = tk(
  "Heart rate readings come from Apple Health or Health Connect on your phone. Syncing from the Centium phone app is coming. Centium only reads the data types you allow.",
);

const round = (v: number) => Math.round(v);
const arrow = (d: number) => (d > 0 ? "↑" : "↓");

export default function HeartRatePage() {
  const navigate = useNavigate();
  const { healthSeries, metricsError } = useApp();
  const { dark } = useHealthMode();
  const { range, setRange, anchor, setAnchor, openDay, today } = useMetricRangeState("week");
  const [goToOpen, setGoToOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Database B1: every sample of the period (health_metrics keeps them; the
  // context column marks rest), and activity_daily.resting_bpm (HA-08).
  // From the previous period (and at least two weeks back) so the change line
  // compares with last week's / last period's average resting (health-backend.md:155).
  const p0 = periodOf(range, anchor);
  const prev0 = previousPeriod(p0);
  const from0 = prev0.start < shiftDate(p0.start, -14) ? prev0.start : shiftDate(p0.start, -14);
  const samples = useMetricRows("heart_rate", from0, p0.end).data;
  const restingByDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const x of samples) if (x.context === "rest") out[x.day] = x.value;
    return out;
  }, [samples]);
  const samplesByDay = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const x of samples) (out[x.day] ??= []).push(x.value);
    return out;
  }, [samples]);
  const activity = activityByDay(useActivityDaily(from0, p0.end).data);
  const restingOn = (d: string): number | null => activity[d]?.restingBpm ?? restingByDay[d] ?? null;
  const samplesOn = (d: string) => samplesByDay[d] ?? [];
  /** Resting values of a period's days (B1 HA-08), keyed by day. */
  const restingIn = (per: Period) => {
    const out: Record<string, number> = {};
    for (const d of daysOf(per)) {
      const r = restingOn(d);
      if (r !== null) out[d] = r;
    }
    return out;
  };

  const byDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of healthSeries.heartRate.history) out[p.date] = p.value;
    return out;
  }, [healthSeries.heartRate.history]);
  const allDays = Object.keys(byDay).sort();
  const hasAny = allDays.length > 0;
  const { loading, retry: retryMetrics } = useMetricsLoad();
  // HA-01 (B1): the connected source as the header tag and its freshness line; none on the web.
  const metricSource = useMetricSource();
  // HA-12 (B1 hidden_synced_readings): Delete on a synced day ("Remove from Centium?").
  const syncedRemove = useSyncedRemove("heart_rate", stepAnchor("month", today, -1), today, setToast);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const period = periodOf(range, anchor);
  const rows = valuesIn(byDay, period);
  const vals = rows.map((r) => r.value);
  const pAvg = avg(vals);
  // Low / high over every sample of the period (B1 keeps them), else the daily values.
  const lows = rows.map((r) => (samplesOn(r.date).length ? Math.min(...samplesOn(r.date)) : r.value));
  const highs = rows.map((r) => (samplesOn(r.date).length ? Math.max(...samplesOn(r.date)) : r.value));
  const pLow = lows.length ? Math.min(...lows) : null;
  const pHigh = highs.length ? Math.max(...highs) : null;
  const prevVals = valuesIn(byDay, previousPeriod(period)).map((r) => r.value);
  const prevAvg = avg(prevVals);
  // B1 resting (HA-08): the period's average resting drives "Avg resting"
  // (tile, line, month / year hero); without any resting value the labels stay
  // "Average" (V6-21).
  const restMap = restingIn(period);
  const restAvg = avg(Object.values(restMap));
  const prevRestAvg = avg(Object.values(restingIn(previousPeriod(period))));
  const resting = restAvg !== null;
  const lineAvg = resting ? restAvg : pAvg;
  const current = isCurrentPeriod(period, today);
  const pTitle = periodTitle(period, today);
  const pLabel = periodLabel(period);

  // --- hero -----------------------------------------------------------------
  const hero: HrHeroData | null = (() => {
    if (range === "day" || range === "week") {
      // The day shown: the Day anchor, or the newest logged day of the week.
      const day = range === "day" ? anchor : [...rows].reverse()[0]?.date;
      if (!day || byDay[day] === undefined) return null;
      const resting = restingOn(day);
      const v = resting ?? byDay[day];
      const word = resting !== null ? "resting" : "latest";
      const isYesterday = day === shiftDate(today, -1);
      const sv = samplesOn(day);
      const lo = sv.length ? Math.min(...sv) : v;
      const hi = sv.length ? Math.max(...sv) : v;
      const earlier = allDays.filter((d) => d < day);
      const prev = earlier.length ? byDay[earlier[earlier.length - 1]] : null;
      const lohi = { lo: round(lo), hi: round(hi) };
      return {
        value: round(v),
        unit: word === "resting" ? t("bpm resting") : t("bpm latest"),
        // Every sample of the day (health_metrics); low to high when more than one.
        rangeText:
          sv.length > 1
            ? day === today
              ? t("Today {lo} to {hi} bpm", lohi)
              : isYesterday
                ? t("Yesterday {lo} to {hi} bpm", lohi)
                : t("{day} {lo} to {hi} bpm", { ...lohi, day: dayLabel(day) })
            : day === today
              ? t("1 reading today")
              : isYesterday
                ? t("1 reading · yesterday")
                : t("1 reading · {day}", { day: dayLabel(day) }),
        // Resting: against last week's average resting (health-backend.md:155); otherwise the previous reading.
        change: (() => {
          const ref = resting !== null ? avg(Object.values(restingIn(previousPeriod(periodOf("week", day))))) : prev;
          return ref === null || round(v) === round(ref) ? null : t("{arrow} {n} bpm", { arrow: arrow(v - ref), n: Math.abs(round(v - ref)) });
        })(),
        low: round(lo),
        high: round(hi),
        marker: round(v),
        markerLabel: word === "resting" ? t("Resting {n}", { n: round(v) }) : t("Latest {n}", { n: round(v) }),
      };
    }
    if (pAvg === null || pLow === null || pHigh === null) return null;
    const name = range === "month" ? monthLong(Number(period.start.slice(5, 7))) : period.start.slice(0, 4);
    const prevName = range === "month" ? monthShort(Number(previousPeriod(period).start.slice(5, 7))) : String(Number(period.start.slice(0, 4)) - 1);
    // HE1.5.m / .y #13, #20: "bpm avg resting", "Avg resting 61" with B1 resting values.
    const v = resting ? (restAvg as number) : pAvg;
    const ref = resting ? prevRestAvg : prevAvg;
    return {
      value: round(v),
      unit: resting ? t("bpm avg resting") : t("bpm average"),
      rangeText: t("{name} range {lo} to {hi} bpm", { name, lo: round(pLow), hi: round(pHigh) }),
      change: ref === null || round(v) === round(ref) ? null : t("{arrow} {n} bpm vs {prev}", { arrow: arrow(v - ref), n: Math.abs(round(v - ref)), prev: prevName }),
      low: round(pLow),
      high: round(pHigh),
      marker: round(v),
      markerLabel: resting ? t("Avg resting {n}", { n: round(v) }) : t("Average {n}", { n: round(v) }),
    };
  })();

  // --- chart ----------------------------------------------------------------
  const units = hrUnits(range, period, byDay, today, samplesByDay, restMap);
  const logged = rows.length;
  const nDays = daysOf(period).length;
  const avgLabel =
    lineAvg === null
      ? ""
      : resting
        ? range === "week"
          ? t("Week avg resting {n}", { n: round(lineAvg) })
          : t("Avg resting {n}", { n: round(lineAvg) })
        : range === "week"
          ? t("Week average {n}", { n: round(lineAvg) })
          : range === "month"
            ? t("Average {n}", { n: round(lineAvg) })
            : t("Year average {n}", { n: round(lineAvg) });
  const elapsed = (() => {
    if (anchor !== today) return 1;
    const n = new Date();
    return (n.getHours() * 60 + n.getMinutes()) / 1440;
  })();

  const chartFoot = (() => {
    if (range === "day")
      return byDay[anchor] !== undefined
        ? anchor === today
          ? t("{n} bpm so far", { n: round(byDay[anchor]) })
          : t("{n} bpm", { n: round(byDay[anchor]) })
        : t("No heart rate data this day");
    if (logged === 0) return range === "week" ? t("No heart rate data this week") : range === "month" ? t("No heart rate data this month") : t("No heart rate data this year");
    // HE1.5 (Week) has no foot inside the chart card; the count is the line under the stats (#44).
    if (range === "week") return null;
    if (range === "month") return t("{n} of {span} days logged", { n: logged, span: current ? Number(today.slice(8, 10)) : nDays });
    const months = units.filter((u) => u.low !== null);
    const first = months[0];
    const last = months[months.length - 1];
    const span = first === last ? monthShort(Number(first.key.slice(5, 7))) : t("{start} to {end}", { start: monthShort(Number(first.key.slice(5, 7))), end: monthShort(Number(last.key.slice(5, 7))) });
    return current ? `${span} · ${t("{month} so far", { month: monthLong(Number(today.slice(5, 7))) })}` : span;
  })();

  const statFoot = (() => {
    if (logged === 0) return null;
    const days = tn(logged, "{n} day logged", "{n} days logged");
    if (range === "day") return relativeDayTitle(anchor, today);
    if (range === "week") return current ? t("This week so far · {days}", { days }) : `${pLabel} · ${days}`;
    if (range === "month") return `${monthLong(Number(period.start.slice(5, 7)))} · ${t("{n} of {span} days logged", { n: logged, span: current ? Number(today.slice(8, 10)) : nDays })}`;
    return `${period.start.slice(0, 4)} · ${days}`;
  })();

  const summary = (() => {
    // Whole sentences, joined by a space.
    if (range === "day")
      return (
        byDay[anchor] !== undefined
          ? [anchor === today ? t("Heart rate today.") : t("Heart rate {day}.", { day: dayLabel(anchor) }), t("Latest {n} bpm.", { n: round(byDay[anchor]) })]
          : [t("Heart rate {day}.", { day: dayLabel(anchor) }), t("No readings.")]
      ).join(" ");
    if (logged === 0) return [t("Heart rate {period}.", { period: pTitle.toLowerCase() }), t("No readings.")].join(" ");
    const lo = round(pLow as number);
    const hi = round(pHigh as number);
    const a = round(lineAvg as number);
    if (range === "week")
      return [
        current ? t("Heart rate this week.") : t("Heart rate {period}.", { period: pLabel }),
        resting
          ? tn(logged, "{n} day, {lo} to {hi} bpm, average resting {avg}.", "{n} days, {lo} to {hi} bpm, average resting {avg}.", { lo, hi, avg: a })
          : tn(logged, "{n} day, {lo} to {hi} bpm, average {avg}.", "{n} days, {lo} to {hi} bpm, average {avg}.", { lo, hi, avg: a }),
      ].join(" ");
    // HE1.5.m / .y screen reader: "Heart rate in September. Average resting 61 bpm. Range 50 to 168 bpm."
    return [
      t("Heart rate in {period}.", { period: range === "month" ? monthLong(Number(period.start.slice(5, 7))) : pLabel }),
      resting ? t("Average resting {n} bpm.", { n: a }) : t("Average {n} bpm.", { n: a }),
      t("Range {lo} to {hi} bpm.", { lo, hi }),
    ].join(" ");
  })();

  // --- history: one row per logged day, newest first (synced rows; Delete is
  // native only, V6-169, so no swipe on the web) ------------------------------
  const history: HistoryItem[] = [...allDays]
    .reverse()
    .slice(0, 30)
    .map((d) => ({
      key: d,
      title: relativeDayTitle(d, today),
      // HE1.5 #54: the date (the source name is native); not repeated when the title is already the date.
      meta: [relativeDayTitle(d, today) === dayLabel(d) ? null : dayLabel(d), syncedRemove.sourceOf(d) === t("Logged by you") ? null : syncedRemove.sourceOf(d)].filter(Boolean).join(" · "),
      value: t("{n} bpm", { n: round(byDay[d]) }),
      // The day's low to high from its samples (B1: every sample is kept; the range shown).
      sub: (() => {
        const sv = samplesOn(d);
        return sv.length > 1 ? t("{low} to {high}", { low: round(Math.min(...sv)), high: round(Math.max(...sv)) }) : undefined;
      })(),
      onClick: () => openDay(d),
      onDelete: syncedRemove.onDelete(d),
    }));

  const menu: MetricMenuItem[] = [
    ...(REVIEWED ? [{ value: "alerts", label: t("Alert settings"), icon: <Bell size={17} />, onSelect: () => navigate("/app/health/heart-rate/alerts") }] : []),
    { value: "sources", label: t("Sources"), icon: <RefreshCw size={17} />, onSelect: () => navigate("/app/settings/devices") },
    { value: "date", label: t("Go to date"), icon: <CalendarDays size={17} />, onSelect: () => setGoToOpen(true) },
  ];

  const goTo = (
    <MeasuredOnPopup
      open={goToOpen}
      onClose={() => setGoToOpen(false)}
      value={new Date(`${anchor}T12:00:00`)}
      today={today}
      dateOnly
      title={t("Go to date")}
      onDone={(d) => {
        setGoToOpen(false);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        openDay(iso);
      }}
    />
  );

  const ink = metricTextInk("heart-rate", dark);

  // --- web: no device connected (OURS-health-no-device-web, HE1.2.e) ---------
  if (!loading && !hasAny && !metricsError) {
    const p = periodOf("week", today);
    return (
      <MetricPage
        metric="heart-rate"
        title={t("Heart rate")}
        range={range}
        onRangeChange={setRange}
        menu={menu}
        cta={{ label: t("Connect a source"), icon: <Link2 size={16} />, onClick: () => navigate("/app/settings/devices") }}
      >
        <NoDeviceCard metric="heart-rate" icon={HeartPulse} body={t(NO_DEVICE_BODY)} literal />
        <ChartCard
          metric="heart-rate"
          title={t("This week")}
          periodLabel={periodLabel(p)}
          onPrev={() => undefined}
          onNext={() => undefined}
          nextDisabled
          hideNav
          summary={t("Heart rate this week. No readings yet.")}
          foot={<span style={{ color: "rgb(var(--c-charcoal-soft))" }}>{t("Your week fills in once heart rate syncs.")}</span>}
        >
          <HeartRateChart range="week" units={hrUnits("week", p, {}, "0000-00-00")} average={null} averageLabel="" />
        </ChartCard>
        {goTo}
      </MetricPage>
    );
  }

  return (
    <MetricPage sourceTag={metricSource.tag} onSourceTag={() => navigate("/app/settings/devices")} metric="heart-rate" title={t("Heart rate")} range={range} onRangeChange={setRange} menu={menu}>
      <HeartRateHero
        data={hero}
        loading={loading}
        ariaLabel={hero ? `${t("Heart rate {n} {unit}.", { n: hero.value, unit: hero.unit })} ${hero.rangeText}.` : t("Heart rate, no reading")}
        empty={
          <div className="text-center" style={{ padding: "40px 0" }}>
            <p style={{ fontSize: textPx(17), lineHeight: linePx(25.5), fontWeight: 800, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>{t("No heart rate data yet")}</p>
            <p style={{ marginTop: 4, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: ink }}>
              {range === "day"
                ? t("Nothing synced this day")
                : range === "week"
                  ? t("No heart rate data this week")
                  : range === "month"
                    ? t("No heart rate data this month")
                    : t("No heart rate data this year")}
            </p>
          </div>
        }
      />
      {offline && hasAny && <FreshnessLine offline>{t(OFFLINE_CACHED)}</FreshnessLine>}
      {metricSource.freshness}
      {metricsError && !hasAny ? (
        <ErrorCard onRetry={retryMetrics} />
      ) : (
        <ChartCard
          metric="heart-rate"
          title={range === "month" && !current ? monthLong(Number(period.start.slice(5, 7))) : pTitle}
          periodLabel={pLabel}
          onPrev={() => setAnchor(stepAnchor(range, anchor, -1))}
          onNext={() => setAnchor(stepAnchor(range, anchor, 1))}
          nextDisabled={current}
          legend={hrLegend(range, dark, range === "day" ? restingOn(anchor) !== null : resting)}
          foot={chartFoot}
          loading={loading}
          summary={summary}
        >
          <HeartRateChart range={range} units={units} average={range === "day" ? null : lineAvg} averageLabel={avgLabel} day={range === "day" ? { value: restingOn(anchor) ?? byDay[anchor] ?? null, elapsed } : undefined} />
        </ChartCard>
      )}
      {logged > 0 && (
        <>
          <StatCard metric="heart-rate" stats={hrStats(lineAvg, pLow, pHigh, resting)} style={{ marginTop: 10, minHeight: 56 }} />
          {statFoot && <p style={{ marginTop: 6, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: ink }}>{statFoot}</p>}
        </>
      )}
      <CapsLabel>{t("History")}</CapsLabel>
      <HistoryCard metric="heart-rate" icon={HeartPulse} items={history} loading={loading} empty={t("No heart rate data yet")} />
      {goTo}
      {syncedRemove.popup}
      <Toast open={!!toast} message={toast ? t(toast) : ""} onExpire={() => setToast(null)} />
    </MetricPage>
  );
}
