import { strict as assert } from "node:assert";
import { test } from "node:test";
import { nextAction, orderChip, orderSteps, returnAction, returnChip, returnGroup, returnSteps, stepToast } from "./orderSteps.ts";
import type { StoreOrder, StoreReturn } from "./types.ts";

const order = (over: Partial<StoreOrder>): StoreOrder => ({
  id: "o1",
  businessId: "b1",
  number: 1041,
  customerId: "c1",
  customerLabel: "Member #0042",
  customerIsMinor: false,
  fulfilment: "delivery",
  deliveryAddress: "123 Main Street",
  deliveryFee: 0,
  subtotal: 66,
  total: 66,
  paymentMethod: "cash",
  paymentStatus: "pending",
  paidAt: null,
  status: "placed",
  placedAt: "2026-10-14T15:12:00Z",
  packedAt: null,
  completedAt: null,
  cancelledAt: null,
  cancelReason: null,
  note: null,
  itemCount: 0,
  items: [],
  storeName: null,
  openReturn: null,
  canCancel: true,
  canReturn: false,
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
  const out = orderSteps(order({ status: "out_for_delivery", packedAt: "2026-10-14T15:31:00Z" }));
  assert.deepEqual(out.map((s) => s.tone), ["done", "done", "done", "next"]);
  assert.equal(out[1].at, "2026-10-14T15:31:00Z");
  // B11 keeps no out-for-delivery time.
  assert.equal(out[2].at, null);
  const done = orderSteps(order({ status: "completed", packedAt: "x", completedAt: "2026-10-14T17:00:00Z" }));
  assert.equal(done[3].at, "2026-10-14T17:00:00Z");
});

test("pickup path keeps Packed and Ready as separate steps (V6-158), and picking up sends no message", () => {
  const p = order({ fulfilment: "pickup", status: "packed", packedAt: "2026-10-14T15:31:00Z" });
  assert.deepEqual(orderSteps(p).map((s) => s.title), ["Placed", "Packed", "Ready for pickup", "Picked up"]);
  assert.equal(nextAction(p)?.label, "Mark as ready for pickup");
  assert.equal(nextAction(p)?.to, "ready_for_pickup");
  const ready = nextAction(order({ fulfilment: "pickup", status: "ready_for_pickup" }))!;
  assert.equal(ready.label, "Mark as picked up");
  assert.equal(stepToast(ready, "Member #0042"), "Marked as picked up.");
});

test("toasts name the customer by the server's label", () => {
  const a = nextAction(order({}))!;
  assert.equal(stepToast(a, "Member #0042"), "Marked as packed. Member #0042 has been told.");
});

test("list chips follow §3.10", () => {
  assert.deepEqual(orderChip({ status: "placed" }), { label: "To pack", tone: "warn" });
  assert.deepEqual(orderChip({ status: "ready_for_pickup" }), { label: "Ready", tone: "good" });
  assert.deepEqual(orderChip({ status: "cancelled" }), { label: "Cancelled", tone: "bad" });
  assert.equal(orderSteps(order({ status: "cancelled", cancelledAt: "x" })).length, 2);
});

const ret = (status: StoreReturn["status"], kind: StoreReturn["kind"] = "refund"): StoreReturn => ({
  id: "r1",
  orderId: "o1",
  orderNumber: 1031,
  orderPlacedAt: null,
  customerLabel: "Member #0007",
  kind,
  reason: "Unopened",
  status,
  paymentMethod: "cash",
  refundAmount: 24,
  requestedAt: "2026-10-14T10:00:00Z",
  resolvedAt: status === "rejected" || status === "refunded" || (kind === "exchange" && status === "received") ? "2026-10-15T11:00:00Z" : null,
  items: [],
});

test("returns: Requested → Approved → Received → Refunded, or Denied", () => {
  assert.deepEqual(returnChip("requested"), { label: "Approve", tone: "pale" });
  assert.equal(returnAction("requested")?.label, "Approve return");
  assert.equal(returnAction("received")?.label, "Mark as refunded");
  assert.equal(returnAction("refunded"), null);
  assert.deepEqual(returnSteps(ret("approved")).map((s) => [s.glyph, s.tone]), [
    ["check", "done"],
    ["check", "done"],
    ["package", "next"],
    ["banknote", "later"],
  ]);
  const denied = returnSteps(ret("rejected"));
  assert.deepEqual(denied.map((s) => s.title), ["Requested", "Denied"]);
  assert.equal(denied[1].at, "2026-10-15T11:00:00Z");
  assert.equal(returnSteps(ret("refunded"))[3].at, "2026-10-15T11:00:00Z");
});

test("an exchange ends at Received: no refund step, no refund CTA", () => {
  const steps = returnSteps(ret("received", "exchange"));
  assert.deepEqual(steps.map((s) => s.title), ["Requested", "Approved", "Received"]);
  assert.equal(steps[2].at, "2026-10-15T11:00:00Z");
  assert.equal(returnAction("received", "exchange"), null);
  assert.equal(returnAction("approved", "exchange")?.to, "received");
  assert.deepEqual(returnChip("received", "exchange"), { label: "Exchanged", tone: "soft" });
  assert.equal(returnGroup("received", "exchange"), "done");
  assert.equal(returnGroup("received", "refund"), "progress");
});
