import React, { useEffect, useState } from "react";
import { ArrowDown, ChevronDown, ChevronRight, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { fetchOfferPerformance } from "../../services/market/performance";
import { chartData, fmtCount, isEmptySeries, offerRateFraction, OFFER_METRICS, PERF_RANGES, RANGE_UNIT, rateText, ratePct, SEGMENT, type OfferChoice, type OfferMetric, type PerfRange, type PerfSeries } from "../../services/market/performanceModel";
import { funnelLine, num, perfLine, SOURCE_LABEL, SOURCE_ORDER } from "../../services/business-market/listingLogic";
import { useMarket } from "./MarketContext";
import { CapsLabel } from "./listingParts";
import { deltaOf, formatOf, QUESTION, totalOf, useOfferChoices, usePerfParams } from "./offerPerfData";
import { useListingData, type ListingData } from "./useListingData";
import { isRtl, t, tk } from "../../i18n/core";

// Website viewport v1 · WB-MA.4 Performance (WB-MA Marketplace Web v2,
// `isPerfOffers` / `isPerfListing` / `isPerfEmpty` + perfVals()), for a gym
// or classes business inside the web Marketplace. Readers and the words are
// the mobile tab's (OfferPerformance, PerformanceTab's useListingData); the
// mobile tab is unchanged.
// - Offer charts (fills the window under the tabs): the offer selector (40,
//   r12, 15/24 600) beside the range tabs (track #F4F3F9 pad 5 r14 gap 4,
//   tabs 30 r10 15/24, selected #9A8CD6 white 700), then a 2 × 2 grid (gap
//   20) of chart cards (r20, pad 16 20; question 17/24 800 + the 32 expand;
//   total 28/36 800, delta 13/20 700, "vs previous …" 13/20, the legend 12/16;
//   the plot fills the card: y labels 11/16 #A79E93 in a 56 gutter on 5 grid
//   lines (the top one with its unit), the area and line #AEA1DC with 5 px
//   dots, the previous period dashed #6F9993 "5 4", the last point 9 px with
//   its dark label; bars gap 3, r3 3 0 0, the last #7D6BB5; x labels 11/16).
//   The funnel card: Views / Redemptions bars (14, r4) and "Rate over time".
// - Listing (another window's height below; the page scrolls): caps
//   "Listing", a 12-column grid gap 24 — span 5: the funnel card (chips 36,
//   stages 16 tall with the conversion rows 28) over Top / New half cards;
//   span 7: the ledger card, the insight line, the views and bookings per
//   week cards with the promotion starts as dashed markers.
// - Empty (no offer data and no listing data): one window, three columns —
//   Offer performance "No data yet", Listing (ledger, line, funnel), and the
//   chart placeholder card.
// The tab reads the offer series with the previous period (compare) so the
// dashed line and its legend show, as drawn. UNSPECIFIED: the listing week
// charts' legend (the board writes "This month" over 12 weeks) is left out.

const FILL = "max(560px, calc(100dvh - 192px))";
const CARD: React.CSSProperties = { minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", boxSizing: "border-box", borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)", padding: "16px 20px" };
const MUTED = "#71685E";
const AXIS = "#776E64";
const CSS = ".pfw-btn:hover{background:#F5F5F6}.pfw-sel:hover{border-color:#AEA1DC}.pfw-chip:hover{background:#F5F5F6}";

type Load = { state: "loading" } | { state: "error" } | { state: "ok"; series: Record<OfferMetric, PerfSeries | null> };

/** The four offer series with the previous period (offer_performance p_compare = true). */
function useSeriesWithPrevious(businessId: string | null, range: PerfRange, offerId: string | null, enabled: boolean): [Load, () => void] {
  const [tick, setTick] = useState(0);
  const key = `${businessId ?? ""}|${range}|${offerId ?? ""}|${tick}`;
  const [got, setGot] = useState<{ key: string; load: Load } | null>(null);
  useEffect(() => {
    if (!enabled || !businessId) return;
    let alive = true;
    const k = `${businessId}|${range}|${offerId ?? ""}|${tick}`;
    void Promise.all(OFFER_METRICS.map((mt) => fetchOfferPerformance(businessId, range, mt, offerId, true))).then((res) => {
      if (!alive) return;
      if (res.some((r) => !r.ok)) return setGot({ key: k, load: { state: "error" } });
      const series = {} as Record<OfferMetric, PerfSeries | null>;
      OFFER_METRICS.forEach((mt, i) => {
        const r = res[i];
        series[mt] = r.ok ? r.value : null;
      });
      setGot({ key: k, load: { state: "ok", series } });
    });
    return () => {
      alive = false;
    };
  }, [businessId, range, offerId, tick, enabled]);
  return [got?.key === key ? got.load : { state: "loading" }, () => setTick((x) => x + 1)];
}

export function PerformanceTabWeb() {
  const mk = useMarket();
  const navigate = useNavigate();
  const { range, offerId, set, query } = usePerfParams();
  const choices = useOfferChoices(mk.business?.id ?? null);
  const can = mk.can("marketing");
  const [load, retry] = useSeriesWithPrevious(mk.business?.id ?? null, range, offerId, can);
  const L = useListingData();
  const listingReady = !(L.live && !L.data);
  const offersEmpty = !can || (load.state === "ok" && OFFER_METRICS.every((mt) => isEmptySeries(load.series[mt])));
  const header = <HeaderRow choices={choices} offerId={offerId} range={range} onOffer={(id) => set({ offer: id })} onRange={(r) => set({ range: r })} />;
  const expand = (mt: OfferMetric) => () => navigate(`${mk.base}/performance/${SEGMENT[mt]}?${query}`);

  if (offersEmpty && listingReady && L.empty) {
    return (
      <div data-perf="empty" style={{ height: FILL, display: "flex", flexDirection: "column", gap: 24 }}>
        <style>{CSS}</style>
        {header}
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24 }}>
          <div style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <CapsLabel>{t("Offer performance")}</CapsLabel>
            <NoData title={t("No data yet")} body={can ? t("Views, redemptions and points show here once members can see your offers.") : t("Offer performance is for the owner and staff who manage marketing.")} placeholder={t("Charts start with your first offer view")} />
          </div>
          <div style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <CapsLabel>{t("Listing")}</CapsLabel>
            <Ledger L={L} />
            <FunnelCard L={L} />
          </div>
          <div style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <CapsLabel>{"​"}</CapsLabel>
            <NoData title={L.v.chartTitle} body={L.v.chartSub} placeholder={L.v.chartPlaceholder} />
          </div>
        </div>
      </div>
    );
  }

  let offers: React.ReactNode;
  if (load.state === "loading" && can) offers = <MarketSkeleton radius={20} rows={3} height={244} count={2} gap={20} label={t("Loading your offer performance")} />;
  else if (load.state === "error") offers = <MarketError thing={tk("your offer performance")} onRetry={retry} />;
  else if (offersEmpty || load.state !== "ok")
    offers = <NoData title={t("No data yet")} body={can ? t("Views, redemptions and points show here once members can see your offers.") : t("Offer performance is for the owner and staff who manage marketing.")} placeholder={t("Charts start with your first offer view")} />;
  else {
    const s = load.series;
    const unit = RANGE_UNIT[range];
    const views = s.offer_views;
    const red = s.redemptions;
    const rate = s.conversion ? s.conversion.total : ratePct(red?.total ?? 0, views?.total ?? 0);
    const card = (mt: OfferMetric, kind: "line" | "bar" | "funnel", cumulative = false) => {
      const d = chartData(s[mt], { cumulative });
      return (
        <ChartCardWeb
          key={mt}
          kind={kind}
          question={t(QUESTION[mt])}
          total={totalOf(mt, s[mt])}
          delta={deltaOf(mt, s[mt])}
          unit={unit}
          labels={d.labels}
          series={d.values}
          prev={d.prev}
          formatValue={formatOf(mt)}
          onExpand={expand(mt)}
          steps={
            kind === "funnel"
              ? [
                  { label: t("Views"), value: fmtCount(views?.total ?? 0), fraction: 1 },
                  { label: t("Redemptions"), value: `${fmtCount(red?.total ?? 0)} · ${rateText(rate)}`, fraction: offerRateFraction(rate) },
                ]
              : undefined
          }
        />
      );
    };
    offers = (
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridTemplateRows: "repeat(2, minmax(0, 1fr))", gap: 20 }}>
        {card("offer_views", "line")}
        {card("redemptions", "bar")}
        {card("points_redeemed", "line", true)}
        {card("conversion", "funnel")}
      </div>
    );
  }

  return (
    <div data-perf="web" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{CSS}</style>
      <div data-perf-part="offers" style={{ height: FILL, display: "flex", flexDirection: "column", gap: 24 }}>
        {header}
        {offers}
      </div>
      <section data-perf-part="listing" aria-label={t("Listing")} style={{ height: FILL, display: "flex", flexDirection: "column", gap: 24 }}>
        <CapsLabel>{t("Listing")}</CapsLabel>
        {L.live && L.error && !L.data ? (
          <MarketError thing={tk("your listing performance")} onRetry={() => L.setTick((x) => x + 1)} />
        ) : !listingReady ? (
          <MarketSkeleton radius={20} rows={3} count={3} gap={12} height={160} label={t("Loading your listing performance")} />
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 24 }}>
            <div style={{ gridColumn: "span 5", minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <FunnelCard L={L} />
              {!L.empty ? <HalfCards L={L} /> : null}
            </div>
            <div style={{ gridColumn: "span 7", minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <Ledger L={L} />
              {L.empty ? (
                <NoData title={L.v.chartTitle} body={L.v.chartSub} placeholder={L.v.chartPlaceholder} />
              ) : (
                <>
                  <WeekCard question={L.v.perWeek[0]} total={num(L.s.views)} note={L.s.early ? t("The trend starts after 2 weeks on Explore.") : t("last 12 weeks")} kind="line" L={L} series={L.s.viewsPerWeek} format={(x) => t("{n} views", { n: num(Math.round(x)) })} />
                  <WeekCard question={L.v.perWeek[1]} total={num(L.s.done)} note={t("last 12 weeks")} kind="bar" L={L} series={L.s.donePerWeek} format={(x) => L.v.doneCount(Math.round(x))} />
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header row

function HeaderRow({ choices, offerId, range, onOffer, onRange }: { choices: OfferChoice[]; offerId: string | null; range: PerfRange; onOffer: (id: string | null) => void; onRange: (r: PerfRange) => void }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const label = choices.find((o) => o.id === offerId)?.headline ?? t("All offers");
  return (
    <div style={{ flex: "none", display: "flex", gap: 12, alignItems: "center" }}>
      <button
        ref={setAnchor}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("Offer: {name}", { name: label })}
        onClick={() => setOpen(true)}
        className="pfw-sel market-focus"
        style={{ flex: 1, minWidth: 0, height: 40, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(36,31,27,0.11)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, paddingBlock: 0, paddingInline: "14px 12px", fontFamily: "inherit", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B", cursor: "pointer" }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        <ChevronDown size={16} strokeWidth={2.4} color={MUTED} aria-hidden style={{ flex: "none" }} />
      </button>
      <div role="radiogroup" aria-label={t("Range")} style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4, padding: 5, borderRadius: 14, background: "#F4F3F9" }}>
        {PERF_RANGES.map((r) => {
          const on = r === range;
          return (
            <button key={r} type="button" role="radio" aria-checked={on} onClick={() => onRange(r)} className="market-focus" style={{ minWidth: 0, height: 30, borderRadius: 10, border: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", fontSize: 15, lineHeight: "24px", fontWeight: on ? 700 : 600, background: on ? "#9A8CD6" : "transparent", color: on ? "#FFFFFF" : "#5B5349", cursor: "pointer" }}>
              {r}
            </button>
          );
        })}
      </div>
      <PopupMenu
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        matchWidth={anchor}
        variant="field"
        heading={t("Offer")}
        options={[{ value: "", label: t("All offers") }, ...choices.map((o) => ({ value: o.id, label: o.headline }))]}
        selected={offerId ?? ""}
        onSelect={(v) => {
          setOpen(false);
          onOffer(v || null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts

/** A rounded axis top (1, 2, 2.5, 5 × 10^k) at or above the largest value. */
function niceMax(v: number): number {
  if (!(v > 0)) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p;
  return 10 * p;
}

const tick = (v: number) => (Number.isInteger(v) ? fmtCount(v) : String(Math.round(v * 10) / 10));

/** Five x labels (first, quarters, last), each anchored so the ends stay inside. */
function xLabels(labels: readonly string[]) {
  const n = labels.length;
  if (!n) return [];
  const idx = n < 5 ? labels.map((_, i) => i) : [0, Math.round((n - 1) / 4), Math.round((n - 1) / 2), Math.round((3 * (n - 1)) / 4), n - 1];
  return [...new Set(idx)].map((i) => ({ i, pos: n > 1 ? (i / (n - 1)) * 100 : 50, label: labels[i] }));
}

/**
 * The board's plot (`c.geo`): a 56 gutter at the start for the y labels, the
 * grid lines, the line (or bars) drawn in a 0–100 box that stretches to the
 * card, the 5 px dots, the last point's dark label, x labels under it.
 */
function Plot({ kind, series, labels, prev = [], format, markers = [], marginTop = 14 }: { kind: "line" | "bar"; series: readonly number[]; labels: readonly string[]; prev?: readonly number[]; format: (v: number) => string; markers?: readonly { index: number; label: string }[]; marginTop?: number }) {
  const rtl = isRtl();
  const n = series.length;
  const max = niceMax(Math.max(0, ...series, ...prev));
  const x = (i: number) => (kind === "bar" ? ((i + 0.5) / Math.max(1, n)) * 100 : n > 1 ? (i / (n - 1)) * 100 : 50);
  const y = (v: number) => 100 - (Math.max(0, v) / max) * 100;
  const path = (vals: readonly number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const grid = [0, 1, 2, 3, 4].map((k) => ({ top: `${(k / 4) * 100}%`, label: k === 0 ? format(max) : tick((max * (4 - k)) / 4) }));
  const last = n - 1;
  const lastText = n ? format(series[last]).replace(/[^\d.,%−-].*$/, "") || format(series[last]) : "";
  const pill: React.CSSProperties = { position: "absolute", background: "#241F1B", color: "#FFFFFF", fontSize: 11, lineHeight: "16px", fontWeight: 700, borderRadius: 8, padding: "2px 8px", whiteSpace: "nowrap", pointerEvents: "none" };
  const summary = n ? `${labels[0] ?? ""} – ${labels[last] ?? ""}: ${format(series[last])}` : "";
  return (
    <div style={{ flex: 1, minHeight: 72, display: "flex", flexDirection: "column", marginTop }}>
      <div role="img" aria-label={summary} style={{ position: "relative", flex: 1, minHeight: 0, marginInlineStart: 56 }}>
        {grid.map((g) => (
          <React.Fragment key={g.top}>
            <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: g.top, height: 1, background: "rgba(36,31,27,0.06)" }} />
            <span aria-hidden style={{ position: "absolute", insetInlineStart: -56, width: 48, top: g.top, transform: "translateY(-50%)", textAlign: "end", fontSize: 11, lineHeight: "16px", color: AXIS, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{g.label}</span>
          </React.Fragment>
        ))}
        {kind === "line" ? (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", transform: rtl ? "scaleX(-1)" : undefined }}>
              {n > 0 ? <path d={`${path(series)} L${x(last).toFixed(2)} 100 L${x(0).toFixed(2)} 100 Z`} fill="rgba(174,161,220,0.22)" /> : null}
              {prev.length > 0 ? <path d={path(prev)} fill="none" stroke="#6F9993" strokeWidth={2} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" /> : null}
              {n > 0 ? <path d={path(series)} fill="none" stroke="#AEA1DC" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null}
            </svg>
            {series.map((v, i) =>
              i === last ? null : <span key={i} title={`${labels[i] ?? ""} · ${format(v)}`} style={{ position: "absolute", insetInlineStart: `${x(i)}%`, top: `${y(v)}%`, width: 5, height: 5, marginTop: -2.5, marginInlineStart: -2.5, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 0 0 1.5px #AEA1DC" }} />
            )}
            {n > 0 ? (
              <>
                <span title={`${labels[last] ?? ""} · ${format(series[last])}`} style={{ position: "absolute", insetInlineStart: `${x(last)}%`, top: `${y(series[last])}%`, width: 9, height: 9, marginTop: -4.5, marginInlineStart: -4.5, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 0 0 2px #7D6BB5" }} />
                <span aria-hidden style={{ ...pill, insetInlineStart: `${x(last)}%`, top: `${y(series[last])}%`, transform: `translate(${rtl ? "100%" : "-100%"}, -150%)`, marginInlineStart: -6 }}>{lastText}</span>
              </>
            ) : null}
          </>
        ) : (
          <>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 3 }}>
              {series.map((v, i) => (
                <span key={i} title={`${labels[i] ?? ""} · ${format(v)}`} style={{ flex: 1, minWidth: 0, height: `${(Math.max(0, v) / max) * 100}%`, background: i === last ? "#7D6BB5" : "#AEA1DC", borderRadius: "3px 3px 0 0" }} />
              ))}
            </div>
            {n > 0 ? <span aria-hidden style={{ ...pill, insetInlineEnd: 0, top: -2, transform: "translateY(-100%)" }}>{lastText}</span> : null}
          </>
        )}
        {markers
          .filter((k) => k.index >= 0 && k.index < n)
          .map((k) => (
            <React.Fragment key={k.index}>
              <span aria-hidden style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: `${x(k.index)}%`, borderInlineStart: "1.5px dashed #A79AD5" }} />
              <span aria-hidden style={{ position: "absolute", top: 0, insetInlineStart: `${x(k.index)}%`, transform: `translate(${rtl ? "50%" : "-50%"}, -100%)`, fontSize: 11, lineHeight: "16px", fontWeight: 700, color: "#7D6BB5", whiteSpace: "nowrap" }}>{k.label}</span>
            </React.Fragment>
          ))}
      </div>
      <div aria-hidden style={{ position: "relative", height: 16, marginTop: 6, marginInlineStart: 56 }}>
        {xLabels(labels).map((l) => (
          <span key={l.i} style={{ position: "absolute", insetInlineStart: `${kind === "bar" ? x(l.i) : l.pos}%`, transform: `translateX(${(rtl ? -1 : 1) * (l.pos === 0 ? 0 : l.pos === 100 ? -100 : -50)}%)`, fontSize: 11, lineHeight: "16px", color: AXIS, whiteSpace: "nowrap" }}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function deltaInk(d: string | null | undefined): string {
  return d && (d.startsWith("−") || d.startsWith("-")) ? "#C0392B" : "#1D744A";
}

function Legend({ unit, prev }: { unit: string; prev: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, lineHeight: "16px", color: "#5B5349", whiteSpace: "nowrap" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden style={{ width: 16, height: 3, borderRadius: 2, background: "#AEA1DC" }} />
        {t("This {unit}", { unit: t(unit) })}
      </span>
      {prev ? (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 16, borderTop: "2px dashed #6F9993" }} />
          {t("Previous {unit}", { unit: t(unit) })}
        </span>
      ) : null}
    </span>
  );
}

function ChartCardWeb({ kind, question, total, delta, unit, labels, series, prev, formatValue, onExpand, steps }: { kind: "line" | "bar" | "funnel"; question: string; total: string; delta: string | null; unit: string; labels: readonly string[]; series: readonly number[]; prev: readonly number[]; formatValue: (v: number) => string; onExpand: () => void; steps?: { label: string; value: string; fraction: number }[] }) {
  return (
    <div data-chart-card={kind} style={CARD}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{question}</h3>
        <button type="button" onClick={onExpand} aria-label={t("Expand {section}", { section: question })} title={t("Expand {section}", { section: question })} className="pfw-btn market-focus" style={{ width: 32, height: 32, margin: "-6px", marginInlineStart: 0, borderRadius: 8, border: 0, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
          <Maximize2 size={16} strokeWidth={2} color={MUTED} aria-hidden />
        </button>
      </div>
      <div style={{ flex: "none", display: "flex", alignItems: "baseline", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 28, lineHeight: "36px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{total}</span>
        {delta ? <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: deltaInk(delta) }}>{delta}</span> : null}
        {delta ? <span style={{ fontSize: 13, lineHeight: "20px", color: MUTED, whiteSpace: "nowrap" }}>{t("vs previous {unit}", { unit: t(unit) })}</span> : null}
        <span style={{ flex: 1 }} />
        {kind === "line" ? <Legend unit={unit} prev={prev.length > 0} /> : null}
      </div>
      {kind === "funnel" ? (
        <>
          <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {(steps ?? []).map((s, k) => (
              <div key={s.label}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, lineHeight: "20px" }}>
                  <span style={{ fontWeight: 600, color: "#5B5349" }}>{s.label}</span>
                  <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
                </span>
                <span style={{ display: "block", marginTop: 4, height: 14, borderRadius: 4, background: "#F5F5F6", overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${Math.max(0, Math.min(1, k === 0 ? 1 : s.fraction)) * 100}%`, height: "100%", borderRadius: 4, background: "#AEA1DC" }} />
                </span>
              </div>
            ))}
          </div>
          <p style={{ margin: "14px 0 0", flex: "none", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>{t("Rate over time")}</p>
          <Plot kind="line" series={series} labels={labels} format={formatValue} marginTop={8} />
        </>
      ) : (
        <Plot kind={kind} series={series} labels={labels} prev={prev} format={formatValue} />
      )}
    </div>
  );
}

function WeekCard({ question, total, note, kind, L, series, format }: { question: string; total: string; note: string; kind: "line" | "bar"; L: ListingData; series: readonly number[]; format: (v: number) => string }) {
  return (
    <div style={{ ...CARD, flex: "1 1 0" }}>
      <h3 style={{ margin: 0, flex: "none", fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{question}</h3>
      <div style={{ flex: "none", display: "flex", alignItems: "baseline", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 28, lineHeight: "36px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{total}</span>
        <span style={{ fontSize: 13, lineHeight: "20px", color: MUTED }}>{note}</span>
      </div>
      <Plot kind={kind} series={series} labels={L.labels} format={format} markers={L.markers} marginTop={22} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listing blocks

function Ledger({ L }: { L: ListingData }) {
  return (
    <>
      <div style={{ flex: "none", borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)", padding: "0 16px" }}>
        {L.ledger.map((r, i) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i ? "1.5px dashed rgba(36,31,27,0.11)" : 0 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5B5349" }}>{r.label}</span>
            <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
            <span style={{ minWidth: 48, textAlign: "end", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: MUTED }}>{r.delta}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: "-4px 2px 0", flex: "none", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{perfLine(L.s, L.top, L.mkind, L.v.people)}</p>
    </>
  );
}

function FunnelCard({ L }: { L: ListingData }) {
  const { src, setSrc, stage, setStage, stages, chips, colOf, funnel, empty, detail, v } = L;
  return (
    <div style={{ ...CARD, flex: 1 }}>
      <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{v.funnelTitle}</p>
      <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", color: MUTED }}>{v.funnelSub}</p>
      <div role="group" aria-label={t("Show one source")} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {chips.map((k) => {
          const on = src === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => setSrc(on ? null : k)}
              className="pfw-chip market-focus"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, boxSizing: "border-box", padding: "0 12px", borderRadius: 999, border: `1px solid ${on ? colOf(k) : "rgba(36,31,27,0.11)"}`, background: on ? "#F5F5F6" : "transparent", fontFamily: "inherit", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5B5349", whiteSpace: "nowrap", opacity: src === null || on ? 1 : 0.5, cursor: "pointer" }}
            >
              <span aria-hidden style={{ width: 9, height: 9, borderRadius: 3, background: colOf(k) }} />
              {t(SOURCE_LABEL[k])}
            </button>
          );
        })}
      </div>
      {stages.length > 0 ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "space-around", marginTop: 12 }}>
          {stages.map((st, i) => {
            const bar = (
              <>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, lineHeight: "20px" }}>
                  <span style={{ fontWeight: 600, color: "#5B5349" }}>{st.t}</span>
                  <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{num(st.v)}</span>
                </span>
                <span style={{ display: "block", marginTop: 4, height: 16, borderRadius: 4, background: "#F5F5F6", overflow: "hidden" }}>
                  <span style={{ display: "flex", gap: 2, width: `${st.w}%`, height: "100%", borderRadius: 4, overflow: "hidden" }}>
                    {st.segs && st.segs.length > 0 ? (
                      st.segs.map((sg) => <span key={sg.source} style={{ flex: `${sg.v} 1 0`, minWidth: 0, background: colOf(sg.source), opacity: src === null || src === sg.source ? 1 : 0.18 }} />)
                    ) : (
                      <span style={{ flex: "1 1 0", minWidth: 0, background: i === 1 ? "#7D6BB5" : "#4F8F8A" }} />
                    )}
                  </span>
                </span>
              </>
            );
            return (
              <div key={st.t}>
                {i > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, height: 28, paddingInlineStart: 2, fontSize: 13, fontWeight: 700, color: "#2F5F58", whiteSpace: "nowrap" }}>
                    <ArrowDown size={14} strokeWidth={2.6} aria-hidden />
                    {st.conv}
                  </div>
                ) : null}
                {i === 0 && st.segs && st.segs.length > 0 ? (
                  <button type="button" aria-label={`${st.t}, ${st.v}`} aria-expanded={stage === 0} onClick={() => setStage(stage === 0 ? null : 0)} className="market-focus" style={{ display: "block", width: "100%", textAlign: "start", border: 0, borderRadius: 8, padding: 0, background: stage === 0 ? "#F5F5F6" : "transparent", boxShadow: stage === 0 ? "0 0 0 6px #F5F5F6" : "none", fontFamily: "inherit", color: "inherit", cursor: "pointer" }}>
                    {bar}
                  </button>
                ) : (
                  <div aria-label={`${st.t}, ${st.v}`}>{bar}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
      {detail ? (
        <div style={{ marginTop: 12, borderRadius: 12, background: "#F5F5F6", padding: "10px 12px" }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 800 }}>{v.bySource}</p>
          {SOURCE_ORDER.filter((k) => (detail.bySource[k] ?? 0) > 0).map((k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 28, fontSize: 13, lineHeight: "20px" }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: colOf(k) }} />
              <span style={{ flex: 1 }}>{t(SOURCE_LABEL[k])}</span>
              <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{num(detail.bySource[k] ?? 0)}</span>
              <span style={{ width: 44, textAlign: "end", color: MUTED }}>{`${Math.round(((detail.bySource[k] ?? 0) / Math.max(1, detail.seen)) * 100)}%`}</span>
            </div>
          ))}
        </div>
      ) : null}
      <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>{empty ? v.emptyFunnel : funnelLine(funnel, src, v.emptyFunnel, v.doneWord)}</p>
    </div>
  );
}

function HalfCards({ L }: { L: ListingData }) {
  const items = [{ title: L.v.topTitle, value: L.top ? num(L.top.bookings) : "0", sub: L.topSub, to: "top" }];
  if (L.mkind !== "store" && !L.s.early) items.push({ title: L.v.newTitle, value: num(L.nc), sub: t("first booking came through Centium"), to: "new" });
  return (
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
      {items.map((h) => (
        <div key={h.to} style={{ borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)", padding: "16px 16px 4px", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 800 }}>{h.title}</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, lineHeight: "36px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{h.value}</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: MUTED, minHeight: 40 }}>{h.sub}</p>
          <button
            type="button"
            onClick={() => L.navigate(`${L.mk.base}/performance/${h.to}`)}
            className="market-focus"
            style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 44, border: 0, borderTop: "1px solid rgba(36,31,27,0.06)", background: "transparent", fontFamily: "inherit", fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5", cursor: "pointer" }}
          >
            {t("See all")}
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

/** "No data yet" (the board's empty cards): 17/24 800, the line 15/24 #5B5349, a dashed placeholder (min 96, r14, 13/20) filling the card. */
function NoData({ title, body, placeholder }: { title: string; body: string; placeholder: string }) {
  return (
    <div style={{ ...CARD, flex: 1 }}>
      <div style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 15, lineHeight: "24px", color: "#5B5349", marginTop: 4, textWrap: "pretty" } as React.CSSProperties}>{body}</div>
      <div style={{ flex: 1, minHeight: 96, marginTop: 12, border: "1.5px dashed rgba(36,31,27,0.11)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 16px", fontSize: 13, lineHeight: "20px", color: MUTED }}>{placeholder}</div>
    </div>
  );
}
