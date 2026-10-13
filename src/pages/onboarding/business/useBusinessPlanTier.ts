import { useEffect, useState } from "react";
import { fetchSubscriptionTiers, type SubscriptionTier } from "../../../services/subscription-tiers";

/** The Centium business plan's base tier, read from subscription_tiers (V6-40: never a hard-coded price). */
export function useBusinessPlanTier(): { base: SubscriptionTier | null; loading: boolean; error: boolean } {
  const [state, setState] = useState<{ base: SubscriptionTier | null; loading: boolean; error: boolean }>({ base: null, loading: true, error: false });
  useEffect(() => {
    let alive = true;
    void fetchSubscriptionTiers("business").then((r) => {
      if (!alive) return;
      if (!r.ok) setState({ base: null, loading: false, error: true });
      else setState({ base: r.tiers.find((t) => !t.isAddon) ?? null, loading: false, error: false });
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
