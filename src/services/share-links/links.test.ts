import { test } from "node:test";
import assert from "node:assert/strict";
import { bizProfileLink, bizShareHref, bizSharePath, bizShareText, isBizSlug, parseShareSplat, serverKind } from "./links.ts";
import { classifyShareLinkError, parseBusiness, parseItem, parseResolution, priceText } from "./resolveModel.ts";

const ID = "e1000000-0000-4000-8000-0000000000c1";

test("links are built on the site address, never centium.app", () => {
  assert.equal(bizShareHref("flexfitness"), "https://centium.atraxia.org/b/flexfitness");
  assert.equal(bizShareHref("flexfitness", "week"), "https://centium.atraxia.org/b/flexfitness/week");
  assert.equal(bizShareHref("flexfitness", "c", ID), `https://centium.atraxia.org/b/flexfitness/class/${ID}`);
  assert.equal(bizShareText("flexfitness", "m", ID), `centium.atraxia.org/b/flexfitness/membership/${ID}`);
  for (const k of ["c", "o", "i", "m", "j"] as const) assert.equal(bizSharePath("hamra-strength", k, ID), `/b/hamra-strength/${serverKind(k)}/${ID}`);
  assert.equal(bizSharePath("hamra-strength", "c", ID.toUpperCase()), `/b/hamra-strength/class/${ID}`);
  assert.ok(!bizShareHref("flexfitness", "o", ID).includes("centium.app"));
});

test("a bad slug or a missing item throws rather than building a dead link", () => {
  assert.throws(() => bizSharePath("Flex Fitness"));
  assert.throws(() => bizSharePath("12345"));
  assert.throws(() => bizSharePath("ab"));
  assert.throws(() => bizSharePath("flexfitness", "c"));
  assert.throws(() => bizSharePath("flexfitness", "o", "a/b"));
  // resolve_share_link takes p_item_id uuid: a non-uuid item is never built.
  assert.throws(() => bizSharePath("flexfitness", "m", "monthly"));
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
  assert.equal(parseShareSplat("c/1"), null);
  assert.equal(parseShareSplat("constructor/" + ID), null);
  for (const [k, item] of [["c", ID], ["m", ID], [null, null], ["week", null]] as const) {
    const path = bizSharePath("flexfitness", k, item);
    assert.deepEqual(parseShareSplat(path.replace(/^\/b\/flexfitness\/?/, "")), { kind: k, item });
  }
});

test("the server's kind words: we call the resolver with them, and its target_url opens our route", () => {
  assert.equal(serverKind(null), "profile");
  assert.equal(serverKind("week"), "week");
  assert.deepEqual((["c", "o", "i", "m", "j"] as const).map(serverKind), ["class", "offer", "item", "membership", "opening"]);
  // target_url = public_base_url || '/b/' || slug || '/' || kind || '/' || item
  assert.deepEqual(parseShareSplat(`class/${ID}`), { kind: "c", item: ID });
  assert.deepEqual(parseShareSplat(`membership/${ID}`), { kind: "m", item: ID });
  assert.deepEqual(parseShareSplat(`offer/${ID.toUpperCase()}`), { kind: "o", item: ID });
  assert.equal(parseShareSplat("profile"), null);
});

