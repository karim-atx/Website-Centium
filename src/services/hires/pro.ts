import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import {
  describeCancelError,
  describeConfirmError,
  describePlanWriteError,
  sortByPosition,
  validatePlanDraft,
  type HirePaymentMethod,
  type PlanBilling,
  type PlanDraft,
} from "./proLogic";

// A3, the professional's side of hiring (A3-pro). Written as its own file
// because src/services/hires/index.ts (A3-client's) did not exist yet when
// this was built — see a3-shared.md; the lead merges.
//
//   professional_plans           the plan editor, direct table writes
//   professional_pending_hires() what is waiting to be confirmed
//   confirm_hire_payment()       the professional confirms receipt
//   cancel_hire()                either party; was_free picks the wording
//
// NONE OF THESE ARE IN THE GENERATED TYPES, which come from production and
// predate A3, so the client is cast narrowly at this boundary rather than the
// generated file being hand-edited (the pattern services/business-members uses).

type PgError = { code?: string; message: string } | null;

export interface ProPlan {
  id: string;
  name: string;
  price: number;
  billing: PlanBilling;
  features: string[];
  active: boolean;
  position: number;
  createdAt: string;
}

export interface PendingHire {
  id: string;
  clientFirstName: string;
  planName: string;
  paymentMethod: HirePaymentMethod;
  priceAgreed: number;
  createdAt: string;
}

interface PlanRow {
  id: string;
  name: string;
  /** numeric arrives as a number or a string depending on the path. */
  price: number | string;
  billing: PlanBilling;
  features: string[] | null;
  active: boolean;
  position: number;
  created_at: string;
}

interface PendingRow {
  id: string;
  client_first_name: string | null;
  plan_name: string;
  payment_method: HirePaymentMethod;
  price_agreed: number | string;
  created_at: string;
}

const PLAN_COLUMNS = "id, name, price, billing, features, active, position, created_at";

type PlanQuery = PromiseLike<{ data: PlanRow[] | null; error: PgError }> & {
  eq: (c: string, v: string) => PlanQuery;
  order: (c: string, o: { ascending: boolean }) => PlanQuery;
};
type PlanSingle = PromiseLike<{ data: PlanRow | null; error: PgError }>;
interface PlansTable {
  select: (c: string) => PlanQuery;
  insert: (row: Record<string, unknown>) => { select: (c: string) => { single: () => PlanSingle } };
  update: (row: Record<string, unknown>) => {
    eq: (c: string, v: string) => { select: (c: string) => { single: () => PlanSingle } };
  };
}
const plansTable = (): PlansTable =>
  (supabase as unknown as { from: (t: "professional_plans") => PlansTable }).from("professional_plans");

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PgError }> };
const rpc = (): Rpc => supabase as unknown as Rpc;

const toPlan = (r: PlanRow): ProPlan => ({
  id: r.id,
  name: r.name,
  price: Number(r.price),
  billing: r.billing,
  features: r.features ?? [],
  active: r.active,
  position: r.position,
  createdAt: r.created_at,
});

const LOAD_PLANS_FAILED = "Couldn't load your plans. Try again.";

/**
 * Every plan this professional has, active or not, in hire-sheet order.
 *
 * FILTERED BY professional_id because the public SELECT policy would also
 * return every OTHER listed professional's active plans; the own-plans policy
 * is what lets the inactive ones through.
 */
export async function fetchMyPlans(userId: string): Promise<{ ok: true; plans: ProPlan[] } | { ok: false; message: string }> {
  try {
    const { data, error } = await plansTable()
      .select(PLAN_COLUMNS)
      .eq("professional_id", userId)
      .order("position", { ascending: true });
    if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : LOAD_PLANS_FAILED };
    return { ok: true, plans: sortByPosition((data ?? []).map(toPlan)) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : LOAD_PLANS_FAILED };
  }
}

export type PlanWriteResult = { ok: true; plan: ProPlan } | { ok: false; message: string };

/**
 * Adds a plan at the end of the list. professional_id is sent on INSERT only
 * (the insert policy requires it to be the caller); it is outside the UPDATE
 * grant, so an edit can never move a plan to another profile.
 */
