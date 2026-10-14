import { useNavigate, useParams } from "react-router-dom";
import { MarketProvider, useMarket } from "./MarketContext";
import { lh, MBackHeader, MCard, px } from "./kit";

// OURS-MA1-performance-see-all: the two "See all" pages under Performance
// (Top classes / New clients, per type). Their rows are B13 MK-07 readers
// (listing_top_items, listing_new_clients), not on the local stack: the page
// shows its empty line. The half cards that link here stay hidden until then.

export default function SeeAllPage() {
  return (
    <MarketProvider>
      <SeeAllBody />
    </MarketProvider>
  );
}

function SeeAllBody() {
  const { c, kind, tabHref } = useMarket();
  const navigate = useNavigate();
  const { which } = useParams();
  const top = which !== "new";
  const title = top ? (kind === "store" ? "Top items" : kind === "gym" ? "Top passes" : "Top classes") : kind === "store" ? "New customers" : kind === "gym" ? "New members" : "New clients";
  const empty = kind === "store" ? "No orders from Centium yet." : kind === "gym" ? "No passes bought from Centium yet." : "No bookings from Centium yet.";
  return (
    <div style={{ color: c.ink, marginTop: -4 }}>
      <MBackHeader c={c} eyebrow={kind === "store" ? "Products · Performance" : "Marketplace · Performance"} title={title} onBack={() => navigate(tabHref("perf"))} backLabel="Back to Performance" />
      <p style={{ fontSize: px(12), fontWeight: 700, color: c.inkSoft, margin: "8px 2px 8px", lineHeight: lh(18) }}>Last 12 weeks · from Centium</p>
      <MCard c={c} r={20} style={{ padding: "18px 16px", textAlign: "center" }}>
        <p style={{ fontSize: px(12.5), color: c.inkSoft, lineHeight: lh(18) }}>{empty}</p>
      </MCard>
    </div>
  );
}
