import { strict as assert } from "node:assert";
import { test } from "node:test";
import { composeReturns, dollars, parseReturns, returnsSummary } from "./storePolicyText.ts";
import { helpTopics, readMinutes, searchHelp } from "./help/helpContent.ts";

const base = {
  exists: true,
  sellsProducts: true,
  offersAppointments: false,
  deliveryEnabled: false,
  pickupEnabled: false,
  deliveryFee: null,
  freeDeliveryOver: null,
  deliveryTimeText: null,
  allowExchanges: false,
};

test("a returns sentence the sheet writes reads back as its two choices", () => {
  for (const w of [7, 14, 30] as const) {
    for (const c of ["unopened", "any"] as const) {
      assert.deepEqual(parseReturns(composeReturns(w, c)), { window: w, condition: c, ours: true });
    }
  }
  assert.deepEqual(parseReturns(composeReturns("none", "unopened")), { window: "none", condition: "unopened", ours: true });
});

test("a sentence written elsewhere is kept as it is, never reinterpreted", () => {
  const p = parseReturns("Return unopened items within 14 days with a receipt.");
  assert.equal(p.ours, false);
  assert.equal(returnsSummary({ ...base, returnsPolicy: "Return unopened items within 14 days with a receipt." }), "Return unopened items within 14 days with a receipt.");
});

test("the More row reads the frame's short form, and nothing when unset", () => {
  assert.equal(returnsSummary({ ...base, returnsPolicy: composeReturns(14, "unopened") }), "14 days, unopened items");
  assert.equal(returnsSummary({ ...base, returnsPolicy: null }), null);
});

test("store money prints as the store set it", () => {
  assert.equal(dollars(3), "$3");
  assert.equal(dollars(2.5), "$2.50");
});

test("help: stores get their own topics and no class topic", () => {
  const store = helpTopics("store").map((t) => t.id);
  assert.ok(!store.includes("classes"));
  assert.ok(store.includes("orders"));
  assert.ok(helpTopics("classes").map((t) => t.id).includes("classes"));
});

test("help: read time is at least a minute, and search finds steps too", () => {
  const topics = helpTopics("gym");
  for (const t of topics) for (const a of t.articles) assert.ok(readMinutes(a) >= 1);
  assert.ok(searchHelp(topics, "seat").length >= 1);
  assert.equal(searchHelp(topics, "   ").length, 0);
});

test("help copy has no em dashes", () => {
  for (const k of ["classes", "gym", "store"] as const)
    for (const t of helpTopics(k)) for (const a of t.articles) for (const s of [a.title, ...a.steps]) assert.ok(!s.includes("—"), s);
});
