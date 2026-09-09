import React, { useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { Layout } from "./components/navigation/Layout";
import { MarketingLayout } from "./marketing/layouts/MarketingLayout";
import { Home as MarketingHome } from "./marketing/pages/Home";
import { Product as MarketingProduct } from "./marketing/pages/Product";
import { Pricing as MarketingPricing } from "./marketing/pages/Pricing";
import { Business as MarketingBusiness } from "./marketing/pages/Business";
import { Contact as MarketingContact } from "./marketing/pages/Contact";
import { Legal as MarketingLegal } from "./marketing/pages/Legal";
import { NotFound as MarketingNotFound } from "./marketing/pages/NotFound";
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
import BusinessOperationsTab from "./pages/marketplace/BusinessOperationsTab";
import BusinessGymTab from "./pages/marketplace/BusinessGymTab";
import BusinessCalendarTab from "./pages/marketplace/BusinessCalendarTab";
import Profile from "./pages/profile/Profile";
import Subscription from "./pages/subscription/Subscription";
import More from "./pages/profile/More";
import ClientCalendarTab from "./pages/profile/ClientCalendarTab";
import ForumTab from "./pages/profile/ForumTab";
import Settings from "./pages/settings/Settings";
import ResetPassword from "./pages/auth/ResetPassword";

const RouteLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <p className="text-sm text-charcoal-faint">Loading…</p>
  </div>
);

const RequireOnboarded: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authUserId, authReady, profileReady, recoveryPending } = useApp();

  // Wait for the server profile before deciding. `user.onboarded` starts from
  // localStorage, which is per-browser and not keyed by account — redirecting
  // on it directly is what sent genuinely-onboarded users back through
  // onboarding after a sign-out or on a second account in the same browser.
  // Once profileReady is true, `user.onboarded` has been overwritten by
  // profiles.onboarded, so it is the server's answer rather than the cache's.
  if (!authReady || !profileReady) return <RouteLoading />;

  // THE SESSION CHECK, AND IT HAS TO COME BEFORE `user.onboarded`.
  //
  // This guard used to have no session check at all. `user.onboarded` is
  // seeded from localStorage, which outlives a session: sign-out only looked
  // safe because it happens to wipe that key. Any other way a session ends —
  // an expired token, a revoked session, or simply closing the browser with
  // "Remember me" off, which leaves a session cookie behind but not a
  // persistent one — left `onboarded: true` in storage with no session, and
  // this guard waved it straight through to the dashboard. Verified: with the
  // Supabase cookie cleared and localStorage intact, /app rendered the
  // professional dashboard and /app/health rendered body metrics, to a
  // caller the server would not answer a single query for.
  //
  // Nothing server-side was ever at risk — every table returns 42501 without
  // a JWT — but the cached shell, the account's name and email, and whatever
  // the app had hydrated into localStorage were all on screen. That last part
  // grows every time a feature moves from local state to Supabase, since
  // hydration writes the server's answer back into the same storage.
  if (!authUserId) return <Navigate to="/app/onboarding" replace />;

  // A recovery session may do exactly one thing: set a new password. It is a
  // real session, so without this it would sail straight through — which is
  // how an emailed link, or a forwarded one, handed over a working account.
  if (recoveryPending) return <Navigate to="/app/reset-password" replace />;

  if (!user.onboarded) return <Navigate to="/app/onboarding" replace />;
  return <>{children}</>;
};

/**
 * The inverse guard, and the one that was missing.
 *
 * RequireOnboarded stops an un-onboarded user getting INTO the app. Nothing
 * stopped an already-onboarded user getting back into onboarding — and the
 * onboarding route is where a signed-out user lands, so signing in there as
 * an existing account walked them through the whole flow again. AuthStep only
 * knows "a session arrived, advance a step"; it never asked whether this
 * person had already finished.
 */
