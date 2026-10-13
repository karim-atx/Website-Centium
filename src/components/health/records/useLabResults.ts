import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { getLabResults, type LabPanel, type LabResult } from "../../../services/labs/results";

/**
 * Every lab result, one row each (services/labs/results). Re-read whenever
 * the app's grouped lists change (a save, a delete, reloadHealthRecords), so
 * the page and the rest of the app never disagree.
 */
export function useLabResults() {
  const { authUserId, bloodMarkers, labReports } = useApp();
  const [results, setResults] = useState<LabResult[]>([]);
  const [panels, setPanels] = useState<LabPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void getLabResults(authUserId).then((r) => {
      if (cancelled) return;
      setLoading(false);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setResults(r.results);
      setPanels(r.panels);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, bloodMarkers, labReports, tick]);

  const retry = useCallback(() => {
    setLoading(true);
    setTick((n) => n + 1);
  }, []);
  return { results, panels, loading, error, retry };
}
