import { useCallback, useEffect, useMemo, useState } from "react";
import { useBusiness } from "../../../components/business-more/useBusiness";
import {
  fetchAllTransactions,
  fetchFirstPaidDay,
  fetchRevenueByPlan,
  fetchRevenueByStream,
  figuresFromRecorded,
  figuresFromRecords,
  type PaymentRecord,
  type Period,
  type RecordedInput,
  type RevenueFigures,
} from "../../../services/business-revenue";
import { previousOf } from "../analyticsRange";

export interface RecordedState {
  /** The period's figures from the B8 readers, or from the records while they are missing; null while loading. */
  figures: RevenueFigures | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * B8 RV-01 for one range: recorded_revenue_by_stream for the range and the
 * period before (the totals), recorded_revenue_by_plan (Streams), the paid
 * transactions over both periods (the daily series on the server's own
 * days) and the first paid day. ATX09 is an empty `denied` answer. When the
 * readers are missing (PGRST202 / 42883) the figures are the records' sums
 * (`records`, from the Revenue read), as before B8.
 */
export function useRecordedRevenue(
  range: Period & { compare?: boolean },
  records: PaymentRecord[] | null,
  opts: { plans?: boolean; series?: boolean } = {},
): RecordedState {
  const { business, loading: bizLoading } = useBusiness();
  const businessId = business?.id ?? null;
  const wantPlans = opts.plans ?? true;
  const wantSeries = opts.series ?? true;
  // Keyed by the range it was read for: a new range shows the loading state, not the last range's figures.
  const [read, setRead] = useState<{ key: string; input: RecordedInput | "pending" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const prev = useMemo(() => previousOf({ key: "custom", from: range.from, to: range.to, compare: true }), [range.from, range.to]);

  const key = `${businessId}|${range.from}|${range.to}`;
  useEffect(() => {
    if (bizLoading || !businessId) return;
    let alive = true;
    void (async () => {
      const [cur, before, plans, paid, first] = await Promise.all([
        fetchRevenueByStream(businessId, range.from, range.to),
        fetchRevenueByStream(businessId, prev.from, prev.to),
        wantPlans ? fetchRevenueByPlan(businessId, range.from, range.to) : null,
        wantSeries ? fetchAllTransactions(businessId, { from: prev.from, to: range.to, status: "paid" }) : null,
        fetchFirstPaidDay(businessId),
      ]);
      if (!alive) return;
      const all = [cur, before, plans, paid, first].filter((x) => x !== null);
      if (all.some((x) => !x.ok && x.pending)) {
        setError(null);
        setRead({ key, input: "pending" });
        return;
      }
      const bad = all.find((x) => !x.ok);
      if (bad && !bad.ok) {
        setError(bad.message);
        return;
      }
      if (!cur.ok || !before.ok || !first.ok) return;
      setError(null);
      setRead({ key, input: {
        denied: cur.value.denied,
        streams: cur.value.rows,
        prevStreams: before.value.rows,
        plans: plans && plans.ok ? plans.value.rows : [],
        paid: paid && paid.ok ? paid.value.rows : [],
        first: first.value,
      } });
    })();
    return () => {
      alive = false;
    };
  }, [bizLoading, businessId, range.from, range.to, prev.from, prev.to, wantPlans, wantSeries, tick, key]);

  const input = read && read.key === key ? read.input : null;
  const figures = useMemo(() => {
    if (!input) return null;
    if (input === "pending") return records ? figuresFromRecords(records, range, prev) : null;
    return figuresFromRecorded(input, range, prev);
  }, [input, records, range, prev]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return {
    figures,
    loading: !figures && !error && (bizLoading || !!businessId),
    error,
    reload,
  };
}
