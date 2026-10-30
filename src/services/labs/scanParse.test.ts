import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { CatalogueMarker } from "./catalogueLogic.ts";
import { acceptedUnit, markerForLabel, normaliseUnit, parseReport, readNumber, readRange, readReportDate } from "./scanParse.ts";

const mk = (key: string, displayName: string, aliases: string[], units: [string, number, number][]): CatalogueMarker => ({
  key,
  displayName,
  category: "x",
  canonicalUnit: units[0][0],
  reviewed: true,
  notes: null,
  remark: null,
  aliases,
  units: units.map(([unit, factor, offset]) => ({ unit, factor, offset })),
  ranges: [],
});

const LIST: CatalogueMarker[] = [
  mk("haemoglobin", "Haemoglobin", ["hb", "hgb", "hemoglobin", "haemoglobin"], [["g/dL", 1, 0], ["g/L", 0.1, 0], ["mmol/L", 1.61121, 0]]),
  mk("hba1c", "HbA1c", ["hba1c", "a1c", "glycated haemoglobin"], [["%", 1, 0], ["mmol/mol", 0.09148, 2.152]]),
  mk("total_cholesterol", "Total cholesterol", ["chol", "cholesterol", "total cholesterol"], [["mg/dL", 1, 0], ["mmol/L", 38.665, 0]]),
  mk("ldl_cholesterol", "LDL cholesterol", ["ldl", "ldl cholesterol", "ldl-c"], [["mg/dL", 1, 0], ["mmol/L", 38.665, 0]]),
  mk("white_cell_count", "White cell count", ["wbc", "white blood cells"], [["x10^9/L", 1, 0], ["x10^3/uL", 1, 0]]),
  mk("platelets", "Platelets", ["plt", "platelets", "platelet count"], [["x10^9/L", 1, 0], ["x10^3/uL", 1, 0]]),
  mk("vitamin_d", "Vitamin D (25-OH)", ["vitamin d", "25-oh vitamin d", "25(oh)d"], [["ng/mL", 1, 0], ["nmol/L", 0.4006, 0]]),
  mk("vitamin_b12", "Vitamin B12", ["b12", "vitamin b12", "cobalamin"], [["pg/mL", 1, 0], ["pmol/L", 1.355, 0]]),
  mk("tsh", "TSH", ["tsh", "thyrotropin"], [["mIU/L", 1, 0], ["uIU/mL", 1, 0]]),
];

test("numbers: decimal comma, thousands comma, OCR's O for 0", () => {
  assert.equal(readNumber("13.5"), 13.5);
  assert.equal(readNumber("13,5"), 13.5);
  assert.equal(readNumber("250,000"), 250000);
  assert.equal(readNumber("1O.2"), 10.2);
  assert.equal(readNumber("abc"), null);
  // A dropped decimal point after a leading zero.
  assert.equal(readNumber("06"), 0.6);
  assert.equal(readNumber("0"), 0);
});

test("units are compared in one spelling", () => {
  assert.equal(normaliseUnit("x10³/µL"), "10^3/ul");
  assert.equal(normaliseUnit("10*9/L"), "10^9/l");
  const wbc = LIST.find((m) => m.key === "white_cell_count")!;
  assert.equal(acceptedUnit(wbc, "K/uL"), "x10^3/uL");
  assert.equal(acceptedUnit(wbc, "10^9/L"), "x10^9/L");
  const hb = LIST[0];
  assert.equal(acceptedUnit(hb, "g/dl"), "g/dL");
  // Not a unit the list accepts for haemoglobin: never assumed.
  assert.equal(acceptedUnit(hb, "mg/dL"), null);
});

test("ranges: two-sided, under, over", () => {
  assert.deepEqual(readRange(" g/dL (12.0 - 15.5)"), { low: 12, high: 15.5 });
  assert.deepEqual(readRange(" % < 5.7"), { low: null, high: 5.7 });
  assert.deepEqual(readRange(" mg/dL > 40"), { low: 40, high: null });
  assert.deepEqual(readRange(" mg/dL"), { low: null, high: null });
});

test("the longest list name wins, as whole words", () => {
  assert.equal(markerForLabel("LDL Cholesterol (calc)", LIST)?.key, "ldl_cholesterol");
  assert.equal(markerForLabel("Cholesterol, total", LIST)?.key, "total_cholesterol");
  assert.equal(markerForLabel("HbA1c", LIST)?.key, "hba1c");
  assert.equal(markerForLabel("Patient name", LIST), null);
});

