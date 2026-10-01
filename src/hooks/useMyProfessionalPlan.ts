import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { fetchMyProfessionalPlan, type MyProfessionalPlanResult } from "../services/subscription-tiers/freePeriod";
import type { FreePeriodFacts } from "../services/subscription-tiers/freePeriodCopy";

/**
 * Task G: my_professional_plan() for the signed-in account, keyed to it for
 * the reason useEffectiveProfessionalTier gives (a late answer must not be
 * rendered against a different account). `refresh` re-reads it, used after a
 * connection is refused with ATX49 so the screen catches up with the server.
 *
 * Null while unknown or after a failed read: unknown blocks nothing, because
 * the server refuses a connection either way and the refusal is mapped.
 */
export function useMyProfessionalPlan(): { plan: FreePeriodFacts | null; refresh: () => void } {
  const { authUserId } = useApp();
  const [answer, setAnswer] = useState<{ userId: string; result: MyProfessionalPlanResult } | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchMyProfessionalPlan().then((result) => {
      if (!cancelled) setAnswer({ userId: authUserId, result });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const plan = authUserId && answer?.userId === authUserId && answer.result.ok ? answer.result.plan : null;
  return { plan, refresh };
}
