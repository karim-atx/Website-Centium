import { Navigate, Route, Routes } from "react-router-dom";
import MarketplacePage from "./MarketplacePage";
import PhotosPage from "./PhotosPage";
import PreviewPage from "./PreviewPage";
import SeeAllPage from "./SeeAllPage";
import OfferEditorPage from "./OfferEditorPage";

// /app/business/marketplace/* (Classes and Gym) and the same sub-pages under
// /app/business/products/* for a Store (mounted from StoreProductsRoute):
//   index              the four tabs (?tab=spots | perf | promo)
//   photos             MA1-033 photo manager
//   preview            MA1-026 Preview as client
//   performance/:which OURS-MA1-performance-see-all (top | new)
//   offers/new         B-MA.3 Create offer → Preview and publish (W3)
//   offers/:offerId    the same editor for an existing offer (W3)
// The Redeem a voucher page (B-MA.4) is /app/business/redeem (App.tsx), so
// front-desk staff reach it too (D-25).

export default function MarketRoutes() {
  return (
    <Routes>
      <Route index element={<MarketplacePage />} />
      <Route path="photos" element={<PhotosPage />} />
      <Route path="preview" element={<PreviewPage />} />
      <Route path="performance/:which" element={<SeeAllPage />} />
      <Route path="offers/new" element={<OfferEditorPage />} />
      <Route path="offers/:offerId" element={<OfferEditorPage />} />
      <Route path="*" element={<Navigate to="/app/business/marketplace" replace />} />
    </Routes>
  );
}
