import { strict as assert } from "node:assert";
import { test } from "node:test";
import { OWN_BUSINESS_OFFER_LINE, parseVoucherEligibility, voucherGateLine, voucherRefusalLine, type VoucherEligibility } from "./voucherRules.ts";
import { parseCatalogue, parseOfferDetail } from "./offersModel.ts";

const now = new Date(2026, 9, 31, 12, 0);
const ok: VoucherEligibility = { eligible: true, accountOpensAt: "2026-09-01T00:00:00Z", pointsDays: 12, pointsDaysNeeded: 7, thisWeek: 0, weeklyCap: 3, nextFreesAt: null };

test("parseVoucherEligibility: voucher_eligibility()'s row as sent; no row, no answer", () => {
  const el = parseVoucherEligibility([
    { eligible: false, account_opens_at: "2026-11-20T08:00:00+00:00", points_days: 2, points_days_needed: 7, this_week: 0, weekly_cap: 3, next_frees_at: null },
  ]);
  assert.deepEqual(el, { eligible: false, accountOpensAt: "2026-11-20T08:00:00+00:00", pointsDays: 2, pointsDaysNeeded: 7, thisWeek: 0, weeklyCap: 3, nextFreesAt: null });
  assert.equal(parseVoucherEligibility([]), null);
  assert.equal(parseVoucherEligibility(null), null);
});

test("voucherGateLine: nothing when eligible or unknown", () => {
  assert.equal(voucherGateLine(ok, now), null);
  assert.equal(voucherGateLine(null, now), null);
});

test("voucherGateLine: redeem_offer's order, account age first, then points days, then the weekly cap", () => {
  const young = { ...ok, eligible: false, accountOpensAt: new Date(2026, 10, 20, 8, 0).toISOString(), pointsDays: 2 };
  assert.equal(voucherGateLine(young, now), "New accounts can redeem rewards after 30 days. You can redeem from Nov 20.");
  const fewDays = { ...ok, eligible: false, pointsDays: 4, thisWeek: 3 };
  assert.equal(voucherGateLine(fewDays, now), "You can redeem once you've earned points on 7 different days: 4 of 7 days with points so far.");
  const capped = { ...ok, eligible: false, thisWeek: 3, nextFreesAt: new Date(2026, 10, 1, 9, 40).toISOString() };
  assert.equal(voucherGateLine(capped, now), "You've redeemed 3 vouchers in the last 7 days. The next one frees tomorrow at 9:40 AM.");
  assert.equal(voucherGateLine({ ...capped, weeklyCap: 1, thisWeek: 1 }, now), "You've redeemed 1 voucher in the last 7 days. The next one frees tomorrow at 9:40 AM.");
});

test("voucherRefusalLine: ATXV0–ATXV3 from their DETAIL, nothing else", () => {
  assert.equal(voucherRefusalLine({ code: "ATXV0", details: new Date(2026, 10, 20, 8, 0).toISOString() }, now), "New accounts can redeem rewards after 30 days. You can redeem from Nov 20.");
  assert.equal(voucherRefusalLine({ code: "ATXV1", details: "5" }, now), "You can redeem once you've earned points on 7 different days: 5 of 7 days with points so far.");
  assert.equal(voucherRefusalLine({ code: "ATXV2", details: new Date(2026, 9, 31, 18, 0).toISOString() }, now), "You've reached this week's voucher limit. The next one frees today at 6:00 PM.");
  assert.equal(voucherRefusalLine({ code: "ATXV2", details: null }, now), "You've reached this week's voucher limit. Try again in a few days.");
  assert.equal(voucherRefusalLine({ code: "ATXV3" }, now), OWN_BUSINESS_OFFER_LINE);
  assert.equal(voucherRefusalLine({ code: "ATX12" }, now), null);
  assert.equal(voucherRefusalLine(null, now), null);
});

test("is_own_business on the catalogue and the detail; absent stays absent", () => {
  const card = { offer_id: "o1", headline: "10% off", category: "clothing", owner_type: "business", owner_id: "b1", owner_name: "Outline", owner_logo_url: null, points_cost: 900, ends_on: null };
  assert.equal(parseCatalogue([{ ...card, is_own_business: true }])[0].isOwnBusiness, true);
  assert.equal("isOwnBusiness" in parseCatalogue([card])[0], false);
  assert.equal(parseOfferDetail([{ ...card, is_own_business: true, voucher_days: 90 }])?.isOwnBusiness, true);
});
