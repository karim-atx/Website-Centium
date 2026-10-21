import { useCallback, useEffect, useState } from "react";
import { useConsoleAccess } from "./useConsoleAccess";
import {
  buySeatBlocks,
  cancelSeatPurchase,
  fetchBillingHistory,
  fetchMyBillingPeriod,
  fetchPeriodPrices,
  fetchPlanSummary,
  setBillingPeriod,
  pendingSeatPurchase,
  type CentiumCharge,
  type MyBillingPeriod,
  type PeriodWrite,
  type PlanSummary,
  type Read,
  type SubscriptionPeriod,
} from "../services/centium-billing";
import { fetchSubscriptionTiers } from "../services/subscription-tiers";
import { OFFLINE_MESSAGE } from "../services/network-error";

export interface CentiumBilling {
  /** The console seat has settled and the first reads have answered. */
  ready: boolean;
  /**
   * RV-06 is on this database (business_plan_summary answered, or refused for
   * a reason other than "no such function"). False keeps each screen's
   * earlier behaviour (the pending rule).
   */
  available: boolean;
  /** business_plan_summary; null while loading, without the gate, or on error. */
  summary: PlanSummary | null;
  summaryError: string | null;
  /** centium_billing_history (gate revenue); null without the gate or on error. */
  history: CentiumCharge[] | null;
  historyError: string | null;
  /** The seat purchase awaiting payment (owner's / revenue's view). */
  pendingSeat: CentiumCharge | null;
  /** The seat may see the plan (members or revenue) and the billing (revenue). */
  canSeePlan: boolean;
  canSeeBilling: boolean;
  /** buy_seat_blocks / cancel_seat_block_purchase are the owner's. */
  isOwner: boolean;
  /** The console's business these answers are for. */
  businessId: string | null;
  reload: () => void;
  buy: typeof buySeatBlocks;
  cancel: typeof cancelSeatPurchase;
}

/**
 * B8 / RV-06: what this business pays Centium (plan and seat blocks), for
 * the console's current business. An employee without the gate gets an
 * empty, quiet answer (canSeePlan / canSeeBilling false), never an error.
 */
