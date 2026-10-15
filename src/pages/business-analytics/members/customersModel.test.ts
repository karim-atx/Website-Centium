import { strict as assert } from "node:assert";
import { test } from "node:test";
import { presetRange } from "../analyticsRange.ts";
import { customersIndex, topCustomers, type CustomerOrder } from "./customersModel.ts";

const TODAY = "2026-10-15"; // a Thursday; the week starts Monday 12 Oct
const range = presetRange("4w", TODAY);
const o = (who: string | null, day: string, status: CustomerOrder["status"] = "completed"): CustomerOrder => ({ customerId: who, placedAt: `${day}T10:00:00`, status });

test("customers: in the range, new this week, cancelled and guest orders do not count", () => {
  const orders = [o("a", "2026-08-01"), o("a", "2026-10-13"), o("b", "2026-10-14"), o("c", "2026-10-14", "cancelled"), o(null, "2026-10-14")];
  const i = customersIndex(orders, range, TODAY);
  assert.equal(i.inRange, 2);
  assert.equal(i.newThisWeek, 1, "b's first order is this week; a ordered before");
  assert.equal(i.orders, 3);
  assert.equal(i.orderedAgainPct, null, "under 10 orders: no percentage");
});

test("customers: ordered again = customers with 2+ orders over customers, from 10 orders", () => {
  const orders = [
    ...["a", "a", "a", "b", "b", "c", "d", "e", "f", "g"].map((w, k) => o(w, `2026-09-${String(10 + k).padStart(2, "0")}`)),
  ];
  const i = customersIndex(orders, range, TODAY);
  assert.equal(i.orders, 10);
  assert.equal(i.orderedAgainPct, 29, "2 of 7 customers");
});

test("top customers: most orders, then most recent", () => {
  const t = topCustomers([o("a", "2026-10-01"), o("b", "2026-10-02"), o("b", "2026-10-03"), o("c", "2026-10-05"), o("c", "2026-10-01", "cancelled")]);
  assert.deepEqual(t.map((x) => [x.customerId, x.orders]), [["b", 2], ["c", 1], ["a", 1]]);
});
