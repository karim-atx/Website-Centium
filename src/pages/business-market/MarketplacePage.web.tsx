import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { FOCUS_CSS } from "../../components/market/usePress";
import { MarketSkeleton } from "../../components/market/MarketStates";
import { BizShareButton } from "../../components/share/business/BizShareButton";
import { fetchRatingLine } from "../../components/share/business/useBizBrand";
import { useWebLayout } from "../../components/web/useWebLayout";
import { MarketWebType } from "../../components/market/webType";
import { WebSegmented } from "../business-analytics/AnalyticsParts.web";
import { MarketProvider, MARKET_TAB_KEYS, tabKeyOf, useMarket, type MarketTabKey } from "./MarketContext";
import { HiddenBanner } from "./MarketplacePage";
import { OverviewWeb } from "./Overview.web";
import { ShowcaseManager } from "./ShowcaseManager";
import { OffersTabWeb } from "./OffersWeb.web";
import { PerformanceTabWeb } from "./PerformanceWeb.web";
import PhotosPage from "./PhotosPage";
import PreviewPage from "./PreviewPage";
import SeeAllPage from "./SeeAllPage";
import OfferEditorPage from "./OfferEditorPage";
import { t } from "../../i18n/core";

// Website viewport v1 · WB-MA Marketplace tabs (WB-MA Marketplace Web v2),
// from 1024px wide, for a gym or a classes business (a store's Marketplace is
// its Products page). The page header (64: "Marketplace", the line, the 40
// share button at the end) and the segmented tabs (40, full width) over the
// tab. Overview (WB-MA.1) has its web columns (Overview.web); Showcase
// (WB-MA.2) its list-detail with the docked editor (ShowcaseManager reads
// MarketWebType and draws ShowcaseWeb); Offers (WB-MA.3) its three columns
// (OffersWeb); Performance (WB-MA.4) its offer charts and Listing
// (PerformanceWeb). The other
// Marketplace routes (photos, preview, See all, the offer editor) keep their
// mobile pages in the shell's centred column. The tab lives in ?tab= as on
// mobile; the mobile Marketplace page is not touched.


export default function MarketRoutesWeb() {
  return (
    <Routes>
      <Route index element={<MarketplacePageWeb />} />
      <Route path="photos" element={<PhotosPage />} />
      <Route path="preview" element={<PreviewPage />} />
      <Route path="performance/:which" element={<SeeAllPage />} />
      <Route path="offers/new" element={<OfferEditorPage />} />
      <Route path="offers/:offerId" element={<OfferEditorPage />} />
      <Route path="*" element={<Navigate to="/app/business/marketplace" replace />} />
    </Routes>
  );
}

function MarketplacePageWeb() {
  return (
    <MarketProvider>
      <Body />
    </MarketProvider>
  );
}

function Body() {
  const m = useMarket();
  const { kind, kindKnown } = m;
  const { rail } = useWebLayout();
  const [params, setParams] = useSearchParams();
  const tab = tabKeyOf(params.get("tab"), "overview");
  if (kindKnown && kind === "store") {
    const rest = new URLSearchParams(params);
    rest.set("tab", tab);
    return <Navigate to={`/app/business/products?${rest.toString()}`} replace />;
  }
  const labels: Record<MarketTabKey, string> = { overview: t("Overview"), showcase: t("Showcase"), offers: t("Offers"), perf: t("Performance") };
  const setTab = (k: MarketTabKey) => {
    const next = new URLSearchParams(params);
    if (k === "overview") next.delete("tab");
    else next.set("tab", k);
    setParams(next, { replace: true });
  };

  return (
    <div data-market="web" style={{ color: "#241F1B", lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <header style={{ height: 64, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "0 32px", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", whiteSpace: "nowrap" }}>{t("Marketplace")}</h1>
          {kindKnown && (
            <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{m.v.subtitle}</p>
          )}
        </div>
        <BizShareButton label={t("Share your profile: Find us on Centium")} getData={async (id) => ({ t: "profile", d: { rating: await fetchRatingLine(id) } })} />
      </header>
      <div style={{ maxWidth: 1280, boxSizing: "border-box", padding: 32 }}>
        <WebSegmented label={t("Marketplace")} items={MARKET_TAB_KEYS.map((k) => ({ key: k, label: labels[k] }))} active={tab} onChange={(k) => setTab(k)} />
        <div role="tabpanel" style={{ marginTop: 24 }}>
          {!m.kindKnown && m.loading ? (
            <MarketSkeleton radius={24} rows={3} count={2} label={t("Loading your marketplace")} />
          ) : tab === "overview" ? (
            <OverviewWeb rail={rail} />
          ) : (
            <MarketWebType.Provider value={rail ? "rail" : "wide"}>
              <HiddenBanner />
              {tab === "showcase" ? <ShowcaseManager /> : tab === "offers" ? <OffersTabWeb /> : <PerformanceTabWeb />}
            </MarketWebType.Provider>
          )}
        </div>
      </div>
    </div>
  );
}
