import { useCallback, useEffect, useState } from "react";
import { fetchHiringCredits, fetchPlanLevel, type HiringCredits, type PlanLevel } from "../../services/premium";

// Round G1 · #15: where a business stands on plan levels, and its hiring
// credits, keyed to the business asked about. Null while loading, after a
// failed read, or before the Database's G1 is on the stack: every caller
// reads null as the switch being off (today's screens).

function useBusinessRead<T>(businessId: string | null | undefined, fetcher: (id: string) => Promise<{ ok: true; value: T } | { ok: false }>) {
  const [state, setState] = useState<{ id: string; value: T | null } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!businessId) return;
    let live = true;
    void fetcher(businessId).then((r) => live && setState({ id: businessId, value: r.ok ? r.value : null }));
    return () => {
      live = false;
    };
    // fetcher is a module function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const mine = state && state.id === businessId ? state : null;
  return { value: mine?.value ?? null, loading: !!businessId && !mine, reload };
}

export function usePlanLevel(businessId: string | null | undefined): { level: PlanLevel | null; loading: boolean; reload: () => void } {
  const r = useBusinessRead(businessId, fetchPlanLevel);
  return { level: r.value, loading: r.loading, reload: r.reload };
}

export function useHiringCredits(businessId: string | null | undefined): { credits: HiringCredits | null; reload: () => void } {
  const r = useBusinessRead(businessId, fetchHiringCredits);
  return { credits: r.value, reload: r.reload };
}
