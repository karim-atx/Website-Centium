// A3, the professional's side of hiring: the pure parts, tested without a
// database (proLogic.test.ts). The I/O lives in ./pro.ts.
//
// Contract: "Stage A3 · Hiring a professional" in ../Database/docs/HANDOVER_API.md,
// migration 20261101000000_professional_plans_and_hires.sql.

import { parsePrice, formatPrice } from "../../utils/price";
import { PERIOD } from "../venues/venueLogic";
import { OFFLINE_MESSAGE } from "../network-error";

export type PlanBilling = "daily" | "monthly" | "annually";
export type HirePaymentMethod = "cash" | "whish";

export const BILLING_OPTIONS: { value: PlanBilling; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
];

/** professional_plans_name_check: non-blank, at most 80 characters. */
export const PLAN_NAME_MAX = 80;
/** professional_plans_features_check: at most 10 bullets. */
export const PLAN_FEATURES_MAX = 10;

/** "$180/month". */
export function planPriceLine(price: number, billing: PlanBilling): string {
  return `${formatPrice(price) || "$0"}/${PERIOD[billing]}`;
}

/** "Cash" / "Whish Money" — the stage 5 checkout's own names for the two. */
export function paymentMethodLabel(method: string): string {
  if (method === "whish") return "Whish Money";
  if (method === "cash") return "Cash";
  return method;
}

export interface PlanDraft {
  name: string;
  /** What was typed; parsed with utils/price like every other price box. */
  price: string;
  billing: PlanBilling;
  /** One entry per bullet, as typed. Blank ones are dropped. */
  features: string[];
  active: boolean;
}

/** The columns a plan write sends — all inside the column grant. */
export interface PlanWrite {
  name: string;
  price: number;
  billing: PlanBilling;
  features: string[];
  active: boolean;
}

/**
 * The draft as columns, or the sentence saying why it cannot be saved. Mirrors
 * the table's own checks so a refusal is caught here with a reason, not as a
 * bare 23514 from the database.
 */
export function validatePlanDraft(draft: PlanDraft): { ok: true; row: PlanWrite } | { ok: false; message: string } {
  const name = draft.name.trim();
  if (!name) return { ok: false, message: "Give the plan a name." };
  if (name.length > PLAN_NAME_MAX) {
    return { ok: false, message: `Keep the plan name to ${PLAN_NAME_MAX} characters or fewer.` };
  }

  const price = parsePrice(draft.price);
  if (!price.ok || price.value === null) {
    return { ok: false, message: "Enter the price as a number, for example 180 or $180." };
  }

  if (!BILLING_OPTIONS.some((b) => b.value === draft.billing)) {
    return { ok: false, message: "Choose how often the plan is billed." };
  }

  const features = draft.features.map((f) => f.trim()).filter((f) => f.length > 0);
  if (features.length > PLAN_FEATURES_MAX) {
    return { ok: false, message: `A plan can list up to ${PLAN_FEATURES_MAX} features.` };
  }

  return { ok: true, row: { name, price: price.value, billing: draft.billing, features, active: draft.active } };
}

/**
 * The position each plan should have after moving one up or down, as the
 * changed (id, position) pairs only. Positions are rewritten as 0..n-1 in the
 * new order, so plans that shared a position (the column defaults to 0) come
 * out distinct and the order the professional sees is the order saved.
 */
export function reorderPlans<T extends { id: string; position: number }>(
  plans: T[],
  id: string,
  direction: "up" | "down"
): { id: string; position: number }[] {
  const order = [...plans];
  const from = order.findIndex((p) => p.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= order.length) return [];
  [order[from], order[to]] = [order[to], order[from]];
  return order
    .map((p, index) => ({ id: p.id, position: index, before: p.position }))
    .filter((p) => p.position !== p.before)
    .map(({ id: planId, position }) => ({ id: planId, position }));
}

/** Plans in the order the hire sheet shows them: position, then creation. */
export function sortByPosition<T extends { position: number; createdAt: string }>(plans: T[]): T[] {
  return [...plans].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
}

/** A failed plan write as a sentence. */
export function describePlanWriteError(error: { code?: string; message?: string } | null, offline: boolean): string {
  if (offline) return OFFLINE_MESSAGE;
  switch (error?.code) {
    case "23514":
      // A table check the validator above should already have caught.
      return "That plan can't be saved: check the name, price and features.";
    case "42501":
      return "You can't change this plan.";
    case "PGRST116":
      // UPDATE ... select().single() matched nothing: not theirs, or gone.
      return "That plan isn't there any more. Refresh and try again.";
    default:
      return "Couldn't save the plan. Try again.";
  }
}

/**
 * Whether this professional can take a new client, derived from what the app
 * can read, because professional_can_take_client() is granted to nobody.
 *
 * THE SAME TWO GATES IN THE SAME ORDER as that function:
 *   1. the free period — my_professional_plan().may_connect_clients is the
 *      same predicate the connection paths refuse with (ATX49);
 *   2. the client cap — my_effective_professional_tier()'s tier max_clients
 *      (null = unlimited) against the live roster (professional_clients with
 *      disconnected_at null, which is what the roster view returns).
 *
 * Unknown answers block nothing (null): the server refuses either way and
 * the refusal is mapped, and a notice drawn from a guess would be wrong.
 */
export type HireGate = "free_period" | "tier_cap" | null;

export function hireGate(facts: {
  mayConnectClients: boolean | null | undefined;
  maxClients: number | null | undefined;
  clientCount: number;
}): HireGate {
  if (facts.mayConnectClients === false) return "free_period";
  if (typeof facts.maxClients === "number" && facts.clientCount >= facts.maxClients) return "tier_cap";
  return null;
}

/**
 * confirm_hire_payment()'s refusals, to the PROFESSIONAL. Here ATXA0 and
 * ATX49 may say which gate it was (the contract: the caller is the
 * professional). `planLabel` names their plan when known.
 */
export function describeConfirmError(code: string | undefined, planLabel?: string | null): string {
  switch (code) {
    case "ATXA1":
      return "This hire isn't waiting for confirmation any more. It may have been cancelled.";
    case "ATX49":
      return "Your free month has ended, so this payment can't be confirmed. Upgrade to connect new clients.";
    case "ATXA0":
      return planLabel
        ? `You've reached the client limit on your ${planLabel} plan, so this payment can't be confirmed. Disconnect a client to free a place, or upgrade.`
        : "You've reached the client limit on your plan, so this payment can't be confirmed. Disconnect a client to free a place, or upgrade.";
    case "ATX01":
      return "Your session expired. Sign in again.";
    default:
      return "Couldn't confirm the payment. Try again.";
  }
}

/** cancel_hire()'s refusals. */
export function describeCancelError(code: string | undefined): string {
  switch (code) {
    case "ATXA1":
      return "This hire has already been cancelled.";
    case "ATX01":
      return "Your session expired. Sign in again.";
    default:
      return "Couldn't cancel the hire. Try again.";
  }
}

/**
 * What cancelling did, from was_free. Before confirmation nothing had been
 * acknowledged; after it Centium only records the cancellation — no money
 * passed through it, so there is no charge or refund to name.
 */
export function cancelledLine(firstName: string, wasFree: boolean): string {
  const who = firstName.trim() || "The client";
  return wasFree
    ? `${who}'s hire is cancelled. No payment had been confirmed, so there's nothing to settle.`
    : `${who}'s hire is cancelled. You'd already confirmed their payment, so Centium has recorded the cancellation; anything owed is between you and ${who}.`;
}
