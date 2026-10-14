import { useEffect } from "react";
import { HeartPulse } from "lucide-react";
import { useAnalytics } from "./analyticsContext";
import { AnEmptyCard } from "./members/anKit";

// Analytics › Outcomes (AN5-001 K1 / AN4-001 K1, kept feature): Client
// Outcomes stays as a fifth tab for Classes and Gym. Its old numbers were
// mock (adherence, distribution, a hard-coded review list); a business has
// no shared client progress data today, so it shows the honest empty state
// instead (data honesty). The at-risk list moved to Members › At risk.

export function OutcomesSection() {
  const { setExport } = useAnalytics();
  useEffect(() => setExport("", null), [setExport]);
  return <AnEmptyCard icon={HeartPulse} title="No client outcomes yet" body="Client outcomes appear when clients share their progress with you." />;
}
