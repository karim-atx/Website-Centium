import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { ChartCard, ChartRangeControl, ExpandedChart } from "../../components/market/ChartCard";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS } from "../../components/market/usePress";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { fetchOfferChoices, fetchOfferPerformance } from "../../services/market/performance";
import {
  chartData,
  countOf,
  DEFAULT_RANGE,
  deltaPt,
  deltaText,
  fmtCount,
  isEmptySeries,
  isPerfRange,
  longDate,
  chartDate,
  offerRateFraction,
  OFFER_METRICS,
  PERF_RANGES,
  RANGE_UNIT,
  ratePct,
  ratePtChange,
  rateText,
  startsLater,
  EXPANDED,
  SEGMENT,
  type OfferChoice,
  type OfferMetric,
  type PerfRange,
  type PerfSeries,
} from "../../services/market/performanceModel";
import { useMarket } from "./MarketContext";
import { BackHeader, px, useMarketColors } from "./listingParts";
import { isoOf } from "./model";

// Market + Share 3.0 · W3 · B-MA.7 Offer Performance (HANDOVER §4 "B-MA.7
// Offer Performance"; Business Marketplace Screens lines 467–577, the script's
// RANGES / lineCardData / red / rate / EX / pf). Frames `performance`,
// `performanceExpanded`, `performanceEmpty`.
//
// - Header row (gap 8, centred): the offer selector (flex 1, 40 tall + its 1px
//   border = 42 as rendered, radius 12, padding 0 10 0 12, 12.5 / 700, the
//   14 chevron --faint 2.4) listing "All offers" and the owner's offers
//   (the owner's offers table read, DB2), then the range control (W1 ChartRangeControl).
// - Four ChartCards: views (area line), redemptions (bars, per day for 7D /
//   30D, per week for 90D / 12M; the tapped bar #7D6BB5), points (cumulative
//   line; no leaf, as the business markup draws it), "How many viewers
//   redeemed?" (two-step funnel + "Rate over time"). Scrub, tap and keyboard
//   are ChartCard's. A range change resets the scrub / tap (`ranges[].tap`).
// - Tapping a card title expands it (`expandTo`): the full-screen page
//   (performance/{views|redemptions|points|rate}, SeeAllPage) with the back
//   header "Offer performance" / {title}, the same selector and range, the
//   240-tall chart and the compare switch (`toggleCompare`, starting off as
//   the script's `cmp` does outside the preset frame).
// - Data: DB5 offer_performance(p_range, p_metric, p_offer_id, p_compare,
//   p_business_id) (Database PR #39), one call per metric. Every series zero
//   = the board's "No data yet" card; a scheduled offer reads "This offer
//   starts on {date}" (performanceEmpty). The rate card's change is in
//   points ("+0.1 pt"), derived from the server's relative delta_pct
//   (ratePtChange); nothing when the previous window was empty.

const QUESTION: Record<OfferMetric, string> = {
  offer_views: "How many members saw your offers?",
  redemptions: "How many vouchers were redeemed?",
  points_redeemed: "How many points did members spend with you?",
  conversion: "How many viewers redeemed?",
};



const formatOf = (metric: OfferMetric) => (v: number): string =>
  metric === "offer_views" ? countOf(v, "view", "views") : metric === "redemptions" ? countOf(v, "voucher", "vouchers") : metric === "points_redeemed" ? `${fmtCount(v)} pts` : rateText(v);

const totalOf = (metric: OfferMetric, s: PerfSeries | null): string => (metric === "conversion" ? rateText(s?.total ?? 0) : fmtCount(s?.total ?? 0));
const deltaOf = (metric: OfferMetric, s: PerfSeries | null): string | null => (metric === "conversion" ? deltaPt(s ? ratePtChange(s.total, s.deltaPct) : null) : deltaText(s?.deltaPct));

/** The range and offer, kept in the page's query so the expanded page and back keep them. */
function usePerfParams(): { range: PerfRange; offerId: string | null; set: (patch: { range?: PerfRange; offer?: string | null }) => void; query: string } {
  const [params, setParams] = useSearchParams();
  const raw = params.get("range");
  const range: PerfRange = isPerfRange(raw) ? raw : DEFAULT_RANGE;
  const offerId = params.get("offer") || null;
  const set = (patch: { range?: PerfRange; offer?: string | null }) => {
    const next = new URLSearchParams(params);
    if (patch.range) next.set("range", patch.range);
    if (patch.offer !== undefined) {
      if (patch.offer) next.set("offer", patch.offer);
      else next.delete("offer");
    }
    setParams(next, { replace: true });
  };
  const q = new URLSearchParams();
  q.set("range", range);
  if (offerId) q.set("offer", offerId);
  return { range, offerId, set, query: q.toString() };
}

/** The business's offers for the selector (DB2 `offers`); [] while loading or when the read fails (the selector keeps "All offers"). */
function useOfferChoices(businessId: string | null): OfferChoice[] {
  const [list, setList] = useState<OfferChoice[]>([]);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchOfferChoices(businessId).then((r) => {
      if (alive && r.ok) setList(r.value);
    });
    return () => {
      alive = false;
    };
  }, [businessId]);
  return list;
}

