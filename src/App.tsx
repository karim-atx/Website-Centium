import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { Layout } from "./components/navigation/Layout";
import { MarketingLayout } from "./marketing/layouts/MarketingLayout";
import { Home as MarketingHome } from "./marketing/pages/Home";
import { Product as MarketingProduct } from "./marketing/pages/Product";
import { Pricing as MarketingPricing } from "./marketing/pages/Pricing";
import { Business as MarketingBusiness } from "./marketing/pages/Business";
import { About as MarketingAbout } from "./marketing/pages/About";
import { Contact as MarketingContact } from "./marketing/pages/Contact";
import { Privacy as MarketingPrivacy } from "./marketing/pages/legal/Privacy";
import { Terms as MarketingTerms } from "./marketing/pages/legal/Terms";
import Onboarding from "./pages/onboarding/Onboarding";
import Home from "./pages/home/Home";
import Food from "./pages/food/Food";
import Workout from "./pages/workout/Workout";
import Health from "./pages/health/Health";
import Mind from "./pages/mind/Mind";
import Professionals from "./pages/professionals/Professionals";
import ProfessionalDetail from "./pages/professionals/ProfessionalDetail";
import CalendarTab from "./pages/professionals/CalendarTab";
import WorkoutTemplateBuilderTab from "./pages/professionals/WorkoutTemplateBuilderTab";
import MealPlanBuilderTab from "./pages/professionals/MealPlanBuilderTab";
import MessagesTab from "./pages/professionals/MessagesTab";
import HealthMetricsTab from "./pages/professionals/HealthMetricsTab";
import Marketplace from "./pages/marketplace/Marketplace";
import MarketplaceCategoryPage from "./pages/marketplace/MarketplaceCategoryPage";
import BusinessAnalyticsTab from "./pages/marketplace/BusinessAnalyticsTab";
import BusinessMarketplaceTab from "./pages/marketplace/BusinessMarketplaceTab";
import BusinessProfileTab from "./pages/marketplace/BusinessProfileTab";
import BusinessMessagesTab from "./pages/marketplace/BusinessMessagesTab";
import BusinessEmployeesTab from "./pages/marketplace/BusinessEmployeesTab";
import BusinessClassesTab from "./pages/marketplace/BusinessClassesTab";
import Profile from "./pages/profile/Profile";
import Subscription from "./pages/subscription/Subscription";
import More from "./pages/profile/More";
import Settings from "./pages/settings/Settings";

const RequireOnboarded: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useApp();
  if (!user.onboarded) return <Navigate to="/app/onboarding" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing site */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<MarketingHome />} />
        <Route path="/product" element={<MarketingProduct />} />
        <Route path="/pricing" element={<MarketingPricing />} />
        <Route path="/business" element={<MarketingBusiness />} />
        <Route path="/about" element={<MarketingAbout />} />
        <Route path="/contact" element={<MarketingContact />} />
        <Route path="/legal/privacy" element={<MarketingPrivacy />} />
        <Route path="/legal/terms" element={<MarketingTerms />} />
      </Route>

      {/* Customer portal (authenticated app shell) */}
      <Route path="/app/onboarding" element={<Onboarding />} />
      <Route
        element={
          <RequireOnboarded>
            <Layout />
          </RequireOnboarded>
        }
      >
        <Route path="/app" element={<Home />} />
        <Route path="/app/food" element={<Food />} />
        <Route path="/app/workout" element={<Workout />} />
        <Route path="/app/health" element={<Health />} />
        <Route path="/app/mind" element={<Mind />} />
        <Route path="/app/professionals" element={<Professionals />} />
        <Route path="/app/professionals/calendar" element={<CalendarTab />} />
        <Route path="/app/professionals/templates" element={<WorkoutTemplateBuilderTab />} />
        <Route path="/app/professionals/meal-plans" element={<MealPlanBuilderTab />} />
        <Route path="/app/professionals/messages" element={<MessagesTab />} />
        <Route path="/app/professionals/health-metrics" element={<HealthMetricsTab />} />
        <Route path="/app/professionals/:id" element={<ProfessionalDetail />} />
        <Route path="/app/marketplace" element={<Marketplace />} />
        <Route path="/app/marketplace/:category" element={<MarketplaceCategoryPage />} />
        <Route path="/app/business/analytics" element={<BusinessAnalyticsTab />} />
        <Route path="/app/business/marketplace" element={<BusinessMarketplaceTab />} />
        <Route path="/app/business/profile" element={<BusinessProfileTab />} />
        <Route path="/app/business/messages" element={<BusinessMessagesTab />} />
        <Route path="/app/business/employees" element={<BusinessEmployeesTab />} />
        <Route path="/app/business/classes" element={<BusinessClassesTab />} />
        <Route path="/app/profile" element={<Profile />} />
        <Route path="/app/subscription" element={<Subscription />} />
        <Route path="/app/more" element={<More />} />
        <Route path="/app/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
