import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  featureErrorMessage,
  offerLocked,
  OFFER_LOCKED_MESSAGE,
  placementTarget,
  placementView,
  promoErrorMessage,
  promotionStatus,
  toPlacement,
  toPromotion,
  toStats,
  type PromotionRow,
} from "./promoLogic.ts";

const row: PromotionRow = {
  id: "p1",
  business_id: "b1",
  name: "Strength Basics, 25% off",
  target_kind: "class",
  target_id: "c1",
  type: "percent_off",
  value: "25.00",
  code: null,
  use_limit: null,
  starts_on: "2026-10-06",
  ends_on: "2026-10-19",
  audience: "new",
  show_on_listing: true,
  paused_at: null,
  ended_at: null,
  created_at: "2026-10-01T10:00:00Z",
};

test("a promotions row becomes the app's promotion (numeric value as a number)", () => {
  const p = toPromotion(row);
  assert.equal(p.value, 25);
  assert.equal(p.targetKind, "class");
  assert.equal(p.showOnListing, true);
  assert.equal(toPromotion({ ...row, type: "first_free", value: null }).value, null);
});

test("status follows promotion_status: ended, paused, scheduled, live", () => {
  const p = toPromotion(row);
  assert.equal(promotionStatus(p, "2026-10-05"), "scheduled");
  assert.equal(promotionStatus(p, "2026-10-06"), "live");
  assert.equal(promotionStatus(p, "2026-10-19"), "live");
  assert.equal(promotionStatus(p, "2026-10-20"), "ended");
  assert.equal(promotionStatus({ ...p, pausedAt: "2026-10-08T00:00:00Z" }, "2026-10-08"), "paused");
  // Ended wins over paused, as in the server function.
  assert.equal(promotionStatus({ ...p, pausedAt: "x", endedAt: "y" }, "2026-10-08"), "ended");
  assert.equal(promotionStatus({ ...p, endsOn: null }, "2027-01-01"), "live");
});

test("ATX10: the offer is locked once a promotion has started", () => {
  assert.equal(offerLocked("scheduled"), false);
  assert.equal(offerLocked("live"), true);
  assert.equal(offerLocked("paused"), true);
  assert.equal(offerLocked("ended"), true);
});

test("promotion errors in plain sentences", () => {
  assert.equal(promoErrorMessage({ code: "23505" }), "You already have a promotion with that code.");
  assert.equal(promoErrorMessage({ code: "ATX10" }), OFFER_LOCKED_MESSAGE);
  assert.match(promoErrorMessage({ code: "ATXF8" }), /can't be used now/);
  assert.equal(promoErrorMessage({ code: "23514", message: 'new row violates check constraint "promotions_dates"' }), "The end date must be after the start date.");
  assert.equal(promoErrorMessage({ code: "23514", message: 'violates check constraint "promotions_value"' }), "Check the offer's amount.");
  assert.equal(promoErrorMessage({ code: "42501" }), "You don't have permission to change promotions.");
  assert.equal(promoErrorMessage({ code: "XX000" }, "Couldn't end it. Try again."), "Couldn't end it. Try again.");
});

test("featuring errors: full week, not on sale, owner only, 90 days", () => {
  assert.equal(featureErrorMessage({ code: "ATXF7", message: "that week is fully booked in classes" }), "That week is fully booked. Pick another start day.");
  assert.equal(featureErrorMessage({ code: "ATXF7", message: "featuring is not on sale" }), "Featuring isn't on sale for that week.");
  assert.equal(featureErrorMessage({ code: "ATX03" }), "Only the owner can feature your business.");
  assert.equal(featureErrorMessage({ code: "22023", message: "choose a start in the next 90 days" }), "Pick a start day in the next 90 days.");
  assert.match(featureErrorMessage({ code: "22023", message: "a business has to be on Explore to be featured there" }), /Turn on your listing/);
});

test("stats and placements map from their readers", () => {
  const s = toStats([{ promotion_id: "p1", name: "x", status: "live", uses: 3, use_limit: 10, people: 2, recorded_revenue: "45.50" }]).get("p1");
  assert.deepEqual(s, { uses: 3, useLimit: 10, people: 2, recorded: 45.5 });
  const p = toPlacement({ placement_id: "f1", target_kind: "class", target_id: "c1", area: "classes", starts_on: "2026-10-06", ends_on: "2026-10-12", status: "requested", charge_status: "pending", amount: "15.00" });
  assert.equal(p.amount, 15);
  assert.equal(placementView(p), "awaiting");
  assert.equal(placementView({ status: "payment_not_received" }), "unpaid");
  assert.equal(placementView({ status: "live" }), "featured");
  assert.equal(placementView({ status: "cancelled" }), null);
});

test("a featured target: a class, a product, else the business", () => {
  assert.deepEqual(placementTarget("class", "c1", "b1"), { kind: "class", id: "c1" });
  assert.deepEqual(placementTarget("offering", "o1", "b1"), { kind: "product", id: "o1" });
  assert.deepEqual(placementTarget("plan", "m1", "b1"), { kind: "business", id: "b1" });
  assert.deepEqual(placementTarget("offer", "offer:10% off", "b1"), { kind: "business", id: "b1" });
});

test("promotion starts become discount markers on the bucket holding the start day", async () => {
  const { promoStartMarkers } = await import("./promoLogic.ts");
  const weeks = ["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"];
  const rows = [
    { startsOn: "2026-09-30", t: "a" },
    { startsOn: "2026-10-12", t: "b" },
    { startsOn: "2026-10-13", t: "same week" },
    { startsOn: "2026-09-01", t: "before" },
    { startsOn: "2026-10-20", t: "scheduled" },
  ];
  const m = promoStartMarkers(rows, weeks, "2026-10-18", (p) => p.t, "2026-10-15");
  assert.deepEqual(m, [
    { i: 1, t: "a", kind: "discount" },
    { i: 3, t: "b", kind: "discount" },
  ]);
  assert.deepEqual(promoStartMarkers(rows, [], "2026-10-18", (p) => p.t, "2026-10-15"), []);
});
