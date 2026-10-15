import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { useOnline } from "../../../hooks/useOnline";
import {
  fetchRevenue,
  type RevenueData,
} from "../../../services/business-revenue";

export interface RevenueState {
  data: RevenueData | null;
  loading: boolean;
  error: string | null;
  /** When the last good read finished (the offline line names it). */
  loadedAt: Date | null;
  online: boolean;
  reload: () => void;
  businessId: string | null;
}

// One read for every Revenue page (Overview, Streams, Payments,
// Transactions and the See all pages), kept while offline.
export function useRevenueData(): RevenueState {
  const { business, loading: bizLoading } = useBusiness();
  const online = useOnline();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const businessId = business?.id ?? null;

  useEffect(() => {
    if (bizLoading) return;
    if (!businessId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchRevenue(businessId).then((r) => {
      if (cancelled) return;
      setLoading(false);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setData(r.value);
      setLoadedAt(new Date());
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, bizLoading, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return {
    data,
    loading: loading || bizLoading,
    error,
    loadedAt,
    online,
    reload,
    businessId,
  };
}
