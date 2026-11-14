import { test } from "node:test";
import assert from "node:assert/strict";
import { addCatalogue, setActiveLanguage } from "../../i18n/core.ts";
import { PCOS_STORED, PMOS_LABEL, storedConditionText } from "./conditionLabel.ts";
import { CONDITION_LABEL } from "../cycle/guidance.ts";
import health from "../../i18n/ar/health.ts";

test("Batch D GJ: PCOS shows as PMOS; what is stored stays PCOS", () => {
  assert.equal(PCOS_STORED, "PCOS");
  assert.equal(PMOS_LABEL, "PMOS (formerly PCOS)");
  assert.equal(storedConditionText("PCOS"), "PMOS (formerly PCOS)");
  // Only the chip's exact text is renamed: a person's own words are theirs.
  assert.equal(storedConditionText("pcos"), "pcos");
  assert.equal(storedConditionText("Asthma"), "Asthma");
  assert.equal(CONDITION_LABEL.pcos, "PMOS (formerly PCOS)");
  // Karim's approved Arabic, from the real catalogue.
  assert.equal(health["PMOS (formerly PCOS)"], "PMOS (متلازمة تكيّس المبايض سابقًا)");
  addCatalogue("ar", health);
  setActiveLanguage("ar");
  try {
    assert.equal(storedConditionText("PCOS"), "PMOS (متلازمة تكيّس المبايض سابقًا)");
  } finally {
    setActiveLanguage("en");
  }
});
