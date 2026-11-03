import { ArrowDown, ChevronRight } from "lucide-react";
import { ChartCard } from "../../components/market/ChartCard";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { StatLedger } from "../../components/market/StatLedger";
import { FOCUS_CSS } from "../../components/market/usePress";
import { funnelLine, num, perfLine, SOURCE_LABEL, SOURCE_ORDER } from "../../services/business-market/listingLogic";
import type { MarketPalette } from "../../theme/marketTokens";
import { Card, CapsLabel, lh, px } from "./listingParts";
import { OfferPerformance } from "./OfferPerformance";
import { useListingData } from "./useListingData";
import { t, tk, tn } from "../../i18n/core";

// Market + Share 3.0 · W3 · B-MA.7 Performance tab: the drawn offer charts
// (OfferPerformance), then the KEPT live listing performance (PLAN §3.4,
// D-14) as handover cards under a caps "Listing" group, replacing the old
// ScrubChart on this screen:
// - Listing views / Profile taps / Bookings (passes, orders): a StatLedger
//   with the insight line;
// - the funnel "From seen to booked" with the source chips (a source narrows
//   the first stage; tapping the first stage lists views by source);
// - the 12-week charts as ChartCards: views per week (line) and bookings per
//   week (bars), each with the promotion starts marked ("Offer on");
// - Top classes / New clients with their See all pages.
// Readers: listing_performance, listing_funnel, listing_top_items,
// listing_new_clients (B13 MK-07, always the last 12 weeks, so no previous
// period: no deltas). While the readers are absent (probe "pending") or there
// is no event yet, the drawn no-data state stands.

export function PerformanceTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8 }}>
      <OfferPerformance />
      <ListingGroup />
    </div>
  );
}

