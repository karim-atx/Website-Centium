import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import PracticeInsights from "./PracticeInsights";
import PublicProfile from "./PublicProfile";
import EditProfile from "./EditProfile";
import Credentials from "./Credentials";
import Services from "./Services";
import WhereYouWork from "./WhereYouWork";
import Forms from "./Forms";
import Consent from "./Consent";
import Templates from "./Templates";
import NoteTemplates from "./NoteTemplates";
import Reviews from "./Reviews";
import CareNetwork from "./CareNetwork";
import Payments from "./Payments";
import Businesses from "./Businesses";
import BusinessDetail from "./BusinessDetail";

/**
 * Release 3 · the professional More pages, /app/more/* (MO1 v7 rows; FINAL_PLAN
 * W1 and W6). /app/more itself stays the More page every account shares.
 * Business accounts have their own More pages under /app/business/more; a
 * client has none here. Profile, Settings, Subscription, Messages, Explore
 * and Community keep their own routes.
 */
export default function MoreRoutes() {
  const { user } = useApp();
  if (user.accountType === "business") return <Navigate to="/app/business/more" replace />;
  if (user.accountType !== "professional") return <Navigate to="/app/more" replace />;
  return (
    <Routes>
      <Route path="practice-insights" element={<PracticeInsights />} />
      <Route path="public-profile" element={<PublicProfile />} />
      <Route path="edit-profile" element={<EditProfile />} />
      <Route path="credentials" element={<Credentials />} />
      <Route path="services" element={<Services />} />
      <Route path="where-you-work" element={<WhereYouWork />} />
      <Route path="forms" element={<Forms />} />
      <Route path="consent" element={<Consent />} />
      <Route path="templates" element={<Templates />} />
      <Route path="note-templates" element={<NoteTemplates />} />
      <Route path="reviews" element={<Reviews />} />
      <Route path="care-network" element={<CareNetwork />} />
      <Route path="payments" element={<Payments />} />
      <Route path="businesses" element={<Businesses />} />
      <Route path="businesses/:id" element={<BusinessDetail />} />
      <Route path="*" element={<Navigate to="/app/more" replace />} />
    </Routes>
  );
}
