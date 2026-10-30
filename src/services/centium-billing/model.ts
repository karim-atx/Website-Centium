// B8 / RV-06 · What a business pays CENTIUM (Database 20261121210000): its
// Business plan and its seat blocks. Pure shapes and wording, no runtime
// imports (the node test project reads this file).
//
// TWO LEDGERS THAT NEVER MIX. business_payments is what members pay a
// business; centium_charges is what a business pays Centium. Nothing here
// touches a member's money, and no copy may suggest Centium handled it. No
// card payment exists: a charge is an amount Centium asked for, paid to
// Centium by cash or bank transfer, and Centium marks it paid (Whish later).
// Seats count only once their charge is paid.
//
// PRICES ARE NEVER WRITTEN HERE. Every amount comes from the database
// (business_plan_summary reads subscription_tiers; a charge carries its own
// amount).

import type { SubscriptionPeriod } from "./period";
import { t, tk, tn } from "../../i18n/core";

export type CentiumProduct = "business_plan" | "seat_block" | "featured_week";
export type CentiumChargeStatus = "pending" | "paid" | "failed" | "waived" | "cancelled" | "payment_not_received";
export type CentiumChargeMethod = "whish" | "cash" | "transfer" | "manual";

/** business_plan_summary(p_business_id): one row. Gate members OR revenue. */
export interface PlanSummaryRow {
  plan_name: string | null;
  plan_status: string | null;
  renews_at: string | null;
  plan_price: number | string | null;
  included_seats: number | null;
  seat_blocks: number | null;
  seats_per_block: number | null;
  seat_block_price: number | string | null;
  seat_capacity: number | null;
  pending_charges: number | null;
  pending_amount: number | string | null;
  /** Batch 2 (20261204000000): the period plan_price and seat_block_price are for. Absent on an older stack. */
  billing_period?: string | null;
}

export interface PlanSummary {
  planName: string;
  /** The plan is active: the only state that holds seats. */
  active: boolean;
  renewsAt: string | null;
  /** How the business is billed (billing_period); monthly on a stack without it. */
  period: SubscriptionPeriod;
  /** The plan's price for `period`; null when there is none ("Not available"). */
  planPrice: number | null;
  includedSeats: number;
  seatBlocks: number;
  /** Seats per block, from the seat-block tier; null when that tier is missing. */
  seatsPerBlock: number | null;
  /** The seat block's price for `period`; null when there is none ("Not available"). */
  seatBlockPrice: number | null;
  /** business_seat_capacity(): included + blocks × per block, 0 without an active plan. */
  capacity: number;
  /** Charges to Centium still pending or failed, and what they add up to. */
  pendingCharges: number;
  pendingAmount: number;
  /**
   * The plan plus the blocks held, for `period`. Null without a plan price,
   * or with blocks held and no block price: never a total that leaves part out.
   */
  total: number | null;
}

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const cents = (n: number): number => Math.round(n * 100) / 100;

export function toPlanSummary(r: PlanSummaryRow): PlanSummary {
  const planPrice = num(r.plan_price);
  const seatBlockPrice = num(r.seat_block_price);
  const seatBlocks = r.seat_blocks ?? 0;
  return {
    planName: r.plan_name?.trim() || "Business",
    active: r.plan_status === "active",
    renewsAt: r.renews_at,
    period: r.billing_period === "yearly" ? "yearly" : "monthly",
    planPrice,
    includedSeats: r.included_seats ?? 0,
    seatBlocks,
    seatsPerBlock: r.seats_per_block ?? null,
    seatBlockPrice,
    capacity: r.seat_capacity ?? 0,
    pendingCharges: r.pending_charges ?? 0,
    pendingAmount: num(r.pending_amount) ?? 0,
    total: planPrice === null || (seatBlocks > 0 && seatBlockPrice === null) ? null : cents(planPrice + seatBlocks * (seatBlockPrice ?? 0)),
  };
}

/**
 * The seat facts the Team screens draw (AN5 SeatInfo, OP1 capacity) from the
 * summary. `fallbackPer` covers a missing seat-block tier, as before.
 */
export function seatFacts(
  s: PlanSummary,
  fallbackPer: number
): { capacity: number; planActive: boolean; blocks: number; perBlock: number; blockPrice: number | null; period: SubscriptionPeriod } {
  return {
    capacity: s.capacity,
    planActive: s.active,
    blocks: s.seatBlocks,
    perBlock: s.seatsPerBlock ?? fallbackPer,
    blockPrice: s.seatBlockPrice,
    period: s.period,
  };
}

/** centium_billing_history(p_business_id, p_limit, p_offset). Gate revenue. */
export interface ChargeRow {
  charge_id: string;
  product: CentiumProduct;
  is_renewal: boolean;
  quantity: number | null;
  period_start: string | null;
  period_end: string | null;
  amount: number | string;
  currency: string | null;
  status: CentiumChargeStatus;
  method: CentiumChargeMethod | null;
  paid_at: string | null;
  created_at: string;
  total_count: number | string | null;
}

