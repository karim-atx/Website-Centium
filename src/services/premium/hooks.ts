import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchFreeLimits, fetchMyPremium, fetchSwitches, type Read } from "./index";
import type { FreeLimits, MyPremium, Switches } from "./model";

// Round G1 · the switches and the member's Premium, read ONCE PER SESSION per
// account (the app's keyed-hook pattern, as useMySubscriptionTier: an answer
// applies only to the account it was asked about) and shared by every screen
// through a small module cache, so a badge, a card and a gate on one page
// make one call between them.
//
// WHILE LOADING, AND AFTER A FAILED READ, THE ANSWER IS "OFF" (null here):
// the decisions in ./model read null as today's experience. A failed read is
// not cached, so the next screen asks again.

type Entry<T> = { value: T | null; promise: Promise<T | null> | null };
const caches = { switches: new Map<string, Entry<Switches>>(), premium: new Map<string, Entry<MyPremium>>(), limits: new Map<string, Entry<FreeLimits>>() };
const listeners = new Set<() => void>();

function load<T>(cache: Map<string, Entry<T>>, userId: string, fetcher: () => Promise<Read<T | null>>): Promise<T | null> {
  const hit = cache.get(userId);
  if (hit?.promise) return hit.promise;
  const promise = fetcher().then((r) => {
    if (r.ok) cache.set(userId, { value: r.value, promise: Promise.resolve(r.value) });
    else cache.delete(userId);
    return r.ok ? r.value : null;
  });
  cache.set(userId, { value: hit?.value ?? null, promise });
  return promise;
}

/** Drops the cached answers (after something changed them), and re-reads on screen. */
export function invalidatePremium(): void {
  caches.switches.clear();
  caches.premium.clear();
  caches.limits.clear();
  listeners.forEach((l) => l());
}

function useCached<T>(cache: Map<string, Entry<T>>, fetcher: () => Promise<Read<T | null>>): { value: T | null; loading: boolean; reload: () => void } {
  const { authUserId } = useApp();
  const [state, setState] = useState<{ userId: string; value: T | null; done: boolean } | null>(() => {
    const hit = authUserId ? cache.get(authUserId) : undefined;
    return authUserId && hit && hit.value !== null ? { userId: authUserId, value: hit.value, done: true } : null;
  });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setEpoch((e) => e + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void load(cache, authUserId, fetcher).then((value) => {
      if (live) setState({ userId: authUserId, value, done: true });
    });
    return () => {
      live = false;
    };
    // fetcher is a module function; epoch re-reads after invalidatePremium().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, epoch, cache]);

  const reload = useCallback(() => invalidatePremium(), []);
  if (!authUserId) return { value: null, loading: false, reload };
  const mine = state?.userId === authUserId ? state : null;
  return { value: mine?.value ?? null, loading: !mine?.done, reload };
}

export interface SwitchesState {
  /** Null while loading or unknown: read as "off". */
  switches: Switches | null;
  loading: boolean;
  reload: () => void;
}

/** my_switches(): premium_on, business_plans_on, preview. */
export function useSwitches(): SwitchesState {
  const r = useCached(caches.switches, fetchSwitches);
  return { switches: r.value, loading: r.loading, reload: r.reload };
}

export interface PremiumState {
  /** Null while loading or unknown: read as "off". */
  premium: MyPremium | null;
  loading: boolean;
  reload: () => void;
}

/** my_premium(): the member's Premium, the prices and may_prompt_upgrade. */
export function usePremium(): PremiumState {
  const r = useCached(caches.premium, fetchMyPremium);
  return { premium: r.value, loading: r.loading, reload: r.reload };
}

/** free_limits(): the free tier's numbers (G5). Null while unknown. */
export function useFreeLimits(): FreeLimits | null {
  return useCached(caches.limits, fetchFreeLimits).value;
}

export { supportOpen, useMarkSupportSurface } from "./support";
