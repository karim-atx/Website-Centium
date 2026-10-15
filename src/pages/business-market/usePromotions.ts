import { useCallback, useEffect, useState } from "react";
import { fetchPromotions, fetchPromotionStats, type PromoStats, type Promotion } from "../../services/business-market/promotions";
import { fetchPlacements } from "../../services/business-market/featured";
import type { Placement } from "../../services/business-market/promoLogic";
import type { Probe } from "../../services/business-market";

// The Promotions tab's B13 reads: the business's promotions (insiders see
// every row), promotion_stats, and my_featured_placements. Each is read only
// when its probe answered "live" (pending = the table or function is absent:
// the tab keeps its earlier, empty behaviour).

export interface PromoData {
  loading: boolean;
  error: string | null;
  promotions: Promotion[];
  stats: Map<string, PromoStats>;
  placements: Placement[];
  reload: () => void;
  setPromotions: (f: (rows: Promotion[]) => Promotion[]) => void;
}

export function usePromotions(businessId: string | null, probes: { promotions: Probe; placements: Probe }, canRead: { promos: boolean; placements: boolean }): PromoData {
  const [promotions, setRows] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<Map<string, PromoStats>>(new Map());
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const promosLive = probes.promotions === "live" && canRead.promos;
  const placementsLive = probes.placements === "live" && canRead.placements;
  const key = businessId && (promosLive || placementsLive) ? `${businessId}:${promosLive}:${placementsLive}` : null;
  /** The key of the last read that answered: loading until it matches. */
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId || !key) return;
    let alive = true;
    void (async () => {
      const [rows, st, pl] = await Promise.all([
        promosLive ? fetchPromotions(businessId) : null,
        promosLive ? fetchPromotionStats(businessId) : null,
        placementsLive ? fetchPlacements(businessId) : null,
      ]);
      if (!alive) return;
      setDone(key);
      setError(rows && !rows.ok ? rows.message : null);
      if (rows?.ok) setRows(rows.value);
      // Stats are a second read: without them the cards show "–", never a guess.
      if (st?.ok) setStats(st.value);
      if (pl?.ok) setPlacements(pl.value);
    })();
    return () => {
      alive = false;
    };
  }, [businessId, key, promosLive, placementsLive, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setPromotions = useCallback((f: (rows: Promotion[]) => Promotion[]) => setRows(f), []);
  return { loading: !!key && done !== key, error: key ? error : null, promotions: key ? promotions : [], stats, placements: key ? placements : [], reload, setPromotions };
}
