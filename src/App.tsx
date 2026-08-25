import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { Layout } from "./components/navigation/Layout";
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
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        element={
          <RequireOnboarded>
            <Layout />
          </RequireOnboarded>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/food" element={<Food />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/health" element={<Health />} />
        <Route path="/mind" element={<Mind />} />
        <Route path="/professionals" element={<Professionals />} />
        <Route path="/professionals/calendar" element={<CalendarTab />} />
        <Route path="/professionals/templates" element={<WorkoutTemplateBuilderTab />} />
        <Route path="/professionals/meal-plans" element={<MealPlanBuilderTab />} />
        <Route path="/professionals/messages" element={<MessagesTab />} />
        <Route path="/professionals/health-metrics" element={<HealthMetricsTab />} />
        <Route path="/professionals/:id" element={<ProfessionalDetail />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/:category" element={<MarketplaceCategoryPage />} />
        <Route path="/business/analytics" element={<BusinessAnalyticsTab />} />
        <Route path="/business/marketplace" element={<BusinessMarketplaceTab />} />
        <Route path="/business/profile" element={<BusinessProfileTab />} />
        <Route path="/business/messages" element={<BusinessMessagesTab />} />
        <Route path="/business/employees" element={<BusinessEmployeesTab />} />
        <Route path="/business/classes" element={<BusinessClassesTab />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/more" element={<More />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