type Load = { state: "loading" } | { state: "error" } | { state: "ok"; series: Record<OfferMetric, PerfSeries | null> };

function useOfferSeries(businessId: string | null, range: PerfRange, offerId: string | null, enabled: boolean): [Load, () => void] {
  const [tick, setTick] = useState(0);
  const key = `${businessId ?? ""}|${range}|${offerId ?? ""}|${tick}`;
  const [got, setGot] = useState<{ key: string; load: Load } | null>(null);
  useEffect(() => {
    if (!enabled || !businessId) return;
    let alive = true;
    void Promise.all(OFFER_METRICS.map((mt) => fetchOfferPerformance(businessId, range, mt, offerId, false))).then((res) => {
      if (!alive) return;
      let load: Load;
      if (res.some((r) => !r.ok)) load = { state: "error" };
      else {
        const series = {} as Record<OfferMetric, PerfSeries | null>;
        OFFER_METRICS.forEach((mt, k) => {
          const r = res[k];
          series[mt] = r.ok ? r.value : null;
        });
        load = { state: "ok", series };
      }
      setGot({ key: `${businessId}|${range}|${offerId ?? ""}|${tick}`, load });
    });
    return () => {
      alive = false;
    };
  }, [businessId, range, offerId, tick, enabled]);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  return [got?.key === key ? got.load : { state: "loading" }, retry];
}

/** The header row: the offer selector and the range control (lines 469–474). */
function HeaderRow({ choices, offerId, range, onOffer, onRange }: { choices: OfferChoice[]; offerId: string | null; range: PerfRange; onOffer: (id: string | null) => void; onRange: (r: PerfRange) => void }) {
  const m = useMarketColors();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const current = choices.find((o) => o.id === offerId);
  const label = current?.headline ?? "All offers";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <style>{FOCUS_CSS}</style>
      <button
        ref={setAnchor}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Offer: ${label}`}
        onClick={() => setOpen(true)}
        className="market-focus hit"
        style={{ flex: 1, minWidth: 0, height: 42, boxSizing: "border-box", borderRadius: 12, border: `1px solid ${m.border}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "0 10px 0 12px", fontFamily: "inherit", fontSize: px(12.5), fontWeight: 700, color: m.ink, cursor: "pointer", lineHeight: "normal" }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", ...NO_ICON_SCALE }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ChartRangeControl ranges={PERF_RANGES} value={range} onChange={onRange} />
      <PopupMenu
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        matchWidth={anchor}
        variant="field"
        heading="Offer"
        options={[{ value: "", label: "All offers" }, ...choices.map((o) => ({ value: o.id, label: o.headline }))]}
        selected={offerId ?? ""}
        onSelect={(v) => {
          setOpen(false);
          onOffer(v || null);
        }}
      />
    </div>
  );
}

/** The B-MA.7 offer charts (the Performance tab's first block). */
export function OfferPerformance() {
  const mk = useMarket();
  const navigate = useNavigate();
  const { range, offerId, set, query } = usePerfParams();
  const choices = useOfferChoices(mk.business?.id ?? null);
  const can = mk.can("marketing");
  const [load, retry] = useOfferSeries(mk.business?.id ?? null, range, offerId, can);
  const offer = choices.find((o) => o.id === offerId) ?? null;
  const unit = RANGE_UNIT[range];
  const today = isoOf(new Date());

  const expand = (mt: OfferMetric) => () => navigate(`${mk.base}/performance/${SEGMENT[mt]}?${query}`);

  let body: React.ReactNode;
  if (!can) body = <MarketEmptyCard title="No data yet" body="Offer performance is for the owner and staff who manage marketing." />;
  else if (load.state === "loading") body = <MarketSkeleton radius={20} rows={3} height={244} count={4} gap={12} label="Loading your offer performance" />;
  else if (load.state === "error") body = <MarketError thing="your offer performance" onRetry={retry} />;
  else if (OFFER_METRICS.every((mt) => isEmptySeries(load.series[mt]))) body = <EmptyCard offer={offer} today={today} />;
  else {
    const s = load.series;
    const views = s.offer_views;
    const red = s.redemptions;
    const pts = s.points_redeemed;
    const conv = s.conversion;
    const vD = chartData(views);
    const rD = chartData(red);
    const pD = chartData(pts, { cumulative: true });
    const cD = chartData(conv);
    const rate = conv ? conv.total : ratePct(red?.total ?? 0, views?.total ?? 0);
    const card = (mt: OfferMetric) => {
      const d = deltaOf(mt, s[mt]);
      return { question: QUESTION[mt], total: totalOf(mt, s[mt]), delta: d, note: d ? undefined : null, unit, range, onExpand: expand(mt), formatValue: formatOf(mt) };
    };
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ChartCard kind="line" {...card("offer_views")} labels={vD.labels} series={vD.values} />
        <ChartCard kind="bar" {...card("redemptions")} labels={rD.labels} series={rD.values} />
        <ChartCard kind="line" {...card("points_redeemed")} labels={pD.labels} series={pD.values} />
        <ChartCard
          kind="funnel"
          {...card("conversion")}
          labels={cD.labels}
          series={cD.values}
          steps={[
            { label: "Views", value: fmtCount(views?.total ?? 0), fraction: 1 },
            { label: "Redemptions", value: `${fmtCount(red?.total ?? 0)} · ${rateText(rate)}`, fraction: offerRateFraction(rate) },
          ]}
          rateSeries={cD.values}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <HeaderRow choices={choices} offerId={offerId} range={range} onOffer={(id) => set({ offer: id })} onRange={(r) => set({ range: r })} />
      {body}
    </div>
  );
}

