import type { OrderStatus, ReturnKind, ReturnStatus, StoreOrder, StoreReturn } from "./types";
import { t, tk } from "../../i18n/core";

// The step titles, hints, chips and CTA labels stay English (screens compare
// some of them) and are marked with tk(); the screens show them through t().

// The fulfilment and return step models (OURS-OP1-store-order-steps,
// OURS-OP1-store-return-detail). Pure, so the screens and the tests share it.

export type StepTone = "done" | "next" | "later" | "bad";
export type StepGlyph = "check" | "package" | "truck" | "home" | "store" | "hand" | "x-circle" | "rotate-ccw" | "banknote";

export interface Step {
  key: string;
  glyph: StepGlyph;
  title: string;
  /** ISO time once done. */
  at: string | null;
  /** The Next row's hint. */
  hint: string | null;
  tone: StepTone;
}

export interface StepAction {
  /** The status the CTA moves the order to. */
  to: OrderStatus;
  label: string;
  /** "{step}. {customer} has been told." prefix, or the whole toast when quiet. */
  done: string;
  /** No customer message for this step (picked up: the customer is there). */
  quiet?: boolean;
}

/** Order list chip (OP1-001 row 14, OURS completed row 10-12). */
export function orderChip(o: Pick<StoreOrder, "status">): { label: string; tone: "warn" | "good" | "pale" | "soft" | "bad" } {
  switch (o.status) {
    case "placed":
      return { label: tk("To pack"), tone: "warn" };
    case "packed":
      return { label: tk("Packed"), tone: "pale" };
    case "out_for_delivery":
      return { label: tk("Out"), tone: "pale" };
    case "ready_for_pickup":
      return { label: tk("Ready"), tone: "good" };
    case "completed":
      return { label: tk("Completed"), tone: "soft" };
    case "cancelled":
      return { label: tk("Cancelled"), tone: "bad" };
    case "returned":
      return { label: tk("Returned"), tone: "pale" };
  }
}

export const isOpen = (s: OrderStatus) => s === "placed" || s === "packed" || s === "out_for_delivery" || s === "ready_for_pickup";

const RANK: Record<OrderStatus, number> = { placed: 0, packed: 1, out_for_delivery: 2, ready_for_pickup: 2, completed: 3, returned: 3, cancelled: -1 };

/** The status card rows for the order's path, in order. */
export function orderSteps(o: StoreOrder): Step[] {
  const delivery = o.fulfilment === "delivery";
  const r = RANK[o.status];
  const placed: Step = { key: "placed", glyph: "check", title: tk("Placed"), at: o.placedAt, hint: null, tone: "done" };
  if (o.status === "cancelled") {
    return [placed, { key: "cancelled", glyph: "x-circle", title: tk("Cancelled"), at: o.cancelledAt, hint: null, tone: "bad" }];
  }
  // B11 records packed_at and completed_at only: the Out for delivery and
  // Ready for pickup rows show no time once done.
  const defs: { key: string; glyph: StepGlyph; title: string; at: string | null; hint: string }[] = delivery
    ? [
        { key: "packed", glyph: "package", title: tk("Packed"), at: o.packedAt, hint: tk("Tap when it's packed") },
        { key: "out", glyph: "truck", title: tk("Out for delivery"), at: null, hint: tk("Tap when it leaves the store") },
        { key: "delivered", glyph: "home", title: tk("Delivered"), at: o.completedAt, hint: tk("Tap when it's delivered") },
      ]
    : [
        { key: "packed", glyph: "package", title: tk("Packed"), at: o.packedAt, hint: tk("Tap when it's packed") },
        { key: "ready", glyph: "store", title: tk("Ready for pickup"), at: null, hint: tk("Tap when it's ready to collect") },
        { key: "picked", glyph: "hand", title: tk("Picked up"), at: o.completedAt, hint: tk("Tap when it's collected") },
      ];
  return [
    placed,
    ...defs.map((d, i) => {
      const doneRank = i + 1;
      const tone: StepTone = r >= doneRank ? "done" : r + 1 === doneRank ? "next" : "later";
      return { key: d.key, glyph: d.glyph, title: d.title, at: tone === "done" ? d.at : null, hint: tone === "next" ? d.hint : null, tone };
    }),
  ];
}

