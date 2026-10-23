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
import { fetchMarketplaceVisible, fetchProOverview, needsHideWarning, overviewView, setMarketplaceVisible, visibleFrom, type ProOverviewState } from "../../../services/pro-market";
import { useMyCv } from "../../../components/cv/useMyCv";
import { licenceFacts } from "../../../components/pro/profile/profileModel";
import { CapsLabel, CentredDialog, lh, px, useMarketColors, useStrip } from "../../business-market/listingParts";

// Market + Share 3.0 · W3 · P-MA.1 Overview (HANDOVER §4 "P-MA.1 Overview";
// Professional Marketplace Screens lines 60–109 and the `ov` / `lt` script;
// frame-check P-MA.1: ovVisible, ovHidden, ovEmpty). Column padding 0 16 32
// (the app column gives the 16), gap 12:
// 1. the top row, grid minmax(0,4fr) minmax(0,1fr) gap 12: RedeemVoucherTile
//    (→ /app/pro/marketplace/redeem) and the ListingToggleTile "Listing"
//    Visible #3F9165 / Hidden #C0392B: the live state is the caller's
//    professional_profiles.listed_publicly, written by set_marketplace_visible
//    (Database 73ea87b, D-19). While the state is unknown (loading, or a
//    failed read) the tile is disabled. Turning it on can be refused: the
//    tile stays Hidden and the error strip says why (VISIBLE_REFUSALS: ATXC6
//    licence, ATX47 under 18, ATX48 date of birth). A visible professional
//    without a verified licence (licenceFacts over useMyCv) turning it OFF
//    is asked first (lead decision, not drawn): CentredDialog "Hide your
//    Showcase?" / "You'll need a verified licence or certificate to show it
//    again." · "Keep it shown" (cancels, no call) · "Hide it";
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
// 4. caps "Opportunities" (margin-top 4) and the card (radius 24): Offers from
//    gyms · Openings near you · My work, each → the Opportunities tab. They
//    are Release 2 (DB8): no counts and no OFFERED badge until then. A fourth
//    row "Gyms and colleagues" keeps the live ProfessionalExplore
//    (/app/marketplace) reachable now that More › Explore points here (D-39).

const HOME = "/app/pro/marketplace";

/** The Opportunities card rows (lines 100–107): titles as drawn; the subs are ours until DB8 gives counts. */
const LINKS: { title: string; sub: string; to: string }[] = [
  { title: "Offers from gyms", sub: "Gyms can send you direct offers here soon", to: `${HOME}/opportunities` },
  { title: "Openings near you", sub: "Roles and class slots near you, coming soon", to: `${HOME}/opportunities` },
  { title: "My work", sub: "When a gym hires you, it shows here", to: `${HOME}/opportunities` },
  { title: "Gyms and colleagues", sub: "Your gyms, their classes and other professionals", to: "/app/marketplace" },
];

export function OverviewTab() {
  const c = useMarketColors();
  const navigate = useNavigate();
  const online = useOnline();
  const { professionalClients, rosterLoading, rosterError, authUserId } = useApp();
  const [state, setState] = useState<ProOverviewState>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState<boolean | null>(null);
  const [visibleKnown, setVisibleKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [strip, showStrip] = useStrip();
  const retry = useCallback(() => setTick((t) => t + 1), []);

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

  useEffect(() => {
    if (!authUserId) return;
    let alive = true;
    void fetchMarketplaceVisible(authUserId).then((v) => {
      if (!alive) return;
      setVisible(v);
      setVisibleKnown(v !== null);
    });
    return () => {
      alive = false;
    };
  }, [authUserId, tick]);

  const roster = rosterLoading || rosterError ? null : professionalClients.length;
  const view = overviewView(state, roster);
  const on = visible ?? visibleFrom(state);

  // Verified licence or certificate, from the professional's own CV (the
  // reader the Showcase's About and the public profile already use); null
  // until it loads (treated as unverified by needsHideWarning).
  const { cv } = useMyCv();
  const verified = cv ? licenceFacts(cv.licences, cv.reviews).verified : null;
  const [confirmHide, setConfirmHide] = useState(false);

  const request = (next: boolean) => {
    if (busy || !visibleKnown) return;
    if (needsHideWarning(on, next, verified)) return setConfirmHide(true);
    void toggle(next);
  };

  const toggle = async (next: boolean) => {
    if (busy || !visibleKnown) return;
    setBusy(true);
    const r = await setMarketplaceVisible(next);
    setBusy(false);
    if (r.ok) {
      setVisible(r.value);
      showStrip(r.value ? "Your Showcase is visible" : "Your Showcase is hidden");
      return;
    }
    showStrip(r.offline ? "You're offline. Try again when you're connected." : r.message, r.offline ? "neutral" : "error");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 32, color: c.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <MarketOffline loaded />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,4fr) minmax(0,1fr)", gap: 12 }}>
        <RedeemVoucherTile onPress={() => navigate(`${HOME}/redeem`)} />
        <ListingToggleTile variant="pro" on={on} disabled={!online || busy || !visibleKnown} onChange={request} />
      </div>
      {visibleKnown && !on ? (
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
        {LINKS.map((l, i) => (
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
              <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{l.sub}</span>
            </span>
            <ChevronRight size={16} strokeWidth={2} color={c.faint} aria-hidden style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>
      <CentredDialog
        open={confirmHide}
        title="Hide your Showcase?"
        body="You'll need a verified licence or certificate to show it again."
        cancel="Keep it shown"
        action="Hide it"
        onCancel={() => setConfirmHide(false)}
        onAction={() => {
          setConfirmHide(false);
          void toggle(false);
        }}
      />
      {strip}
    </div>
  );
}
