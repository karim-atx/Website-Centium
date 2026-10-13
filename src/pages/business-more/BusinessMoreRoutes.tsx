import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import LocationsPage from "./LocationsPage";
import { BookingPoliciesEditor, BookingPoliciesPage, PolicyEditorPage, StorePoliciesPage } from "./PoliciesPages";
import { BusinessIdPage, EmployeesPage, JoinRequestsPage, RolesPage, SeatsPage } from "./TeamPages";
import { InvoicesPage, PaymentMethodsPage, PayoutsPage, SubscriptionPage, TaxesPage } from "./BillingPages";
import { BusinessNotificationsPage, BusinessTermsPage, DeactivatePage, ExportPage, SecurityPage } from "./AppPages";
import { HelpArticlePage, HelpCentrePage, HelpTopicPage } from "./help/HelpPages";

// v6 Batch 3 · the business More sub-pages (MO1B), all under
// /app/business/more/* so App.tsx carries one route line. Business accounts
// only; anyone else is sent back to More.
export default function BusinessMoreRoutes() {
  const { user } = useApp();
  if (user.accountType !== "business") return <Navigate to="/app/more" replace />;
  return (
    <Routes>
      <Route index element={<Navigate to="/app/more" replace />} />
      <Route path="policies" element={<BookingPoliciesPage />} />
      <Route path="policies/edit" element={<BookingPoliciesEditor />} />
      <Route path="policy/:kind" element={<PolicyEditorPage />} />
      <Route path="policy/:kind/:view" element={<PolicyEditorPage />} />
      <Route path="store-policies" element={<StorePoliciesPage />} />
      <Route path="locations" element={<LocationsPage />} />
      <Route path="employees" element={<EmployeesPage />} />
      <Route path="roles" element={<RolesPage />} />
      <Route path="join-requests" element={<JoinRequestsPage />} />
      <Route path="seats" element={<SeatsPage />} />
      <Route path="business-id" element={<BusinessIdPage />} />
      <Route path="payment-methods" element={<PaymentMethodsPage />} />
      <Route path="payouts" element={<PayoutsPage />} />
      <Route path="invoices" element={<InvoicesPage />} />
      <Route path="taxes" element={<TaxesPage />} />
      <Route path="subscription" element={<SubscriptionPage />} />
      <Route path="notifications" element={<BusinessNotificationsPage />} />
      <Route path="export" element={<ExportPage />} />
      <Route path="security" element={<SecurityPage />} />
      <Route path="deactivate" element={<DeactivatePage />} />
      <Route path="business-terms" element={<BusinessTermsPage />} />
      <Route path="help" element={<HelpCentrePage />} />
      <Route path="help/:topic" element={<HelpTopicPage />} />
      <Route path="help/:topic/:article" element={<HelpArticlePage />} />
      <Route path="*" element={<Navigate to="/app/more" replace />} />
    </Routes>
  );
}
