// FQ: the professional's conflict lines for an "Other" allergy, and today's rows unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { conflictBody, conflictTitle } from "./nuFormat";
import type { ConflictRow } from "./nutritionModel";

const FSI = "⁨";
const PDI = "⁩";
const row = (extra: Partial<ConflictRow>): ConflictRow => ({ kind: "allergy_check", allergen: null, severity: null, restriction: null, detail: null, ...extra });

test("an Other allergy: the client's label as written, isolated, with their severity", () => {
  const kiwi = row({ severity: "severe", customAllergy: "Kiwi", detail: "Check this: the name matches an Other allergy" });
  assert.equal(conflictTitle("Green KIWI", kiwi), `Green KIWI may contain ${FSI}Kiwi${PDI}. Check this.`);
  assert.equal(conflictBody("Sara", kiwi), `Sara added ${FSI}Kiwi${PDI} as an allergy in their own words (severe). Only the name matches, so check the ingredients with Sara.`);
  const arabic = row({ severity: null, customAllergy: "كيوي" });
  assert.equal(conflictTitle("سلطة كيوي", arabic), `سلطة كيوي may contain ${FSI}كيوي${PDI}. Check this.`);
  assert.equal(conflictBody("Sara", arabic), `Sara added ${FSI}كيوي${PDI} as an allergy in their own words. Only the name matches, so check the ingredients with Sara.`);
  // The detail text is never shown: the line is built from custom_allergy.
  assert.ok(!conflictTitle("x", kiwi).includes("Other allergy"));
});

test("today's rows (no custom_allergy at all) read as before", () => {
  const std = row({ allergen: "peanuts" });
  assert.equal(conflictTitle("Satay", std), "Satay may contain peanuts. Check this.");
  assert.equal(conflictBody("Sara", std), "The name suggests it. Check the ingredients with Sara.");
  const confirmed = row({ kind: "allergy_confirmed", allergen: "peanuts", severity: "severe" });
  assert.equal(conflictTitle("Satay", confirmed), "Satay contains peanuts");
  // A standard row that also carried a label keeps its allergen (the label is only read when allergen is null).
  assert.equal(conflictTitle("Satay", row({ allergen: "peanuts", customAllergy: "Pea" })), "Satay may contain peanuts. Check this.");
});

// Batch D GI: a "may contain" trace and an online food with no allergen data.
test("GI: may contain names the allergen with the client's severity; allergens unknown never blocks", () => {
  const may = row({ kind: "may_contain", allergen: "peanuts", severity: "severe" });
  assert.equal(conflictTitle("Cereal bar", may), "Cereal bar may contain peanuts");
  assert.equal(conflictBody("Sara", may), "Sara is allergic to peanuts (severe). The label says it may contain traces. Check it with Sara.");
  assert.equal(conflictBody("Sara", { ...may, severity: null }), "Sara is allergic to peanuts. The label says it may contain traces. Check it with Sara.");
  const unk = row({ kind: "food_allergens_unknown", detail: "Allergens unknown: there is no allergen information for this food." });
  assert.equal(conflictTitle("Apple", unk), "Allergens unknown");
  assert.equal(conflictBody("Sara", unk), "There's no allergen information for this food. Check the label with Sara.");
});
