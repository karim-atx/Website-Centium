import { Navigate, useSearchParams } from "react-router-dom";
import { EyeOff } from "lucide-react";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { MarketProvider, useMarket } from "./MarketContext";
import { lh, MBlock, px } from "./kit";
import { ListingTab } from "./ListingTab";
import { SpotsTab } from "./SpotsTab";
import { DayPassesTab } from "./DayPassesTab";
import { PerformanceTab } from "./PerformanceTab";
import { PromotionsTab } from "./PromotionsTab";
import { useListingSwitch } from "./useListingSwitch";

// MA1 · Marketplace (BizMarketV7 `isMain`, source lines 25-249): title,
// subtitle per type, the four tabs (Listing · Open spots / Day passes ·
// Performance · Promotions), the hidden banner on every tab but Listing
// (MA1-048) and the tab body. Store does not come here: its Listing,
// Performance and Promotions live under Products (MA1-067, V6-54).
//
// REPLACES BusinessMarketplaceTab (deleted). Its two live features are kept:
// discounts (business_discounts) as "Offers on your listing" with an
// "Add an offer" row (MA1-007 OF1-OF3), and the offerings form and list
// (business_offerings) as the Listing tab's "Offerings" card (MA1-001 K1).

export type MarketTab = "listing" | "spots" | "perf" | "promo";
const KEYS: MarketTab[] = ["listing", "spots", "perf", "promo"];

export default function MarketplacePage() {
  return (
    <MarketProvider>
      <MarketplaceBody />
    </MarketProvider>
  );
}

function MarketplaceBody() {
  const m = useMarket();
  const { c, v, kind, kindKnown } = m;
  const { accessibility } = useApp();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as MarketTab | null;
  const tab: MarketTab = raw && KEYS.includes(raw) ? raw : "listing";

  if (kindKnown && kind === "store") return <Navigate to={`/app/business/products${raw === "perf" ? "?tab=performance" : raw === "promo" ? "?tab=promotions" : "?tab=listing"}`} replace />;

  // The subtitle, the second tab and every tab's wording are per type. Until
  // the lane is known (kind is only bizKindOf's "store" fallback) the header
  // holds them as skeletons; if the read settles with no row and no type,
  // the page is the Listing tab's own state (the profile gate, or the error
  // card) under the bare title, since nothing else exists without a row.
  if (!kindKnown) {
    const title = <h1 style={{ fontSize: px(27), fontWeight: 800, letterSpacing: "-0.022em", lineHeight: lh(34), color: c.ink }}>Marketplace</h1>;
    if (m.loading) {
      return (
        <div data-market style={{ color: c.ink, marginTop: -4 }} aria-busy="true" aria-label="Loading your marketplace">
          {title}
          <MBlock c={c} h={14} r={7} style={{ width: "62%", marginTop: 8.5 }} />
          <MBlock c={c} h={40} r={12} style={{ margin: "18px 0 18px" }} />
          <MBlock c={c} h={105.5} style={{ marginBottom: 12 }} />
          <MBlock c={c} h={352} />
        </div>
      );
    }
    return (
      <div data-market style={{ color: c.ink, marginTop: -4 }}>
        {title}
        <div style={{ marginTop: 18 }}>
          <ListingTab />
        </div>
      </div>
    );
  }

  const items = [
    { key: "listing", label: "Listing" },
    { key: "spots", label: v.spotsTab },
    { key: "perf", label: "Performance" },
    { key: "promo", label: "Promotions" },
  ];

  return (
    <div data-market style={{ color: c.ink, marginTop: -4 }}>
      <h1 style={{ fontSize: px(27), fontWeight: 800, letterSpacing: "-0.022em", lineHeight: lh(34), color: c.ink }}>Marketplace</h1>
      <p style={{ fontSize: px(13), fontWeight: 500, color: c.faint, marginTop: 4, lineHeight: lh(19) }}>{v.subtitle}</p>
      <SegmentedTabs
        items={items}
        activeKey={tab}
        onChange={(k) => setParams(k === "listing" ? {} : { tab: k }, { replace: true })}
        size="compact"
        labelSize={12}
        wrapLabels
        // Larger text (O6): four one-word labels no longer fit 82.75 each, so the track scrolls.
        scroll={!!accessibility.largerText}
        trackStyle={{ margin: "16px 0 18px" }}
      />
      <div role="tabpanel" aria-label={items.find((i) => i.key === tab)?.label}>
        {tab !== "listing" && <HiddenBanner />}
        {tab === "listing" && <ListingTab />}
        {tab === "spots" && (kind === "gym" ? <DayPassesTab /> : <SpotsTab />)}
        {tab === "perf" && <PerformanceTab />}
        {tab === "promo" && <PromotionsTab />}
      </div>
    </div>
  );
}

/** MA1-048 row 1: shown on Open spots, Performance and Promotions while the listing is off. */
export function HiddenBanner() {
  const m = useMarket();
  const { c, v, business } = m;
  const online = useOnline();
  const sw = useListingSwitch();
  if (!business || business.active) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 16, background: c.soft, border: `1px solid ${c.border}`, padding: "12px 14px", marginBottom: 16 }}>
      <span style={{ width: 32, height: 32, borderRadius: 999, background: c.card, color: c.faint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <EyeOff size={16} strokeWidth={2.2} aria-hidden />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: px(13), fontWeight: 800, color: c.ink, lineHeight: lh(19.5) }}>Hidden from Explore</span>
        <span style={{ display: "block", fontSize: px(11.5), color: c.inkSoft, lineHeight: lh(16) }}>{v.bannerBody}</span>
        {/* B7: Show on Explore is a business_profiles write, the owner's alone. */}
        {!m.isOwner && <span style={{ display: "block", fontSize: px(11), color: c.faint, lineHeight: lh(15), marginTop: 2 }}>Only the owner can turn it on.</span>}
      </span>
      {m.isOwner && (
      <button
        type="button"
        onClick={() => void sw.turnOn()}
        disabled={!online || !m.isOwner || sw.busy}
        className="tap"
        style={{ height: 34, padding: "0 12px", borderRadius: 10, background: c.fill, color: c.onFill, border: 0, display: "flex", alignItems: "center", fontSize: px(12), fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0, opacity: !online || !m.isOwner ? 0.4 : 1 }}
      >
        Turn on
      </button>
      )}
      {sw.toast}
    </div>
  );
}

/** For the Store Products page: the same tab bodies inside its own header and tabs. */
export function StoreMarketPanel({ tab }: { tab: "listing" | "performance" | "promotions" }) {
  return (
    <MarketProvider forceKind="store">
      {tab !== "listing" && <HiddenBanner />}
      {tab === "listing" && <ListingTab />}
      {tab === "performance" && <PerformanceTab />}
      {tab === "promotions" && <PromotionsTab />}
    </MarketProvider>
  );
}
