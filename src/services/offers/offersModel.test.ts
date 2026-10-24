import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arrangeOffers,
  categoryOfType,
  categoryParam,
  deductionLine,
  forAge,
  limitLabel,
  needMoreLine,
  ownerInitials,
  parseCatalogue,
  parseOfferDetail,
  parsePublicOffers,
  redeemErrorOf,
  validRange,
  voucherExpiryLabel,
  whereLabel,
  REDEEM_ERROR_TEXT,
} from "./offersModel.ts";

// An offer_catalogue() row (Database PR #40, 20261215010000): the ten columns.
const row = (id: string, cost: number, over: Record<string, unknown> = {}) => ({
  offer_id: id,
  headline: `H${id}`,
  category: "clothing",
  owner_type: "business",
  owner_id: "b1",
  owner_name: "Outline Activewear",
  owner_professional_subtype: null,
  owner_logo_url: null,
  points_cost: cost,
  ends_on: "2026-12-31",
  ...over,
});
// offer_detail(): the catalogue's card plus everything the screen draws.
const detail = (over: Record<string, unknown> = {}) => ({
  ...row("1", 900),
  kind: "percent_off",
  value: 15,
  starts_on: "2026-10-01",
  where_used: "both",
  terms: null,
  online_url: "https://outlineactive.com/",
  applies_to: null,
  applies_to_name: null,
  applies_to_price: null,
  per_member_limit: 2,
  quantity_left: 70,
  limit_left: 1,
  voucher_expires_at: "2027-01-20T10:00:00+00:00",
  voucher_days: 90,
  voucher_capped_on: null,
  ...over,
});
const label = (s: string) => (s === "trainer" ? "Personal trainer" : null);

test("categories map to offers.category and to business types", () => {
  assert.equal(categoryParam("all"), null);
  assert.equal(categoryParam("meal_prep"), "meal_prep");
  assert.equal(categoryParam("professionals"), "professionals");
  assert.equal(categoryOfType("clothing_store"), "clothing");
  assert.equal(categoryOfType("gym"), null);
});

test("catalogue rows: the server's owner card (business name and logo; professional first name · type); incomplete rows dropped", () => {
  const pro = row("3", 1200, { owner_type: "professional", owner_id: "p1", owner_name: "Rana", owner_professional_subtype: "trainer", category: "professionals" });
  const list = parseCatalogue([row("1", 900, { owner_logo_url: "https://x/logo.png" }), { offer_id: "2", headline: "x" }, pro], label);
  assert.deepEqual(
    list.map((o) => [o.offerId, o.headline, o.ownerType, o.ownerId, o.ownerName, o.ownerSubtitle, o.ownerLogoUrl, o.category, o.pointsCost, o.endsOn]),
    [
      ["1", "H1", "business", "b1", "Outline Activewear", "Outline Activewear", "https://x/logo.png", "clothing", 900, "2026-12-31"],
      ["3", "H3", "professional", "p1", "Rana", "Rana · Personal trainer", null, "professionals", 1200, "2026-12-31"],
    ]
  );
  // A subtype without a label, or no label function: the first name alone.
  assert.equal(parseCatalogue([pro])[0].ownerSubtitle, "Rana");
  // No live rule here: the server already applied offer_is_live().
  assert.equal(parseCatalogue([row("4", 10, { ends_on: null })]).length, 1);
});

test("arrange: featured = redeemable first, then the read's order; affordable keeps what the balance reaches", () => {
  const list = parseCatalogue([row("b", 400), row("a", 900), row("c", 3000), row("d", 5000)]);
  assert.deepEqual(arrangeOffers(list, "featured", false, 1240).map((o) => o.offerId), ["b", "a", "c", "d"]);
  assert.deepEqual(arrangeOffers(parseCatalogue([row("c", 3000), row("b", 400)]), "featured", false, 1240).map((o) => o.offerId), ["b", "c"]);
  assert.deepEqual(arrangeOffers(list, "highest", false, 1240).map((o) => o.offerId), ["d", "c", "a", "b"]);
  assert.deepEqual(arrangeOffers(list, "featured", true, 1240).map((o) => o.offerId), ["b", "a"]);
});

test("no supplement offers for under-18s (or no date of birth)", () => {
  // The readers have no age rule (Database PR #40), so the client keeps it.
  const list = parseCatalogue([row("1", 10), row("2", 20, { category: "supplements" })]);
  assert.equal(forAge(list, true).length, 2);
  assert.deepEqual(forAge(list, false).map((o) => o.offerId), ["1"]);
});

