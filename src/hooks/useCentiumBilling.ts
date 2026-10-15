import { useCallback, useEffect, useState } from "react";
import { useConsoleAccess } from "./useConsoleAccess";
import {
  buySeatBlocks,
  cancelSeatPurchase,
  fetchBillingHistory,
  fetchPlanSummary,
  pendingSeatPurchase,
  type CentiumCharge,
  type PlanSummary,
  type Read,
} from "../services/centium-billing";

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
