import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arrangeOffers,
  categoryOfType,
  categoryParam,
  deductionLine,
  limitLabel,
  needMoreLine,
  ownerInitials,
  parseCatalog,
  parseOfferDetail,
  redeemErrorOf,
  validRange,
  voucherExpiryLabel,
  whereLabel,
} from "./offersModel.ts";

const row = (id: string, cost: number, can = false) => ({ offer_id: id, headline: `H${id}`, owner_type: "business", owner_id: "b", owner_name: "Outline Activewear", points_cost: cost, can_redeem: can, points_to_go: 0 });

test("categories map to reward_catalog's p_category and to business types", () => {
  assert.equal(categoryParam("all"), null);
  assert.equal(categoryParam("meal_prep"), "meal_prep");
  assert.equal(categoryOfType("clothing_store"), "clothing");
  assert.equal(categoryOfType("gym"), null);
});

test("catalog rows parse; a row without a cost is dropped; a professional keeps its subtitle", () => {
  const list = parseCatalog([row("1", 900), { offer_id: "2", headline: "x" }, { ...row("3", 1200), owner_type: "professional", owner_subtitle: "Rana Khoury · Trainer" }]);
  assert.equal(list.length, 2);
  assert.equal(list[1].ownerSubtitle, "Rana Khoury · Trainer");
  assert.equal(list[0].ownerSubtitle, "Outline Activewear");
});

test("arrange: featured keeps the server's order; affordable keeps what the balance reaches", () => {
  const list = parseCatalog([row("a", 900), row("b", 400), row("c", 3000)]);
  assert.deepEqual(arrangeOffers(list, "featured", false, 1240).map((o) => o.offerId), ["a", "b", "c"]);
  assert.deepEqual(arrangeOffers(list, "lowest", false, 1240).map((o) => o.offerId), ["b", "a", "c"]);
  assert.deepEqual(arrangeOffers(list, "featured", true, 1240).map((o) => o.offerId), ["a", "b"]);
});

test("detail labels as the board's offerRows (month first)", () => {
  const d = parseOfferDetail([{ ...row("1", 900), where_used: "both", starts_on: "2026-10-01", ends_on: "2026-12-31", per_member_limit: 1, voucher_days: 90 }]);
  assert.ok(d);
  assert.equal(whereLabel(d.where), "In store and online");
  assert.equal(validRange(d.startsOn, d.endsOn), "Oct 1 to Dec 31, 2026");
  assert.equal(limitLabel(d.perMemberLimit), "1 per member");
  assert.equal(voucherExpiryLabel(d.voucherDays), "90 days after it is issued");
  assert.equal(validRange("2026-12-01", "2027-01-31"), "Dec 1, 2026 to Jan 31, 2027");
});

test("redeem lines and errors", () => {
  assert.equal(deductionLine(900, 1240), "900 points will be deducted. New balance: 340.");
  assert.equal(needMoreLine(3000, 1240), "You need 1,760 more points");
  assert.equal(redeemErrorOf({ code: "P0001", message: "insufficient_points" }), "insufficient_points");
  assert.equal(redeemErrorOf({ code: "ATX99", message: "x", hint: "sold_out" }), "sold_out");
  assert.equal(redeemErrorOf({ code: "42501", message: "permission denied" }), null);
});

test("owner initials", () => {
  assert.equal(ownerInitials("Outline Activewear"), "OA");
  assert.equal(ownerInitials("Rana Khoury · Trainer"), "RK");
  assert.equal(ownerInitials("Peak"), "PE");
});
