import HealthMetricsTab from "../../professionals/HealthMetricsTab";

/**
 * Release 3 · Practice insights (/app/more/practice-insights, MO19), which
 * replaces the Health metrics row. Owned by W6, which replaces this file and
 * deletes HealthMetricsTab. Until then the existing health metrics page is
 * mounted here (the old route redirects here for Full coaching and Nutrition).
 */
export default function PracticeInsights() {
  return <HealthMetricsTab />;
}
