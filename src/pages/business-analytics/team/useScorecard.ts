import { useEffect, useState } from "react";
import { fetchInstructorScorecard, type ScorecardRow } from "../../../services/business-analytics";
import type { AnalyticsRange } from "../shell/range";

// B15 instructor_scorecard (TM-04, gate revenue): per instructor for the
// range, classes taught, fill, rating and reviews (B14), pay
// (pay_rate_per_class × classes) and recorded revenue from their classes.
// `rows` is null until it answers, and stays null when the reader is missing
// or the caller lacks revenue (Pay then keeps the rate × classes estimate
// and shows no revenue).

export function useScorecard(businessId: string | null, range: AnalyticsRange): { rows: ScorecardRow[] | null; loading: boolean } {
  const [state, setState] = useState<{ key: string; rows: ScorecardRow[] | null } | null>(null);
  const key = `${businessId}|${range.from}|${range.to}`;
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    void fetchInstructorScorecard(businessId, range.from, range.to).then((r) => {
      if (!cancelled) setState({ key: `${businessId}|${range.from}|${range.to}`, rows: r.ok ? r.value : null });
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, range.from, range.to]);
  return { rows: state?.rows ?? null, loading: !!businessId && state?.key !== key };
}