/** The fixed CTA for the order's next step, or null when there is none. */
export function nextAction(o: Pick<StoreOrder, "status" | "fulfilment">): StepAction | null {
  const delivery = o.fulfilment === "delivery";
  switch (o.status) {
    case "placed":
      return { to: "packed", label: tk("Mark as packed"), done: tk("Marked as packed.") };
    case "packed":
      return delivery
        ? { to: "out_for_delivery", label: tk("Mark as out for delivery"), done: tk("Out for delivery.") }
        : { to: "ready_for_pickup", label: tk("Mark as ready for pickup"), done: tk("Ready for pickup.") };
    case "out_for_delivery":
      return { to: "completed", label: tk("Mark as delivered"), done: tk("Marked as delivered.") };
    case "ready_for_pickup":
      return { to: "completed", label: tk("Mark as picked up"), done: tk("Marked as picked up."), quiet: true };
    default:
      return null;
  }
}

/**
 * The toast after a step (OP1-007 row 3 and OURS row 14). B11's
 * advance_order_status sends the customer's push itself and answers void, so
 * there is no "couldn't message" case to show.
 */
export function stepToast(a: StepAction, customer: string): string {
  if (a.quiet) return t(a.done);
  return `${t(a.done)} ${t("{customer} has been told.", { customer })}`;
}

// ---------------------------------------------------------------------------
// Returns

export function returnChip(s: ReturnStatus, kind: ReturnKind = "refund"): { label: string; tone: "warn" | "good" | "pale" | "soft" | "bad" } {
  // An exchange ends at Received (OURS: tk("Exchanged"), the finished soft tone).
  if (s === "received" && kind === "exchange") return { label: tk("Exchanged"), tone: "soft" };
  switch (s) {
    case "requested":
      return { label: tk("Approve"), tone: "pale" };
    case "approved":
      return { label: tk("Approved"), tone: "good" };
    case "received":
      return { label: tk("To refund"), tone: "warn" };
    case "refunded":
      return { label: tk("Refunded"), tone: "soft" };
    case "rejected":
      return { label: tk("Denied"), tone: "bad" };
  }
}

export function returnGroup(s: ReturnStatus, kind: ReturnKind = "refund"): "needs" | "progress" | "done" {
  if (s === "received" && kind === "exchange") return "done";
  return s === "requested" ? "needs" : s === "approved" || s === "received" ? "progress" : "done";
}

const RET_RANK: Record<ReturnStatus, number> = { requested: 0, approved: 1, received: 2, refunded: 3, rejected: -1 };

/**
 * B11 keeps created_at and resolved_at only: Requested shows its time, and
 * the last step (Refunded, Denied, or an exchange's Received) shows the
 * resolved time. An exchange ends at Received (respond_return refunds only a
 * refund return).
 */
export function returnSteps(r: StoreReturn): Step[] {
  const requested: Step = { key: "requested", glyph: "check", title: "Requested", at: r.requestedAt, hint: null, tone: "done" };
  if (r.status === "rejected") return [requested, { key: "denied", glyph: "x-circle", title: tk("Denied"), at: r.resolvedAt, hint: null, tone: "bad" }];
  const rank = RET_RANK[r.status];
  const exchange = r.kind === "exchange";
  const defs = [
    { key: "approved", glyph: "rotate-ccw" as StepGlyph, title: tk("Approved"), at: null, hint: tk("Tap when you approve it") },
    { key: "received", glyph: "package" as StepGlyph, title: tk("Received"), at: exchange ? r.resolvedAt : null, hint: tk("Tap when it's back in the store") },
    ...(exchange ? [] : [{ key: "refunded", glyph: "banknote" as StepGlyph, title: tk("Refunded"), at: r.resolvedAt, hint: tk("Tap when you've refunded it") }]),
  ];
  return [
    requested,
    ...defs.map((d, i) => {
      const doneRank = i + 1;
      const tone: StepTone = rank >= doneRank ? "done" : rank + 1 === doneRank ? "next" : "later";
      // The handover's rule: Approved shows `check` once done.
      const glyph: StepGlyph = tone === "done" && d.key === "approved" ? "check" : d.glyph;
      return { key: d.key, glyph, title: d.title, at: tone === "done" ? d.at : null, hint: tone === "next" ? d.hint : null, tone };
    }),
  ];
}

export function returnAction(s: ReturnStatus, kind: ReturnKind = "refund"): { to: ReturnStatus; label: string } | null {
  if (s === "requested") return { to: "approved", label: tk("Approve return") };
  if (s === "approved") return { to: "received", label: tk("Mark as received") };
  if (s === "received" && kind === "refund") return { to: "refunded", label: tk("Mark as refunded") };
  return null;
}
