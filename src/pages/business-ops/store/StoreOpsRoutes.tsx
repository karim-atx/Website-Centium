import { Navigate, Route, Routes } from "react-router-dom";
import { useBusinessNavKind } from "../../../components/navigation/useBusinessNavKind";
import PhotosPage from "../../business-market/PhotosPage";
import PreviewPage from "../../business-market/PreviewPage";
import SeeAllPage from "../../business-market/SeeAllPage";
import OfferEditorPage from "../../business-market/OfferEditorPage";
import StoreOrdersPage from "./StoreOrdersPage";
import OrderDetailPage from "./OrderDetailPage";
import ReturnDetailPage from "./ReturnDetailPage";
import OrdersListPage from "./OrdersListPage";
import StoreProductsPage from "./products/StoreProductsPage";

// v6 Batch 4 · Store routes (one App.tsx line each):
//   /app/business/orders/*   the order detail, return detail and See all lists
//   /app/business/products/* Store › Products (store kinds; Classes and Gym
//                            have no Products tab and go to Marketplace).
//                            Batch 5 (MA1): the Listing sub-pages Photos,
//                            Preview and the Performance See all pages.
// The Orders tab root itself is /app/business/operations (the navbar slot's
// one route, NAV-001 row 8): BusinessOperationsTab renders StoreOrdersPage
// for a store.

export function BusinessOrdersRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/app/business/operations" replace />} />
      <Route path="list/:which" element={<OrdersListPage />} />
      <Route path="returns/:returnId" element={<ReturnDetailPage />} />
      <Route path=":orderId" element={<OrderDetailPage />} />
    </Routes>
  );
}

export function StoreProductsRoute() {
  const kind = useBusinessNavKind();
  if (kind !== "store" && kind !== "appointments" && kind !== "unknown") return <Navigate to="/app/business/marketplace" replace />;
  return (
    <Routes>
      <Route index element={<StoreProductsPage />} />
      <Route path="photos" element={<PhotosPage />} />
      <Route path="preview" element={<PreviewPage />} />
      <Route path="performance/:which" element={<SeeAllPage />} />
      {/* Market + Share 3.0 W3: B-MA.3 offers, as under /app/business/marketplace. */}
      <Route path="offers/new" element={<OfferEditorPage />} />
      <Route path="offers/:offerId" element={<OfferEditorPage />} />
      <Route path="*" element={<Navigate to="/app/business/products" replace />} />
    </Routes>
  );
}

export { StoreOrdersPage };
