import ProfessionalDashboard from "../professionals/ProfessionalDashboard";

/**
 * Release 3 · Home (/app/pro, CL1). Owned by W2, which replaces this file with
 * the hub (ProTrendRing, client strip, notifications) and deletes
 * ProfessionalDashboard. Until then the existing dashboard (roster, Get set
 * up, team invites, pending hires, client codes) stays here, so no feature is
 * out of reach inside the PR (FINAL_PLAN W1: old pages are mounted at the new
 * routes until their batch replaces them).
 */
export default function Home() {
  return <ProfessionalDashboard />;
}
