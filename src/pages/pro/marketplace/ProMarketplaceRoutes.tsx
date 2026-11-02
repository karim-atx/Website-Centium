import React from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { t, tk } from "../../../i18n/core";
import { OverviewTab } from "./Overview";
import { ShowcaseTab } from "./Showcase";
import { OffersTab } from "./Offers";
import { OpportunitiesTab } from "./Opportunities";
import { PerformanceTab } from "./Performance";
import OfferEditorPage from "./OfferEditor";
import RedeemPage from "./Redeem";
import MyApplicationsPage from "./opportunities/MyApplications";
import MyWorkPage from "./opportunities/MyWork";

// Market + Share 3.0 · W3 · the professional Marketplace (P-MA, HANDOVER §4
// "Professional Marketplace", §13 routes), /app/pro/marketplace/*:
//   :tab              overview | showcase | offers | opportunities | performance
//   offers/new        P-MA.3 Create offer → Preview and publish
//   offers/:offerId   the same editor for an existing offer
//   redeem            P-MA.4 Redeem a voucher
//   opportunities/applications  P-MA.5.2 My applications (W4)
//   opportunities/work          P-MA.5.3 My work (W4)
// Entry: More › Explore (D-39); the header's back chevron returns to More.
//
// The tabbed header is Professional Marketplace Screens lines 30–42: a row
// (gap 6, margin-left −7) with a 36 back chevron (18, stroke 2, --ink2), the
// title 27/34 800 −0.022em and the subtitle 13/19 500 --faint (margin-top 4);
// the track margin 16 0 18, padding 4, gap 3, radius 16, --segtrack; tabs
// flex 1 1 auto, 38 tall, padding 0 3, radius 12, 10.5 / 700 nowrap, active
// --segactive / --onfill, idle --segidle / --segink.

export const PRO_MARKET_HOME = "/app/pro/marketplace";

export const PRO_MARKET_TABS = [
  { key: "overview", label: tk("Overview") },
  { key: "showcase", label: tk("Showcase") },
  { key: "offers", label: tk("Offers") },
  { key: "opportunities", label: tk("Opportunities") },
  { key: "performance", label: tk("Performance") },
] as const;

export type ProMarketTab = (typeof PRO_MARKET_TABS)[number]["key"];

const isTab = (v: string | undefined): v is ProMarketTab => PRO_MARKET_TABS.some((x) => x.key === v);

export default function ProMarketplaceRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to={`${PRO_MARKET_HOME}/overview`} replace />} />
      <Route path="offers/new" element={<OfferEditorPage />} />
      <Route path="offers/:offerId" element={<OfferEditorPage />} />
      <Route path="redeem" element={<RedeemPage />} />
      <Route path="opportunities/applications" element={<MyApplicationsPage />} />
      <Route path="opportunities/work" element={<MyWorkPage />} />
      <Route path=":tab" element={<ProMarketplacePage />} />
      <Route path="*" element={<Navigate to={`${PRO_MARKET_HOME}/overview`} replace />} />
    </Routes>
  );
}

function ProMarketplacePage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const back = useBack("/app/more");
  const dark = useIsDark();
  const m = marketPalette(dark);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  if (!isTab(tab)) return <Navigate to={`${PRO_MARKET_HOME}/overview`} replace />;
  const go = (k: ProMarketTab) => navigate(`${PRO_MARKET_HOME}/${k}`, { replace: true });

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = PRO_MARKET_TABS.length;
    const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    go(PRO_MARKET_TABS[j].key);
    refs.current[j]?.focus();
  };

  return (
    <div data-pro-market style={{ color: m.ink, marginTop: -4 }}>
      <style>{FOCUS_CSS}</style>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginInlineStart: -7 }}>
        <button
          type="button"
          onClick={back}
          aria-label={t("Back to More")}
          className="market-focus hit"
          style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: m.ink2, background: "transparent", border: 0, padding: 0, cursor: "pointer", }}
        >
          <ChevronLeft size={18} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: textPx(27), fontWeight: 800, letterSpacing: "-0.022em", lineHeight: linePx(34), margin: 0 }}>{t("Marketplace")}</h1>
          <p style={{ fontSize: textPx(13), fontWeight: 500, color: m.faint, marginTop: 4, lineHeight: linePx(19) }}>{t("How clients and gyms find you")}</p>
        </div>
      </div>
      <div role="tablist" aria-label={t("Marketplace")} style={{ margin: "16px 0 18px", display: "flex", gap: 3, padding: 4, borderRadius: 16, background: m.segtrack, overflowX: "auto", scrollbarWidth: "none" }}>
        {PRO_MARKET_TABS.map((tb, i) => {
          const on = tb.key === tab;
          return (
            <button
              key={tb.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`pm-tab-${tb.key}`}
              aria-selected={on}
              aria-controls={`pm-panel-${tb.key}`}
              tabIndex={on ? 0 : -1}
              onClick={() => go(tb.key)}
              onKeyDown={(e) => onKey(e, i)}
              className="market-focus hit"
              style={{
                flex: "1 1 auto",
                minHeight: 38,
                padding: "0 3px",
                borderRadius: 12,
                border: 0,
                background: on ? m.segactive : m.segidle,
                color: on ? m.onfill : m.segink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: textPx(10.5),
                fontWeight: 700,
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {t(tb.label)}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`pm-panel-${tab}`} aria-labelledby={`pm-tab-${tab}`}>
        {tab === "overview" && <OverviewTab />}
        {tab === "showcase" && <ShowcaseTab />}
        {tab === "offers" && <OffersTab />}
        {tab === "opportunities" && <OpportunitiesTab />}
        {tab === "performance" && <PerformanceTab />}
      </div>
    </div>
  );
}
