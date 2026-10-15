import HealthMetricsTab from "../professionals/HealthMetricsTab";

/**
 * Release 3 · Insights (/app/pro/insights/:tab, Clinical overview's navbar
 * tab; the other lanes see Insights inside the client page). Owned by W5;
 * HealthMetricsTab is deleted in W6. Until then the existing health metrics
 * page is mounted here.
 */
export default function Insights() {
  return <HealthMetricsTab />;
}
