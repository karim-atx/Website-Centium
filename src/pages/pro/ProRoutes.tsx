import React from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useProSubtype } from "../../hooks/useProSubtype";
import { legacyProRedirect, slotRouteFor, PRO_ROUTES } from "../../components/pro/subtypeLanes";
import Home from "./Home";
import InviteClients from "./InviteClients";
import Clients from "./Clients";
import ClientPage from "./ClientPage";
import Calendar from "./Calendar";
import CalendarAvailability from "./CalendarAvailability";
import Library from "./Library";
import MealPlans from "./MealPlans";
import Insights from "./Insights";
import ProMarketplaceRoutes from "./marketplace/ProMarketplaceRoutes";

/**
 * Release 3 · every /app/pro route (FINAL_PLAN W1). Professionals only:
 * any other account goes to /app. Each page file is owned by its batch; the
 * routes here and in App.tsx stay as they are.
 *
 * Lane gating (HANDOVER d capability matrix; hidden means not rendered and not
 * fetched): Library is Full coaching's, Meal plans Nutrition's (Full coaching
 * has it inside Library), Insights Clinical overview's. Another lane's slot
 * route sends the professional to their own (slotRouteFor).
 */
const LaneSlot: React.FC<{ area: "library" | "meal-plans" | "insights"; children: React.ReactNode }> = ({ area, children }) => {
  const { lane } = useProSubtype();
  const { tab } = useParams();
  if (!lane) return null;
  const elsewhere = slotRouteFor(lane, area, tab);
  return elsewhere ? <Navigate to={elsewhere} replace /> : <>{children}</>;
};

export default function ProRoutes() {
  const { user } = useApp();
  const { lane } = useProSubtype();
  if (user.accountType !== "professional" || !lane) return <Navigate to="/app" replace />;
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="invite" element={<InviteClients />} />
      <Route path="clients" element={<Clients />} />
      <Route path="clients/:id/:tab?" element={<ClientPage />} />
      <Route path="calendar" element={<Calendar />} />
      <Route path="calendar/availability" element={<CalendarAvailability />} />
      <Route path="library/:tab?" element={<LaneSlot area="library"><Library /></LaneSlot>} />
      <Route path="meal-plans/:tab?" element={<LaneSlot area="meal-plans"><MealPlans /></LaneSlot>} />
      {/* Market + Share 3.0 W3: the professional Marketplace (P-MA), from More › Explore (D-39). */}
      <Route path="marketplace/*" element={<ProMarketplaceRoutes />} />
      <Route path="insights/:tab?" element={<LaneSlot area="insights"><Insights /></LaneSlot>} />
      <Route path="*" element={<Navigate to={PRO_ROUTES.home} replace />} />
    </Routes>
  );
}

/**
 * The old professional addresses, for one release (FINAL_PLAN W1, two-phase
 * removal 5). Professional accounts go to the new route for their lane;
 * everyone else gets `otherwise` (the client directory stays at
 * /app/professionals). Kept as static routes so "calendar" is never read as a
 * professional's id by /app/professionals/:id.
 */
export const ProOnlyRedirect: React.FC<{ otherwise: React.ReactNode }> = ({ otherwise }) => {
  const { user } = useApp();
  const { lane } = useProSubtype();
  const { pathname } = useLocation();
  if (user.accountType !== "professional" || !lane) return <>{otherwise}</>;
  return <Navigate to={legacyProRedirect(pathname.replace(/\/+$/, ""), lane)} replace />;
};

/** J1: a professional's /app is /app/pro (one canonical Home path). */
export const ProHomeRedirect: React.FC<{ otherwise: React.ReactNode }> = ({ otherwise }) => {
  const { user } = useApp();
  return user.accountType === "professional" ? <Navigate to={PRO_ROUTES.home} replace /> : <>{otherwise}</>;
};
