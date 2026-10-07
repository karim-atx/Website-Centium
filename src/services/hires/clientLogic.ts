// A3, the client's side of hiring: the pure parts, tested without a database
// (clientLogic.test.ts). The I/O lives in ./index.ts.
//
// Contract: "Stage A3 · Hiring a professional" in ../Database/docs/HANDOVER_API.md,
// migration 20261101000000_professional_plans_and_hires.sql (and
// 20261101010000_hire_chat_cards.sql for post_plans_card).

import { formatPrice } from "../../utils/price";
import { OFFLINE_MESSAGE } from "../network-error";
import type { HirePaymentMethod, PlanBilling } from "./proLogic";

export type { HirePaymentMethod, PlanBilling } from "./proLogic";

/** professional_hires.status (the hire_status enum). */
export type HireStatus = "pending" | "active" | "cancelled" | "expired";
/** professional_hires.payment_status (stage 5's venue_payment_status). */
export type HirePaymentStatus = "pending" | "paid" | (string & {});

/** One row of professional_plans_for(): a plan on the hire sheet (MO1.2.1.5). */
export interface Plan {
  id: string;
  name: string;
  price: number;
  billing: PlanBilling;
  features: string[];
  position: number;
  /** The caller already holds a live (pending or active) hire on this plan. */
  isHired: boolean;
}