test("detail: offer_detail's quantity_left / limit_left / voucher expiry as sent, where, the website", () => {
  const d = parseOfferDetail([detail()], label);
  assert.ok(d);
  assert.equal(d.quantityLeft, 70);
  assert.equal(d.limitLeft, 1);
  assert.equal(d.perMemberLimit, 2);
  assert.equal(d.startsOn, "2026-10-01");
  assert.equal(d.where, "both");
  assert.equal(whereLabel(d.where), "In store and online");
  assert.equal(d.voucherDays, 90);
  assert.equal(voucherExpiryLabel(d.voucherDays, d.voucherCappedOn), "90 days after it is issued");
  assert.equal(d.onlineUrl, "https://outlineactive.com/");
  // No cap / no limit → null; a sold-out cap reads 0.
  const u = parseOfferDetail([detail({ quantity_left: null, limit_left: null })]);
  assert.equal(u?.quantityLeft, null);
  assert.equal(u?.limitLeft, null);
  assert.equal(parseOfferDetail([detail({ quantity_left: 0 })])?.quantityLeft, 0);
  // where_used in_person: "In store" for a business, "In person" for a professional (no website).
  assert.equal(parseOfferDetail([detail({ where_used: "in_person" })])?.where, "in_store");
  const pro = parseOfferDetail([detail({ where_used: "in_person", owner_type: "professional", owner_id: "p1", owner_name: "Rana", owner_professional_subtype: "trainer", online_url: null })], label);
  assert.equal(pro?.where, "in_person");
  assert.equal(pro?.ownerSubtitle, "Rana · Personal trainer");
  assert.equal(pro?.onlineUrl, null);
  // The offer ends first: voucher_expiry_for's capped days and day, as sent.
  const c = parseOfferDetail([detail({ ends_on: "2026-10-31", voucher_days: 10, voucher_capped_on: "2026-10-31" })]);
  assert.equal(c?.voucherDays, 10);
  assert.equal(c?.voucherCappedOn, "2026-10-31");
  assert.equal(voucherExpiryLabel(c!.voucherDays, c!.voucherCappedOn), "Until Oct 31, 2026");
  // No row (gone or not live) → null (the not-found card).
  assert.equal(parseOfferDetail([]), null);
  assert.equal(parseOfferDetail(null), null);
});

test("detail labels as the board's offerRows (month first)", () => {
  assert.equal(validRange("2026-10-01", "2026-12-31"), "Oct 1 to Dec 31, 2026");
  assert.equal(validRange("2026-12-01", "2027-01-31"), "Dec 1, 2026 to Jan 31, 2027");
  assert.equal(validRange("2026-12-01", null), null);
  assert.equal(limitLabel(1), "1 per member");
});

test("redeem lines; refusals by the documented SQLSTATE only", () => {
  assert.equal(deductionLine(900, 1240), "900 points will be deducted. New balance: 340.");
  assert.equal(needMoreLine(3000, 1240), "You need 1,760 more points");
  assert.equal(redeemErrorOf({ code: "ATX08" }), "offer_not_found");
  assert.equal(redeemErrorOf({ code: "ATX10" }), "offer_not_active");
  assert.equal(redeemErrorOf({ code: "ATX11" }), "not_available_to_minors");
  assert.equal(redeemErrorOf({ code: "ATX12" }), "insufficient_points");
  assert.equal(redeemErrorOf({ code: "ATX13" }), "sold_out");
  assert.equal(redeemErrorOf({ code: "ATX14" }), "limit_reached");
  assert.equal(redeemErrorOf({ code: "ATX02" }), "rate_limited");
  assert.equal(redeemErrorOf({ code: "P0001" }), null);
  assert.equal(redeemErrorOf({ code: "42501" }), null);
  assert.equal(REDEEM_ERROR_TEXT.not_available_to_minors, "Supplement offers are for members 18 and over.");
});

test("public_offers rows: the server's live list as cards of the page's owner (no client live rule)", () => {
  const list = parsePublicOffers(
    [
      { id: "o1", title: "15% off a month pass", kind: "percent_off", value: 15, points_cost: 150, where_used: "in_person", terms: null, starts_on: "2026-10-01", ends_on: "2026-12-31", per_member_limit: 1, quantity_cap: null, redeemed_count: 3, category: "gyms" },
      { id: "o2", title: "Free shaker", kind: "free_item", value: null, points_cost: "120", where_used: "both", terms: null, starts_on: "2026-10-01", ends_on: null, per_member_limit: 1, quantity_cap: null, redeemed_count: 0, category: "supplements" },
      { id: "bad", title: "", points_cost: 1 },
    ],
    "business",
    "b1"
  );
  assert.deepEqual(list.map((o) => [o.offerId, o.headline, o.pointsCost, o.category, o.endsOn, o.ownerType, o.ownerId]), [
    ["o1", "15% off a month pass", 150, "gyms", "2026-12-31", "business", "b1"],
    ["o2", "Free shaker", 120, "supplements", null, "business", "b1"],
  ]);
  // The age rule still applies on top (supplements for 18+).
  assert.deepEqual(forAge(list, false).map((o) => o.offerId), ["o1"]);
});

test("owner initials", () => {
  assert.equal(ownerInitials("Outline Activewear"), "OA");
  assert.equal(ownerInitials("Rana Khoury · Trainer"), "RK");
  assert.equal(ownerInitials("Peak"), "PE");
});
