import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ChevronRight } from "lucide-react";
import { useMarket } from "./MarketContext";
import { ScrubChart, type ScrubChartConfig } from "../../components/charts/ScrubChart";
import { fetchListingPerformance, type ListingPerformance } from "../../services/business-market/listing";
import { fetchPromotions, promoStartMarkers, type Promotion } from "../../services/business-market/promotions";
import {
  funnelLine,
  funnelStages,
  newClientsTotal,
  num,
  perfLine,
  SOURCE_LABEL,
  SOURCE_ORDER,
  summarize,
  topBooked,
  type ListingSource,
  type MarketKind,
} from "../../services/business-market/listingLogic";
import { lh, MBlock, MCard, MError, px } from "./kit";
import { addDays, dayMonth, isoOf, mondayOf } from "./model";
import type { MarketPalette } from "./palette";

// MA1-005 / 054-057 / 060 / 065 / 096 / 098, MA1-071 (Store) and
// OURS-MA1-gym-performance. ONLY REAL LISTING EVENTS (V6-105, decision of
// 7 Oct: the invented "Views (30d)" stays gone). B13 MK-07 readers, always
// the last 12 weeks: listing_performance (weekly), listing_funnel (seen,
// opened, booked, impressions by source), listing_top_items and
// listing_new_clients. No event at all = the drawn no-data state (MA1-065);
// data only this week and last = the early state (MA1-060). The readers
// cover 12 weeks only, so there is no previous period: no deltas and no
// dashed "12 weeks before" line. by_source splits impressions only, so the
// source chips narrow the first stage. While the readers are absent (probe
// "pending") the no-data state stands. Promotion starts (promotions.starts_on,
// B13) mark the chart: tag "Offer on" with the discount kind (V6-104).

