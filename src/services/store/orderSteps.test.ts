import { strict as assert } from "node:assert";
import { test } from "node:test";
import { nextAction, orderChip, orderSteps, returnAction, returnChip, returnSteps, stepToast } from "./orderSteps.ts";
import type { StoreOrder, StoreReturn } from "./types.ts";

const order = (over: Partial<StoreOrder>): StoreOrder => ({
  id: "o1",
  businessId: "b1",
  number: 1041,
  customerId: "c1",
  customerName: "Jane Smith",
  customerPhone: null,
  fulfilment: "delivery",
  deliveryAddress: "123 Main Street",
  deliveryFee: 0,
  subtotal: 66,
  total: 66,
  paymentMethod: "cash",
  paidAt: null,
  status: "placed",
  placedAt: "2026-10-14T15:12:00Z",
  packedAt: null,
  outAt: null,
  readyAt: null,
  completedAt: null,
  cancelledAt: null,
  refundAmount: null,
  refundMethod: null,
  refundedAt: null,
  items: [],
  storeName: null,
  ...over,
});

test("delivery path: placed → packed → out → delivered, one Next at a time", () => {
  const steps = orderSteps(order({}));
  assert.deepEqual(steps.map((s) => s.title), ["Placed", "Packed", "Out for delivery", "Delivered"]);
  assert.deepEqual(steps.map((s) => s.tone), ["done", "next", "later", "later"]);
  assert.equal(steps[1].hint, "Tap when it's packed");
  assert.equal(nextAction(order({}))?.label, "Mark as packed");
  assert.equal(nextAction(order({ status: "packed" }))?.label, "Mark as out for delivery");
  assert.equal(nextAction(order({ status: "out_for_delivery" }))?.label, "Mark as delivered");
  assert.equal(nextAction(order({ status: "completed" })), null);
  const out = orderSteps(order({ status: "out_for_delivery", packedAt: "2026-10-14T15:31:00Z", outAt: "2026-10-14T16:00:00Z" }));
  assert.deepEqual(out.map((s) => s.tone), ["done", "done", "done", "next"]);
  assert.equal(out[2].at, "2026-10-14T16:00:00Z");
});

test("pickup path keeps Packed and Ready as separate steps (V6-158), and picking up sends no message", () => {
  const p = order({ fulfilment: "pickup", status: "packed", packedAt: "2026-10-14T15:31:00Z" });
  assert.deepEqual(orderSteps(p).map((s) => s.title), ["Placed", "Packed", "Ready for pickup", "Picked up"]);
  assert.equal(nextAction(p)?.label, "Mark as ready for pickup");
  const ready = nextAction(order({ fulfilment: "pickup", status: "ready_for_pickup" }))!;
  assert.equal(ready.label, "Mark as picked up");
  assert.equal(stepToast(ready, "Jane Smith", true), "Marked as picked up.");
});

test("toasts say who was told, or that the message failed", () => {
  const a = nextAction(order({}))!;
  assert.equal(stepToast(a, "Jane Smith", true), "Marked as packed. Jane Smith has been told.");
  assert.equal(stepToast(a, "Jane Smith", false), "Marked as packed. We couldn't message Jane Smith.");
});

test("list chips follow §3.10", () => {
  assert.deepEqual(orderChip({ status: "placed" }), { label: "To pack", tone: "warn" });
  assert.deepEqual(orderChip({ status: "ready_for_pickup" }), { label: "Ready", tone: "good" });
  assert.deepEqual(orderChip({ status: "cancelled" }), { label: "Cancelled", tone: "bad" });
  assert.equal(orderSteps(order({ status: "cancelled", cancelledAt: "x" })).length, 2);
});

test("returns: Requested → Approved → Received → Refunded, or Denied", () => {
  const r = (status: StoreReturn["status"]): StoreReturn => ({
    id: "r1",
    orderId: "o1",
    orderNumber: 1031,
    orderPlacedAt: null,
    customerName: "Alex Morgan",
    reason: "Unopened",
    note: null,
    status,
    paymentMethod: "cash",
    refundAmount: 24,
    requestedAt: "2026-10-14T10:00:00Z",
    approvedAt: status === "requested" ? null : "2026-10-14T11:00:00Z",
    receivedAt: null,
    refundedAt: null,
    rejectedAt: status === "rejected" ? "2026-10-14T11:00:00Z" : null,
    items: [],
  });
  assert.deepEqual(returnChip("requested"), { label: "Approve", tone: "pale" });
  assert.equal(returnAction("requested")?.label, "Approve return");
  assert.equal(returnAction("received")?.label, "Mark as refunded");
  assert.equal(returnAction("refunded"), null);
  assert.deepEqual(returnSteps(r("approved")).map((s) => [s.glyph, s.tone]), [
    ["check", "done"],
    ["check", "done"],
    ["package", "next"],
    ["banknote", "later"],
  ]);
  assert.deepEqual(returnSteps(r("rejected")).map((s) => s.title), ["Requested", "Denied"]);
});
