import { Navigate, Route, Routes } from "react-router-dom";
import MarketplacePage from "./MarketplacePage";
import PhotosPage from "./PhotosPage";
import PreviewPage from "./PreviewPage";
import SeeAllPage from "./SeeAllPage";

// /app/business/marketplace/* (Classes and Gym) and the same sub-pages under
// /app/business/products/* for a Store (mounted from StoreProductsRoute):
//   index              the four tabs (?tab=spots | perf | promo)
//   photos             MA1-033 photo manager
//   preview            MA1-026 Preview as client
//   performance/:which OURS-MA1-performance-see-all (top | new)

export default function MarketRoutes() {
  return (
    <Routes>
      <Route index element={<MarketplacePage />} />
      <Route path="photos" element={<PhotosPage />} />
      <Route path="preview" element={<PreviewPage />} />
      <Route path="performance/:which" element={<SeeAllPage />} />
      <Route path="*" element={<Navigate to="/app/business/marketplace" replace />} />
    </Routes>
  );
}
