import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  chargeStatusText,
  chargeTitle,
  chargeTone,
  isMissingFunction,
  pendingPlanCharge,
  pendingSeatPurchase,
  seatFacts,
  seatPurchaseRefusal,
  toCharge,
  toPlanSummary,
  type ChargeRow,
  type PlanSummaryRow,
} from "./model.ts";

const summaryRow = (o: Partial<PlanSummaryRow> = {}): PlanSummaryRow => ({
  plan_name: "Base",
  plan_status: "active",
  renews_at: "2026-11-15T00:00:00+00:00",
  plan_price: "29.00",
  included_seats: 5,
  seat_blocks: 2,
  seats_per_block: 5,
  seat_block_price: "59.99",
  seat_capacity: 15,
  pending_charges: 1,
  pending_amount: "59.99",
  ...o,
});

const chargeRow = (o: Partial<ChargeRow> = {}): ChargeRow => ({
  charge_id: "c1",
  product: "seat_block",
  is_renewal: false,
  quantity: 2,
  period_start: "2026-10-15",
  period_end: "2026-11-14",
  amount: "119.98",
  currency: "USD",
  status: "pending",
  method: null,
  paid_at: null,
  created_at: "2026-10-15T09:00:00+00:00",
  total_count: 3,
  ...o,
});

test("plan summary: numbers from the database, the monthly total, active only when active", () => {
  const s = toPlanSummary(summaryRow());
  assert.equal(s.planName, "Base");
  assert.equal(s.active, true);
  assert.equal(s.planPrice, 29);
  assert.equal(s.seatBlockPrice, 59.99);
  assert.equal(s.capacity, 15);
  assert.equal(s.pendingAmount, 59.99);
  // 29 + 2 × 59.99, to the cent.
  assert.equal(s.monthlyTotal, 148.98);

  const none = toPlanSummary(summaryRow({ plan_status: null, seat_blocks: 0, seat_capacity: 0, renews_at: null }));
  assert.equal(none.active, false);
  assert.equal(none.capacity, 0);
  assert.equal(none.monthlyTotal, 29);
  assert.equal(toPlanSummary(summaryRow({ plan_status: "cancelled" })).active, false);
  assert.equal(toPlanSummary(summaryRow({ plan_price: null })).monthlyTotal, null);
  assert.equal(toPlanSummary(summaryRow({ plan_name: " " })).planName, "Business");
});

test("seat facts for the Team screens: capacity and block price from the summary", () => {
  const f = seatFacts(toPlanSummary(summaryRow()), 5);
  assert.deepEqual(f, { capacity: 15, planActive: true, blocks: 2, perBlock: 5, blockPrice: 59.99 });
  // A missing seat-block tier falls back to the caller's block size.
  assert.equal(seatFacts(toPlanSummary(summaryRow({ seats_per_block: null })), 4).perBlock, 4);
});

test("billing history: mapping, the pending seat purchase and the pending plan charge", () => {
  const charges = [
    toCharge(chargeRow()),
    toCharge(chargeRow({ charge_id: "r1", is_renewal: true, status: "pending" })),
    toCharge(chargeRow({ charge_id: "p1", product: "business_plan", quantity: 1, amount: 29, status: "paid", method: "transfer" })),
  ];
  assert.equal(charges[0].amount, 119.98);
  assert.equal(pendingSeatPurchase(charges)?.id, "c1");
  // A pending renewal of blocks already held is not a purchase.
  assert.equal(pendingSeatPurchase(charges.slice(1)), null);
  assert.equal(pendingSeatPurchase([toCharge(chargeRow({ status: "cancelled" }))]), null);
  assert.equal(pendingPlanCharge(charges), null);
  assert.equal(pendingPlanCharge([toCharge(chargeRow({ product: "business_plan", status: "pending" }))])?.product, "business_plan");
});

test("billing history wording: titles and statuses never name a member's payment", () => {
  assert.equal(chargeTitle(toCharge(chargeRow())), "2 seat blocks");
  assert.equal(chargeTitle(toCharge(chargeRow({ quantity: 1 }))), "1 seat block");
  assert.equal(chargeTitle(toCharge(chargeRow({ is_renewal: true }))), "2 seat blocks renewal");
  assert.equal(chargeTitle(toCharge(chargeRow({ product: "business_plan", quantity: 1 }))), "Business plan");
  assert.equal(chargeTitle(toCharge(chargeRow({ product: "business_plan", is_renewal: true }))), "Business plan renewal");
  assert.equal(chargeStatusText(toCharge(chargeRow())), "Awaiting payment");
  assert.equal(chargeStatusText(toCharge(chargeRow({ status: "paid", method: "cash" }))), "Paid in cash");
  assert.equal(chargeStatusText(toCharge(chargeRow({ status: "paid", method: "transfer" }))), "Paid by bank transfer");
  assert.equal(chargeStatusText(toCharge(chargeRow({ status: "paid", method: null }))), "Paid");
  assert.equal(chargeStatusText(toCharge(chargeRow({ status: "waived" }))), "No charge");
  assert.equal(chargeStatusText(toCharge(chargeRow({ status: "cancelled" }))), "Cancelled");
  assert.equal(chargeTone(toCharge(chargeRow())), "due");
  assert.equal(chargeTone(toCharge(chargeRow({ status: "paid" }))), "settled");
  assert.equal(chargeTone(toCharge(chargeRow({ status: "cancelled" }))), "void");
});

test("seat purchase refusals and the missing-function rule", () => {
  assert.equal(seatPurchaseRefusal("ATXD7").kind, "already_pending");
  assert.equal(seatPurchaseRefusal("ATXD6").kind, "no_plan");
  assert.equal(seatPurchaseRefusal("ATX03", "cancel").message, "Only the business owner can cancel this order.");
  assert.equal(seatPurchaseRefusal("XX000", "cancel").message, "Couldn't cancel the order. Try again.");
  assert.equal(seatPurchaseRefusal(undefined).kind, "failed");
  assert.equal(isMissingFunction("PGRST202"), true);
  assert.equal(isMissingFunction("42883"), true);
  assert.equal(isMissingFunction("ATX03"), false);
});