export async function createPlan(userId: string, draft: PlanDraft, position: number): Promise<PlanWriteResult> {
  const built = validatePlanDraft(draft);
  if (!built.ok) return built;
  try {
    const { data, error } = await plansTable()
      .insert({ professional_id: userId, ...built.row, position })
      .select(PLAN_COLUMNS)
      .single();
    if (error || !data) {
      if (error) console.error("[hires/pro] Could not create the plan:", error.message);
      return { ok: false, message: describePlanWriteError(error, isOffline(error)) };
    }
    return { ok: true, plan: toPlan(data) };
  } catch (e) {
    return { ok: false, message: describePlanWriteError(null, isOffline(e)) };
  }
}

/**
 * Edits a plan in place: name, price, billing, features, active and
 * updated_at only — exactly the column UPDATE grant. Filtered by id alone; the
 * update policy is what restricts it to the caller's own plans.
 */
export async function updatePlan(planId: string, draft: PlanDraft): Promise<PlanWriteResult> {
  const built = validatePlanDraft(draft);
  if (!built.ok) return built;
  return writePlan(planId, { ...built.row });
}

/** The active switch on its own, from the list. */
export function setPlanActive(planId: string, active: boolean): Promise<PlanWriteResult> {
  return writePlan(planId, { active });
}

/** One plan's position, from the reorder arrows. */
export function setPlanPosition(planId: string, position: number): Promise<PlanWriteResult> {
  return writePlan(planId, { position });
}

async function writePlan(planId: string, row: Record<string, unknown>): Promise<PlanWriteResult> {
  try {
    const { data, error } = await plansTable()
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", planId)
      .select(PLAN_COLUMNS)
      .single();
    if (error || !data) {
      if (error) console.error("[hires/pro] Could not update the plan:", error.message);
      return { ok: false, message: describePlanWriteError(error, isOffline(error)) };
    }
    return { ok: true, plan: toPlan(data) };
  } catch (e) {
    return { ok: false, message: describePlanWriteError(null, isOffline(e)) };
  }
}

const LOAD_PENDING_FAILED = "Couldn't load hires waiting for payment. Try again.";

/**
 * professional_pending_hires(): the client's FIRST NAME and nothing more,
 * the plan, the method, the agreed price and when they hired. client_id comes
 * back from the function too but is not carried — nothing here needs it.
 */
export async function fetchPendingHires(): Promise<{ ok: true; hires: PendingHire[] } | { ok: false; message: string }> {
  try {
    const { data, error } = await rpc().rpc("professional_pending_hires");
    if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : LOAD_PENDING_FAILED };
    const rows = (Array.isArray(data) ? data : []) as PendingRow[];
    return {
      ok: true,
      hires: rows.map((r) => ({
        id: r.id,
        clientFirstName: r.client_first_name ?? "",
        planName: r.plan_name,
        paymentMethod: r.payment_method,
        priceAgreed: Number(r.price_agreed),
        createdAt: r.created_at,
      })),
    };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : LOAD_PENDING_FAILED };
  }
}

export type ConfirmResult = { ok: true } | { ok: false; code?: string; message: string };

/**
 * confirm_hire_payment(): activates the hire, creates the professional_clients
 * row and posts the "Plan confirmed" card. Idempotent on the server, so a
 * second press is harmless. `planLabel` names the professional's plan in the
 * ATXA0 message.
 */
export async function confirmHirePayment(hireId: string, planLabel?: string | null): Promise<ConfirmResult> {
  try {
    const { error } = await rpc().rpc("confirm_hire_payment", { p_hire_id: hireId });
    if (error) {
      if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
      return { ok: false, code: error.code, message: describeConfirmError(error.code, planLabel) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : describeConfirmError(undefined) };
  }
}

export type CancelResult = { ok: true; wasFree: boolean } | { ok: false; code?: string; message: string };

/** cancel_hire(): either party. Leaves professional_clients alone. */
export async function cancelHire(hireId: string, reason?: string): Promise<CancelResult> {
  try {
    const { data, error } = await rpc().rpc("cancel_hire", {
      p_hire_id: hireId,
      p_reason: reason?.trim() ? reason.trim() : null,
    });
    if (error) {
      if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
      return { ok: false, code: error.code, message: describeCancelError(error.code) };
    }
    const row = (Array.isArray(data) ? data[0] : data) as { was_free?: boolean } | null;
    // RETURNS TABLE (was_free) always yields one row; a missing value is read
    // as "free" only because a pending hire (all this console cancels) is.
    return { ok: true, wasFree: row?.was_free ?? true };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : describeCancelError(undefined) };
  }
}
