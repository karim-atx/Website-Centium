import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  fetchMySubscriptionTier,
  type MyTierResult,
  type ResolvedTier,
  type TierType,
} from "../services/subscription-tiers";

export interface MySubscriptionTierState {
  /** The plan this account holds, or the free default. Null while unknown. */
  resolved: ResolvedTier | null;
  loading: boolean;
  /** Set only when the read failed. Not the same as "no plan". */
  error: string | null;
}

/**
 * The plan the signed-in account is actually on.
 *
 * KEYED TO THE ACCOUNT, unlike useSubscriptionTiers. That hook reads public
 * reference data identical for everyone; this one reads one account's row, so
 * an answer that arrives after a sign-out — or after a switch to a second
 * account in the same browser — must not be rendered against whoever is on
 * screen now. Comparing the answer's own userId means a late answer simply
 * does not apply to a question it was not asked.
 *
 * SIGNED OUT IS NOT AN ERROR AND NOT A LOADING STATE. There is no account to
 * have a plan, so `resolved` is null and `loading` is false — a caller that
 * waits for loading to end would otherwise wait forever on the marketing side
 * of the app.
 */
export function useMySubscriptionTier(tierType: TierType): MySubscriptionTierState {
  const { authUserId } = useApp();
  const [answer, setAnswer] = useState<{
    userId: string;
    tierType: TierType;
    result: MyTierResult;
  } | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchMySubscriptionTier(authUserId, tierType).then((result) => {
      if (cancelled) return;
      setAnswer({ userId: authUserId, tierType, result });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, tierType]);

  if (!authUserId) return { resolved: null, loading: false, error: null };

  const current =
    answer?.userId === authUserId && answer.tierType === tierType ? answer.result : null;

  return {
    resolved: current?.ok ? current.resolved : null,
    loading: current === null,
    error: current && !current.ok ? current.message : null,
  };
}
