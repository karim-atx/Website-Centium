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
import Marketplace from "./pages/marketplace/Marketplace";
import Profile from "./pages/profile/Profile";
import Subscription from "./pages/subscription/Subscription";
import More from "./pages/profile/More";

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
        <Route path="/professionals/:id" element={<ProfessionalDetail />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/more" element={<More />} />
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
