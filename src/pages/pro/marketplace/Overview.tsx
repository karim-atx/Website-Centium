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
import { fetchProOverview, needsHideWarning, overviewView, setMarketplaceVisible, visibleOf, type ProOverviewState } from "../../../services/pro-market";
import { useMyCv } from "../../../components/cv/useMyCv";
import { licenceFacts } from "../../../components/pro/profile/profileModel";
import { CapsLabel, CentredDialog, lh, px, useMarketColors, useStrip } from "../../business-market/listingParts";
import { useIsDark } from "../../../hooks/useIsDark";
import { STATUS_STEPS } from "../../../theme/marketTokens";
import { fetchMyApplications, fetchMyWork, fetchOpportunities } from "../../../services/team-hiring";
import { fixedPair } from "./opportunities/colours";
import { offeredCount, offersSub, openingsSub, workSub } from "./opportunities/opportunitiesModel";
import { t, tk } from "../../../i18n/core";

// Market + Share 3.0 · W3 · P-MA.1 Overview (HANDOVER §4 "P-MA.1 Overview";
// Professional Marketplace Screens lines 60–109 and the `ov` / `lt` script;
// frame-check P-MA.1: ovVisible, ovHidden, ovEmpty). Column padding 0 16 32
// (the app column gives the 16), gap 12:
// 1. the top row, grid minmax(0,4fr) minmax(0,1fr) gap 12: RedeemVoucherTile
//    (→ /app/pro/marketplace/redeem) and the ListingToggleTile "Listing"
//    Visible #3F9165 / Hidden #C0392B: the live state is professional_overview's
//    marketplace_visible (listed_publicly, Database PR #39), written by
//    set_marketplace_visible (Database 73ea87b, D-19). While the state is unknown (loading, or a
//    failed read) the tile is disabled. Turning it on can be refused: the
//    tile stays Hidden and the error strip says why (VISIBLE_REFUSALS: ATXC6
//    licence, ATX47 under 18, ATX48 date of birth). A visible professional
//    without a verified licence (licenceFacts over useMyCv) turning it OFF
//    is asked first (lead decision, not drawn): CentredDialog "Hide your
//    Showcase?" / "You'll need a verified licence or certificate to show it
//    again." · "Keep it shown" (cancels, no call) · "Hide it";
// 2. ovHidden: the banner (radius 16, --highbg, padding 12 14, 12.5 / 18 700
//    --high);
// 3. HeroStatCard "Clients reached" + the 358 × 64 sparkline (sub line "This
//    month so far", Karim #40: clients_reached is month to date; the board's
//    "Last 30 days" is replaced, as on B-MA.1), and the
//    StatLedger (Active offers · Redemptions this month · Points redeemed
//    (leaf) · Active clients · Gyms working with), from DB5
//    professional_overview() (Database PR #39); while it loads or after a
//    failed read every figure is the quiet "–" except Active clients, which the LIVE roster (AppContext
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
  { key: "offers", title: tk("Offers from gyms"), quiet: tk("Gyms can send you direct offers here soon"), to: `${HOME}/opportunities/applications` },
  { key: "openings", title: tk("Openings near you"), quiet: tk("Roles and class slots near you, coming soon"), to: `${HOME}/opportunities` },
  { key: "work", title: tk("My work"), quiet: tk("When a gym hires you, it shows here"), to: `${HOME}/opportunities/work` },
  { key: "explore", title: tk("Gyms and colleagues"), quiet: tk("Your gyms, their classes and other professionals"), to: "/app/marketplace" },
];

/** The three DB8 reads behind the card; a sub only when its read answers. */
function useOpportunityCard(): Record<"offers" | "openings" | "work", Sub> {
  const [subs, setSubs] = useState<Record<"offers" | "openings" | "work", Sub>>({ offers: null, openings: null, work: null });
  useEffect(() => {
    let alive = true;
    // Database Release 2: my_hire_offers + own applications, opportunities, my_work.
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
  // A switch made here, over the overview's marketplace_visible until the next read.
  const [switched, setSwitched] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [strip, showStrip] = useStrip();
  const retry = useCallback(() => setTick((n) => n + 1), []);
  const card = useOpportunityCard();
  const [offeredBg, offeredInk] = fixedPair(STATUS_STEPS.OFFERED[0], STATUS_STEPS.OFFERED[1], useIsDark());

  useEffect(() => {
    let alive = true;
    void fetchProOverview().then((r) => {
      if (!alive) return;
      setSwitched(null);
      setState(r.ok ? { status: "ok", value: r.value } : { status: "error" });
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const roster = rosterLoading || rosterError ? null : professionalClients.length;
  const view = overviewView(state, roster);
  const visible = switched ?? visibleOf(state);
  const visibleKnown = visible !== null;
  const on = visible ?? true;

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
      setSwitched(r.value);
      showStrip(r.value ? t("Your Showcase is visible") : t("Your Showcase is hidden"));
      return;
    }
    showStrip(r.offline ? t("You're offline. Try again when you're connected.") : t(r.message), r.offline ? "neutral" : "error");
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
          {t("Hidden. Clients and gyms can't find your Showcase or offers. Vouchers already issued still work.")}
        </div>
      ) : null}
      {state.status === "loading" ? (
        <>
          <MarketSkeleton radius={24} rows={3} height={165} label={t("Loading clients reached")} />
          <MarketSkeleton radius={20} rows={4} height={226} label={t("Loading your figures")} />
        </>
      ) : (
        <>
          <HeroStatCard label={t("Clients reached")} value={view.hero.value} delta={view.hero.delta} sub={view.hero.sub ? t(view.hero.sub) : view.hero.sub} series={view.hero.series} />
          {/* The ledger labels are services/pro-market's English, shown in the app's language. */}
          <StatLedger rows={view.rows.map((r) => ({ ...r, label: t(r.label) }))} />
        </>
      )}
      {state.status === "error" ? <MarketError thing={t("your marketplace figures")} onRetry={retry} /> : null}
      <CapsLabel style={{ marginTop: 4 }}>{t("Opportunities")}</CapsLabel>
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
              textAlign: "start",
              color: c.ink,
              fontFamily: "inherit",
              lineHeight: "normal",
              cursor: "pointer",
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: px(14), fontWeight: 700 }}>{t(l.title)}</span>
              <span style={{ display: "block", fontSize: px(11.5), color: c.faint }}>{sub?.text ?? t(l.quiet)}</span>
            </span>
            {sub?.badge ? (
              <span style={{ fontSize: px(10), fontWeight: 800, letterSpacing: "0.08em", borderRadius: 999, padding: "3px 8px", background: offeredBg, color: offeredInk, flexShrink: 0 }}>{t("OFFERED")}</span>
            ) : null}
            <ChevronRight size={16} strokeWidth={2} color={c.faint} aria-hidden className="rtl:-scale-x-100" style={{ flexShrink: 0 }} />
          </button>
          );
        })}
      </div>
      <CentredDialog
        open={confirmHide}
        title={t("Hide your Showcase?")}
        body={t("You'll need a verified licence or certificate to show it again.")}
        cancel={t("Keep it shown")}
        action={t("Hide it")}
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
