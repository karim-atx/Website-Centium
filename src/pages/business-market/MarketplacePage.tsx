import React, { useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { FOCUS_CSS } from "../../components/market/usePress";
import { MarketSkeleton } from "../../components/market/MarketStates";
import { BizShareButton } from "../../components/share/business/BizShareButton";
import { fetchRatingLine } from "../../components/share/business/useBizBrand";
import { MarketProvider, MARKET_TAB_KEYS, tabKeyOf, useMarket, type MarketTabKey } from "./MarketContext";
import { Overview } from "./Overview";
import { ShowcaseManager } from "./ShowcaseManager";
import { OffersTab } from "./OffersManager";
import { PerformanceTab } from "./PerformanceTab";
import { useListingSwitch } from "./useListingSwitch";
import { lh, px, useMarketColors } from "./listingParts";
import { isRtl, t } from "../../i18n/core";

// Market + Share 3.0 · W3 · B-MA.1–B-MA.7 Marketplace (Business Marketplace
// Screens lines 31–41 and the `biz.subtitle` / `topTabs` script): the tabbed
// header (title 27 / 34 800 −0.022em; subtitle 13 / 19 500 --faint, 4 below;
// the track margin 16 0 18, padding 6, gap 5, radius 16, --segtrack; tabs 38
// tall radius 12, 12 / 700 nowrap, active --segactive / --onfill, idle
// --segidle / --segink) with Overview · Showcase · Offers · Performance
// (`?tab=` overview (default) | showcase | offers | perf; the MA1 keys
// listing / spots → Overview and promo → Offers still work). The B-SH.1
// "Find us on Centium" share stays in the header (W1). The MA1 Open spots /
// Day passes tab is gone: its content lives on Classes (B-MA.6) and
// Memberships (B-MA.5).
//
// A store (D-12) keeps Products in its navbar: the same four tabs render on
// the Products page (StoreMarketPanel, Showcase first there), so
// /app/business/marketplace sends a store to /app/business/products.

export default function MarketplacePage() {
  return (
    <MarketProvider>
      <MarketplaceBody />
    </MarketProvider>
  );
}

function MarketplaceBody() {
  const m = useMarket();
  const { kind, kindKnown } = m;
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab = tabKeyOf(raw, "overview");

  if (kindKnown && kind === "store") {
    const rest = new URLSearchParams(params);
    rest.set("tab", tab);
    return <Navigate to={`/app/business/products?${rest.toString()}`} replace />;
  }

  // Until the lane is known the per-type subtitle holds as a skeleton line.
  return (
    <MarketTabsScreen
      title={t("Marketplace")}
      tab={tab}
      onTab={(k) => {
        const next = new URLSearchParams(params);
        if (k === "overview") next.delete("tab");
        else next.set("tab", k);
        setParams(next, { replace: true });
      }}
      subtitleReady={kindKnown}
    />
  );
}

/**
 * The header and the four tab bodies, for the Marketplace page and a store's
 * Products page. Must sit inside a MarketProvider.
 */
export function MarketTabsScreen({ title, tab, onTab, subtitleReady = true }: { title: string; tab: MarketTabKey; onTab: (k: MarketTabKey) => void; subtitleReady?: boolean }) {
  const m = useMarket();
  const c = useMarketColors();
  const { accessibility } = useApp();
  const larger = !!accessibility.largerText;
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const labels: Record<MarketTabKey, string> = { overview: t("Overview"), showcase: t("Showcase"), offers: t("Offers"), perf: t("Performance") };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const n = MARKET_TAB_KEYS.length;
    // In Arabic the tabs run right to left, so the arrow that points onward is ArrowLeft.
    const onward = isRtl() ? "ArrowLeft" : "ArrowRight";
    const j = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === onward ? 1 : n - 1)) % n;
    onTab(MARKET_TAB_KEYS[j]);
    tabsRef.current[j]?.focus();
  };

  return (
    <div data-market style={{ color: c.ink, marginTop: -4, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <h1 style={{ fontSize: px(27), fontWeight: 800, letterSpacing: "-0.022em", lineHeight: lh(34), color: c.ink, margin: 0 }}>{title}</h1>
        {/* Market + Share 3.0 B-SH.1 / B-SH.4: share the business's profile card (Find us on Centium); the Overview figures never go on it. */}
        <BizShareButton label={t("Share your profile: Find us on Centium")} style={{ marginBlock: "-5px", marginInline: "0 -5px" }} getData={async (id) => ({ t: "profile", d: { rating: await fetchRatingLine(id) } })} />
      </div>
      {subtitleReady ? (
        <p style={{ fontSize: px(13), fontWeight: 500, color: c.faint, marginTop: 4, lineHeight: lh(19) }}>{m.v.subtitle}</p>
      ) : (
        <div aria-hidden className="animate-skeleton-pulse" style={{ height: 14, width: "62%", borderRadius: 7, background: c.soft, marginTop: 6.5 }} />
      )}
      <div
        role="tablist"
        aria-label={t("Marketplace")}
        className={larger ? "scroll-row no-scrollbar" : undefined}
        style={{ margin: "16px 0 18px", display: "flex", gap: 5, padding: 6, borderRadius: 16, background: c.segtrack }}
      >
        {MARKET_TAB_KEYS.map((k, i) => {
          const on = k === tab;
          return (
            <button
              key={k}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`mk-tab-${k}`}
              aria-selected={on}
              aria-controls="mk-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => onTab(k)}
              onKeyDown={(e) => onKey(e, i)}
              className="market-focus hit"
              style={{
                flex: larger ? "1 0 auto" : 1,
                minWidth: 0,
                height: 38,
                padding: larger ? "0 10px" : 0,
                borderRadius: 12,
                border: 0,
                background: on ? c.segactive : c.segidle,
                color: on ? c.onfill : c.segink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "inherit",
                fontSize: px(12),
                fontWeight: 700,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {labels[k]}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="mk-panel" aria-labelledby={`mk-tab-${tab}`}>
        {tab !== "overview" && <HiddenBanner />}
        <TabBody tab={tab} />
      </div>
    </div>
  );
}

function TabBody({ tab }: { tab: MarketTabKey }) {
  const m = useMarket();
  if (!m.kindKnown && m.loading) return <MarketSkeleton radius={24} rows={3} count={2} label={t("Loading your marketplace")} />;
  if (tab === "showcase") return <ShowcaseManager />;
  if (tab === "offers") return <OffersTab />;
  if (tab === "perf") return <PerformanceTab />;
  return <Overview />;
}

/**
 * Shown on Showcase, Offers and Performance while the listing is off (the
 * Overview shows it on the ListingToggleTile, B-MA.1 overviewPaused). The
 * P-MA.1 hidden banner's chrome (radius 16, --highbg, padding 12 14, 12.5 /
 * 18 700 --high); the owner's Turn on (KEPT), "Only the owner can turn it
 * on." for anyone else, and the closed rule.
 */
export function HiddenBanner() {
  const m = useMarket();
  const c = useMarketColors();
  const { v, business } = m;
  const online = useOnline();
  const sw = useListingSwitch();
  // The Turn on strip outlives the banner (it goes as the listing turns on).
  if (!business || business.active) return <>{sw.toast}</>;
  // CP: a closed business can't be listed again (close_business set active = false).
  const closed = !!business.closedAt;
  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, background: c.highbg, padding: "12px 14px", marginBottom: 12 }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: px(12.5), lineHeight: lh(18), fontWeight: 700, color: c.high }}>
        {closed ? t("Hidden. Your business is closed, so it can't be listed.") : t("Hidden. {reason} Vouchers already issued still work.", { reason: v.bannerBody })}
        {!m.isOwner && !closed ? <span style={{ display: "block", fontWeight: 600 }}>{t("Only the owner can turn it on.")}</span> : null}
      </span>
      {m.isOwner && !closed && (
        <button
          type="button"
          onClick={() => void sw.turnOn()}
          disabled={!online || sw.busy}
          className="tap market-focus"
          style={{ minHeight: 34, padding: "0 12px", borderRadius: 10, background: c.high, color: c.onfill, border: 0, fontSize: px(12), fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0, opacity: !online || sw.busy ? 0.4 : 1, fontFamily: "inherit", cursor: "pointer" }}
        >
          {t("Turn on")}
        </button>
      )}
      {sw.toast}
    </div>
  );
}

/**
 * The store's Products page (D-12): the four B-MA tabs in the same header,
 * forced to the store lane. `tab` comes from StoreProductsPage's `?tab=`.
 */
export function StoreMarketPanel({ title, tab, onTab }: { title: string; tab: MarketTabKey; onTab: (k: MarketTabKey) => void }) {
  return (
    <MarketProvider forceKind="store">
      <MarketTabsScreen title={title} tab={tab} onTab={onTab} />
    </MarketProvider>
  );
}