const RedirectIfOnboarded: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authUserId, authReady, profileReady, recoveryPending } = useApp();

  // Decided once PER ACCOUNT, then held.
  //
  // Holding matters because onboarding's own finish() sets `onboarded`
  // locally before it navigates: re-evaluating every render would fire this
  // redirect mid-completion, bouncing the user to /app while finish() was
  // still awaiting its profile write and sending professionals to the wrong
  // landing page.
  //
  // Keying it to the account matters because the first version held a single
  // boolean, latched on the first settled render — which, on the signed-out
  // onboarding screen, is a render with no account at all. Readiness settles
  // immediately when signed out (hydratedFor and authUserId are both null),
  // and signOut() resets `user` to defaultUser, whose `onboarded` is false.
  // So the guard answered "not onboarded" before anyone had signed in, and
  // never looked again — sending returning users through the whole flow, the
  // exact bug this guard exists to prevent.
  const decidedFor = useRef<{ userId: string; onboarded: boolean } | null>(null);

  if (!authReady || !profileReady) return <RouteLoading />;

  // Onboarding is no more reachable than the dashboard while a recovery is
  // outstanding — it is still the app, and it still implies a usable account.
  if (recoveryPending) return <Navigate to="/app/reset-password" replace />;

  // Signed out: onboarding is where they belong — AuthStep is its first step.
  // Deliberately no latch, because there is no account to latch an answer
  // about, and latching here is what broke it before.
  if (!authUserId) return <>{children}</>;

  // A different account (or the first one) resets the answer. profileReady
  // guarantees `user` has been hydrated for THIS authUserId, so `onboarded`
  // is the server's value rather than the previous account's leftovers.
  if (decidedFor.current?.userId !== authUserId) {
    decidedFor.current = { userId: authUserId, onboarded: user.onboarded };
  }

  if (decidedFor.current.onboarded) return <Navigate to="/app" replace />;
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
        <Route path="/contact" element={<MarketingContact />} />
        <Route path="/legal" element={<MarketingLegal />} />
        {/* v2 landing handoff consolidated the two standalone legal pages
            into one page with anchored sections — redirect the old routes
            rather than leave them 404ing for anyone with an old link. */}
        <Route path="/legal/privacy" element={<Navigate to="/legal#privacy" replace />} />
        <Route path="/legal/terms" element={<Navigate to="/legal#terms" replace />} />
        {/* v3 landing handoff: branded 404 for anything else under the
            marketing site. Ranked below every explicit path above (and
            below /app/* below, a more specific splat) by React Router's own
            specificity scoring, so this only ever catches genuine
            mismatches — it can't shadow a real route. */}
        <Route path="*" element={<MarketingNotFound />} />
      </Route>

      {/* The one route a recovery session may reach. Deliberately outside
          RequireOnboarded: those guards redirect INTO here, so putting it
          behind them would loop. It does its own auth check instead. */}
      <Route path="/app/reset-password" element={<ResetPassword />} />

      {/* Customer portal (authenticated app shell) */}
      <Route
        path="/app/onboarding"
        element={
          <RedirectIfOnboarded>
            <Onboarding />
          </RedirectIfOnboarded>
        }
      />
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
        <Route path="/app/business/operations" element={<BusinessOperationsTab />} />
        <Route path="/app/business/gym" element={<BusinessGymTab />} />
        <Route path="/app/business/calendar" element={<BusinessCalendarTab />} />
        <Route path="/app/profile" element={<Profile />} />
        <Route path="/app/subscription" element={<Subscription />} />
        <Route path="/app/more" element={<More />} />
        <Route path="/app/calendar" element={<ClientCalendarTab />} />
        <Route path="/app/forum" element={<ForumTab />} />
        <Route path="/app/settings" element={<Settings />} />
      </Route>
      {/* More specific than the marketing group's own path="*" (an extra
          static "app" segment outranks a bare splat), so this — not the
          marketing 404 — is what catches an unmatched /app/... path. */}
      <Route path="/app/*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      {/* No basename: Centium is served from a domain root and only ever from
          a domain root (see vite.config.ts). This used to derive the basename
          from document.baseURI, which only worked because index.html injected
          a <base> tag at runtime to cope with being served under /centium/ or
          /Website-Centium/centium/. With that tag gone baseURI is just the
          current page URL, so the same expression would read a deep link like
          /pricing back as basename="/pricing" and strip the route away. */}
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
