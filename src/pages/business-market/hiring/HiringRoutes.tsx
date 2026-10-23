import { Navigate, Route, Routes } from "react-router-dom";
import { ConsoleGate } from "../../../components/business-console/ConsoleGate";
import HubPage from "./Hub";
import ApplicantsPage from "./Applicants";
import TeamPage from "./Team";
import FeesPage from "./Fees";
import DirectOfferPage from "./DirectOffer";
import ExistingTeamPage from "./ExistingTeam";

// Market + Share 3.0 · W4 · Business Hiring (B-MA.8, gyms and studios: business_may_hire;
// HANDOVER §4 "Business Hiring B-MA.8", §13 routes), /app/business/hiring/*
// (App.tsx: ConsoleGate "members"; api.md "business (owner, members)"):
//   index                 B-MA.8 Hiring hub (Open · Filled · Closed; ?tab=filled|closed)
//   openings/:openingId   B-MA.8.2 Applicants (→ 8.3 Offer and hire)
//   team                  B-MA.8.4 Team
//   fees                  B-MA.8.5 Hiring fees (owner: my_hiring_fees is the owner's)
//   find                  B-MA.8.6 Find a professional (direct offer)
//   existing-team         B-MA.8.8 Add your existing team (D-31 window)
// Entry: Marketplace › Overview › Gym card › Hiring (B-MA.1), and Go to Hiring
// from the instructor picker (B-MA.6) and the employee invite (B-MA.8.7).

export const HIRING_HOME = "/app/business/hiring";

export const HIRING_ROUTES = {
  hub: HIRING_HOME,
  applicants: (openingId: string) => `${HIRING_HOME}/openings/${encodeURIComponent(openingId)}`,
  team: `${HIRING_HOME}/team`,
  fees: `${HIRING_HOME}/fees`,
  find: `${HIRING_HOME}/find`,
  existingTeam: `${HIRING_HOME}/existing-team`,
} as const;

export default function HiringRoutes() {
  return (
    <Routes>
      <Route index element={<HubPage />} />
      <Route path="openings/:openingId" element={<ApplicantsPage />} />
      <Route path="team" element={<TeamPage />} />
      <Route path="fees" element={<ConsoleGate need="owner"><FeesPage /></ConsoleGate>} />
      <Route path="find" element={<DirectOfferPage />} />
      <Route path="existing-team" element={<ExistingTeamPage />} />
      <Route path="*" element={<Navigate to={HIRING_HOME} replace />} />
    </Routes>
  );
}