function ListingGroup() {
  const { mk, v, m, navigate, src, setSrc, stage, setStage, data, error, setTick, live, mkind, s, top, empty, funnel, stages, chips, colOf, doneWord, labels, markers, nc, topSub, detail, ledger } = useListingData();
  const head = <CapsLabel style={{ margin: "12px 0 0" }}>{t("Listing")}</CapsLabel>;
  if (live && error && !data)
    return (
      <>
        {head}
        <MarketError thing={tk("your listing performance")} onRetry={() => setTick((t) => t + 1)} />
      </>
    );
  if (live && !data)
    return (
      <>
        {head}
        <MarketSkeleton radius={20} rows={3} count={3} gap={12} height={160} label={t("Loading your listing performance")} />
      </>
    );

  return (
    <>
      <style>{FOCUS_CSS}</style>
      {head}
      <div>
        <StatLedger rows={ledger} />
        <p style={{ fontSize: px(12), lineHeight: lh(17), color: m.ink2, margin: "8px 2px 0" }}>{perfLine(s, top, mkind, v.people)}</p>
      </div>

      <Card r={20} style={{ padding: 16, color: m.ink, lineHeight: "normal" }}>
        <p style={{ fontSize: px(13.5), lineHeight: lh(19), fontWeight: 800 }}>{v.funnelTitle}</p>
        <p style={{ fontSize: px(12), lineHeight: lh(17), color: m.faint, marginTop: 2 }}>{v.funnelSub}</p>
        <div role="group" aria-label={t("Show one source")} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {chips.map((k) => {
            const on = src === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setSrc(on ? null : k)}
                className="tap market-focus"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 999, border: `1px solid ${on ? colOf(k) : m.border}`, background: on ? m.soft : "transparent", fontFamily: "inherit", fontSize: px(11.5), fontWeight: 700, color: m.ink2, opacity: src === null || on ? 1 : 0.5, cursor: "pointer" }}
              >
                <span aria-hidden style={{ width: 9, height: 9, borderRadius: 3, background: colOf(k) }} />
                {t(SOURCE_LABEL[k])}
              </button>
            );
          })}
        </div>
        {stages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
            {stages.map((st, i) => {
              const sel = stage === i;
              const body = (
                <>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: px(11.5) }}>
                    <span style={{ fontWeight: 600, color: m.ink2 }}>{st.t}</span>
                    <span style={{ fontWeight: 800, color: m.ink, fontVariantNumeric: "tabular-nums" }}>{num(st.v)}</span>
                  </span>
                  <span style={{ display: "block", marginTop: 4, height: 14, borderRadius: 4, background: m.soft, overflow: "hidden" }}>
                    <span style={{ display: "flex", gap: 2, width: `${st.w}%`, height: "100%", borderRadius: 4, overflow: "hidden" }}>
                      {st.segs && st.segs.length > 0 ? (
                        st.segs.map((sg) => <span key={sg.source} style={{ flex: `${sg.v} 1 0`, minWidth: 0, background: colOf(sg.source), opacity: src === null || src === sg.source ? 1 : 0.18 }} />)
                      ) : (
                        <span style={{ flex: "1 1 0", minWidth: 0, background: i === 1 ? m.pdark : "#4F8F8A" }} />
                      )}
                    </span>
                  </span>
                </>
              );
              return (
                <div key={st.t}>
                  {i > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, height: 26, paddingInlineStart: 2, fontSize: px(11), fontWeight: 700, color: m.tealink }}>
                      <ArrowDown size={12} strokeWidth={2.6} aria-hidden />
                      {st.conv}
                    </div>
                  )}
                  {i === 0 && st.segs && st.segs.length > 0 ? (
                    <button
                      type="button"
                      aria-label={`${st.t}, ${st.v}`}
                      aria-expanded={sel}
                      onClick={() => setStage(sel ? null : 0)}
                      className="market-focus"
                      style={{ display: "block", width: "100%", textAlign: "start", border: 0, borderRadius: 8, padding: 0, background: sel ? m.soft : "transparent", boxShadow: sel ? `0 0 0 6px ${m.soft}` : "none", fontFamily: "inherit", color: "inherit", cursor: "pointer" }}
                    >
                      {body}
                    </button>
                  ) : (
                    <div aria-label={`${st.t}, ${st.v}`}>{body}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {detail && (
          <div style={{ marginTop: 12, borderRadius: 12, background: m.soft, padding: "10px 12px" }}>
            <p style={{ fontSize: px(12), fontWeight: 800, color: m.ink }}>{v.bySource}</p>
            {SOURCE_ORDER.filter((k) => (detail.bySource[k] ?? 0) > 0).map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 28, fontSize: px(12), color: m.ink }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: colOf(k) }} />
                <span style={{ flex: 1 }}>{t(SOURCE_LABEL[k])}</span>
                <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{num(detail.bySource[k] ?? 0)}</span>
                <span style={{ width: 44, textAlign: "end", color: m.faint }}>{`${Math.round(((detail.bySource[k] ?? 0) / Math.max(1, detail.seen)) * 100)}%`}</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: px(11.5), lineHeight: lh(16), color: m.ink2, marginTop: 12, textWrap: "pretty" } as React.CSSProperties}>
          {empty ? v.emptyFunnel : funnelLine(funnel, src, v.emptyFunnel, doneWord)}
        </p>
      </Card>

      {empty ? (
        <MarketEmptyCard title={v.chartTitle} body={v.chartSub} placeholder={v.chartPlaceholder} placeholderContentBox />
      ) : (
        <>
          <ChartCard
            kind="line"
            question={v.perWeek[0]}
            total={num(s.views)}
            note={s.early ? t("The trend starts after 2 weeks on Explore.") : t("last 12 weeks")}
            unit=""
            range="12W"
            labels={labels}
            series={s.viewsPerWeek}
            markers={markers}
            formatValue={(x) => tn(Math.round(x), "{n} view", "{n} views", { n: num(Math.round(x)) })}
          />
          <ChartCard
            kind="bar"
            question={v.perWeek[1]}
            total={num(s.done)}
            note={t("last 12 weeks")}
            unit=""
            range="12W"
            labels={labels}
            series={s.donePerWeek}
            markers={markers}
            formatValue={(x) => v.doneCount(Math.round(x))}
          />
          <div style={{ display: "grid", gridTemplateColumns: mkind === "store" || s.early ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
            <HalfCard m={m} title={v.topTitle} value={top ? num(top.bookings) : "0"} sub={topSub} onAll={() => navigate(`${mk.base}/performance/top`)} />
            {mkind !== "store" && !s.early && <HalfCard m={m} title={v.newTitle} value={num(nc)} sub={t("first booking came through Centium")} onAll={() => navigate(`${mk.base}/performance/new`)} />}
          </div>
        </>
      )}
    </>
  );
}

function HalfCard({ m, title, value, sub, onAll }: { m: MarketPalette; title: string; value: string; sub: string; onAll: () => void }) {
  return (
    <div style={{ borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: "16px 14px 4px", display: "flex", flexDirection: "column", minWidth: 0, color: m.ink, lineHeight: "normal" }}>
      <p style={{ fontSize: px(12.5), fontWeight: 800, lineHeight: lh(17) }}>{title}</p>
      <p style={{ fontSize: px(26), fontWeight: 800, lineHeight: lh(32), marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      <p style={{ fontSize: px(11), lineHeight: lh(15), color: m.faint, minHeight: lh(30) }}>{sub}</p>
      <button
        type="button"
        onClick={onAll}
        className="market-focus"
        style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 44, borderTop: `1px solid ${m.div}`, borderInlineStart: 0, borderInlineEnd: 0, borderBottom: 0, background: "transparent", fontFamily: "inherit", fontSize: px(12), fontWeight: 800, color: m.pdark, cursor: "pointer" }}
      >
        {t("See all")}
        <ChevronRight size={14} aria-hidden className="rtl:-scale-x-100" />
      </button>
    </div>
  );
}
