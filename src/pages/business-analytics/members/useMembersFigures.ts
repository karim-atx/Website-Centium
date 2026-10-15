import { useCallback, useEffect, useState } from "react";
import {
  fetchFirst90Days,
  fetchMemberGrowth,
  fetchPeopleSummary,
  fetchPeriodStats,
  fetchPlanFigures,
  growthSeries,
  growthWeeksFor,
  type Read,
} from "../../../services/business-analytics";
import type { AnalyticsRange } from "../analyticsRange";
import { NO_FIGURES, type MembersFigures } from "./membersModel";

// The Members section's B15 reads (see membersModel.ts for which page reads
// what). The range goes to the readers as the shell has it (p_from / p_to);
// they bucket in the business's own calendar, Monday weeks. A reader the
// caller may not use (ATX03) or that is missing leaves its figure null, so
// the page keeps "–" and its plain line; any other failure is `error`.

export function useMembersFigures(businessId: string | null, range: AnalyticsRange, today: string): { figures: MembersFigures; loaded: boolean; error: string | null; reload: () => void } {
  const [state, setState] = useState<{ key: string; figures: MembersFigures; error: string | null } | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const key = `${businessId}|${range.from}|${range.to}|${range.compare}|${today}`;

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const weeks = growthWeeksFor(range.from, today);
    void Promise.all([
      fetchPeopleSummary(businessId),
      fetchFirst90Days(businessId),
      fetchPlanFigures(businessId, range.from, range.to),
      fetchPeriodStats(businessId, range.from, range.to, range.compare),
      fetchMemberGrowth(businessId, weeks.ask),
    ]).then(([summary, first90, plans, stats, growth]) => {
      if (cancelled) return;
      const val = <T,>(r: Read<T>): T | null => (r.ok ? r.value : null);
      const broken = ([summary, first90, plans, stats, growth] as Read<unknown>[]).find((r) => !r.ok && !r.pending && !r.denied);
      setState({
        key: `${businessId}|${range.from}|${range.to}|${range.compare}|${today}`,
        error: broken && !broken.ok ? broken.message : null,
        figures: {
          summary: val(summary),
          first90: val(first90),
          plans: val(plans),
          stats: val(stats),
          growth: growth.ok ? growthSeries(growth.value, weeks.shown) : null,
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, range.from, range.to, range.compare, today, tick]);

  // A new range keeps the last figures on screen until the new ones land.
  return { figures: state?.figures ?? NO_FIGURES, loaded: state?.key === key, error: state?.error ?? null, reload };
}
