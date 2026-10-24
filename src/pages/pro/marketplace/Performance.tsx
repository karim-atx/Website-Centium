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
  PRO_FETCHED,
  proRatePt,
  proStepFraction,
  RANGE_UNIT,
  rateOverTime,
  ratePct,
  rateText,
  type PerfRange,
  type PerfSeries,
  type ProFetched,
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
// - Data: professional_performance(p_range, p_metric) (Database PR #39, #40)
//   for the five counted metrics (PRO_FETCHED), each bucket the
//   professional's own local day. Every series zero = pfEmpty "No data yet".
//   The funnel's third step "Hired" is the server's `hired` total
//   (business_hires by hired_at), its bar × 8 of the views like the board's.
//   The funnel's rate is the hire rate the board draws (hire requests /
//   profile views, per bucket for "Rate over time", its change in points
//   from both series' delta_pct): the server's own `conversion` is vouchers
//   over views, a different question, so it isn't asked for.

const QUESTION: Record<Exclude<ProMetric, "hired">, string> = {
  profile_views: "How many people viewed your profile?",
  hire_requests: "How many clients asked to hire you?",
  vouchers_redeemed: "How many vouchers were redeemed?",
  points_spent: "How many points did clients spend with you?",
  conversion: "How many viewers asked to hire you?",
};

type Load = { state: "loading" } | { state: "error" } | { state: "ok"; series: Record<ProFetched, PerfSeries | null> };

function useProSeries(range: PerfRange): [Load, () => void] {
  const [tick, setTick] = useState(0);
  const key = `${range}|${tick}`;
  const [got, setGot] = useState<{ key: string; load: Load } | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all(PRO_FETCHED.map((mt) => fetchProfessionalPerformance(range, mt))).then((res) => {
      if (!alive) return;
      let load: Load;
      if (res.some((r) => !r.ok)) load = { state: "error" };
      else {
        const series = {} as Record<ProFetched, PerfSeries | null>;
        PRO_FETCHED.forEach((mt, k) => {
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
  const empty = load.state === "ok" && PRO_FETCHED.every((mt) => isEmptySeries(load.series[mt]));

  let body: React.ReactNode;
  if (load.state === "loading") body = <MarketSkeleton radius={20} rows={3} height={244} count={5} gap={12} label="Loading your performance" />;
  else if (load.state === "error") body = <MarketError thing="your performance" onRetry={retry} />;
  else if (empty || load.state !== "ok") body = <MarketEmptyCard title="No data yet" body="Profile views, hire requests and redemptions show here once your listing is visible." placeholder="Charts start with your first profile view" placeholderContentBox />;
  else {
    const s = load.series;
    const views = s.profile_views;
    const hires = s.hire_requests;
    // The hire rate per bucket (the board's rateLine: hires / views).
    const conv = rateOverTime(hires, views);
    const card = (mt: Exclude<ProMetric, "hired">) => {
      const d = mt === "conversion" ? deltaPt(proRatePt(views, hires)) : deltaText(s[mt]?.deltaPct);
      return { question: QUESTION[mt], total: mt === "conversion" ? rateText(conv?.total ?? 0) : fmtCount(s[mt]?.total ?? 0), delta: d, note: d ? undefined : null, unit, range };
    };
    const vD = chartData(views);
    const hD = chartData(hires);
    const rD = chartData(s.vouchers_redeemed);
    const pD = chartData(s.points_spent, { cumulative: true });
    const cD = chartData(conv);
    const viewsN = views?.total ?? 0;
    const hiresN = hires?.total ?? 0;
    const hiredN = s.hired?.total ?? 0;
    const steps: FunnelStep[] = [
      { label: "Profile views", value: fmtCount(viewsN), fraction: 1 },
      { label: "Hire requests", value: fmtCount(hiresN), fraction: proStepFraction(hiresN, viewsN) },
      { label: "Hired", value: fmtCount(hiredN), fraction: proStepFraction(hiredN, viewsN) },
    ];
    const rate = ratePct(hiresN, viewsN);
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
