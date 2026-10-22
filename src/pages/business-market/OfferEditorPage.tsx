import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useBusiness } from "../../components/business-more/useBusiness";
import { OfferEditor } from "../../components/market/offers/OfferEditor";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { BackHeader } from "../../components/market/offers/parts";
import { ownerInitials } from "../../services/offers";
import type { OffersFlashState } from "./OffersManager";

// Market + Share 3.0 · W3 · B-MA.3 Create offer → Preview and publish
// (/app/business/marketplace/offers/new, or under /app/business/products for a
// store), and the same editor for an existing offer (offers/:offerId; an
// expired offer is read only, offer_expired). The back header reads "Offers /
// New offer", then "New offer / Preview"; Back returns to the Offers tab.

export default function OfferEditorPage() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const biz = useBusiness();
  const base = pathname.startsWith("/app/business/products") ? "/app/business/products" : "/app/business/marketplace";
  const list = `${base}?tab=offers`;
  const close = () => navigate(list);
  const isNew = !offerId || offerId === "new";

  if (!biz.business) {
    return (
      <div>
        <BackHeader eyebrow="Offers" title={isNew ? "New offer" : "Edit offer"} onBack={close} backLabel="Back to Offers" />
        {biz.loading ? <MarketSkeleton radius={20} rows={3} count={3} label="Loading offer" /> : <MarketError thing="your business" onRetry={biz.reload} />}
      </div>
    );
  }

  const b = biz.business;
  return (
    <OfferEditor
      key={offerId ?? "new"}
      variant="business"
      owner={{ variant: "business", businessId: b.id }}
      offerId={isNew ? null : (offerId ?? null)}
      previewOwner={{ name: b.name, initials: ownerInitials(b.name), logoUrl: b.logoUrl }}
      onClose={close}
      onDone={(flash) => navigate(list, { state: { offerFlash: flash } satisfies OffersFlashState })}
    />
  );
}
