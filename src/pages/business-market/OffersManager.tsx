import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OffersList } from "../../components/market/offers/OffersList";
import { Caps } from "../../components/market/offers/parts";
import { useMarket } from "./MarketContext";
import { PromotionsTab } from "./PromotionsTab";

// Market + Share 3.0 · W3 · B-MA.3 Offers tab (Business Marketplace Screens
// `offersList`): the drawn point offers first (the shared OffersList, its
// caps "Point offers" + "Create offer" → {base}/offers/new, the manager rows
// → {base}/offers/:id, the row menu's Pause / Resume), then, under a caps
// "Promotions" group, the live PromotionsTab unchanged (D-13: the perk,
// promotions, Featured placements, ?promote= and ?offer=new all keep
// working). {base} is /app/business/marketplace, or /app/business/products
// for a store (D-12).

/** The strip the editor hands back on its way here ("Offer published"). */
export interface OffersFlashState {
  offerFlash?: string;
}

export function OffersTab() {
  const mk = useMarket();
  const navigate = useNavigate();
  const location = useLocation();
  const [flash] = useState<string | null>(() => (location.state as OffersFlashState | null)?.offerFlash ?? null);

  // Show the strip once: drop it from history so a reload doesn't repeat it.
  useEffect(() => {
    if ((location.state as OffersFlashState | null)?.offerFlash) navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, navigate]);

  const businessId = mk.business?.id ?? null;
  return (
    <div>
      <OffersList
        variant="business"
        owner={businessId ? { variant: "business", businessId } : null}
        canManage={mk.can("marketing")}
        onCreate={() => navigate(`${mk.base}/offers/new`)}
        onOpen={(id) => navigate(`${mk.base}/offers/${encodeURIComponent(id)}`)}
        flash={flash}
      />
      <Caps style={{ marginTop: 24, marginBottom: 10 }}>Promotions</Caps>
      <PromotionsTab />
    </div>
  );
}
