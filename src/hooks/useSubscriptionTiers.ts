import { useEffect, useState } from "react";
import {
  fetchSubscriptionTiers,
  type SubscriptionTier,
  type TiersResult,
  type TierType,
} from "../services/subscription-tiers";

export interface SubscriptionTiersState {
  tiers: SubscriptionTier[];
  loading: boolean;
  /** Set only when the read failed. Absence of tiers is not the same thing. */
  error: string | null;
}

/**
 * The tiers of one type, for rendering.
 *
 * NOT KEYED TO AN ACCOUNT, unlike useIsAmbassador and the other per-user
 * hooks here. These rows are public reference data — identical for every
 * caller, signed in or not — so there is no account whose answer could arrive
 * late and be shown against the wrong user. The request is shared at the
 * service level for the same reason.
 *
 * KEYED ON THE TYPE IT ASKED ABOUT, though, and for the reason useIsAmbassador
 * keys on the account: a plain state variable keeps the previous answer for one
 * render after the input changes, so a component switching from professional to
 * business tiers would briefly render professional prices under a business
 * heading. Comparing the answer's own tierType means an answer simply does not
 * apply to a question it was not asked, which also removes the need to reset
 * `loading` from inside the effect.
 *
 * AN EMPTY LIST AND A FAILED READ ARE DIFFERENT and callers must keep them
 * apart. Rendering "no plans available" after a dropped connection tells the
 * user something false about their options, and on the screen where they
 * choose what to pay for, that is worse than saying nothing.
 */
export function useSubscriptionTiers(tierType: TierType): SubscriptionTiersState {
  const [answer, setAnswer] = useState<{ tierType: TierType; result: TiersResult } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSubscriptionTiers(tierType).then((result) => {
      if (cancelled) return;
      setAnswer({ tierType, result });
    });
    return () => {
      cancelled = true;
    };
  }, [tierType]);

  const current = answer?.tierType === tierType ? answer.result : null;

  return {
    tiers: current?.ok ? current.tiers : [],
    loading: current === null,
    error: current && !current.ok ? current.message : null,
  };
}
