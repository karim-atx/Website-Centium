import { useCallback, useEffect, useState } from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { ChartCard, ChartRangeControl, type FunnelStep } from "../../../components/market/ChartCard";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { fetchProfessionalPerformance } from "../../../services/market/performance";
import {
  chartData,
  countOf,
  DEFAULT_RANGE,
  deltaPt,
  deltaText,
  fmtCount,
  isEmptySeries,
  PERF_RANGES,
  PRO_METRICS,
  proStepFraction,
  RANGE_UNIT,
  ratePct,
  rateText,
  type PerfRange,
  type PerfSeries,
  type ProMetric,
} from "../../../services/market/performanceModel";

// Market + Share 3.0 · W3 · P-MA.6 Performance (HANDOVER §4 "P-MA.6
// Performance"; Professional Marketplace Screens lines 482–533 and the
// script's RANGES / lineCard / barCard / pf). Frames `pfMain`, `pfEmpty`.
//
// - The row (gap 8, centred): "Tap or drag a chart" 12 --faint (flex 1; empty
//   in the no-data state, as `pf.note`), then the range control.
// - Five ChartCards (no expand on P-MA.6): profile views (line), hire
//   requests (bars), vouchers redeemed (bars), points spent (cumulative line +
//   the leaf), "How many viewers asked to hire you?" (the funnel Profile
//   views → Hire requests → Hired, each step × 8 of the views, at least 1%,
//   then "Rate over time"; the axis shows under it too). A range change resets
//   the scrub / tap (`ranges[].tap`).
// - Data: DB5 professional_performance (awaiting DB stage DB5). Pending, or
//   every series zero = pfEmpty "No data yet".

const QUESTION: Record<ProMetric, string> = {
  profile_views: "How many people viewed your profile?",
  hire_requests: "How many clients asked to hire you?",
  vouchers_redeemed: "How many vouchers were redeemed?",
  points_spent: "How many points did clients spend with you?",
  conversion: "How many viewers asked to hire you?",
};

type Load = { state: "loading" } | { state: "pending" } | { state: "error" } | { state: "ok"; series: Record<ProMetric, PerfSeries | null> };

function useProSeries(range: PerfRange): [Load, () => void] {
  const [tick, setTick] = useState(0);
  const key = `${range}|${tick}`;
  const [got, setGot] = useState<{ key: string; load: Load } | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all(PRO_METRICS.map((mt) => fetchProfessionalPerformance(range, mt))).then((res) => {
      if (!alive) return;
      let load: Load;
      if (res.some((r) => !r.ok && r.pending)) load = { state: "pending" };
      else if (res.some((r) => !r.ok)) load = { state: "error" };
      else {
        const series = {} as Record<ProMetric, PerfSeries | null>;
        PRO_METRICS.forEach((mt, k) => {
          const r = res[k];
          series[mt] = r.ok ? r.value : null;
        });
        load = { state: "ok", series };
      }
      setGot({ key: `${range}|${tick}`, load });
    });
    return () => {
      alive = false;
    };
  }, [range, tick]);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  return [got?.key === key ? got.load : { state: "loading" }, retry];
}

export function PerformanceTab() {
  const m = marketPalette(useIsDark());
  const [range, setRange] = useState<PerfRange>(DEFAULT_RANGE);
  const [load, retry] = useProSeries(range);
  const unit = RANGE_UNIT[range];
  const empty = load.state === "pending" || (load.state === "ok" && PRO_METRICS.every((mt) => isEmptySeries(load.series[mt])));

  let body: React.ReactNode;
  if (load.state === "loading") body = <MarketSkeleton radius={20} rows={3} height={244} count={5} gap={12} label="Loading your performance" />;
  else if (load.state === "error") body = <MarketError thing="your performance" onRetry={retry} />;
  else if (empty || load.state !== "ok") body = <MarketEmptyCard title="No data yet" body="Profile views, hire requests and redemptions show here once your listing is visible." placeholder="Charts start with your first profile view" placeholderContentBox />;
  else {
    const s = load.series;
    const views = s.profile_views;
    const hires = s.hire_requests;
    const conv = s.conversion;
    const card = (mt: ProMetric) => {
      const d = mt === "conversion" ? deltaPt(s[mt]?.deltaPct) : deltaText(s[mt]?.deltaPct);
      return { question: QUESTION[mt], total: mt === "conversion" ? rateText(s[mt]?.total ?? 0) : fmtCount(s[mt]?.total ?? 0), delta: d, note: d ? undefined : null, unit, range };
    };
    const vD = chartData(views);
    const hD = chartData(hires);
    const rD = chartData(s.vouchers_redeemed);
    const pD = chartData(s.points_spent, { cumulative: true });
    const cD = chartData(conv);
    const viewsN = views?.total ?? 0;
    const hiresN = hires?.total ?? 0;
    // "Hired" comes only from the conversion row (DB5 documents no hired count yet): without it the step is left out, never guessed.
    const hired = conv?.counts.hired;
    const steps: FunnelStep[] = [
      { label: "Profile views", value: fmtCount(viewsN), fraction: 1 },
      { label: "Hire requests", value: fmtCount(hiresN), fraction: proStepFraction(hiresN, viewsN) },
      ...(hired !== undefined ? [{ label: "Hired", value: fmtCount(hired), fraction: proStepFraction(hired, viewsN) }] : []),
    ];
    const rate = conv ? conv.total : ratePct(hiresN, viewsN);
    body = (
      <>
        <ChartCard kind="line" {...card("profile_views")} labels={vD.labels} series={vD.values} formatValue={(v) => countOf(v, "view", "views")} />
        <ChartCard kind="bar" {...card("hire_requests")} labels={hD.labels} series={hD.values} formatValue={(v) => countOf(v, "request", "requests")} />
        <ChartCard kind="bar" {...card("vouchers_redeemed")} labels={rD.labels} series={rD.values} formatValue={(v) => countOf(v, "voucher", "vouchers")} />
        <ChartCard kind="line" {...card("points_spent")} leaf labels={pD.labels} series={pD.values} formatValue={(v) => `${fmtCount(v)} pts`} />
        <ChartCard kind="funnel" {...card("conversion")} total={rateText(rate)} labels={cD.labels} series={cD.values} steps={steps} rateSeries={cD.values} showAxis />
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, color: m.ink, lineHeight: "normal" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: textPx(12), color: m.faint }}>{load.state === "ok" && !empty ? "Tap or drag a chart" : ""}</span>
        <ChartRangeControl ranges={PERF_RANGES} value={range} onChange={setRange} />
      </div>
      {body}
    </div>
  );
}