export interface CentiumCharge {
  id: string;
  product: CentiumProduct;
  isRenewal: boolean;
  quantity: number;
  periodStart: string | null;
  periodEnd: string | null;
  amount: number;
  currency: string;
  status: CentiumChargeStatus;
  method: CentiumChargeMethod | null;
  paidAt: string | null;
  createdAt: string;
}

export function toCharge(r: ChargeRow): CentiumCharge {
  return {
    id: r.charge_id,
    product: r.product,
    isRenewal: r.is_renewal === true,
    quantity: r.quantity ?? 1,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    amount: num(r.amount) ?? 0,
    currency: r.currency || "USD",
    status: r.status,
    method: r.method,
    paidAt: r.paid_at,
    createdAt: r.created_at,
  };
}

/**
 * The seat purchase awaiting payment, if any (at most one: buy_seat_blocks
 * refuses a second with ATXD7). A renewal of blocks already held is not a
 * purchase and can't be cancelled by the owner.
 */
export function pendingSeatPurchase(charges: CentiumCharge[]): CentiumCharge | null {
  return charges.find((c) => c.product === "seat_block" && !c.isRenewal && c.status === "pending") ?? null;
}

/** The plan charge awaiting payment (opened when the business is approved), if any. */
export function pendingPlanCharge(charges: CentiumCharge[]): CentiumCharge | null {
  return charges.find((c) => c.product === "business_plan" && (c.status === "pending" || c.status === "failed")) ?? null;
}

export const blocksText = (n: number): string => tn(n, "{n} seat block", "{n} seat blocks");

/** A billing-history row's title. */
export function chargeTitle(c: CentiumCharge): string {
  switch (c.product) {
    case "business_plan":
      return c.isRenewal ? t("Business plan renewal") : t("Business plan");
    case "seat_block":
      return c.isRenewal ? tn(c.quantity, "{n} seat block renewal", "{n} seat blocks renewal") : blocksText(c.quantity);
    case "featured_week":
      return tn(c.quantity, "Featured listing, {n} week", "Featured listing, {n} weeks");
  }
}

const METHOD_PAID: Record<CentiumChargeMethod, string> = {
  cash: tk("Paid in cash"),
  transfer: tk("Paid by bank transfer"),
  whish: tk("Paid with Whish"),
  manual: tk("Paid"),
};

/** What happened to the charge, in the business's words. */
export function chargeStatusText(c: CentiumCharge): string {
  switch (c.status) {
    case "pending":
      return t("Awaiting payment");
    case "paid":
      return c.method ? t(METHOD_PAID[c.method]) : t("Paid");
    case "failed":
      return t("Payment failed");
    case "waived":
      return t("No charge");
    case "cancelled":
      return t("Cancelled");
    case "payment_not_received":
      return t("Payment not received");
  }
}

/** Status tone for the value colour: awaiting money, settled, or set aside. */
export function chargeTone(c: CentiumCharge): "due" | "settled" | "void" {
  if (c.status === "pending" || c.status === "failed" || c.status === "payment_not_received") return "due";
  if (c.status === "paid" || c.status === "waived") return "settled";
  return "void";
}

/**
 * Why buy_seat_blocks / cancel_seat_block_purchase refused, for the sheet.
 * ATXD6 carries three messages (20261204000000): no active plan, seat blocks
 * not on sale, and no seat-block price for the plan's period.
 */
export function seatPurchaseRefusal(
  code: string | undefined,
  action: "buy" | "cancel" = "buy",
  serverMessage?: string
): { kind: "already_pending" | "no_plan" | "no_price" | "not_on_sale" | "not_owner" | "range" | "final" | "not_found" | "failed"; message: string } {
  switch (code) {
    case "ATXD7":
      return { kind: "already_pending", message: t("A seat order is already waiting for payment.") };
    case "ATXD6": {
      const m = (serverMessage ?? "").toLowerCase();
      const period = /no (monthly|yearly) price/.exec(m);
      if (period) return { kind: "no_price", message: period[1] === "monthly" ? t("Seat blocks aren't available on monthly billing yet.") : t("Seat blocks aren't available on yearly billing yet.") };
      if (m.includes("not on sale")) return { kind: "not_on_sale", message: t("Seat blocks aren't on sale right now.") };
      return { kind: "no_plan", message: t("Seats need an active Business plan.") };
    }
    case "ATX03":
      return { kind: "not_owner", message: action === "buy" ? t("Only the business owner can buy seats.") : t("Only the business owner can cancel this order.") };
    case "22023":
      return { kind: "range", message: t("Choose between 1 and 20 seat blocks.") };
    case "ATXD8":
      return { kind: "final", message: t("This order can't change any more.") };
    case "ATX08":
      return { kind: "not_found", message: t("This order couldn't be found.") };
    default:
      return { kind: "failed", message: action === "buy" ? t("Couldn't place the order. Try again.") : t("Couldn't cancel the order. Try again.") };
  }
}

/** Highest number of blocks one purchase may take (buy_seat_blocks: 1 to 20). */
export const MAX_BLOCKS_PER_PURCHASE = 20;

/** PostgREST / Postgres "no such function": the stage isn't on this database. */
export const isMissingFunction = (code: string | undefined): boolean => code === "PGRST202" || code === "42883";