export function PerformanceTab() {
  const m = useMarket();
  const { c, v, kind, business } = m;
  const navigate = useNavigate();
  const [src, setSrc] = useState<ListingSource | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [data, setData] = useState<ListingPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const live = m.backend.events === "live";
  const businessId = business?.id ?? null;
  const [promos, setPromos] = useState<Promotion[] | null>(null);
  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchPromotions(businessId).then((r) => {
      if (alive && r.ok) setPromos(r.value);
    });
    return () => {
      alive = false;
    };
  }, [businessId]);

  useEffect(() => {
    if (!live || !businessId) return;
    let alive = true;
    void fetchListingPerformance(businessId).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setData(r.value);
        setError(null);
      } else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [live, businessId, tick]);

  if (live && error && !data) return <MError c={c} title="Couldn't load your performance" onRetry={() => setTick((t) => t + 1)} />;
  if (live && !data)
    return (
      <div aria-busy="true" aria-label="Loading your performance">
        <MBlock c={c} h={141.5} r={22} />
        <MBlock c={c} h={300} style={{ marginTop: 12 }} />
      </div>
    );

  const mk: MarketKind = kind === "store" ? "store" : kind === "gym" ? "gym" : "classes";
  const weeks = data?.weeks.length ? data.weeks.map((w) => w.weekStart) : lastTwelveMondays();
  const s = summarize(data?.weeks ?? [], mk);
  const top = topBooked(data?.top ?? []);
  const empty = s.empty;
  const dash = "–";
  const boxes = empty
    ? v.perfLabels.map((l, i) => ({ l, v: dash, d: i === 0 ? "No data yet" : "" }))
    : v.perfLabels.map((l, i) => ({ l, v: num([s.views, s.taps, s.done][i]), d: i === 0 && s.early ? "First 2 weeks" : "" }));
  const funnel = data?.funnel ?? { seen: 0, opened: 0, tappedBook: 0, booked: 0, bySource: {} };
  const stages = empty ? [] : funnelStages(funnel, v.stages, src);
  const chips = SOURCE_ORDER.filter((x) => x !== "featured" || (funnel.bySource.featured ?? 0) > 0);
  const colOf = (x: ListingSource) => srcColour(c, x);
  const doneWord = v.chartModes[1].toLowerCase();
  const cfg: ScrubChartConfig = {
    vh: 120,
    labels: weeks.map((w) => `Week of ${dayMonth(w)}`),
    xl: [dayMonth(weeks[0]), dayMonth(weeks[5]), dayMonth(weeks[11])],
    aria: `Listing ${v.chartModes[0].toLowerCase()} and ${doneWord} per week`,
    caption: "Drag across to read a week, tap to pin it.",
    earlyText: "The trend starts after 2 weeks on Explore.",
    emptyText: `${v.chartModes[0]} and ${doneWord} start once your listing is seen.`,
    curLabel: "This period",
    markers: promos ? promoStartMarkers(promos, weeks, addDays(weeks[weeks.length - 1], 6), () => "Offer on", isoOf(new Date())) : [],
    modes: [
      {
        t: v.chartModes[0],
        unit: v.chartModes[0].toLowerCase(),
        cur: s.viewsPerWeek,
        min: 0,
        fmt: (x) => String(Math.round(x)),
        tips: s.viewsPerWeek.map((x, i) => [
          { l: v.chartModes[0], v: num(x), cur: true },
          { l: v.perfLabels[1], v: num(s.tapsPerWeek[i]), sub: true },
        ]),
      },
      {
        t: v.chartModes[1],
        unit: doneWord,
        cur: s.donePerWeek,
        min: 0,
        fmt: (x) => String(Math.round(x)),
        tips: s.donePerWeek.map((x) => [{ l: v.chartModes[1], v: num(x), cur: true }]),
      },
    ],
  };
  const nc = data ? newClientsTotal(data.newClients) : 0;
  const doneLabel = mk === "store" ? "orders" : mk === "gym" ? "passes" : "bookings";
  // The item's own kind names it: a gym's top item can be a class or a pass.
  const topSub = top?.title
    ? top.kind === "product" || (top.kind === "other" && mk === "store")
      ? `orders for ${top.title}, your top item`
      : top.kind === "plan" || (top.kind === "other" && mk === "gym")
        ? `passes for ${top.title}, your top pass`
        : `bookings for ${top.title}, your top class`
    : `No ${doneLabel} from Centium yet.`;
  const detail = stage === 0 && !empty ? funnel : null;

  return (
    <div style={{ paddingBottom: 8 }}>
      <MCard c={c} r={22} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", overflow: "hidden" }}>
        {boxes.map((b, i) => (
          <div key={b.l} style={{ padding: "13px 10px 11px", borderLeft: i ? `1px solid ${c.divider}` : "none", minWidth: 0 }}>
            <p style={{ fontSize: px(10.5), fontWeight: 700, color: c.faint, lineHeight: lh(14) }}>{b.l}</p>
            <p style={{ fontSize: px(22), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: lh(26), marginTop: 3, fontVariantNumeric: "tabular-nums", color: b.v === dash ? c.tert : c.ink }}>{b.v}</p>
            <p style={{ fontSize: px(10.5), fontWeight: 800, color: /^\+/.test(b.d) ? c.good : c.faint, lineHeight: lh(15.75), minHeight: lh(15.75) }}>{b.d}</p>
          </div>
        ))}
        <p style={{ gridColumn: "1 / -1", fontSize: px(12), lineHeight: lh(17), color: c.inkSoft, padding: "10px 14px 12px", borderTop: `1px solid ${c.divider}` }}>{perfLine(s, top, mk, v.people)}</p>
      </MCard>

      <MCard c={c} style={{ padding: 16, marginTop: 12 }}>
        <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(21) }}>{v.funnelTitle}</p>
        <p style={{ fontSize: px(12), lineHeight: lh(17), color: c.faint, marginTop: 2 }}>{v.funnelSub}</p>
        <div role="group" aria-label="Show one source" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {chips.map((k) => {
            const on = src === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setSrc(on ? null : k)}
                className="tap"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: `1px solid ${on ? colOf(k) : c.border}`,
                  background: on ? c.soft : "transparent",
                  fontSize: px(11.5),
                  fontWeight: 700,
                  color: c.inkSoft,
                  opacity: src === null || on ? 1 : 0.5,
                }}
              >
                <span aria-hidden style={{ width: 9, height: 9, borderRadius: 3, background: colOf(k) }} />
                {SOURCE_LABEL[k]}
              </button>
            );
          })}
        </div>
        {stages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            {stages.map((st, i) => {
              const sel = stage === i;
              const body = (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: px(12.5), fontWeight: 800, color: c.ink }}>{st.t}</span>
                    <span style={{ fontSize: px(14), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.ink }}>{num(st.v)}</span>
                  </div>
                  <div style={{ width: `${st.w}%`, height: 22, borderRadius: 7, overflow: "hidden", display: "flex", gap: 2 }}>
                    {st.segs && st.segs.length > 0 ? (
                      st.segs.map((sg) => <span key={sg.source} style={{ flex: `${sg.v} 1 0`, minWidth: 0, background: colOf(sg.source), opacity: src === null || src === sg.source ? 1 : 0.18 }} />)
                    ) : (
                      <span style={{ flex: "1 1 0", minWidth: 0, background: c.primary }} />
                    )}
                  </div>
                </>
              );
              return (
                <div key={st.t}>
                  {i > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, height: 26, paddingLeft: 4, fontSize: px(11), fontWeight: 800, color: c.tealInk }}>
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
                      style={{ display: "block", width: "100%", textAlign: "left", border: 0, borderRadius: 14, padding: 8, background: sel ? c.soft : "transparent", boxShadow: sel ? `inset 0 0 0 1.5px ${c.primary}` : "none", cursor: "pointer" }}
                    >
                      {body}
                    </button>
                  ) : (
                    <div aria-label={`${st.t}, ${st.v}`} style={{ borderRadius: 14, padding: 8 }}>
                      {body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {detail && (
          <div style={{ marginTop: 10, borderRadius: 14, background: c.soft, padding: "10px 12px" }}>
            <p style={{ fontSize: px(12), fontWeight: 800, color: c.ink }}>{`${v.stages[0]} by source`}</p>
            {SOURCE_ORDER.filter((k) => (detail.bySource[k] ?? 0) > 0).map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 28, fontSize: px(12), color: c.ink }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: colOf(k) }} />
                <span style={{ flex: 1 }}>{SOURCE_LABEL[k]}</span>
                <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{num(detail.bySource[k] ?? 0)}</span>
                <span style={{ width: 44, textAlign: "right", color: c.faint }}>{`${Math.round(((detail.bySource[k] ?? 0) / Math.max(1, detail.seen)) * 100)}%`}</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: px(11.5), lineHeight: lh(16), color: c.inkSoft, marginTop: 10, textWrap: "pretty" } as CSSProperties}>{empty ? v.emptyFunnel : funnelLine(funnel, src, v.emptyFunnel, doneWord)}</p>
      </MCard>

      <MCard c={c} r={22} style={{ marginTop: 12, padding: "14px 16px 16px" }}>
        <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(21) }}>{v.chartTitle}</p>
        <p style={{ fontSize: px(11.5), color: c.faint, margin: "2px 0 10px", lineHeight: lh(17.25) }}>{v.chartSub}</p>
        <ScrubChart cfg={cfg} empty={empty} early={!empty && s.early} />
      </MCard>

      {!empty && (
        <div style={{ display: "grid", gridTemplateColumns: mk === "store" || s.early ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: 10, marginTop: 12 }}>
          <HalfCard c={c} title={v.topTitle} value={top ? num(top.bookings) : "0"} sub={topSub} onAll={() => navigate(`${m.base}/performance/top`)} />
          {mk !== "store" && !s.early && (
            <HalfCard c={c} title={v.newTitle} value={num(nc)} sub="first booking came through Centium" onAll={() => navigate(`${m.base}/performance/new`)} />
          )}
        </div>
      )}
    </div>
  );
}