/** performanceEmpty (lines 475–480): "No data yet", the line and the dashed "Charts start on {date}". */
function EmptyCard({ offer, today }: { offer: OfferChoice | null; today: string }) {
  if (offer && startsLater(offer.startsOn, today))
    return (
      <MarketEmptyCard
        title="No data yet"
        body={`This offer starts on ${longDate(offer.startsOn!)}. Views, redemptions and points show here once members can see it.`}
        placeholder={`Charts start on ${chartDate(offer.startsOn!)}`}
      />
    );
  return <MarketEmptyCard title="No data yet" body="Views, redemptions and points show here once members can see your offers." placeholder="Charts start with your first offer view" placeholderContentBox />;
}

/**
 * performanceExpanded (lines 539–575): the back header "Offer performance" /
 * {title}, the selector and range row, then ExpandedChart (question 15 / 800,
 * figure 34 / 40, the compare switch, the legend, the 240-tall plot, the
 * dashed #6F9993 previous period "5 4", tooltip "… · before …").
 */
export function OfferPerformanceExpanded({ segment }: { segment: string }) {
  const mk = useMarket();
  const navigate = useNavigate();
  const { range, offerId, set, query } = usePerfParams();
  const choices = useOfferChoices(mk.business?.id ?? null);
  const can = mk.can("marketing");
  const businessId = mk.business?.id ?? null;
  const ex = EXPANDED[segment] ?? EXPANDED.views;
  const mt = ex.metric;
  const [compare, setCompare] = useState(false);
  const [tick, setTick] = useState(0);
  const key = `${range}|${offerId ?? ""}|${compare}|${mt}|${tick}`;
  const [got, setGot] = useState<{ key: string; load: Load | { state: "one"; s: PerfSeries | null } } | null>(null);
  useEffect(() => {
    if (!can || !businessId) return;
    let alive = true;
    void fetchOfferPerformance(businessId, range, mt, offerId, compare).then((r) => {
      if (!alive) return;
      setGot({ key: `${range}|${offerId ?? ""}|${compare}|${mt}|${tick}`, load: r.ok ? { state: "one", s: r.value } : { state: "error" } });
    });
    return () => {
      alive = false;
    };
  }, [businessId, range, offerId, compare, mt, tick, can]);
  const load = got?.key === key ? got.load : { state: "loading" as const };
  // While the compare series loads, the last answer for this range and offer stays on screen (the switch doesn't blank the chart).
  const prevLoad = got?.load;
  const shown = load.state === "one" ? load.s : load.state === "loading" && prevLoad?.state === "one" && got?.key.startsWith(`${range}|${offerId ?? ""}|`) ? prevLoad.s : null;
  const unit = RANGE_UNIT[range];
  const offer = choices.find((o) => o.id === offerId) ?? null;
  const today = isoOf(new Date());
  const back = () => navigate(`${mk.tabHref("perf")}&${query}`);

  let body: React.ReactNode;
  if (!can) body = <MarketEmptyCard title="No data yet" body="Offer performance is for the owner and staff who manage marketing." />;
  else if (shown && !isEmptySeries(shown)) {
    const d = chartData(shown, { cumulative: mt === "points_redeemed" });
    const delta = deltaOf(mt, shown);
    body = (
      <div style={{ marginTop: 18 }}>
        <ExpandedChart
          question={QUESTION[mt]}
          total={totalOf(mt, shown)}
          delta={delta}
          note={delta ? undefined : null}
          unit={unit}
          range={range}
          labels={d.labels}
          series={d.values}
          prev={compare ? d.prev : []}
          bars={mt === "redemptions"}
          formatValue={formatOf(mt)}
          compare={compare}
          onCompareChange={setCompare}
        />
      </div>
    );
  } else if (load.state === "loading") body = <MarketSkeleton radius={20} rows={3} height={360} label="Loading your offer performance" style={{ marginTop: 18 }} />;
  else if (load.state === "error") body = <MarketError thing="your offer performance" onRetry={() => setTick((t) => t + 1)} style={{ marginTop: 18 }} />;
  else body = <div style={{ marginTop: 12 }}><EmptyCard offer={offer} today={today} /></div>;

  return (
    <div>
      <BackHeader eyebrow="Offer performance" title={ex.title} onBack={back} backLabel="Back to Performance" />
      <HeaderRow choices={choices} offerId={offerId} range={range} onOffer={(id) => set({ offer: id })} onRange={(r) => set({ range: r })} />
      {body}
    </div>
  );
}
