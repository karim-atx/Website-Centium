import { strict as assert } from "node:assert";
import { test } from "node:test";
import { firstOfferablePlanIds, PLANS_PER_CARD } from "./chatLogic";

const plan = (id: string, position: number, active = true, createdAt = "2026-10-01T00:00:00Z") => ({ id, active, position, createdAt });

test("more than five active plans: the first five by position go in the card", () => {
  const plans = [plan("g", 6), plan("a", 0), plan("c", 2), plan("b", 1), plan("e", 4), plan("d", 3), plan("f", 5)];
  assert.deepEqual(firstOfferablePlanIds(plans), ["a", "b", "c", "d", "e"]);
  assert.equal(PLANS_PER_CARD, 5);
});

test("inactive plans are never offered, and a shared position falls back to creation order", () => {
  const plans = [
    plan("off", 0, false),
    plan("late", 1, true, "2026-10-02T00:00:00Z"),
    plan("early", 1, true, "2026-10-01T00:00:00Z"),
  ];
  assert.deepEqual(firstOfferablePlanIds(plans), ["early", "late"]);
  assert.deepEqual(firstOfferablePlanIds([plan("off", 0, false)]), []);
});
