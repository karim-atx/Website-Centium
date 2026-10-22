import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { RedeemVoucherTile } from "../../../components/market/RedeemVoucherTile";
import { ListingToggleTile } from "../../../components/market/ListingToggleTile";
import { HeroStatCard } from "../../../components/market/HeroStatCard";
import { StatLedger } from "../../../components/market/StatLedger";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { fetchProOverview, overviewView, setMarketplaceVisible, visibleFrom, type ProOverviewState } from "../../../services/pro-market";
import { CapsLabel, lh, px, useMarketColors, useStrip } from "../../business-market/listingParts";
import { useIsDark } from "../../../hooks/useIsDark";
import { STATUS_STEPS } from "../../../theme/marketTokens";
import { fetchMyApplications, fetchMyWork, fetchOpportunities } from "../../../services/team-hiring";
import { fixedPair } from "./opportunities/colours";
import { offeredCount, offersSub, openingsSub, workSub } from "./opportunities/opportunitiesModel";

// Market + Share 3.0 · W3 · P-MA.1 Overview (HANDOVER §4 "P-MA.1 Overview";
// Professional Marketplace Screens lines 60–109 and the `ov` / `lt` script;
// frame-check P-MA.1: ovVisible, ovHidden, ovEmpty). Column padding 0 16 32
// (the app column gives the 16), gap 12:
// 1. the top row, grid minmax(0,4fr) minmax(0,1fr) gap 12: RedeemVoucherTile
//    (→ /app/pro/marketplace/redeem) and the ListingToggleTile "Listing"
//    Visible #3F9165 / Hidden #C0392B over DB3 set_marketplace_visible
//    (awaiting). Pending, the tile shows Visible (D-19: every professional is
//    visible today) and a switch attempt stays Visible with a quiet strip;
// 2. ovHidden: the banner (radius 16, --highbg, padding 12 14, 12.5 / 18 700
//    --high);
// 3. HeroStatCard "Clients reached" + the 358 × 64 sparkline, and the
//    StatLedger (Active offers · Redemptions this month · Points redeemed
//    (leaf) · Active clients · Gyms working with), from DB5
//    professional_overview() (awaiting): pending, every figure is the quiet
//    "–" except Active clients, which the LIVE roster (AppContext
//    professionalClients, active_professional_clients) answers; ovEmpty when
//    the answer has nobody reached (zeros, the dashed flat line, "Shows once
//    clients start finding you");
// 4. caps "Opportunities" (margin-top 4) and the card (radius 24, rows
//    padding 14 16, 0.5px --div between; title 14 / 700, sub 11.5 --faint, the
//    16 chevron), W4 (`ov.links`): "Offers from gyms" ("2 waiting · {gyms}",
//    the OFFERED badge 10 / 800 0.08em #EBF2F4 / #5A859E while an offer waits;
//    my_applications) → My applications; "Openings near you" ("6 roles and
//    class slots"; opportunities, the Gyms tab unfiltered) → the
//    Opportunities tab; "My work" ("{gym} · 2 classes a week"; my_work) → My
//    work. Each read is DB8: pending (or loading / failed), the row keeps the
//    W3 quiet line, never a count. A fourth row "Gyms and colleagues" keeps
//    the live ProfessionalExplore (/app/marketplace) reachable now that More ›
//    Explore points here (D-39).

const HOME = "/app/pro/marketplace";

type Sub = { text: string; badge?: boolean } | null;
/** The Opportunities card rows (lines 100–107): titles as drawn; the quiet subs (ours) show until DB8 answers. */
const LINKS: { key: "offers" | "openings" | "work" | "explore"; title: string; quiet: string; to: string }[] = [
  { key: "offers", title: "Offers from gyms", quiet: "Gyms can send you direct offers here soon", to: `${HOME}/opportunities/applications` },
  { key: "openings", title: "Openings near you", quiet: "Roles and class slots near you, coming soon", to: `${HOME}/opportunities` },
  { key: "work", title: "My work", quiet: "When a gym hires you, it shows here", to: `${HOME}/opportunities/work` },
  { key: "explore", title: "Gyms and colleagues", quiet: "Your gyms, their classes and other professionals", to: "/app/marketplace" },
];

