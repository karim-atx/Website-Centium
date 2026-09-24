import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  fetchBusinessPlan,
  type BusinessPlan,
  type BusinessPlanResult,
} from "../services/subscription-tiers";

export interface BusinessPlanState {
  /** The base plan and however many seat blocks are held. Null while unknown. */
  plan: BusinessPlan | null;
  loading: boolean;
  error: string | null;
}

/**
 * A business's plan: the base, plus the seat blocks it bought.
 *
 * KEYED TO THE ACCOUNT, for the reason the sibling hooks give. Signed out is
 * neither an error nor a loading state.
 */
export function useBusinessPlan(): BusinessPlanState {
  const { authUserId } = useApp();
  const [answer, setAnswer] = useState<{ userId: string; result: BusinessPlanResult } | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchBusinessPlan(authUserId).then((result) => {
      if (!cancelled) setAnswer({ userId: authUserId, result });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  if (!authUserId) return { plan: null, loading: false, error: null };
  if (!answer || answer.userId !== authUserId) return { plan: null, loading: true, error: null };
  if (!answer.result.ok) return { plan: null, loading: false, error: answer.result.message };
  return { plan: answer.result.plan, loading: false, error: null };
}
