import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  catalogueRange,
  convertUnit,
  matchMarker,
  noStandardRange,
  prefillRange,
  searchMarkers,
  toCanonical,
  type CatalogueMarker,
} from "./catalogueLogic.ts";

const hba1c: CatalogueMarker = {
  key: "hba1c",
  displayName: "HbA1c",
  category: "metabolic",
  canonicalUnit: "%",
  reviewed: false,
  notes: null,
  aliases: ["hba1c", "a1c", "glycated haemoglobin"],
  units: [
    { unit: "%", factor: 1, offset: 0 },
    { unit: "mmol/mol", factor: 0.09148, offset: 2.152 },
  ],
  ranges: [],
};
const creatinine: CatalogueMarker = {
  key: "creatinine",
  displayName: "Creatinine",
  category: "kidney",
  canonicalUnit: "mg/dL",
  reviewed: false,
  notes: null,
  aliases: ["creatinine", "serum creatinine"],
  units: [
    { unit: "mg/dL", factor: 1, offset: 0 },
    { unit: "umol/L", factor: 0.0113122, offset: 0 },
  ],
  ranges: [
    { sex: "male", low: 0.74, high: 1.35 },
    { sex: "female", low: 0.59, high: 1.04 },
  ],
};
const alt: CatalogueMarker = {
  ...creatinine,
  key: "alt",
  displayName: "ALT",
  aliases: ["alt", "sgpt"],
  canonicalUnit: "U/L",
  units: [
    { unit: "U/L", factor: 1, offset: 0 },
    { unit: "IU/L", factor: 1, offset: 0 },
  ],
  ranges: [{ sex: null, low: 7, high: 45 }],
};
const list = [hba1c, creatinine, alt];

test("names match through aliases, case and spaces ignored; no match is Other", () => {
  assert.equal(matchMarker("  Glycated Haemoglobin ", list)?.key, "hba1c");
  assert.equal(matchMarker("SGPT", list)?.key, "alt");
  assert.equal(matchMarker("Something else", list), null);
  assert.deepEqual(searchMarkers("a1", list).map((m) => m.key), ["hba1c"]);
});

test("HbA1c conversion keeps its offset: 48 mmol/mol is 6.54 %, not 4.39 %", () => {
  const pct = toCanonical(hba1c, 48, "mmol/mol")!;
  assert.ok(Math.abs(pct - 6.543) < 0.001, String(pct));
  assert.ok(Math.abs(convertUnit(hba1c, 6.543, "%", "mmol/mol")! - 48) < 0.01);
});

test("an unknown unit is never guessed", () => {
  assert.equal(toCanonical(creatinine, 80, "mg/L"), null);
  assert.equal(catalogueRange(creatinine, "male", "mg/L"), null);
});

test("ranges by sex, converted into the chosen unit", () => {
  assert.deepEqual(catalogueRange(creatinine, "female", "mg/dL"), { low: 0.59, high: 1.04 });
  const um = catalogueRange(creatinine, "male", "umol/L")!;
  assert.ok(Math.abs(um.low! - 65.42) < 0.1 && Math.abs(um.high! - 119.3) < 0.2, JSON.stringify(um));
  // Per-sex rows only: no sex on file, or "other", gets no range.
  assert.equal(catalogueRange(creatinine, null, "mg/dL"), null);
  assert.equal(catalogueRange(creatinine, "other", "mg/dL"), null);
  // An everyone-row applies to everybody.
  assert.deepEqual(catalogueRange(alt, "other", "IU/L"), { low: 7, high: 45 });
});

test("nothing is pre-filled until the row is reviewed; then it is, with no code change", () => {
  assert.equal(prefillRange(creatinine, "female", "mg/dL"), null);
  assert.deepEqual(prefillRange({ ...creatinine, reviewed: true }, "female", "mg/dL"), { low: 0.59, high: 1.04 });
});

test("'no standard range' for threshold markers always; for others once reviewed", () => {
  assert.equal(noStandardRange(hba1c, "female", "%"), true);
  assert.equal(noStandardRange(creatinine, "female", "mg/dL"), false);
  // Per-sex rows only and no sex on file: only said once the list is reviewed.
  assert.equal(noStandardRange(creatinine, null, "mg/dL"), false);
  assert.equal(noStandardRange({ ...creatinine, reviewed: true }, null, "mg/dL"), true);
});

test("a marker with no range row gets none (the threshold markers)", () => {
  assert.equal(catalogueRange(hba1c, "female", "%"), null);
});
