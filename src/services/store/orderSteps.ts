import type { OrderStatus, ReturnStatus, StoreOrder, StoreReturn } from "./orders";

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
      return { label: "To pack", tone: "warn" };
    case "packed":
      return { label: "Packed", tone: "pale" };
    case "out_for_delivery":
      return { label: "Out", tone: "pale" };
    case "ready_for_pickup":
      return { label: "Ready", tone: "good" };
    case "completed":
      return { label: "Completed", tone: "soft" };
    case "cancelled":
      return { label: "Cancelled", tone: "bad" };
    case "returned":
      return { label: "Returned", tone: "pale" };
  }
}

export const isOpen = (s: OrderStatus) => s === "placed" || s === "packed" || s === "out_for_delivery" || s === "ready_for_pickup";

const RANK: Record<OrderStatus, number> = { placed: 0, packed: 1, out_for_delivery: 2, ready_for_pickup: 2, completed: 3, returned: 3, cancelled: -1 };

/** The status card rows for the order's path, in order. */
export function orderSteps(o: StoreOrder): Step[] {
  const delivery = o.fulfilment === "delivery";
  const r = RANK[o.status];
  const placed: Step = { key: "placed", glyph: "check", title: "Placed", at: o.placedAt, hint: null, tone: "done" };
  if (o.status === "cancelled") {
    return [placed, { key: "cancelled", glyph: "x-circle", title: "Cancelled", at: o.cancelledAt, hint: null, tone: "bad" }];
  }
  const defs: { key: string; glyph: StepGlyph; title: string; at: string | null; hint: string }[] = delivery
    ? [
        { key: "packed", glyph: "package", title: "Packed", at: o.packedAt, hint: "Tap when it's packed" },
        { key: "out", glyph: "truck", title: "Out for delivery", at: o.outAt, hint: "Tap when it leaves the store" },
        { key: "delivered", glyph: "home", title: "Delivered", at: o.completedAt, hint: "Tap when it's delivered" },
      ]
    : [
        { key: "packed", glyph: "package", title: "Packed", at: o.packedAt, hint: "Tap when it's packed" },
        { key: "ready", glyph: "store", title: "Ready for pickup", at: o.readyAt, hint: "Tap when it's ready to collect" },
        { key: "picked", glyph: "hand", title: "Picked up", at: o.completedAt, hint: "Tap when it's collected" },
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
      return { to: "packed", label: "Mark as packed", done: "Marked as packed." };
    case "packed":
      return delivery
        ? { to: "out_for_delivery", label: "Mark as out for delivery", done: "Out for delivery." }
        : { to: "ready_for_pickup", label: "Mark as ready for pickup", done: "Ready for pickup." };
    case "out_for_delivery":
      return { to: "completed", label: "Mark as delivered", done: "Marked as delivered." };
    case "ready_for_pickup":
      return { to: "completed", label: "Mark as picked up", done: "Marked as picked up.", quiet: true };
    default:
      return null;
  }
}

/** The toast after a step (OP1-007 row 3 and OURS row 14). */
export function stepToast(a: StepAction, customer: string, notified: boolean): string {
  if (a.quiet) return a.done;
  return notified ? `${a.done} ${customer} has been told.` : `${a.done} We couldn't message ${customer}.`;
}

// ---------------------------------------------------------------------------
// Returns

export function returnChip(s: ReturnStatus): { label: string; tone: "warn" | "good" | "pale" | "soft" | "bad" } {
  switch (s) {
    case "requested":
      return { label: "Approve", tone: "pale" };
    case "approved":
      return { label: "Approved", tone: "good" };
    case "received":
      return { label: "To refund", tone: "warn" };
    case "refunded":
      return { label: "Refunded", tone: "soft" };
    case "rejected":
      return { label: "Denied", tone: "bad" };
  }
}

export function returnGroup(s: ReturnStatus): "needs" | "progress" | "done" {
  return s === "requested" ? "needs" : s === "approved" || s === "received" ? "progress" : "done";
}

const RET_RANK: Record<ReturnStatus, number> = { requested: 0, approved: 1, received: 2, refunded: 3, rejected: -1 };

export function returnSteps(r: StoreReturn): Step[] {
  const requested: Step = { key: "requested", glyph: "check", title: "Requested", at: r.requestedAt, hint: null, tone: "done" };
  if (r.status === "rejected") return [requested, { key: "denied", glyph: "x-circle", title: "Denied", at: r.rejectedAt, hint: null, tone: "bad" }];
  const rank = RET_RANK[r.status];
  const defs = [
    { key: "approved", glyph: "rotate-ccw" as StepGlyph, title: "Approved", at: r.approvedAt, hint: "Tap when you approve it" },
    { key: "received", glyph: "package" as StepGlyph, title: "Received", at: r.receivedAt, hint: "Tap when it's back in the store" },
    { key: "refunded", glyph: "banknote" as StepGlyph, title: "Refunded", at: r.refundedAt, hint: "Tap when you've refunded it" },
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

export function returnAction(s: ReturnStatus): { to: ReturnStatus; label: string } | null {
  if (s === "requested") return { to: "approved", label: "Approve return" };
  if (s === "approved") return { to: "received", label: "Mark as received" };
  if (s === "received") return { to: "refunded", label: "Mark as refunded" };
  return null;
}
