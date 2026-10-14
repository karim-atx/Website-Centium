import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { JoinRequestsPage } from "./JoinRequestsPage";
import { PersonPage } from "./PersonPage";
import { TeamPage } from "./TeamPage";
import { useTeamToast } from "./parts";
import { useTeamData } from "./useTeamData";

// v6 Batch 4 · Team and access (OP1 Employees, 053-073 and 112-139):
// /app/business/employees (team), /requests (join requests), /:id (person).
// Replaces BusinessEmployeesTab (HANDOVER §5 "Replaced"). One data load is
// shared by the three screens so going in and out of a person page doesn't
// refetch the team.
export default function TeamRoutes() {
  const { user } = useApp();
  const data = useTeamData();
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, showToast] = useTeamToast(150);
  const passed = (location.state as { toast?: string } | null)?.toast;

  // A toast handed over by a page that navigated here (OP1-064 #8).
  useEffect(() => {
    if (!passed) return;
    showToast(passed);
    navigate(location.pathname, { replace: true, state: null });
  }, [passed, showToast, navigate, location.pathname]);

  if (user.accountType !== "business") return <Navigate to="/app/more" replace />;
  return (
    <>
      <Routes>
        <Route index element={<TeamPage data={data} />} />
        <Route path="requests" element={<JoinRequestsPage data={data} />} />
        <Route path=":id" element={<PersonPage data={data} />} />
        <Route path="*" element={<Navigate to="/app/business/employees" replace />} />
      </Routes>
      {toast}
    </>
  );
}
