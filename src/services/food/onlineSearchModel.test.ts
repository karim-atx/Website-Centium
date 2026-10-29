import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  brandServing,
  canSuggestForCatalogue,
  foodReviewCopy,
  foundNutrientLines,
  macroLine,
  onlineFailureKind,
  onlineFailureMessage,
  onlineQuery,
  orderOnlineResults,
  parseOnlineFood,
  parseOnlineResults,
  saveFoundFoodArgs,
  saveFoundFoodMessage,
  sourcesNote,
  suggestFoodMessage,
  type OnlineFood,
} from "./onlineSearchModel";
import { OFFLINE_MESSAGE } from "../network-error";

const raw = (over: Record<string, unknown> = {}) => ({
  source: "usda_fdc",
  ref: "171287",
  name: "Egg, whole, raw",
  brand: null,
  servingLabel: "1 large (50 g)",
  calories: 72,
  protein_g: 6.3,
  carbs_g: 0.4,
  fat_g: 4.8,
  nutrients: { sodium: 71, vitamin_d: 1, calories: 72 },
  dataKind: "general",
  attribution: { source: "usda_fdc", ref: "171287", url: "https://fdc.nal.usda.gov/food-details/171287", notice: "", fetchedAt: "2026-10-29T10:00:00Z" },
  ...over,
});

test("query: 2 to 80 characters after trimming", () => {
  assert.equal(onlineQuery("  e "), null);
  assert.equal(onlineQuery("eg"), "eg");
  assert.equal(onlineQuery("  greek   yoghurt "), "greek yoghurt");
  assert.equal(onlineQuery("x".repeat(80))?.length, 80);
  assert.equal(onlineQuery("x".repeat(81)), null);
});

test("a result maps to per-serving values; a result missing what saving needs is dropped", () => {
  const f = parseOnlineFood(raw())!;
  assert.equal(f.source, "usda_fdc");
  assert.equal(f.protein, 6.3);
  assert.equal(f.brand, null);
  assert.deepEqual(f.nutrients, { sodium: 71, vitamin_d: 1, calories: 72 });
  assert.equal(f.attribution.notice, null); // a blank notice is no notice
  assert.equal(f.attribution.fetchedAt, "2026-10-29T10:00:00Z");
  assert.equal(parseOnlineFood(raw({ source: "fdc" })), null);
  assert.equal(parseOnlineFood(raw({ name: "  " })), null);
  assert.equal(parseOnlineFood(raw({ calories: null })), null);
  assert.equal(parseOnlineFood(raw({ servingLabel: undefined })), null);
  assert.equal(parseOnlineFood(null), null);
  // a missing macro reads as 0 (the function sends 0 too); bad nutrient values are left out
  const g = parseOnlineFood(raw({ fat_g: null, nutrients: { iron: -1, "Bad Key": 2, zinc: "1.5" } }))!;
  assert.equal(g.fat, 0);
  assert.deepEqual(g.nutrients, { zinc: 1.5 });
});

test("order: USDA general, then USDA branded, then Open Food Facts, each in the function's order", () => {
  const mk = (ref: string, source: OnlineFood["source"], dataKind: OnlineFood["dataKind"]) =>
    parseOnlineFood(raw({ ref, source, dataKind }))!;
  const out = orderOnlineResults([
    mk("1", "open_food_facts", "branded"),
    mk("2", "usda_fdc", "branded"),
    mk("3", "usda_fdc", "general"),
    mk("4", "open_food_facts", "branded"),
    mk("5", "usda_fdc", "general"),
  ]);
  assert.deepEqual(out.map((f) => f.ref), ["3", "5", "2", "1", "4"]);
});

test("the body: usable results once each, and each source's status", () => {
  const body = {
    results: [raw({ source: "open_food_facts", ref: "3017620422003", dataKind: "branded" }), raw(), raw(), { nope: true }],
    sources: { usda_fdc: "cached", open_food_facts: "ok", other: "ok" },
    perServing: true,
  };
  const { results, sources } = parseOnlineResults(body);
  assert.deepEqual(results.map((f) => f.source), ["usda_fdc", "open_food_facts"]);
  assert.deepEqual(sources, { usda_fdc: "cached", open_food_facts: "ok" });
  assert.deepEqual(parseOnlineResults(null), { results: [], sources: {} });
});

test("failures: offline first, then the function's codes", () => {
  assert.equal(onlineFailureKind(429, "rate_limited", true), "offline");
  assert.equal(onlineFailureKind(429, "rate_limited", false), "rate_limited");
  assert.equal(onlineFailureKind(503, "upstream_unavailable", false), "unavailable");
  assert.equal(onlineFailureKind(400, "invalid_query", false), "invalid_query");
  assert.equal(onlineFailureKind(401, "unauthenticated", false), "signed_out");
  assert.equal(onlineFailureKind(500, "server_error", false), "error");
  assert.equal(onlineFailureMessage("offline"), "Searching online needs a connection.");
  assert.match(onlineFailureMessage("rate_limited"), /30 times an hour/);
});

