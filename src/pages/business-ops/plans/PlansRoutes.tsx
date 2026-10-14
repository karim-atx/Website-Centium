import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MEMBERSHIPS_HOME, MembershipsHeader, MembershipsTab } from "./MembershipsTab";
import PlanDetailPage from "./PlanDetailPage";
import { PlansProvider } from "./PlansContext";
import { useBusinessNavKind } from "../../../components/navigation/useBusinessNavKind";

// v6 Batch 4 · /app/business/gym/* : the Memberships list (until the Front
// desk shell mounts MembershipsTab under its Memberships tab) and the plan
// page /app/business/gym/:planId. Plans belong to the Gym type only (COPY.md
// Operations table: "Gym and memberships: Hide" for Classes and Store); a
// Classes or Store business is sent to its own Operations tab.

// The same type the navbar and the Operations shell read (useBusinessNavKind).
function GymOnly({ children }: { children: ReactNode }) {
  const kind = useBusinessNavKind();
  if (kind !== "gym" && kind !== "unknown") return <Navigate to="/app/business/operations" replace />;
  return <>{children}</>;
}

/** A gym's list is Front desk › Memberships; this page stays for a business whose type is not known yet. */
function ListPage() {
  if (useBusinessNavKind() === "gym") return <Navigate to={MEMBERSHIPS_HOME} replace />;
  return (
    <div className="animate-fade-slide-up">
      <MembershipsHeader />
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
