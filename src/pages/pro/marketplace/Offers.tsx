import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OffersList } from "../../../components/market/offers/OffersList";

// Market + Share 3.0 · W3 · P-MA.3 Offers tab (Professional Marketplace
// Screens `ofList` / `ofEmpty`): the shared OffersList, professional copy and
// the drawn empty state. Create → /app/pro/marketplace/offers/new; a row →
// /app/pro/marketplace/offers/:offerId.

const HOME = "/app/pro/marketplace";

export function OffersTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [flash] = useState<string | null>(() => (location.state as { offerFlash?: string } | null)?.offerFlash ?? null);

  useEffect(() => {
    if ((location.state as { offerFlash?: string } | null)?.offerFlash) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  return (
    <OffersList
      variant="professional"
      owner={{ variant: "professional" }}
      canManage
      onCreate={() => navigate(`${HOME}/offers/new`)}
      onOpen={(id) => navigate(`${HOME}/offers/${encodeURIComponent(id)}`)}
      flash={flash}
    />
  );
}
