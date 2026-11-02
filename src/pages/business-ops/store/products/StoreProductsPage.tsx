import { useSearchParams, useNavigate } from "react-router-dom";
import { MarketProvider, tabKeyOf, type MarketTabKey } from "../../../business-market/MarketContext";
import { StoreMarketPanel } from "../../../business-market/MarketplacePage";
import { ShowcaseManager } from "../../../business-market/ShowcaseManager";
import { BackHeader } from "../../../business-market/listingParts";
import { t } from "../../../../i18n/core";

// Market + Share 3.0 · W3 · Store › Products (D-12: a store keeps Products in
// its navbar, and the B-MA tabs sit inside it, Products = Showcase). The page
// is the Marketplace's tabbed header and bodies for the store lane:
// Overview · Showcase · Offers · Performance. Showcase is the default here
// (the navbar's "Add product" and older links land on the products). The
// old Products-page keys keep working: products → Showcase, listing →
// Overview, performance → Performance, promotions → Offers; `?category=`
// opens one category's full list (OP1-008 S3, KEPT) with a back header.
// Products are business_offerings rows (V6-50); the editor is the B-MA.2 Edit
// item sheet (ProductEditorSheet).

export default function StoreProductsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const category = params.get("category");
  const tab = tabKeyOf(params.get("tab"), "showcase");

  if (category) {
    return (
      <MarketProvider forceKind="store">
        <div style={{ marginTop: -4 }}>
          <BackHeader eyebrow={t("Products")} title={category} onBack={() => navigate("/app/business/products")} backLabel={t("Back to Products")} />
          <ShowcaseManager section={category} />
        </div>
      </MarketProvider>
    );
  }

  const onTab = (k: MarketTabKey) => {
    const next = new URLSearchParams(params);
    next.delete("category");
    if (k === "showcase") next.delete("tab");
    else next.set("tab", k);
    setParams(next, { replace: true });
  };

  return <StoreMarketPanel title={t("Products")} tab={tab} onTab={onTab} />;
}