/** One row of my_hires(): the caller's own hire. */
export interface MyHire {
  id: string;
  professionalId: string;
  professionalFirstName: string;
  planName: string;
  status: HireStatus;
  paymentMethod: HirePaymentMethod;
  paymentStatus: HirePaymentStatus;
  /** Copied at hire time; re-pricing the plan never changes it. */
  priceAgreed: number;
  startedOn: string;
  expiresOn: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

/** professional_plans_for() as PostgREST returns it. numeric may be a string. */
export interface PlanRow {
  id: string;
  name: string;
  price: number | string;
  billing: PlanBilling;
  features: string[] | null;
  position: number | null;
  is_hired: boolean | null;
}

/** my_hires() as PostgREST returns it. */
export interface MyHireRow {
  id: string;
  professional_id: string;
  professional_first_name: string | null;
  plan_name: string;
  status: HireStatus;
  payment_method: HirePaymentMethod;
  payment_status: HirePaymentStatus;
  price_agreed: number | string;
  started_on: string;
  expires_on: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
}

export function toPlan(r: PlanRow): Plan {
  return {
    id: r.id,
    name: r.name,
    price: Number(r.price),
    billing: r.billing,
    features: (r.features ?? []).filter((f) => typeof f === "string" && f.trim().length > 0),
    position: r.position ?? 0,
    isHired: r.is_hired === true,
  };
}

export function toMyHire(r: MyHireRow): MyHire {
  return {
    id: r.id,
    professionalId: r.professional_id,
    professionalFirstName: r.professional_first_name ?? "",
    planName: r.plan_name,
    status: r.status,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    priceAgreed: Number(r.price_agreed),
    startedOn: r.started_on,
    expiresOn: r.expires_on,
    confirmedAt: r.confirmed_at,
    cancelledAt: r.cancelled_at,
  };
}

/**
 * The billing suffix. MO1.2.1.5 draws "$120/mo" for a monthly plan; "/yr"
 * and "/day" follow the same short form (the frame draws neither, so these
 * two are unspecified by the handover).
 */
const SHORT_PERIOD: Record<PlanBilling, string> = { daily: "day", monthly: "mo", annually: "yr" };

/** "$120/mo" — the plan card's and the checkout plan line's price. */
export function planPriceLabel(price: number, billing: PlanBilling): string {
  return `${formatPrice(price) || "$0"}/${SHORT_PERIOD[billing] ?? billing}`;
}

/** "$400" — the Pay button and the confirmed line (MO1.2.1.5.1 "Pay $400"). */
export function priceShort(price: number): string {
  return formatPrice(price) || "$0";
}

/** "$400.00" — MO1.2.1.5.1's order total rows. */
export function priceExact(price: number): string {
  const n = Number.isFinite(price) ? price : 0;
  return `$${n.toFixed(2)}`;
}

/** A hire that blocks a second one with the same professional (the partial unique index). */
export function isLiveHire(h: Pick<MyHire, "status">): boolean {
  return h.status === "pending" || h.status === "active";
}

/** The caller's live hire with this professional, if any (my_hires() is newest first). */
export function liveHireWith(hires: MyHire[], professionalId: string): MyHire | null {
  return hires.find((h) => h.professionalId === professionalId && isLiveHire(h)) ?? null;
}

/**
 * The hire's state in words. payment_status 'pending' on a live hire is the
 * handover's "Pending payment" ("Cash hires stay 'Pending payment' until the
 * professional confirms receipt").
 */
export function hireStatusLabel(h: Pick<MyHire, "status" | "paymentStatus">): string {
  if (h.status === "cancelled") return "Cancelled";
  if (h.status === "expired") return "Ended";
  if (h.paymentStatus !== "paid") return "Pending payment";
  return "Active";
}

/** "Until 7 Nov 2026" for a dated hire, else null. */
export function hireUntilLabel(expiresOn: string | null): string | null {
  if (!expiresOn) return null;
  const d = new Date(`${expiresOn}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `Until ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

/**
 * hire_professional()'s refusals, to the CLIENT. Every code the contract
 * lists. ATXA0 is rendered as the contract writes it and says nothing about
 * why (cap or free period is the professional's commercial situation).
 */
export function describeHireError(code: string | undefined): string {
  switch (code) {
    case "ATXA2":
      return "Accounts under 18 can't hire a professional.";
    case "ATX98":
      return "That plan isn't available any more.";
    case "22023":
      return "You can't hire yourself.";
    case "ATX99":
      return "You already have a plan with this professional. Cancel it before choosing another.";
    case "ATXA0":
      return "This professional is not taking new clients right now.";
    case "ATX01":
      return "Your session expired. Sign in again.";
    default:
      return "Couldn't complete the hire. Try again.";
  }
}

/** cancel_hire()'s refusals, to the client. */
export function describeClientCancelError(code: string | undefined): string {
  switch (code) {
    case "ATXA1":
      return "This hire has already been cancelled.";
    case "ATX01":
      return "Your session expired. Sign in again.";
    default:
      return "Couldn't cancel the hire. Try again.";
  }
}

/** post_plans_card()'s refusals, to the professional sending it. */
export function describePlansCardError(code: string | undefined, offline = false): string {
  if (offline) return OFFLINE_MESSAGE;
  switch (code) {
    case "ATX08":
      return "You can't send plans in this conversation.";
    case "ATX98":
      return "You have no active plans to offer. Add one under your hire plans first.";
    case "ATXA2":
      return "Plans can't be offered to someone under 18.";
    case "22023":
      // Two causes share the code: a venue thread, or more than five plans
      // (the server refuses a sixth even when p_plan_ids is null).
      return "Plans can't be sent here. A card holds at most five plans, and none can go in a venue conversation.";
    case "ATX35":
      // A block, either way round; the same sentence messaging uses, which
      // deliberately does not say who blocked whom.
      return "You can't message this person.";
    case "ATX02":
      // The message posts through the ordinary rate limiter.
      return "You're sending messages too quickly. Wait a minute and try again.";
    case "ATX01":
      return "Your session expired. Sign in again.";
    default:
      return "Couldn't send your plans. Try again.";
  }
}

/**
 * The cancel confirmation's body, chosen by whether the professional has
 * confirmed receipt (the same predicate cancel_hire() uses for was_free).
 * After confirmation it states what was agreed and that Centium only records
 * the cancellation: no charge or refund is named, because Centium knows of
 * neither.
 */
export function cancelPromptLine(h: Pick<MyHire, "planName" | "priceAgreed" | "paymentStatus" | "professionalFirstName">): string {
  const who = h.professionalFirstName.trim() || "The professional";
  if (h.paymentStatus !== "paid") {
    return `${who} hasn't confirmed a payment yet, so cancelling is free.`;
  }
  return `You agreed to ${h.planName} at ${priceShort(h.priceAgreed)}, and ${who} has confirmed your payment. Centium records the cancellation only; anything already paid is between you and them.`;
}

/** What cancelling did, from cancel_hire()'s was_free. */
export function clientCancelledLine(firstName: string, wasFree: boolean): string {
  const who = firstName.trim() || "the professional";
  return wasFree
    ? "Hire cancelled. No payment had been confirmed, so there's nothing to settle."
    : `Hire cancelled. Centium has recorded it; anything already paid is between you and ${who}.`;
}
