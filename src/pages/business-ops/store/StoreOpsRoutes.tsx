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
import OrdersPageWeb from "./OrdersPage.web";
import { withWeb } from "../../../components/web/withWeb";
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

// Website viewport v1 (WB-ST-OR, .1, .2): from 1024px wide the Orders tabs,
// an order and a return are one list-detail page at /app/business/orders
// (BusinessOperationsTab sends a store there on web). Below 1024 every route
// is the mobile one.
const OrdersIndex = withWeb(() => <Navigate to="/app/business/operations" replace />, OrdersPageWeb);
const OrderRoute = withWeb(OrderDetailPage, OrdersPageWeb);
const ReturnRoute = withWeb(ReturnDetailPage, OrdersPageWeb);

export function BusinessOrdersRoutes() {
  return (
    <Routes>
      <Route index element={<OrdersIndex />} />
      <Route path="list/:which" element={<OrdersListPage />} />
      <Route path="returns/:returnId" element={<ReturnRoute />} />
      <Route path=":orderId" element={<OrderRoute />} />
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
