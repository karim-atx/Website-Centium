import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  businessSummary,
  effectivePlanLabel,
  formatPercent,
  formatPrice,
  monthlyEquivalent,
  planLabel,
  priceLabel,
  professionalSummary,
  savingLabel,
  yearlyAtMonthlyRate,
  yearlySaving,
} from "./pricing.ts";

// The real rows, so a case that passes here is a case that passes on screen.
//
//   client       Free      0      —          professional  Free       0      —
//   client       Premium   9.99   99.99      professional  Starter   14.99  149.99
//   business     Base     79.99  799.99      professional  Growth    34.99  349.99
//   business     Seat      59.99  599.99     professional  Pro       74.99  749.99
//                                            professional  Unlimited 99.99  999.99

test("money reads the way it is written on a plan", () => {
  assert.equal(formatPrice(9.99), "$9.99");
  assert.equal(formatPrice(79.99), "$79.99");
  assert.equal(formatPrice(0), "$0");
  assert.equal(formatPrice(60), "$60", "a whole amount does not wear a .00");
});

test("twelve monthlies is the thing a yearly price discounts", () => {
  assert.equal(yearlyAtMonthlyRate(9.99), 119.88);
  assert.equal(yearlyAtMonthlyRate(14.99), 179.88);
  assert.equal(yearlyAtMonthlyRate(0), 0);
});

// --- the saving, which is the number both surfaces used to invent -----------

test("Premium saves 16%, not the 30% the screen claimed", () => {
  // $9.99 x 12 = $119.88 against $99.99 -> $19.89, which is 16.59%.
  const saving = yearlySaving(9.99, 99.99);
  assert.deepEqual(saving, { amount: 19.89, percent: 16 });
  assert.equal(savingLabel(saving!), "Save 16%");
});

test("Starter saves 16%, not the 15% the plan picker claimed", () => {
  // $14.99 x 12 = $179.88 against $149.99 -> $29.89, which is 16.61%.
  assert.deepEqual(yearlySaving(14.99, 149.99), { amount: 29.89, percent: 16 });
});

test("every real tier's saving is derived, never assumed equal", () => {
  assert.equal(yearlySaving(34.99, 349.99)?.percent, 16);
  assert.equal(yearlySaving(74.99, 749.99)?.percent, 16);
  assert.equal(yearlySaving(99.99, 999.99)?.percent, 16);
  assert.equal(yearlySaving(79.99, 799.99)?.percent, 16);
  assert.equal(yearlySaving(59.99, 599.99)?.percent, 16);
});

test("the percent is ROUNDED DOWN, because a saving is a promise", () => {
  // 16.59% must never advertise as 17%.
  assert.equal(yearlySaving(9.99, 99.99)?.percent, 16);
  // Exactly 25% stays 25%, not 24 — flooring is not subtracting.
  assert.equal(yearlySaving(10, 90)?.percent, 25);
  // 8.33% floors to 8.
  assert.equal(yearlySaving(10, 110)?.percent, 8);
});

test("nothing to compare means no badge, never a zero one", () => {
  assert.equal(yearlySaving(0, null), null, "a free plan has no yearly price");
  assert.equal(yearlySaving(9.99, null), null, "no yearly price on the row");
  assert.equal(yearlySaving(9.99, undefined), null);
  assert.equal(yearlySaving(9.99, 119.88), null, "identical is not a discount");
});

test("a yearly price ABOVE twelve monthlies is refused, not shown as a saving", () => {
  // A data problem, and the UI must not dress it up.
  assert.equal(yearlySaving(9.99, 200), null);
});

test("a discount too small to round to one percent is not claimed", () => {
  assert.equal(yearlySaving(100, 1199.5), null, "0.04% is not a saving");
});

// --- restating a yearly price ------------------------------------------------

test("a yearly price restates as a monthly one, so the two can be compared", () => {
  assert.equal(monthlyEquivalent(99.99), 8.33);
  assert.equal(monthlyEquivalent(149.99), 12.5);
  assert.equal(monthlyEquivalent(799.99), 66.67);
});

// --- the label ---------------------------------------------------------------

test("each period shows the price that period actually costs", () => {
  assert.equal(priceLabel(9.99, 99.99, "monthly"), "$9.99/mo");
  assert.equal(priceLabel(9.99, 99.99, "yearly"), "$99.99/yr");
});

test("free is Free in both periods, never $0/year", () => {
  assert.equal(priceLabel(0, null, "monthly"), "Free");
  assert.equal(priceLabel(0, null, "yearly"), "Free");
});

test("a paid plan with no yearly price falls back to its monthly one", () => {
  assert.equal(priceLabel(24.99, null, "yearly"), "$24.99/mo");
});

// --- the sentences -----------------------------------------------------------

test("the business line is assembled from the rows, not retyped", () => {
  assert.equal(
    businessSummary({ basePrice: 79.99, seatPrice: 59.99, seatsPerBlock: 5, revenueSharePct: 10 }),
    "$79.99/mo base + $59.99 per 5 professionals + 10% marketplace fee"
  );
});

test("the revenue share drops a trailing .00 and keeps a real fraction", () => {
  assert.equal(formatPercent(10), "10%");
  assert.equal(formatPercent(10.0), "10%");
  assert.equal(formatPercent(12.5), "12.5%");
});

test("the professional line names the free cap and the cheapest paid plan", () => {
  assert.equal(
    professionalSummary(1, 14.99),
    "Free for 1 client · paid plans from $14.99"
  );
  assert.equal(professionalSummary(3, 14.99), "Free for 3 clients · paid plans from $14.99");
});

test("an uncapped free tier, and one with nothing paid above it, both read", () => {
  assert.equal(professionalSummary(null, 14.99), "Free for unlimited clients · paid plans from $14.99");
  assert.equal(professionalSummary(1, null), "Free for 1 client");
});

// --- how a plan is named -----------------------------------------------------

test("a plan is named by its name, with nothing appended", () => {
  // It read "Free (free)" — the label appending a fact the name already was.
  assert.equal(planLabel("Free"), "Free");
  assert.equal(planLabel("Premium"), "Premium");
  assert.equal(planLabel("Starter"), "Starter");
});

test("the price beside it is what says free, and priceLabel already does", () => {
  // Which is why the suffix was a third telling: the row shows the name, the
  // price column shows "Free", and the label used to say it again.
  assert.equal(priceLabel(0, null, "monthly"), "Free");
  assert.equal(planLabel("Free"), "Free");
});

test("an own plan is named plainly, whichever way it was come by", () => {
  assert.equal(effectivePlanLabel("Pro", "own_subscription"), "Pro");
  assert.equal(effectivePlanLabel("Free", "default"), "Free");
  // A business name is irrelevant unless the plan actually came from a seat.
  assert.equal(effectivePlanLabel("Pro", "own_subscription", "Iron Works"), "Pro");
});

test("a seated plan names the business it depends on", () => {
  assert.equal(effectivePlanLabel("Starter", "business_seat", "Iron Works"), "Starter (via Iron Works)");
});

test("a seat whose business could not be named still says it is a seat", () => {
  // The tier resolves from one call and the business name from a second; a
  // failure to name the business is not a failure to resolve the plan, and
  // the professional still needs to know the plan is not theirs.
  assert.equal(effectivePlanLabel("Starter", "business_seat"), "Starter (via your business)");
});
