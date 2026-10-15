import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchListingPerformance, type ListingPerformance } from "../../services/business-market/listing";
import { num } from "../../services/business-market/listingLogic";
import { MarketProvider, useMarket } from "./MarketContext";
import { lh, MBackHeader, MBlock, MCard, MError, px } from "./kit";
import { dayMonth } from "./model";

// OURS-MA1-performance-see-all: the two "See all" pages under Performance
// (Top classes / New clients, per type), B13 MK-07 readers over the last 12
// weeks. Top: listing_top_items (up to 20), ranked by Centium bookings
// (passes for a gym, orders for a store), bar by share of the top. New:
// listing_new_clients gives counts per week, never people, so the rows are
// the weeks that had any (the drawn per-person rows need a reader that
// names them; none exists). Absent readers (probe "pending") = the empty line.

export default function SeeAllPage() {
  return (
    <MarketProvider>
      <SeeAllBody />
    </MarketProvider>
  );
}

function SeeAllBody() {
  const m = useMarket();
  const { c, kind, tabHref, business } = m;
  const navigate = useNavigate();
  const { which } = useParams();
  const top = which !== "new";
  const [data, setData] = useState<ListingPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const live = m.backend.events === "live";
  const businessId = business?.id ?? null;

  useEffect(() => {
    if (!live || !businessId) return;
    let alive = true;
    void fetchListingPerformance(businessId, 20).then((r) => {
      if (!alive) return;
      if (r.ok) setData(r.value);
      else setError(r.message);
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
  const rows = top
    ? [...(data?.top ?? [])].filter((x) => x.bookings > 0).sort((a, b) => b.bookings - a.bookings || b.impressions - a.impressions)
    : [];
  const weeks = !top ? [...(data?.newClients ?? [])].filter((w) => w.n > 0).reverse() : [];
  const max = Math.max(1, ...rows.map((r) => r.bookings));
  const person = kind === "store" ? "customer" : kind === "gym" ? "member" : "client";

  return (
    <div style={{ color: c.ink, marginTop: -4 }}>
      <MBackHeader c={c} eyebrow={kind === "store" ? "Products · Performance" : "Marketplace · Performance"} title={title} onBack={() => navigate(tabHref("perf"))} backLabel="Back to Performance" />
      <p style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, margin: "8px 2px 8px", lineHeight: lh(18) }}>Last 12 weeks · from Centium</p>
      {live && error && !data ? (
        <MError c={c} title="Couldn't load your performance" onRetry={() => setTick((t) => t + 1)} />
      ) : live && !data ? (
        <MBlock c={c} h={180} r={20} />
      ) : top && rows.length > 0 ? (
        <MCard c={c} r={20} style={{ overflow: "hidden" }}>
          {rows.map((r, i) => (
            <div key={r.itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderTop: i ? `1px solid ${c.divider}` : "none" }}>
              <span style={{ width: 20, fontSize: px(12), fontWeight: 800, color: c.faint, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(13), fontWeight: 800, color: c.ink, lineHeight: lh(18) }}>{r.title ?? "Removed item"}</span>
                <span aria-hidden style={{ display: "block", height: 6, borderRadius: 999, background: c.track, marginTop: 6, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${(r.bookings / max) * 100}%`, borderRadius: 999, background: c.primary }} />
                </span>
              </span>
              <span style={{ fontSize: px(13), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.ink, whiteSpace: "nowrap" }}>{unit(r.bookings, r.kind)}</span>
            </div>
          ))}
        </MCard>
      ) : !top && weeks.length > 0 ? (
        <MCard c={c} r={20} style={{ overflow: "hidden" }}>
          {weeks.map((w, i) => (
            <div key={w.weekStart} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderTop: i ? `1px solid ${c.divider}` : "none" }}>
              <span style={{ flex: 1, fontSize: px(13), fontWeight: 800, color: c.ink }}>{`Week of ${dayMonth(w.weekStart)}`}</span>
              <span style={{ fontSize: px(13), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c.ink }}>{`${num(w.n)} new ${person}${w.n === 1 ? "" : "s"}`}</span>
            </div>
          ))}
        </MCard>
      ) : (
        <MCard c={c} r={20} style={{ padding: "18px 16px", textAlign: "center" }}>
          <p style={{ fontSize: px(12.5), color: c.inkSoft, lineHeight: lh(18) }}>{empty}</p>
        </MCard>
      )}
    </div>
  );
}
