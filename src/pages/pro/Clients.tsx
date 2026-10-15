import { ProComingSoonPage } from "./ProComingSoonPage";
import { useProSubtype } from "../../hooks/useProSubtype";

/**
 * Release 3 · Clients (/app/pro/clients, CL3). Owned by W3. Until it ships,
 * the roster is on Home (the existing dashboard).
 */
export default function Clients() {
  const { lane } = useProSubtype();
  // CL3 v6: Clinical overview calls them patients.
  return <ProComingSoonPage title={lane === "clinical_overview" ? "Patients" : "Clients"} />;
}