export function useCentiumBilling(): CentiumBilling {
  const access = useConsoleAccess();
  const businessId = access.businessId;
  const canSeePlan = access.ready && (access.meets("members") || access.meets("revenue"));
  const canSeeBilling = access.ready && access.meets("revenue");
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ key: string; summary: Read<PlanSummary> | null; history: Read<{ charges: CentiumCharge[]; total: number }> | null } | null>(null);
  const key = `${businessId ?? ""}|${canSeePlan}|${canSeeBilling}|${tick}`;

  useEffect(() => {
    if (!access.ready || !businessId) return;
    let alive = true;
    void Promise.all([
      canSeePlan ? fetchPlanSummary(businessId) : Promise.resolve(null),
      canSeeBilling ? fetchBillingHistory(businessId) : Promise.resolve(null),
    ]).then(([summary, history]) => {
      if (alive) setState({ key, summary, history });
    });
    return () => {
      alive = false;
    };
  }, [access.ready, businessId, canSeePlan, canSeeBilling, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // The previous answer stays on screen while a reload runs.
  const s = state;
  const summary = s?.summary ?? null;
  const history = s?.history ?? null;
  const charges = history && history.ok ? history.value.charges : null;
  const summaryMissing = !!summary && !summary.ok && summary.missing;
  const historyMissing = !!history && !history.ok && history.missing;

  return {
    ready: access.ready && (!businessId || (s !== null && (s.key === key || s.key.startsWith(`${businessId}|`)))),
    available: !summaryMissing && !historyMissing,
    summary: summary && summary.ok ? summary.value : null,
    summaryError: summary && !summary.ok && !summary.missing && !summary.denied ? summary.message : null,
    history: charges,
    historyError: history && !history.ok && !history.missing && !history.denied ? history.message : null,
    pendingSeat: charges ? pendingSeatPurchase(charges) : null,
    canSeePlan,
    canSeeBilling,
    isOwner: access.isOwner,
    businessId,
    reload,
    buy: buySeatBlocks,
    cancel: cancelSeatPurchase,
  };
}

export interface BillingPeriodState {
  /** The first reads have answered (or there is nothing to read). */
  ready: boolean;
  /** The caller's own active subscription, or null without one. */
  sub: MyBillingPeriod | null;
  /** subscription_price_for, both periods, with the seat blocks held. */
  prices: Record<SubscriptionPeriod, number | null> | null;
  error: string | null;
  reload: () => void;
  /** set_subscription_billing_period; on success the new row replaces the old. */
  choose: (period: SubscriptionPeriod) => Promise<PeriodWrite>;
}

/**
 * Batch 2 · CS: the OWNER's billing period and what each period costs. Pass
 * `enabled` false for anyone else: the function changes the caller's own
 * subscription, so a staff member's read or switch would be about their own
 * professional plan, never the business's.
 */
export function useBillingPeriod(ownerId: string | null, enabled: boolean): BillingPeriodState {
  const [tick, setTick] = useState(0);
  const key = `${ownerId ?? ""}|${enabled}|${tick}`;
  const [state, setState] = useState<{ key: string; sub: MyBillingPeriod | null; prices: Record<SubscriptionPeriod, number | null> | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!enabled || !ownerId) return;
    let alive = true;
    void (async () => {
      const r = await fetchMyBillingPeriod(ownerId);
      if (!r.ok) return alive && setState({ key, sub: null, prices: null, error: r.message });
      // A BUSINESS base plan only: the function would switch whatever the
      // caller holds, and a professional's own plan is not this screen's.
      const tiers = await fetchSubscriptionTiers("business");
      if (!tiers.ok) return alive && setState({ key, sub: null, prices: null, error: tiers.message === OFFLINE_MESSAGE ? OFFLINE_MESSAGE : "Couldn't load how you're billed." });
      const own = r.value;
      const isBusinessPlan = !!own?.tierId && tiers.tiers.some((t) => !t.isAddon && t.rowId === own.tierId);
      const sub = own && own.active && isBusinessPlan ? own : null;
      if (!sub || !sub.tierId) return alive && setState({ key, sub: null, prices: null, error: null });
      const p = await fetchPeriodPrices(sub.tierId, sub.seatBlocks, "Couldn't load how you're billed.");
      if (alive) setState({ key, sub, prices: p.ok ? p.value : null, error: p.ok ? null : p.message });
    })();
    return () => {
      alive = false;
    };
  }, [enabled, ownerId, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const choose = useCallback(
    async (period: SubscriptionPeriod) => {
      const r = await setBillingPeriod(period);
      if (r.ok) setState((s) => (s && s.sub ? { ...s, sub: { ...s.sub, ...r.value } } : s));
      return r;
    },
    []
  );

  if (!enabled || !ownerId) return { ready: true, sub: null, prices: null, error: null, reload, choose };
  const fresh = state && state.key.startsWith(`${ownerId}|${enabled}|`) ? state : null;
  return { ready: !!fresh, sub: fresh?.sub ?? null, prices: fresh?.prices ?? null, error: fresh?.error ?? null, reload, choose };
}

/** subscription_price_for for one tier at both periods (the plan comparison); null while loading. */
export function usePeriodPrices(tierIds: (string | null | undefined)[]): { prices: Map<string, Record<SubscriptionPeriod, number | null>> | null; error: string | null; reload: () => void } {
  const ids = tierIds.filter((t): t is string => !!t);
  const idsKey = ids.join(",");
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ key: string; prices: Map<string, Record<SubscriptionPeriod, number | null>> | null; error: string | null } | null>(null);
  const key = `${idsKey}|${tick}`;

  useEffect(() => {
    if (!idsKey) return;
    let alive = true;
    const list = idsKey.split(",");
    void Promise.all(list.map((id) => fetchPeriodPrices(id, 0))).then((rs) => {
      if (!alive) return;
      const failed = rs.find((r) => !r.ok);
      if (failed && !failed.ok) return setState({ key, prices: null, error: failed.message });
      setState({ key, prices: new Map(list.map((id, i) => [id, (rs[i] as { ok: true; value: Record<SubscriptionPeriod, number | null> }).value])), error: null });
    });
    return () => {
      alive = false;
    };
  }, [idsKey, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const fresh = state && state.key.startsWith(`${idsKey}|`) ? state : null;
  return { prices: fresh?.prices ?? null, error: fresh?.error ?? null, reload };
}
