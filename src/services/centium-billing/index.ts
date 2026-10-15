import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { isMissingFunction, seatPurchaseRefusal, toCharge, toPlanSummary, type CentiumCharge, type ChargeRow, type PlanSummary, type PlanSummaryRow } from "./model";

export * from "./model";

// B8 / RV-06 (Database 20261121210000, HANDOVER_API "What a business pays
// Centium"): the plan summary, the billing history, and the owner's seat
// purchase. Signatures checked on the local stack:
//   business_plan_summary(p_business_id) → one row       gate members OR revenue
//   centium_billing_history(p_business_id, p_limit, p_offset) → rows + total_count   gate revenue
//   buy_seat_blocks(p_business_id, p_blocks) → uuid       owner only; ATXD6 / ATXD7 / 22023
//   cancel_seat_block_purchase(p_charge_id)               owner only; 22023 / ATXD8 / ATX08
// Not in the production-generated types yet, so calls go through one loose
// handle. Admin functions (admin_*) belong to the admin console, not here.
//
// PENDING RULE: a missing function (PGRST202 / 42883) answers `missing`, and
// each screen keeps its earlier behaviour; it is never a flag.

type LooseRpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as LooseRpc;

export type Read<T> =
  | { ok: true; value: T }
  | { ok: false; missing: boolean; denied: boolean; message: string };

const readFail = <T>(error: { code?: string; message?: string }, fallback: string): Read<T> => ({
  ok: false,
  missing: isMissingFunction(error.code),
  // ATX03: the seat doesn't hold the gate; ATX08: not this account's business.
  denied: error.code === "ATX03" || error.code === "ATX08",
  message: isOffline(error) ? OFFLINE_MESSAGE : fallback,
});

export async function fetchPlanSummary(businessId: string): Promise<Read<PlanSummary>> {
  try {
    const { data, error } = await rpc<PlanSummaryRow[]>("business_plan_summary", { p_business_id: businessId });
    if (error) return readFail(error, "Couldn't load your plan.");
    const row = Array.isArray(data) ? data[0] : (data as PlanSummaryRow | null);
    if (!row) return { ok: false, missing: false, denied: true, message: "Couldn't load your plan." };
    return { ok: true, value: toPlanSummary(row) };
  } catch (e) {
    return { ok: false, missing: false, denied: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't load your plan." };
  }
}

export async function fetchBillingHistory(businessId: string, limit = 50, offset = 0): Promise<Read<{ charges: CentiumCharge[]; total: number }>> {
  try {
    const { data, error } = await rpc<ChargeRow[]>("centium_billing_history", { p_business_id: businessId, p_limit: limit, p_offset: offset });
    if (error) return readFail(error, "Couldn't load your billing history.");
    const rows = data ?? [];
    return { ok: true, value: { charges: rows.map(toCharge), total: Number(rows[0]?.total_count ?? 0) } };
  } catch (e) {
    return { ok: false, missing: false, denied: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't load your billing history." };
  }
}

export type Write<T> = { ok: true; value: T } | { ok: false; code?: string; kind: ReturnType<typeof seatPurchaseRefusal>["kind"]; message: string };

/** buy_seat_blocks: opens a pending seat_block charge; seats count once Centium marks it paid. */
export async function buySeatBlocks(businessId: string, blocks: number): Promise<Write<string>> {
  try {
    const { data, error } = await rpc<string>("buy_seat_blocks", { p_business_id: businessId, p_blocks: blocks });
    if (error) {
      if (isOffline(error)) return { ok: false, code: error.code, kind: "failed", message: OFFLINE_MESSAGE };
      const r = seatPurchaseRefusal(error.code, "buy");
      return { ok: false, code: error.code, ...r };
    }
    return { ok: true, value: String(data) };
  } catch (e) {
    return { ok: false, kind: "failed", message: isOffline(e) ? OFFLINE_MESSAGE : seatPurchaseRefusal(undefined, "buy").message };
  }
}

/** cancel_seat_block_purchase: a pending seat purchase only (not a renewal). */
export async function cancelSeatPurchase(chargeId: string): Promise<Write<true>> {
  try {
    const { error } = await rpc<null>("cancel_seat_block_purchase", { p_charge_id: chargeId });
    if (error) {
      if (isOffline(error)) return { ok: false, code: error.code, kind: "failed", message: OFFLINE_MESSAGE };
      const r = seatPurchaseRefusal(error.code, "cancel");
      return { ok: false, code: error.code, ...r };
    }
    return { ok: true, value: true };
  } catch (e) {
    return { ok: false, kind: "failed", message: isOffline(e) ? OFFLINE_MESSAGE : seatPurchaseRefusal(undefined, "cancel").message };
  }
}
