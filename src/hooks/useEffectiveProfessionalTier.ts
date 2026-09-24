import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  fetchEffectiveProfessionalTier,
  type EffectiveProfessionalTier,
  type EffectiveTierResult,
} from "../services/subscription-tiers";

export interface EffectiveProfessionalTierState {
  /** The plan in force, however it was come by. Null while unknown. */
  effective: EffectiveProfessionalTier | null;
  loading: boolean;
  /** Set only when the read failed. Not the same as "no plan". */
  error: string | null;
}

/**
 * The plan a professional is actually on, as the database resolves it.
 *
 * KEYED TO THE ACCOUNT, for the reason useMySubscriptionTier gives: an answer
 * that arrives after a sign-out — or after a switch to a second account in the
 * same browser — must not be rendered against whoever is on screen now.
 * Comparing the answer's own userId means a late answer does not apply to a
 * question it was not asked.
 *
 * SIGNED OUT IS NOT AN ERROR AND NOT A LOADING STATE. There is no account to
 * have a plan, so `effective` is null and `loading` is false.
 */
export function useEffectiveProfessionalTier(): EffectiveProfessionalTierState {
  const { authUserId } = useApp();
  const [answer, setAnswer] = useState<{ userId: string; result: EffectiveTierResult } | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchEffectiveProfessionalTier(authUserId).then((result) => {
      if (!cancelled) setAnswer({ userId: authUserId, result });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  if (!authUserId) return { effective: null, loading: false, error: null };
  if (!answer || answer.userId !== authUserId) {
    return { effective: null, loading: true, error: null };
  }
  if (!answer.result.ok) return { effective: null, loading: false, error: answer.result.message };
  return { effective: answer.result.effective, loading: false, error: null };
}
