import { usePremium } from "../../../../services/premium/hooks";
import { useG3 } from "../../../premium/g3/useG3";
import { fetchBiomarkerTrend } from "../../../../services/premium/g3Calls";
import { g3On, trendKey, trendResults, type MarkerStatus } from "../../../../services/premium/g3";

// Round G3 · biomarker trends with Premium: the chart reads my_biomarker_trend()
// (TrendGate holds the free member's Premium card).

/**
 * The chart's results: with the switch on and Premium, the trend reader's
 * points (oldest first) lined up with the page's own results; otherwise the
 * page's results as today.
 */
export function useTrendResults<R extends { id: string; panelId: string | null; date: string; value: number; unit: string; status: MarkerStatus }>(
  marker: { markerKey?: string | null; name: string },
  results: R[]
): R[] {
  const { premium } = usePremium();
  const key = trendKey(marker);
  const on = g3On(premium) && !!premium?.premium && results.length > 1;
  const { state } = useG3(() => fetchBiomarkerTrend(key), `trend:${key}:${results.length}`, on);
  if (!on || state.kind !== "ready" || state.value.length === 0) return results;
  return trendResults(state.value, results);
}
