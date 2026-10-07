import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import {
  describeHireError,
  describePlansCardError,
  toMyHire,
  toPlan,
  type HirePaymentMethod,
  type MyHire,
  type MyHireRow,
  type Plan,
  type PlanRow,
} from "./clientLogic";
import { createPlan, updatePlan, type PlanWriteResult } from "./pro";
import type { PlanDraft } from "./proLogic";

// A3 · Hiring a professional: THE ONE SERVICE for every A3 function and
// table (a3-shared.md). Contract: "Stage A3" in ../Database/docs/HANDOVER_API.md.
//
//   professional_plans_for(id)   the hire sheet, MO1.2.1.5 (anon + authenticated)
//   hire_professional(plan, m)   checkout, MO1.2.1.5.1 (moves no money, BR-04)
//   my_hires()                   confirmed, MO1.2.1.5.2, and "Pending payment"
//   cancel_hire(id, reason)      either party; was_free picks the wording
//   professional_pending_hires() the professional's console (A3-pro, ./pro.ts)
//   confirm_hire_payment(id)     the professional confirms receipt (./pro.ts)
//   professional_plans           the plan editor, direct writes (./pro.ts)
//   post_plans_card(thread, ids) MO1.2.1.3.7, the professional's composer
//
// professional_hires itself is unreadable by any client role; these
// functions are the whole interface. NONE of them are in the generated types
// (production predates A3; gen:types is never run), so the client is cast
// narrowly at this boundary, the pattern ./pro.ts and services/business-members use.

export * from "./clientLogic";
export {
  cancelHire,
  confirmHirePayment,
  createPlan,
  fetchMyPlans,
  fetchPendingHires,
  setPlanActive,
  setPlanPosition,
  updatePlan,
  type CancelResult,
  type ConfirmResult,
  type PendingHire,
  type PlanWriteResult,
  type ProPlan,
} from "./pro";

type PgError = { code?: string; message: string } | null;
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PgError }> };
const rpc = (): Rpc => supabase as unknown as Rpc;

const LOAD_PLANS_FAILED = "Couldn't load the plans. Try again.";
const LOAD_HIRES_FAILED = "Couldn't load your hires. Try again.";

/**
 * professional_plans_for(): the listed professional's active plans in
 * position order, each with is_hired for the caller. An unlisted professional
 * returns zero rows (their plans are not on offer), which is the empty state,
 * not an error.
 */
export async function fetchPlansFor(professionalId: string): Promise<{ ok: true; plans: Plan[] } | { ok: false; message: string }> {
  try {
    const { data, error } = await rpc().rpc("professional_plans_for", { p_professional: professionalId });
    if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : LOAD_PLANS_FAILED };
    const rows = (Array.isArray(data) ? data : []) as PlanRow[];
    return { ok: true, plans: rows.map(toPlan) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : LOAD_PLANS_FAILED };
  }
}

export type HireResult = { ok: true; hireId: string } | { ok: false; code?: string; message: string };

/**
 * hire_professional(): creates a PENDING hire at the plan's current price
 * (copied onto the row). Cash and Whish are only a payment_method; no card
 * field exists anywhere. `code` is the ATX code so a screen can turn ATXA0
 * into its "not taking new clients" state and ATX98 back into the sheet.
 */
export async function hireProfessional(planId: string, method: HirePaymentMethod): Promise<HireResult> {
  try {
    const { data, error } = await rpc().rpc("hire_professional", { p_plan_id: planId, p_method: method });
    if (error) {
      if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
      return { ok: false, code: error.code, message: describeHireError(error.code) };
    }
    if (typeof data !== "string") return { ok: false, message: describeHireError(undefined) };
    return { ok: true, hireId: data };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : describeHireError(undefined) };
  }
}

/** my_hires(): the caller's own hires, newest first. */
export async function fetchMyHires(): Promise<{ ok: true; hires: MyHire[] } | { ok: false; message: string }> {
  try {
    const { data, error } = await rpc().rpc("my_hires");
    if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : LOAD_HIRES_FAILED };
    const rows = (Array.isArray(data) ? data : []) as MyHireRow[];
    return { ok: true, hires: rows.map(toMyHire) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : LOAD_HIRES_FAILED };
  }
}

/**
 * The plan editor's one save: an existing plan (with `id`) is updated, a new
 * one inserted at `position`. professional_id goes on INSERT only; it is
 * outside the UPDATE grant.
 */
export function savePlan(plan: { id?: string | null; userId: string; draft: PlanDraft; position: number }): Promise<PlanWriteResult> {
  return plan.id ? updatePlan(plan.id, plan.draft) : createPlan(plan.userId, plan.draft, plan.position);
}

export type PlansCardResult = { ok: true; messageId: string } | { ok: false; code?: string; message: string };

/**
 * post_plans_card(): a professional offers their own active plans in an
 * existing conversation (MO1.2.1.3.7). `planIds` null/omitted means all of
 * them, capped at five by the server. Returns the new message's id.
 */
export async function postPlansCard(threadId: string, planIds?: string[] | null): Promise<PlansCardResult> {
  try {
    const { data, error } = await rpc().rpc("post_plans_card", {
      p_thread_id: threadId,
      p_plan_ids: planIds && planIds.length > 0 ? planIds : null,
    });
    if (error) {
      return { ok: false, code: error.code, message: describePlansCardError(error.code, isOffline(error)) };
    }
    if (typeof data !== "string") return { ok: false, message: describePlansCardError(undefined) };
    return { ok: true, messageId: data };
  } catch (e) {
    return { ok: false, message: describePlansCardError(undefined, isOffline(e)) };
  }
}
