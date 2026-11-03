import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { OffersList } from "../../components/market/offers/OffersList";
import { useMarket } from "./MarketContext";
import { CapsLabel } from "./listingParts";
import type { OffersFlashState } from "./OffersManager";
import { PromotionsTab } from "./PromotionsTab";
import { t } from "../../i18n/core";

// Website viewport v1 · WB-MA.3 Offers (WB-MA Marketplace Web v2,
// `isOffers` + offersVals()), for a gym or classes business inside the web
// Marketplace (MarketWebType set): three equal columns, gap 24 —
// 1. Point offers (the shared OffersList: caps + Create offer, the offer
//    rows, the dashed empty card) and Worth promoting under it;
// 2. Your promotions (caps, Create promotion in the 44 header row, the cards);
// 3. Offers on your listing (caps in a 44 row, the listing cards, Add an
//    offer, Featured on Explore).
// The blocks, sheets, menus and dialogs are PromotionsTab's (its `layout`);
// the mobile tab (OffersTab) is unchanged. The columns fill the window under
// the tabs (100dvh less 192, as the Showcase) so an empty column's dashed
// card stretches as drawn; a long column scrolls the page. UNSPECIFIED: the
// board draws Offers at 1440 only; at 1024 the three columns stay (277 wide)
// and Create promotion wraps under its caps when they do not fit.

const FILL = "max(560px, calc(100dvh - 192px))";
const COL: React.CSSProperties = { minWidth: 0, display: "flex", flexDirection: "column", gap: 12 };
const HEAD: React.CSSProperties = { flex: "none", minHeight: 44, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 };

export function OffersTabWeb() {
  const mk = useMarket();
  const navigate = useNavigate();
  const location = useLocation();
  const [flash] = useState<string | null>(() => (location.state as OffersFlashState | null)?.offerFlash ?? null);

  // Show the strip once: drop it from history so a reload doesn't repeat it (as OffersTab).
  useEffect(() => {
    if ((location.state as OffersFlashState | null)?.offerFlash) navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, navigate]);

  const businessId = mk.business?.id ?? null;
  return (
    <div data-offers="web">
      <style>{".ofw-btn:not(:disabled):hover{background:#F0EDF9}"}</style>
      <PromotionsTab
        layout={(b) => (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24, minHeight: FILL }}>
            <div style={COL}>
              <OffersList
                variant="business"
                owner={businessId ? { variant: "business", businessId } : null}
                canManage={mk.can("marketing")}
                onCreate={() => navigate(`${mk.base}/offers/new`)}
                onOpen={(id) => navigate(`${mk.base}/offers/${encodeURIComponent(id)}`)}
                flash={flash}
              />
              {b.worth}
            </div>
            <section aria-label={t("Your promotions")} style={COL}>
              <div style={HEAD}>
                <CapsLabel style={{ whiteSpace: "nowrap" }}>{t("Your promotions")}</CapsLabel>
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={b.createPromotion.onClick}
                  disabled={b.createPromotion.disabled}
                  className="ofw-btn market-focus"
                  style={{ minHeight: 40, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(36,31,27,0.11)", background: "transparent", color: "#7D6BB5", fontSize: 15, lineHeight: "24px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 14px", whiteSpace: "nowrap", flex: "none", fontFamily: "inherit", cursor: b.createPromotion.disabled ? "default" : "pointer", opacity: b.createPromotion.disabled ? 0.4 : 1 }}
                >
                  <Plus size={20} strokeWidth={2.4} aria-hidden />
                  {t("Create promotion")}
                </button>
              </div>
              {b.promos}
            </section>
            <section aria-label={t("Offers on your listing")} style={COL}>
              <div style={HEAD}>
                <CapsLabel>{t("Offers on your listing")}</CapsLabel>
              </div>
              {b.listing}
              {b.addOffer}
              {b.featured}
            </section>
          </div>
        )}
      />
    </div>
  );
}
