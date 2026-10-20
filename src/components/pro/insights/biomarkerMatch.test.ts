// Release 3 · W9 biomarker matching by marker_key (biomarkerMatch.ts).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { catalogueByKey, flagFor, markerIdentity } from "./biomarkerMatch";

const catalogue = [
  { key: "haemoglobin", displayName: "Haemoglobin" },
  { key: "hba1c", displayName: "HbA1c" },
];
const flags = [
  { markerKey: "haemoglobin", name: "Hemoglobin", status: "normal" },
  { markerKey: null, name: "Custom marker", status: "unknown" },
  { markerKey: "hba1c", name: "Glucose", status: "out_of_range" },
];

describe("biomarker matching", () => {
  it("finds the catalogue entry by key only", () => {
    assert.equal(catalogueByKey(catalogue, "hba1c")?.displayName, "HbA1c");
    assert.equal(catalogueByKey(catalogue, null), null, "no name or alias fallback");
    assert.equal(catalogueByKey(null, "hba1c"), null);
  });
  it("matches a flag by key even when the names differ", () => {
    assert.equal(flagFor(flags, "haemoglobin", "Haemoglobin")?.status, "normal");
  });
  it("never gives a keyed marker another marker's flag through its name", () => {
    assert.equal(flagFor(flags, "glucose", "Glucose"), null);
  });
  it("keyless markers use the backend's lower(name) identity", () => {
    assert.equal(flagFor(flags, null, " custom MARKER ")?.status, "unknown");
    assert.equal(markerIdentity(null, " A b "), "name:a b");
    assert.equal(markerIdentity("x", "A"), "key:x");
  });
});
