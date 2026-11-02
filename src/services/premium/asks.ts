// Round G2 · Premium moments, from anywhere to the one host.
//
// A screen that checks a free limit, a service whose write came back ATXQ1 /
// ATXQ2, and an entry point labelled Premium all "ask" here; the one
// <PremiumAskHost> (components/premium, mounted in the member's layout)
// decides by the prompt rules whether the sheet opens, a plain notice shows,
// or nothing (askOutcome in ./g2). Services have no React, so this is a tiny
// listener set rather than a context.

import type { PremiumFeature } from "./features";
import { premiumRefusalOf, type AskVia } from "./g2";
import { premiumCodeMessage } from "./model";

export interface PremiumAsk {
  feature: PremiumFeature;
  via: AskVia;
}

const listeners = new Set<(a: PremiumAsk) => void>();

export function askPremium(feature: PremiumFeature, via: AskVia): void {
  listeners.forEach((l) => l({ feature, via }));
}

export function onPremiumAsk(fn: (a: PremiumAsk) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * In a service's error path: an ATXQ2 (detail = the limit key) or an ATXQ1
 * asks the host for the prompt (a "refusal": the sheet only where the rules
 * allow it) and returns the plain sentence the screen shows where it shows
 * its errors, so what the member typed stays in the form. Null for any other
 * error, which the service words as before.
 */
export function premiumRefusalMessage(
  error: { code?: string | null; message?: string | null; details?: string | null } | null | undefined,
  premiumOnlyFeature: PremiumFeature | null = null
): string | null {
  const r = premiumRefusalOf(error, premiumOnlyFeature);
  if (!r) return null;
  if (r.feature) askPremium(r.feature, "refusal");
  return premiumCodeMessage(r.code, { detail: error?.details ?? null, message: error?.message ?? null });
}