/** The three DB8 reads behind the card; a sub only when its read answers. */
function useOpportunityCard(): Record<"offers" | "openings" | "work", Sub> {
  const [subs, setSubs] = useState<Record<"offers" | "openings" | "work", Sub>>({ offers: null, openings: null, work: null });
  useEffect(() => {
    let alive = true;
    // awaiting DB stage DB8 (my_applications, opportunities, my_work)
    void fetchMyApplications().then((r) => alive && r.ok && setSubs((s) => ({ ...s, offers: { text: offersSub(r.value), badge: offeredCount(r.value) > 0 } })));
    void fetchOpportunities("gyms", { type: null, specialty: null, distanceKm: null }).then((r) => alive && r.ok && setSubs((s) => ({ ...s, openings: { text: openingsSub(r.value.length) } })));
    void fetchMyWork().then((r) => alive && r.ok && setSubs((s) => ({ ...s, work: { text: workSub(r.value) } })));
    return () => {
      alive = false;
    };
  }, []);
  return subs;
}

export function OverviewTab() {
  const c = useMarketColors();
  const navigate = useNavigate();
  const online = useOnline();
  const { professionalClients, rosterLoading, rosterError } = useApp();
  const [state, setState] = useState<ProOverviewState>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [strip, showStrip] = useStrip();
  const retry = useCallback(() => setTick((t) => t + 1), []);
  const card = useOpportunityCard();
  const [offeredBg, offeredInk] = fixedPair(STATUS_STEPS.OFFERED[0], STATUS_STEPS.OFFERED[1], useIsDark());

  useEffect(() => {
    let alive = true;
    void fetchProOverview().then((r) => {
      if (!alive) return;
      setState(r.ok ? { status: "ok", value: r.value } : r.pending ? { status: "pending" } : { status: "error" });
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const roster = rosterLoading || rosterError ? null : professionalClients.length;
  const view = overviewView(state, roster);
  const on = visible ?? visibleFrom(state);

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    const r = await setMarketplaceVisible(next);
    setBusy(false);
    if (r.ok) {
      setVisible(r.value);
      showStrip(r.value ? "Your Showcase is visible" : "Your Showcase is hidden");
      return;
    }
    if (r.pending) showStrip(next ? "Showing your Showcase is coming soon." : "Hiding your Showcase is coming soon.", "neutral");
    else showStrip(r.offline ? "You're offline. Try again when you're connected." : r.message, r.offline ? "neutral" : "error");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 32, color: c.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <MarketOffline loaded />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,4fr) minmax(0,1fr)", gap: 12 }}>
        <RedeemVoucherTile onPress={() => navigate(`${HOME}/redeem`)} />
        <ListingToggleTile variant="pro" on={on} disabled={!online || busy} onChange={(next) => void toggle(next)} />
      </div>
      {!on ? (
        <div role="status" style={{ borderRadius: 16, background: c.highbg, padding: "12px 14px", fontSize: px(12.5), lineHeight: lh(18), fontWeight: 700, color: c.high }}>
          Hidden. Clients and gyms can't find your Showcase or offers. Vouchers already issued still work.
        </div>
      ) : null}
      {state.status === "loading" ? (
        <>
          <MarketSkeleton radius={24} rows={3} height={165} label="Loading clients reached" />
          <MarketSkeleton radius={20} rows={4} height={226} label="Loading your figures" />
        </>
      ) : (
        <>
          <HeroStatCard label="Clients reached" value={view.hero.value} delta={view.hero.delta} sub={view.hero.sub} series={view.hero.series} />
          <StatLedger rows={view.rows} />
        </>
      )}
      {state.status === "error" ? <MarketError thing="your marketplace figures" onRetry={retry} /> : null}
      <CapsLabel style={{ marginTop: 4 }}>Opportunities</CapsLabel>
      <div style={{ borderRadius: 24, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
        {LINKS.map((l, i) => {
          const sub = l.key === "explore" ? null : card[l.key];
          return (
          <button
            key={l.title}
            type="button"
            onClick={() => navigate(l.to)}
            className="market-focus"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              width: "100%",
              minHeight: 44,
              boxSizing: "border-box",
              background: "transparent",
              border: 0,
              borderTop: i ? `0.5px solid ${c.div}` : 0,
              textAlign: "left",
              color: c.ink,
              fontFamily: "inherit",
              lineHeight: "normal",
              cursor: "pointer",
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: px(14), fontWeight: 700 }}>{l.title}</span>
              <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{sub?.text ?? l.quiet}</span>
            </span>
            {sub?.badge ? (
              <span style={{ fontSize: px(10), fontWeight: 800, letterSpacing: "0.08em", borderRadius: 999, padding: "3px 8px", background: offeredBg, color: offeredInk, flexShrink: 0 }}>OFFERED</span>
            ) : null}
            <ChevronRight size={16} strokeWidth={2} color={c.faint} aria-hidden style={{ flexShrink: 0 }} />
          </button>
          );
        })}
      </div>
      {strip}
    </div>
  );
}
