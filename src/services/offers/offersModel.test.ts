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
  offerRowIsLive,
  ownerInitials,
  parseCatalog,
  parseOfferDetail,
  parsePublicOffers,
  professionalIds,
  redeemErrorOf,
  validRange,
  voucherExpiryLabel,
  whereLabel,
  REDEEM_ERROR_TEXT,
} from "./offersModel.ts";

const TODAY = "2026-10-22";
// An `offers` row as the table read returns it (DB2 20261210800000), the business embedded.
const row = (id: string, cost: number, over: Record<string, unknown> = {}) => ({
  id,
  owner_kind: "business",
  business_id: "b1",
  professional_id: null,
  title: `H${id}`,
  category: "clothing",
  points_cost: cost,
  quantity_cap: null,
  per_member_limit: 1,
  starts_on: "2026-10-01",
  ends_on: "2026-12-31",
  where_used: "both",
  terms: null,
  paused_at: null,
  hidden_at: null,
  funding_ack_at: "2026-09-30T10:00:00Z",
  redeemed_count: 0,
  business: { business_name: "Outline Activewear", logo_url: null, public_website: "https://outlineactive.com/" },
  ...over,
});

test("categories map to offers.category and to business types", () => {
  assert.equal(categoryParam("all"), null);
  assert.equal(categoryParam("meal_prep"), "meal_prep");
  assert.equal(categoryParam("professionals"), "professionals");
  assert.equal(categoryOfType("clothing_store"), "clothing");
  assert.equal(categoryOfType("gym"), null);
});

test("the live rule: offer_is_live as the row shows it", () => {
  assert.equal(offerRowIsLive(row("1", 900), TODAY), true);
  assert.equal(offerRowIsLive(row("1", 900, { paused_at: "2026-10-10T00:00:00Z" }), TODAY), false);
  assert.equal(offerRowIsLive(row("1", 900, { hidden_at: "2026-10-10T00:00:00Z" }), TODAY), false);
  // RLS doesn't check the funding acknowledgement; redeem_offer refuses it (ATX10).
  assert.equal(offerRowIsLive(row("1", 900, { funding_ack_at: null }), TODAY), false);
  assert.equal(offerRowIsLive(row("1", 900, { starts_on: "2026-10-23" }), TODAY), false);
  assert.equal(offerRowIsLive(row("1", 900, { ends_on: "2026-10-21" }), TODAY), false);
  assert.equal(offerRowIsLive(row("1", 900, { ends_on: TODAY }), TODAY), true);
  assert.equal(offerRowIsLive(row("1", 900, { ends_on: null }), TODAY), true);
  // A business row the member can't read (inactive / closed) drops the offer.
  assert.equal(offerRowIsLive(row("1", 900, { business: null }), TODAY), false);
});

test("catalog rows: title, owner from the embed or the directory; dead rows dropped", () => {
  const pro = row("3", 1200, { owner_kind: "professional", business_id: null, professional_id: "p1", business: null, category: "professionals" });
  const list = parseCatalog([row("1", 900), { id: "2", title: "x" }, pro, row("4", 10, { paused_at: "2026-10-01T00:00:00Z" })], TODAY, new Map([["p1", { first: "Rana", type: "Personal trainer" }]]));
  assert.deepEqual(
    list.map((o) => [o.offerId, o.headline, o.ownerType, o.ownerId, o.ownerSubtitle, o.category]),
    [
      ["1", "H1", "business", "b1", "Outline Activewear", "clothing"],
      ["3", "H3", "professional", "p1", "Rana · Personal trainer", "professionals"],
    ]
  );
  // Not in the directory: the kind of owner only.
  assert.equal(parseCatalog([pro], TODAY)[0].ownerSubtitle, "Professional");
  assert.deepEqual(professionalIds([pro, pro, row("1", 1)]), ["p1"]);
});

test("arrange: featured = redeemable first, then the read's order; affordable keeps what the balance reaches", () => {
  const list = parseCatalog([row("b", 400), row("a", 900), row("c", 3000), row("d", 5000)], TODAY);
  assert.deepEqual(arrangeOffers(list, "featured", false, 1240).map((o) => o.offerId), ["b", "a", "c", "d"]);
  assert.deepEqual(arrangeOffers(parseCatalog([row("c", 3000), row("b", 400)], TODAY), "featured", false, 1240).map((o) => o.offerId), ["b", "c"]);
  assert.deepEqual(arrangeOffers(list, "highest", false, 1240).map((o) => o.offerId), ["d", "c", "a", "b"]);
  assert.deepEqual(arrangeOffers(list, "featured", true, 1240).map((o) => o.offerId), ["b", "a"]);
});

test("no supplement offers for under-18s (or no date of birth)", () => {
  const list = parseCatalog([row("1", 10), row("2", 20, { category: "supplements" })], TODAY);
  assert.equal(forAge(list, true).length, 2);
  assert.deepEqual(forAge(list, false).map((o) => o.offerId), ["1"]);
});

test("detail: derived quantity_left / limit_left, where, D-24 voucher days, the website", () => {
  const d = parseOfferDetail([row("1", 900, { quantity_cap: 100, redeemed_count: 30, per_member_limit: 2, ends_on: "2027-06-30" })], TODAY, new Map(), 1);
  assert.ok(d);
  assert.equal(d.quantityLeft, 70);
  assert.equal(d.limitLeft, 1);
  assert.equal(d.where, "both");
  assert.equal(whereLabel(d.where), "In store and online");
  assert.equal(d.voucherDays, 90);
  assert.equal(voucherExpiryLabel(d.voucherDays, d.voucherCappedOn), "90 days after it is issued");
  assert.equal(d.onlineUrl, "https://outlineactive.com/");
  // Uncapped / unknown own count → null; a sold-out cap reads 0.
  const u = parseOfferDetail([row("1", 900)], TODAY);
  assert.equal(u?.quantityLeft, null);
  assert.equal(u?.limitLeft, null);
  assert.equal(parseOfferDetail([row("1", 900, { quantity_cap: 5, redeemed_count: 5 })], TODAY, new Map(), 0)?.quantityLeft, 0);
  // where_used in_person: "In store" for a business, "In person" for a professional.
  assert.equal(parseOfferDetail([row("1", 9, { where_used: "in_person" })], TODAY)?.where, "in_store");
  assert.equal(parseOfferDetail([row("1", 9, { where_used: "in_person", owner_kind: "professional", professional_id: "p1", business: null })], TODAY)?.where, "in_person");
  // The offer ends in 10 days: the voucher runs to its end, not 90 days.
  const c = parseOfferDetail([row("1", 9, { ends_on: "2026-10-31" })], TODAY);
  assert.equal(c?.voucherDays, 10);
  assert.equal(c?.voucherCappedOn, "2026-10-31");
  assert.equal(voucherExpiryLabel(c!.voucherDays, c!.voucherCappedOn), "Until Oct 31, 2026");
  // Not live → null (the not-found card).
  assert.equal(parseOfferDetail([row("1", 9, { paused_at: "2026-10-01T00:00:00Z" })], TODAY), null);
  assert.equal(parseOfferDetail([], TODAY), null);
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