test("every printed link has the exact shape of resolve_share_link's target_url", () => {
  // The resolver: base || '/b/' || slug || case when kind = 'profile' then '' else '/' || kind || coalesce('/' || item::text, '') end
  const targetUrl = (base: string, slug: string, kind: string, item: string | null) =>
    base + "/b/" + slug + (kind === "profile" ? "" : "/" + kind + (item ? "/" + item : ""));
  const base = "https://centium.atraxia.org";
  for (const [k, item] of [[null, null], ["week", null], ["c", ID], ["o", ID], ["i", ID], ["m", ID], ["j", ID]] as const) {
    assert.equal(bizShareHref("flexfitness", k, item), targetUrl(base, "flexfitness", serverKind(k), item));
    assert.ok(!/\/b\/flexfitness\/[coimj]\//.test(bizShareHref("flexfitness", k, item)), "no letter form is printed");
  }
});

test("links printed before the switch (letters) still open the same target as the words", () => {
  for (const [letter, word] of [["c", "class"], ["o", "offer"], ["i", "item"], ["m", "membership"], ["j", "opening"]] as const) {
    assert.deepEqual(parseShareSplat(`${letter}/${ID}`), parseShareSplat(`${word}/${ID}`));
    assert.deepEqual(parseShareSplat(`${letter}/${ID}`), { kind: letter, item: ID });
  }
});

const BIZ = "e1000000-0000-4000-8000-0000000000b1";
const row = (o: Record<string, unknown>) => [{ found: false, business_id: null, business_name: null, kind: "profile", item_id: null, target_url: null, disabled: false, ...o }];

test("resolve_share_link's row: found, taken down, and every not-found case look as documented", () => {
  assert.deepEqual(parseResolution(row({ found: true, business_id: BIZ, business_name: "Flex Fitness", kind: "class", item_id: ID, target_url: "https://centium.atraxia.org/b/flexfitness/class/" + ID })), {
    status: "found",
    businessId: BIZ,
    businessName: "Flex Fitness",
    kind: "class",
    itemId: ID,
  });
  // Disabled: found = false, nothing else, disabled = true.
  assert.deepEqual(parseResolution(row({ kind: "offer", item_id: ID, disabled: true })), { status: "disabled" });
  // A bad slug, a closed business and a hidden one: found = false with nothing else.
  assert.deepEqual(parseResolution(row({})), { status: "missing" });
  // Unreadable answers never draw a card.
  assert.deepEqual(parseResolution([]), { status: "missing" });
  assert.deepEqual(parseResolution(null), { status: "missing" });
  assert.deepEqual(parseResolution(row({ found: true, business_id: BIZ })), { status: "missing" });
  assert.deepEqual(parseResolution(row({ found: true, business_id: BIZ, business_name: "X", kind: "nope" })), { status: "missing" });
  // A single object (not a set) parses the same.
  assert.equal(parseResolution({ found: true, business_id: BIZ, business_name: "X", kind: "profile", item_id: null }).status, "found");
});

test("resolve_share_link refusals: a bad kind or item is not found, anything else an error", () => {
  assert.equal(classifyShareLinkError({ code: "22023", message: "unknown link kind" }), "missing");
  assert.equal(classifyShareLinkError({ code: "22P02", message: "invalid input syntax for type uuid" }), "missing");
  assert.equal(classifyShareLinkError({ code: "PGRST202", message: "Could not find the function" }), "error");
  assert.equal(classifyShareLinkError({ code: "08006", message: "connection failure" }), "error");
});

test("the card: only public fields, and an item that isn't this business's or isn't public is not found", () => {
  assert.deepEqual(parseBusiness("Flex Fitness", { logo_url: null, business_type: "gym", location: "Beirut", members_reached: 1840 }), {
    name: "Flex Fitness",
    logoUrl: null,
    type: "gym",
    area: "Beirut",
  });
  assert.deepEqual(parseBusiness("Flex Fitness", null), { name: "Flex Fitness", logoUrl: null, type: null, area: null });
  assert.equal(parseBusiness("F", { logo_url: "uid/logo.png" }, (v) => `https://cdn/${v}`).logoUrl, "https://cdn/uid/logo.png");
  assert.equal((parseItem("i", BIZ, { business_id: BIZ, title: "T", visible: true, image_url: "javascript:alert(1)" }) as { imageUrl: string | null }).imageUrl, null);

  assert.deepEqual(parseItem(null, BIZ, undefined), { kind: null });
  assert.deepEqual(parseItem("week", BIZ, undefined), { kind: "week" });
  assert.deepEqual(parseItem("j", BIZ, undefined), { kind: "j" });

  const cls = { business_id: BIZ, title: "Spin", event_date: "2026-10-23", start_time: "07:00:00", cancelled_at: null, listed_on_explore: true, max_capacity: 20 };
  assert.deepEqual(parseItem("c", BIZ, cls), { kind: "c", title: "Spin", date: "2026-10-23", startTime: "07:00:00" });
  assert.equal(parseItem("c", BIZ, { ...cls, cancelled_at: "2026-10-20T10:00:00Z" }), null);
  assert.equal(parseItem("c", BIZ, { ...cls, listed_on_explore: false }), null);
  assert.equal(parseItem("c", "another-business", cls), null);
  assert.equal(parseItem("c", BIZ, null), null);

  const plan = { business_id: BIZ, name: "Monthly", price: "45.00", visible_on_explore: true, status: "active" };
  assert.deepEqual(parseItem("m", BIZ, plan), { kind: "m", name: "Monthly", price: "$45" });
  assert.equal(parseItem("m", BIZ, { ...plan, visible_on_explore: false }), null);
  assert.equal(parseItem("m", BIZ, { ...plan, status: "archived" }), null);

  const shop = { business_id: BIZ, title: "Shaker", price: 12.5, description: null, image_url: "https://x/y.jpg", visible: true, hidden_at: null };
  assert.deepEqual(parseItem("i", BIZ, shop), { kind: "i", name: "Shaker", price: "$12.50", imageUrl: "https://x/y.jpg", description: null });
  assert.equal(parseItem("i", BIZ, { ...shop, hidden_at: "2026-10-01T00:00:00Z" }), null);

  // An offer: read signed in; signed out (not read) the card has no details.
  const offer = { business_id: BIZ, title: "15% off", points_cost: 900, ends_on: "2026-12-31", where_used: "in_store", redeemed_count: 46 };
  assert.deepEqual(parseItem("o", BIZ, offer), { kind: "o", offer: { headline: "15% off", pointsCost: 900, validUntil: "2026-12-31", where: "in_store" } });
  assert.deepEqual(parseItem("o", BIZ, undefined), { kind: "o", offer: null });
  assert.equal(parseItem("o", BIZ, null), null);
  assert.ok(!JSON.stringify(parseItem("o", BIZ, offer)).includes("46"));
  assert.equal(priceText("45.00"), "$45");
  assert.equal(priceText(85.5), "$85.50");
});

test("the business card's link: /b/{slug} on the site address, none without a slug", () => {
  assert.deepEqual(bizProfileLink("flexfitness"), { href: "https://centium.atraxia.org/b/flexfitness", text: "centium.atraxia.org/b/flexfitness" });
  assert.equal(bizProfileLink(null), null);
  assert.equal(bizProfileLink(undefined), null);
  assert.equal(bizProfileLink(""), null);
  assert.equal(bizProfileLink("Flex Fitness"), null);
});
