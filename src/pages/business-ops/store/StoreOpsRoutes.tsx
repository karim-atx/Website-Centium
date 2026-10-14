import { Navigate, Route, Routes } from "react-router-dom";
import { useBusinessNavKind } from "../../../components/navigation/useBusinessNavKind";
import BusinessMarketplaceTab from "../../marketplace/BusinessMarketplaceTab";
import StoreOrdersPage from "./StoreOrdersPage";
import OrderDetailPage from "./OrderDetailPage";
import ReturnDetailPage from "./ReturnDetailPage";
import OrdersListPage from "./OrdersListPage";
import StoreProductsPage from "./products/StoreProductsPage";

// v6 Batch 4 · Store routes (one App.tsx line each):
//   /app/business/orders/*   the order detail, return detail and See all lists
//   /app/business/products/* Store › Products (store kinds; others keep the
//                            listings page that route always showed)
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
  if (kind === "store" || kind === "appointments") return <StoreProductsPage />;
  return <BusinessMarketplaceTab />;
}

export { StoreOrdersPage };
