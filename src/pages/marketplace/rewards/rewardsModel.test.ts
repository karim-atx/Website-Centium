import { test } from "node:test";
import assert from "node:assert/strict";
import {
  businessesForCategory,
  distanceLine,
  newRequestId,
  offerCells,
  productsNote,
  redeemGate,
  showcaseSegments,
  showcaseTypeLabel,
  websiteHost,
  websiteHref,
} from "./rewardsModel.ts";

const biz = [
  { name: "Outline", venueType: "clothing_store" },
  { name: "Peak", venueType: "supplement_store" },
  { name: "Friend Fitness", venueType: "gym" },
];

test("business sections follow the chip (D-21)", () => {
  assert.deepEqual(businessesForCategory(biz, "all").map((b) => b.name), ["Outline", "Peak", "Friend Fitness"]);
  assert.deepEqual(businessesForCategory(biz, "clothing").map((b) => b.name), ["Outline"]);
  assert.deepEqual(businessesForCategory(biz, "supplements").map((b) => b.name), ["Peak"]);
  assert.deepEqual(businessesForCategory(biz, "wellness"), []);
  assert.deepEqual(businessesForCategory(biz, "professionals"), []);
});

test("showcase type line and website host", () => {
  assert.equal(showcaseTypeLabel("clothing_store"), "Clothing Store");
  assert.equal(showcaseTypeLabel("meal_prep_service"), "Meal Prep Service");
  assert.equal(showcaseTypeLabel("gym"), "Gym");
  assert.equal(websiteHost("https://www.outlineactive.com/shop?x=1"), "outlineactive.com");
  assert.equal(websiteHost("outlineactive.com"), "outlineactive.com");
  assert.equal(websiteHost("  "), null);
  assert.equal(websiteHref("outlineactive.com"), "https://outlineactive.com");
  assert.equal(websiteHref("http://a.b"), "http://a.b");
  assert.equal(websiteHref("javascript:alert(1)"), null);
});

test("segments hide what the business doesn't have", () => {
  const all = showcaseSegments({ website: "https://outlineactive.com", location: "Gemmayzeh, Beirut", distance: "1.4 km from you" });
  assert.deepEqual(all.map((s) => s.key), ["shop", "loc", "web"]);
  assert.deepEqual(all.map((s) => s.step), [1, 2, 4]);
  assert.equal(all[0].value, "In store and online");
  assert.equal(all[1].line, "1.4 km from you");
  assert.equal(all[2].value, "outlineactive.com");
  assert.equal(all[2].line, "Enter your voucher code at checkout.");
  const shopOnly = showcaseSegments({ website: null, location: null, distance: null });
  assert.deepEqual(shopOnly.map((s) => s.key), ["shop"]);
  assert.equal(shopOnly[0].value, "In store");
  assert.equal(shopOnly[0].line, "Vouchers work at the counter.");
  assert.deepEqual(showcaseSegments({ website: null, location: "Beirut", distance: null }).map((s) => s.key), ["shop", "loc"]);
  assert.equal(productsNote("x.com"), "Display prices. Buy in store or online.");
  assert.equal(productsNote(null), "Display prices. Buy in store.");
});

test("distance to the nearest place", () => {
  const here = { lat: 33.8938, lng: 35.482 };
  assert.equal(distanceLine(null, [{ lat: 1, lng: 1 }]), null);
  assert.equal(distanceLine(here, [{ lat: null, lng: null }]), null);
  assert.equal(distanceLine(here, [{ lat: 33.887, lng: 35.516 }, { lat: 33.8938, lng: 35.482 }]), "0.0 km from you");
  assert.match(distanceLine(here, [{ lat: 33.887, lng: 35.516 }]) ?? "", /^3\.2 km from you$/);
});

test("offer cells with fallbacks", () => {
  const full = offerCells({ startsOn: "2026-10-01", endsOn: "2026-12-31", where: "both", perMemberLimit: 1, voucherDays: 90, voucherCappedOn: null });
  assert.deepEqual(full.map((c) => c.value), ["Oct 1 to Dec 31, 2026", "In store and online", "1 per member", "90 days after it is issued"]);
  assert.deepEqual(full.map((c) => c.key), ["Valid", "Where to use", "Limit", "Voucher expires"]);
  const bare = offerCells({ startsOn: null, endsOn: null, where: null, perMemberLimit: null, voucherDays: 12, voucherCappedOn: "2026-11-03" });
  assert.deepEqual(bare.map((c) => c.value), ["While it lasts", "See terms", "No limit", "Until Nov 3, 2026"]);
});

test("redeem gate", () => {
  const d = { pointsCost: 3000, quantityLeft: null, limitLeft: null };
  assert.deepEqual(redeemGate(d, 1240), { locked: true, line: "You need 1,760 more points" });
  assert.deepEqual(redeemGate({ ...d, pointsCost: 900 }, 1240), { locked: false, line: null });
  assert.equal(redeemGate({ ...d, pointsCost: 900, quantityLeft: 0 }, 1240).line, "This offer has run out.");
  assert.equal(redeemGate({ ...d, pointsCost: 900, limitLeft: 0 }, 1240).line, "You've already redeemed this offer.");
  assert.equal(redeemGate({ ...d, pointsCost: 1240 }, 1240).locked, false);
});

test("request ids are uuids and differ", () => {
  const a = newRequestId();
  const b = newRequestId();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, b);
});
