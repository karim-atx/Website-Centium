import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { fetchListingPerformance, type ListingPerformance } from "../../services/business-market/listing";
import { num } from "../../services/business-market/listingLogic";
import { MarketProvider, useMarket } from "./MarketContext";
import { BackHeader, Card, lh, px, useMarketColors } from "./listingParts";
import { dayMonth } from "./model";
import { EXPANDED } from "../../services/market/performanceModel";
import { OfferPerformanceExpanded } from "./OfferPerformance";

// performance/:which under the Marketplace (and a Store's Products):
// - views | redemptions | points | rate: the B-MA.7 full-screen chart
//   (`performanceExpanded`, OfferPerformance.tsx);
// - top | new: the KEPT "See all" pages of the listing performance (Top
//   classes / New clients, per type), B13 MK-07 readers over the last 12
//   weeks, restyled in the handover chrome (back header, r20 card, rows on
//   --div rules). Top: listing_top_items (up to 20), ranked by Centium
//   bookings (passes for a gym, orders for a store), bar by share of the top.
//   New: listing_new_clients gives counts per week, never people, so the rows
//   are the weeks that had any. Absent readers (probe "pending") = the empty
//   card.

export default function SeeAllPage() {
  return (
    <MarketProvider>
      <SeeAllBody />
    </MarketProvider>
  );
}

function SeeAllBody() {
  const { which } = useParams();
  if (which && EXPANDED[which]) return <OfferPerformanceExpanded segment={which} />;
  return <ListingSeeAll which={which} />;
}

function ListingSeeAll({ which }: { which: string | undefined }) {
  const mk = useMarket();
  const { kind, tabHref, business } = mk;
  const m = useMarketColors();
  const navigate = useNavigate();
  const top = which !== "new";
  const [data, setData] = useState<ListingPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const live = mk.backend.events === "live";
  const businessId = business?.id ?? null;

  useEffect(() => {
    if (!live || !businessId) return;
    let alive = true;
    void fetchListingPerformance(businessId, 20).then((r) => {
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

  const title = top ? (kind === "store" ? "Top items" : kind === "gym" ? "Top passes" : "Top classes") : kind === "store" ? "New customers" : kind === "gym" ? "New members" : "New clients";
  const empty = kind === "store" ? "No orders from Centium yet." : kind === "gym" ? "No passes bought from Centium yet." : "No bookings from Centium yet.";
  // The item's own kind names the count: a gym's top item can be a class or a pass.
  const unit = (n: number, k: string) => {
    const store = k === "product" || (k === "other" && kind === "store");
    const pass = k === "plan" || (k === "other" && kind === "gym");
    return store ? `${num(n)} order${n === 1 ? "" : "s"}` : pass ? `${num(n)} pass${n === 1 ? "" : "es"}` : `${num(n)} booking${n === 1 ? "" : "s"}`;
  };
  const rows = top ? [...(data?.top ?? [])].filter((x) => x.bookings > 0).sort((a, b) => b.bookings - a.bookings || b.impressions - a.impressions) : [];
  const weeks = !top ? [...(data?.newClients ?? [])].filter((w) => w.n > 0).reverse() : [];
  const max = Math.max(1, ...rows.map((r) => r.bookings));
  const person = kind === "store" ? "customer" : kind === "gym" ? "member" : "client";
  const row = (i: number): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: i ? `1px solid ${m.div}` : "none" });

  return (
    <div style={{ color: m.ink, lineHeight: "normal" }}>
      <BackHeader eyebrow={kind === "store" ? "Products · Performance" : "Marketplace · Performance"} title={title} onBack={() => navigate(tabHref("perf"))} backLabel="Back to Performance" />
      <p style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, margin: "0 0 8px", lineHeight: lh(15.75) }}>Last 12 weeks · from Centium</p>
      {live && error && !data ? (
        <MarketError thing="your performance" onRetry={() => setTick((t) => t + 1)} />
      ) : live && !data ? (
        <MarketSkeleton radius={20} rows={4} height={180} label="Loading your performance" />
      ) : top && rows.length > 0 ? (
        <Card r={20} style={{ overflow: "hidden" }}>
          {rows.map((r, i) => (
            <div key={r.itemId} style={row(i)}>
              <span style={{ width: 20, fontSize: px(12), fontWeight: 800, color: m.faint, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(13.5), fontWeight: 700, color: m.ink, lineHeight: lh(19) }}>{r.title ?? "Removed item"}</span>
                <span aria-hidden style={{ display: "block", height: 6, borderRadius: 999, background: m.soft, marginTop: 6, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${(r.bookings / max) * 100}%`, borderRadius: 999, background: m.fill }} />
                </span>
              </span>
              <span style={{ fontSize: px(13), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: m.ink, whiteSpace: "nowrap" }}>{unit(r.bookings, r.kind)}</span>
            </div>
          ))}
        </Card>
      ) : !top && weeks.length > 0 ? (
        <Card r={20} style={{ overflow: "hidden" }}>
          {weeks.map((w, i) => (
            <div key={w.weekStart} style={row(i)}>
              <span style={{ flex: 1, fontSize: px(13.5), fontWeight: 700, color: m.ink }}>{`Week of ${dayMonth(w.weekStart)}`}</span>
              <span style={{ fontSize: px(13), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: m.ink }}>{`${num(w.n)} new ${person}${w.n === 1 ? "" : "s"}`}</span>
            </div>
          ))}
        </Card>
      ) : (
        <MarketEmptyCard title="No data yet" body={empty} />
      )}
    </div>
  );
}
