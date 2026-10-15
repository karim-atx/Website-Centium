import { Navigate, useParams } from "react-router-dom";
import { ProComingSoonPage } from "./ProComingSoonPage";
import { useProSubtype } from "../../hooks/useProSubtype";
import { CLIENT_TABS, pickTab, proClientPath } from "../../components/pro/subtypeLanes";

/**
 * Release 3 · the client page (/app/pro/clients/:id/:tab, CL2). Owned by W3.
 * The tab list is the lane's (CLIENT_TABS, "the frames' tab lists win"); an
 * unknown or another lane's tab goes to the lane's first.
 */
export default function ClientPage() {
  const { id = "", tab } = useParams();
  const { lane } = useProSubtype();
  if (!lane) return null;
  const tabs = CLIENT_TABS[lane];
  const current = pickTab(tabs, tab);
  if (tab !== undefined && tab !== current) return <Navigate to={proClientPath(id, current)} replace />;
  return <ProComingSoonPage title={lane === "clinical_overview" ? "Patient" : "Client"} showBack />;
}
