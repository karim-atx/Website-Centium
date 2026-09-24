import { useCallback, useEffect, useState } from "react";
import {
  fetchRevenueSharePct,
  fetchSubscriptionTiers,
  type SubscriptionTier,
} from "../../services/subscription-tiers";

// The prices the marketing site quotes, read from the same rows the app
// enforces.
//
// PUBLIC DATA, WHICH IS WHAT MAKES THIS POSSIBLE AT ALL. subscription_tiers
// and platform_settings are both granted to `anon` with a `using (true)`
// policy, so a visitor who has never signed in gets the same figures a
// customer sees on their subscription screen. No second copy, and no build
// step that bakes today's prices into the bundle.
//
// WHY IT WAS LITERALS BEFORE. The handoff carried its own numbers and the
// comment beside them was explicit that they were not derived — which was the
// right call while pricing was unannounced and the database held placeholders
// its own migration called "almost certainly wrong". Both of those have
// changed: the rows are final, and the site now quotes them.

export interface Pricing {
  client: SubscriptionTier[];
  professional: SubscriptionTier[];
  business: SubscriptionTier[];
  /** The marketplace share, as a percentage on a 0-100 scale. */
  revenueSharePct: number;
}

export interface PricingState {
  pricing: Pricing | null;
  loading: boolean;
  /** Set only when a read failed. Never a reason to show stale numbers. */
  error: string | null;
  /** Retries every read. The service does not cache a failure, so this works. */
  retry: () => void;
}

/**
 * Every tier and the revenue share, in one hook.
 *
 * A PARTIAL ANSWER IS AN ERROR. The pricing page quotes all three audiences
 * and the business line needs the share, so rendering whichever reads
 * happened to land would put a page in front of somebody with one plan
 * missing and no indication anything was wrong. All four, or the error state.
 */
export function usePricing(): PricingState {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [client, professional, business, share] = await Promise.all([
        fetchSubscriptionTiers("client"),
        fetchSubscriptionTiers("professional"),
        fetchSubscriptionTiers("business"),
        fetchRevenueSharePct(),
      ]);
      if (cancelled) return;
      const failure = [client, professional, business, share].find((r) => !r.ok);
      if (failure && !failure.ok) {
        setError(failure.message);
        setLoading(false);
        return;
      }
      if (!client.ok || !professional.ok || !business.ok || !share.ok) return;
      setPricing({
        client: client.tiers,
        professional: professional.tiers,
        business: business.tiers,
        revenueSharePct: share.pct,
      });
      setError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { pricing, loading, error, retry };
}

/** The paid plan of a type — the one a "from $x" or a price card quotes. */
export const cheapestPaid = (tiers: SubscriptionTier[]): SubscriptionTier | null =>
  tiers.filter((t) => t.monthlyPrice > 0 && !t.isAddon)[0] ?? null;

export const defaultTier = (tiers: SubscriptionTier[]): SubscriptionTier | null =>
  tiers.find((t) => t.isDefault) ?? null;

export const baseTier = (tiers: SubscriptionTier[]): SubscriptionTier | null =>
  tiers.find((t) => !t.isAddon && !t.isDefault) ?? null;

export const addonTier = (tiers: SubscriptionTier[]): SubscriptionTier | null =>
  tiers.find((t) => t.isAddon) ?? null;
