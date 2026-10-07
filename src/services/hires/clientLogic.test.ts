import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  cancelPromptLine,
  clientCancelledLine,
  describeClientCancelError,
  describeHireError,
  describePlansCardError,
  hireStatusLabel,
  hireUntilLabel,
  isLiveHire,
  liveHireWith,
  planPriceLabel,
  priceExact,
  priceShort,
  toMyHire,
  toPlan,
  type MyHire,
  type MyHireRow,
} from "./clientLogic.ts";

const hireRow = (over: Partial<MyHireRow> = {}): MyHireRow => ({
  id: "h1",
  professional_id: "p1",
  professional_first_name: "Noor",
  plan_name: "Monthly coaching",
  status: "pending",
  payment_method: "cash",
  payment_status: "pending",
  price_agreed: "180.00",
  started_on: "2026-10-07",
  expires_on: "2026-11-07",
  confirmed_at: null,
  cancelled_at: null,
  ...over,
});

test("toPlan reads numeric strings, drops blank bullets and defaults is_hired", () => {
  assert.deepEqual(
    toPlan({ id: "a", name: "Full year", price: "1800.00", billing: "annually", features: ["Two assessments", " ", ""], position: 2, is_hired: null }),
    { id: "a", name: "Full year", price: 1800, billing: "annually", features: ["Two assessments"], position: 2, isHired: false }
  );
  assert.equal(toPlan({ id: "b", name: "x", price: 40, billing: "daily", features: null, position: null, is_hired: true }).isHired, true);
  assert.deepEqual(toPlan({ id: "b", name: "x", price: 40, billing: "daily", features: null, position: null, is_hired: true }).features, []);
});

test("toMyHire maps every my_hires() column", () => {
  const h = toMyHire(hireRow());
  assert.equal(h.priceAgreed, 180);
  assert.equal(h.professionalFirstName, "Noor");
  assert.equal(h.paymentStatus, "pending");
  assert.equal(toMyHire(hireRow({ professional_first_name: null })).professionalFirstName, "");
});

test("price formatting: the frame's $120/mo, Pay $400 and $400.00", () => {
  assert.equal(planPriceLabel(120, "monthly"), "$120/mo");
  assert.equal(planPriceLabel(1800, "annually"), "$1800/yr");
  assert.equal(planPriceLabel(40, "daily"), "$40/day");
  assert.equal(planPriceLabel(12.5, "monthly"), "$12.50/mo");
  assert.equal(planPriceLabel(0, "monthly"), "$0/mo");
  assert.equal(priceShort(400), "$400");
  assert.equal(priceShort(0), "$0");
  assert.equal(priceExact(400), "$400.00");
  assert.equal(priceExact(12.5), "$12.50");
});

test("status: pending payment until confirmed, then active", () => {
  assert.equal(hireStatusLabel({ status: "pending", paymentStatus: "pending" }), "Pending payment");
  assert.equal(hireStatusLabel({ status: "active", paymentStatus: "paid" }), "Active");
  assert.equal(hireStatusLabel({ status: "cancelled", paymentStatus: "paid" }), "Cancelled");
  assert.equal(hireStatusLabel({ status: "expired", paymentStatus: "paid" }), "Ended");
  assert.equal(hireUntilLabel("2026-11-07"), "Until 7 Nov 2026");
  assert.equal(hireUntilLabel(null), null);
});

test("liveHireWith finds only a pending or active hire with that professional", () => {
  const hires: MyHire[] = [
    toMyHire(hireRow({ id: "x", status: "cancelled", cancelled_at: "2026-10-01T00:00:00Z" })),
    toMyHire(hireRow({ id: "y", professional_id: "p2" })),
    toMyHire(hireRow({ id: "z", status: "active", payment_status: "paid" })),
  ];
  assert.equal(liveHireWith(hires, "p1")?.id, "z");
  assert.equal(liveHireWith(hires, "p3"), null);
  assert.equal(isLiveHire({ status: "expired" }), false);
});

test("describeHireError covers every hire_professional() code; ATXA0 gives no reason", () => {
  assert.match(describeHireError("ATXA2"), /under 18/);
  assert.match(describeHireError("ATX98"), /isn't available/);
  assert.match(describeHireError("22023"), /yourself/);
  assert.match(describeHireError("ATX99"), /already have a plan/);
  assert.equal(describeHireError("ATXA0"), "This professional is not taking new clients right now.");
  assert.doesNotMatch(describeHireError("ATXA0"), /limit|cap|free|subscription/i);
  assert.match(describeHireError("ATX01"), /Sign in/);
  assert.equal(describeHireError("XX000"), "Couldn't complete the hire. Try again.");
  assert.equal(describeHireError(undefined), "Couldn't complete the hire. Try again.");
});

test("cancel and plans-card error mapping", () => {
  assert.match(describeClientCancelError("ATXA1"), /already been cancelled/);
  assert.match(describeClientCancelError(undefined), /Couldn't cancel/);
  assert.match(describePlansCardError("ATX08"), /conversation/);
  assert.match(describePlansCardError("ATX98"), /no active plans/);
  assert.match(describePlansCardError("ATXA2"), /under 18/);
  assert.match(describePlansCardError("22023"), /five plans/);
  assert.match(describePlansCardError(undefined, true), /connection/);
  assert.equal(describePlansCardError("ATX35"), "You can't message this person.");
  assert.match(describePlansCardError("ATX02"), /too quickly/);
});

test("cancel wording: free before confirmation; after it, what was agreed and never a charge", () => {
  const pending = toMyHire(hireRow());
  assert.match(cancelPromptLine(pending), /free/);
  const paid = toMyHire(hireRow({ status: "active", payment_status: "paid" }));
  const line = cancelPromptLine(paid);
  assert.match(line, /Monthly coaching at \$180/);
  assert.match(line, /records the cancellation/);
  assert.doesNotMatch(line, /fee|charge|refund|penalt/i);
  assert.match(clientCancelledLine("Noor", true), /nothing to settle/);
  assert.match(clientCancelledLine("Noor", false), /between you and Noor/);
  assert.doesNotMatch(clientCancelledLine("Noor", false), /fee|charge|refund/i);
});
