import { Route, Routes } from "react-router-dom";
import StoreFrontPage from "./StoreFrontPage";
import ProductPage from "./ProductPage";
import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import MyOrdersPage from "./MyOrdersPage";
import MyOrderPage from "./MyOrderPage";
import ReturnRequestPage from "./ReturnRequestPage";

// V6-49 · the customer side of stores, /app/store/* (one App.tsx line).
// Static segments first for the reader; React Router ranks them above :id.
export default function StoreRoutes() {
  return (
    <Routes>
      <Route path="cart" element={<CartPage />} />
      <Route path="checkout" element={<CheckoutPage />} />
      <Route path="orders" element={<MyOrdersPage />} />
      <Route path="orders/:orderId" element={<MyOrderPage />} />
      <Route path="orders/:orderId/return" element={<ReturnRequestPage />} />
      <Route path=":businessId" element={<StoreFrontPage />} />
      <Route path=":businessId/p/:productId" element={<ProductPage />} />
    </Routes>
  );
}