function HalfCard({ c, title, value, sub, onAll }: { c: MarketPalette; title: string; value: string; sub: string; onAll: () => void }) {
  return (
    <div style={{ borderRadius: 20, background: c.card, border: `1px solid ${c.border}`, padding: "14px 12px 4px", display: "flex", flexDirection: "column", minWidth: 0 }}>
      <p style={{ fontSize: px(12), fontWeight: 800, lineHeight: lh(16), color: c.ink }}>{title}</p>
      <p style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 6 }}>
        <span style={{ fontSize: px(24), fontWeight: 800, lineHeight: lh(28), fontVariantNumeric: "tabular-nums", color: c.ink }}>{value}</span>
      </p>
      <p style={{ fontSize: px(11), lineHeight: lh(15), color: c.faint, minHeight: lh(30) }}>{sub}</p>
      <button
        type="button"
        onClick={onAll}
        style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 44, borderTop: `1px solid ${c.divider}`, borderLeft: 0, borderRight: 0, borderBottom: 0, background: "transparent", fontSize: px(12), fontWeight: 800, color: c.pDark, cursor: "pointer" }}
      >
        See all
        <ChevronRight size={14} aria-hidden />
      </button>
    </div>
  );
}

/** Search, Category browsing, Map, Direct link (MA1-005 row 6a); Featured (B13) takes the deep primary. */
function srcColour(c: MarketPalette, s: ListingSource): string {
  const i = ["search", "category", "map", "direct"].indexOf(s);
  return i >= 0 ? c.src[i as 0 | 1 | 2 | 3] : c.pDark;
}

/** The 12 Mondays ending this week (fixed last 12 weeks, V6-105). */
export function lastTwelveMondays(): string[] {
  const end = mondayOf(isoOf(new Date()));
  return Array.from({ length: 12 }, (_, i) => addDays(end, (i - 11) * 7));
}
