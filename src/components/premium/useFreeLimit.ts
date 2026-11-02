import { useCallback } from "react";
import { usePremium } from "../../services/premium/hooks";
import { askPremium } from "../../services/premium/asks";
import { limitReached, limitsApply, type CountedLimit } from "../../services/premium/g2";
import type { PremiumFeature } from "../../services/premium/features";

// Round G2 · the free limits, checked before a screen opens where the app
// already knows the count (routines, habits, recipes, locked folders). With
// the switch off, loading, Premium, a professional or business account
// (my_premium().limits is null), or under the limit, nothing happens and the
// screen opens as today. At the limit, the host shows the gentle prompt (or
// a plain notice where prompts may not show) instead of a form that would
// fail. The write's own ATXQ2 is still handled (services/premium/asks).

export interface FreeLimitCheck {
  /** Adding one more would pass the free limit (no side effect). */
  reached: (key: CountedLimit, count: number) => boolean;
  /** As `reached`, and when it is, asks the host for the prompt. */
  blocked: (key: CountedLimit, count: number) => boolean;
  /** Asks the host for a limit already known to be reached. */
  ask: (key: CountedLimit) => void;
}

export function useFreeLimit(): FreeLimitCheck {
  const { premium } = usePremium();
  const reached = useCallback((key: CountedLimit, count: number) => limitReached(premium, key, count), [premium]);
  const ask = useCallback((key: CountedLimit) => askPremium(key, "limit"), []);
  const blocked = useCallback(
    (key: CountedLimit, count: number) => {
      if (!limitReached(premium, key, count)) return false;
      askPremium(key, "limit");
      return true;
    },
    [premium]
  );
  return { reached, blocked, ask };
}

/**
 * A Premium-only entry point (online food search, AI voice logging, lab
 * report scanning): `locked` while the free limits apply to me (the switch
 * on, no Premium, a member account: the Database refuses only then), when it
 * shows a small "Premium" label and `ask()` opens the prompt instead.
 */
export function usePremiumOnly(feature: PremiumFeature): { locked: boolean; ask: () => void } {
  const { premium } = usePremium();
  const ask = useCallback(() => askPremium(feature, "tap"), [feature]);
  return { locked: limitsApply(premium), ask };
}
