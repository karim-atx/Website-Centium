import { test } from "node:test";
import assert from "node:assert/strict";
import { bizShareHref, bizSharePath, bizShareText, isBizSlug, parseShareSplat } from "./links.ts";
import { classifyShareLinkError, parseShareLink, priceText } from "./resolveModel.ts";

const ID = "e1000000-0000-4000-8000-0000000000c1";

test("links are built on the site address, never centium.app", () => {
  assert.equal(bizShareHref("flexfitness"), "https://centium.atraxia.org/b/flexfitness");
  assert.equal(bizShareHref("flexfitness", "week"), "https://centium.atraxia.org/b/flexfitness/week");
  assert.equal(bizShareHref("flexfitness", "c", ID), `https://centium.atraxia.org/b/flexfitness/c/${ID}`);
  assert.equal(bizShareText("flexfitness", "m", ID), `centium.atraxia.org/b/flexfitness/m/${ID}`);
  for (const k of ["c", "o", "i", "m", "j"] as const) assert.equal(bizSharePath("hamra-strength", k, "x1"), `/b/hamra-strength/${k}/x1`);
  assert.ok(!bizShareHref("flexfitness", "o", ID).includes("centium.app"));
});

test("a bad slug or a missing item throws rather than building a dead link", () => {
  assert.throws(() => bizSharePath("Flex Fitness"));
  assert.throws(() => bizSharePath("12345"));
  assert.throws(() => bizSharePath("ab"));
  assert.throws(() => bizSharePath("flexfitness", "c"));
  assert.throws(() => bizSharePath("flexfitness", "o", "a/b"));
});

test("slugs follow business_profiles_slug_check", () => {
  assert.ok(isBizSlug("flexfitness"));
  assert.ok(isBizSlug("hamra-strength"));
  assert.ok(!isBizSlug(null));
  assert.ok(!isBizSlug("-hamra"));
  assert.ok(!isBizSlug("hamra--strength"));
  assert.ok(!isBizSlug("2026"));
  assert.ok(!isBizSlug("a".repeat(41)));
});

test("the route's splat parses back to the target it was built from", () => {
  assert.deepEqual(parseShareSplat(""), { kind: null, item: null });
  assert.deepEqual(parseShareSplat("week"), { kind: "week", item: null });
  assert.deepEqual(parseShareSplat(`o/${ID}`), { kind: "o", item: ID });
  assert.deepEqual(parseShareSplat(`j/${ID}`), { kind: "j", item: ID });
  assert.equal(parseShareSplat("week/1"), null);
  assert.equal(parseShareSplat("x/1"), null);
  assert.equal(parseShareSplat("c"), null);
  assert.equal(parseShareSplat("c/1/2"), null);
  for (const [k, item] of [["c", ID], ["m", "monthly"], [null, null], ["week", null]] as const) {
    const path = bizSharePath("flexfitness", k, item);
    assert.deepEqual(parseShareSplat(path.replace(/^\/b\/flexfitness\/?/, "")), { kind: k, item });
  }
});

test("resolve_share_link: documented errors read as missing, a missing function as unavailable (DB13 not landed)", () => {
  assert.equal(classifyShareLinkError({ code: "P0001", message: "not_found" }), "missing");
  assert.equal(classifyShareLinkError({ code: "P0001", message: "not_public" }), "missing");
  assert.equal(classifyShareLinkError({ code: "PGRST202", message: "Could not find the function public.resolve_share_link" }), "unavailable");
  assert.equal(classifyShareLinkError({ code: "42883", message: "function does not exist" }), "unavailable");
  assert.equal(classifyShareLinkError({ code: "08006", message: "connection failure" }), "error");
});

test("resolve_share_link: only the documented public fields are read; an unreadable answer is no card", () => {
  const card = parseShareLink(
    {
      business: { business_name: "Flex Fitness", logo_url: null, category: "Gym", area: "Beirut", rating: 4.8, review_count: 12, members_reached: 1840, revenue: 9000 },
      item: { headline: "15% off", points_cost: 900, ends_on: "2026-12-31", where_used: "In store", redeemed_count: 46 },
    },
    "o",
  );
  assert.ok(card);
  assert.deepEqual(card.business, { name: "Flex Fitness", logoUrl: null, category: "Gym", area: "Beirut", rating: { average: 4.8, count: 12 } });
  assert.deepEqual(card.item, { kind: "o", headline: "15% off", pointsCost: 900, validUntil: "2026-12-31", where: "In store" });
  const flat = JSON.stringify(card);
  for (const leak of ["1840", "9000", "46", "members", "revenue", "redeemed"]) assert.ok(!flat.includes(leak), leak);
  assert.equal(parseShareLink(null, "o"), null);
  assert.equal(parseShareLink({ business: { business_name: "X" }, item: {} }, "o"), null);
  assert.equal(parseShareLink({ business: {} }, null), null);
  assert.deepEqual(parseShareLink([{ business_name: "X" }], null)?.item, { kind: null });
  assert.equal(priceText("45.00"), "$45");
  assert.equal(priceText(85.5), "$85.50");
});