test("a source that didn't take part is named; both or neither answering says nothing", () => {
  assert.equal(sourcesNote({ usda_fdc: "ok", open_food_facts: "ok" }), null);
  assert.equal(sourcesNote({ usda_fdc: "cached", open_food_facts: "ok" }), null);
  assert.equal(
    sourcesNote({ usda_fdc: "ok", open_food_facts: "not_configured" }),
    "Results from USDA FoodData Central only. Open Food Facts isn't available right now."
  );
  assert.equal(
    sourcesNote({ usda_fdc: "unavailable", open_food_facts: "ok" }),
    "Results from Open Food Facts only. USDA FoodData Central isn't available right now."
  );
  assert.equal(sourcesNote({}), null);
});

test("lines: brand and serving, macros per serving", () => {
  assert.equal(brandServing("Nutella", "15 g"), "Nutella · 15 g");
  assert.equal(brandServing(null, "100 g"), "100 g");
  assert.equal(macroLine({ protein: 6.34, carbs: 0.4, fat: 4.8 }), "P 6.3g · C 0.4g · F 4.8g");
});

test("nutrients: the app's names and units, its order, only what the source gave, never the macros again", () => {
  const lines = foundNutrientLines({ vitamin_d: 1, sodium: 71, calories: 72, protein: 6, unknown_key: 3 });
  assert.deepEqual(lines.map((l) => l.key), ["sodium", "vitamin_d"]);
  assert.equal(lines[0].name, "Sodium");
  assert.equal(lines[0].unit, "mg");
  assert.deepEqual(foundNutrientLines(null), []);
  assert.deepEqual(foundNutrientLines({}), []);
});

test("save: the confirmed result's values, nutrients null when there are none", () => {
  const f = parseOnlineFood(raw({ nutrients: {} }))!;
  assert.deepEqual(saveFoundFoodArgs(f), {
    p_source: "usda_fdc",
    p_ref: "171287",
    p_name: "Egg, whole, raw",
    p_brand: null,
    p_serving_label: "1 large (50 g)",
    p_calories: 72,
    p_protein_g: 6.3,
    p_carbs_g: 0.4,
    p_fat_g: 4.8,
    p_nutrients: null,
    p_fetched_at: "2026-10-29T10:00:00Z",
  });
  assert.equal(saveFoundFoodMessage("22023", true), OFFLINE_MESSAGE);
  assert.match(saveFoundFoodMessage("22023", false), /outside what we can save/);
});

test("suggest: USDA and typed foods only, never Open Food Facts, and only a saved row", () => {
  const id = "0b7f6d0e-3f1c-4a52-9a43-2f0d7a1b2c3d";
  assert.equal(canSuggestForCatalogue({ id, source: "custom", externalSource: "usda_fdc" }), true);
  assert.equal(canSuggestForCatalogue({ id, source: "custom", externalSource: null }), true);
  assert.equal(canSuggestForCatalogue({ id, source: "custom" }), true);
  assert.equal(canSuggestForCatalogue({ id, source: "custom", externalSource: "open_food_facts" }), false);
  assert.equal(canSuggestForCatalogue({ id, source: "catalog" }), false);
  assert.equal(canSuggestForCatalogue({ id: "custom1757352", source: "custom" }), false);
  assert.match(suggestFoodMessage("ATXL0", false), /Open Food Facts/);
  assert.match(suggestFoodMessage("ATX60", false), /can't go into the catalogue/);
  assert.match(suggestFoodMessage("ATX02", false), /10 foods an hour/);
  assert.equal(suggestFoodMessage("ATX60", true), OFFLINE_MESSAGE);
});

test("the decision: approved or rejected with the reason in words, never the note", () => {
  assert.deepEqual(foodReviewCopy("approved", "Grandma's kibbeh", null), {
    title: "Added to the catalogue",
    body: "Grandma's kibbeh is in the catalogue now, so everyone can find it.",
  });
  assert.equal(
    foodReviewCopy("rejected", "Kibbeh", "incorrect_values").body,
    "Kibbeh wasn't added. Its values didn't look right. It's still in your own foods."
  );
  assert.match(foodReviewCopy("rejected", null, "something_new").body!, /^Your food wasn't added\. It didn't meet our guidelines\./);
  assert.deepEqual(foodReviewCopy("pending", "X", null), {});
});
