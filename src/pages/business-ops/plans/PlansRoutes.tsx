import type { ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { hasInAppHistory } from "../../../hooks/useBack";
import { BackHeader } from "../../business-market/listingParts";
import { MembershipsTab } from "./MembershipsTab";
import PlanDetailPage from "./PlanDetailPage";
import { PlansProvider } from "./PlansContext";
import { useBusinessNavKind } from "../../../components/navigation/useBusinessNavKind";
import { t } from "../../../i18n/core";

// /app/business/gym/*: the Memberships page (B-MA.5) and the plan page
// /app/business/gym/:planId. Gyms and Classes businesses sell plans
// (plan_types_for_business_type); a store sells none and is sent to its own
// Operations tab.
//
// Market + Share 3.0 (D-15): a gym reaches this page from Marketplace ›
// Overview › Gym › Memberships and it renders here (no longer redirected to
// Front desk), under the drawn back header "Gym / Memberships"; Front desk ›
// Memberships renders the same body without it. A Classes business opens it
// from Schedule as before, under "Schedule / Plans" (OURS: it has no Gym).

function GymOnly({ children }: { children: ReactNode }) {
  const kind = useBusinessNavKind();
  if (kind !== "gym" && kind !== "classes" && kind !== "unknown") return <Navigate to="/app/business/operations" replace />;
  return <>{children}</>;
}

function ListPage() {
  const kind = useBusinessNavKind();
  const navigate = useNavigate();
  const classes = kind === "classes";
  const back = () => {
    if (hasInAppHistory()) navigate(-1);
    else navigate(classes ? "/app/business/operations" : "/app/business/marketplace", { replace: true });
  };
  return (
    <div>
      <BackHeader eyebrow={classes ? t("Schedule") : t("Gym")} title={classes ? t("Plans") : t("Memberships")} onBack={back} backLabel={classes ? t("Back to Schedule") : t("Back to Marketplace")} />
      <MembershipsTab />
    </div>
  );
}

export default function PlansRoutes() {
  return (
    <PlansProvider>
      <GymOnly>
        <Routes>
          <Route index element={<ListPage />} />
          <Route path=":planId" element={<PlanDetailPage />} />
          <Route path="*" element={<Navigate to="/app/business/gym" replace />} />
        </Routes>
      </GymOnly>
    </PlansProvider>
  );
}