test("a report reads into results, the date and the lines it couldn't match", () => {
  const text = [
    "ACME LABORATORIES",
    "Patient: R. Haddad   Collected: 12/08/2026   Printed: 14/08/2026",
    "Test Result Unit Reference",
    "Hemoglobin 13.5 g/dL 12.0 - 15.5",
    "WBC 6,2 K/uL 4.0-11.0",
    "Platelets 250 x10^9/L 150 - 450",
    "HbA1c 5.6% < 5.7",
    "LDL Cholesterol 3.1 mmol/L",
    "Vitamin D 25-OH 32 ng/mL 30 - 100",
    "Vitamin B12 450 pg/mL",
    "TSH 2.1 H uIU/mL (0.5-4.5)",
    "Ferritin 80 ng/mL 15 - 150",
    "Hemoglobin 99 g/dL",
  ].join("\n");
  const r = parseReport(text, LIST, "2026-10-30");
  assert.equal(r.date, "2026-08-12");
  const by = Object.fromEntries(r.results.map((x) => [x.markerKey, x]));
  assert.deepEqual(
    r.results.map((x) => x.markerKey),
    ["haemoglobin", "white_cell_count", "platelets", "hba1c", "ldl_cholesterol", "vitamin_d", "vitamin_b12", "tsh"]
  );
  assert.equal(by.haemoglobin.value, 13.5);
  assert.equal(by.haemoglobin.unit, "g/dL");
  assert.equal(by.haemoglobin.rangeLow, 12);
  assert.equal(by.haemoglobin.rangeHigh, 15.5);
  assert.equal(by.white_cell_count.value, 6.2);
  assert.equal(by.white_cell_count.unit, "x10^3/uL");
  assert.equal(by.hba1c.value, 5.6);
  assert.equal(by.hba1c.unit, "%");
  assert.equal(by.hba1c.rangeHigh, 5.7);
  assert.equal(by.ldl_cholesterol.unit, "mmol/L");
  assert.equal(by.vitamin_d.value, 32);
  assert.equal(by.vitamin_b12.value, 450);
  assert.equal(by.tsh.value, 2.1);
  assert.equal(by.tsh.unit, "uIU/mL");
  assert.equal(by.tsh.rangeLow, 0.5);
  // Ferritin isn't on this list: left for the member to type. A line with
  // only a date isn't a result.
  assert.ok(r.unmatched.some((l) => l.startsWith("Ferritin")));
  assert.ok(!r.unmatched.some((l) => l.startsWith("Patient")));
  // The second haemoglobin line doesn't replace the first.
  assert.equal(by.haemoglobin.value, 13.5);
});

test("a unit the list doesn't accept for the marker is left blank, with what was printed", () => {
  const r = parseReport("Hemoglobin 13.5 mg/dL", LIST, "2026-10-30");
  assert.equal(r.results[0].unit, null);
  assert.equal(r.results[0].printedUnit, "mg/dL");
});

test("what the reader makes of print: a caret, a capital I, a dropped decimal point", () => {
  const r = parseReport(['WBC 6.2 x10"9/L 4.0-11.0', "TSH 2.1 mlU/L 05-45", "HbA1c 56 % <5.7", "Platelets 265 x1079/L 150 - 450"].join("\n"), LIST, "2026-10-30");
  const by = Object.fromEntries(r.results.map((x) => [x.markerKey, x]));
  assert.equal(by.white_cell_count.unit, "x10^9/L");
  assert.equal(by.tsh.unit, "mIU/L");
  assert.equal(by.tsh.check, false);
  assert.equal(by.tsh.rangeLow, 0.5);
  assert.equal(by.platelets.unit, "x10^9/L");
  // "0.5 - 4.5" read as "05-45": the upper limit is flagged for checking.
  assert.equal(by.tsh.checkRange, true);
  assert.equal(by.platelets.checkRange, false);
  // 56 against "< 5.7": flagged for checking, never changed.
  assert.equal(by.hba1c.value, 56);
  assert.equal(by.hba1c.check, true);
});

test("dates: day first, named months, ISO; never a future date", () => {
  assert.equal(readReportDate("Date 2026-07-01", "2026-10-30"), "2026-07-01");
  assert.equal(readReportDate("Sampled 3 Sep 2026", "2026-10-30"), "2026-09-03");
  assert.equal(readReportDate("Sep 3, 2026", "2026-10-30"), "2026-09-03");
  assert.equal(readReportDate("Next visit 12/12/2026", "2026-10-30"), null);
});
