import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  GROUP_LABEL,
  MEASUREMENT_SITES,
  MEASUREMENT_TYPES,
  RANGE,
  checkValue,
  isMeasurementType,
  siteFor,
} from "./sites.ts";

// The client-side mirror of health_metrics_measurement_range_check. Each case
// names the mistake class the SQL comment says the bounds exist to catch, so a
// drift between the two has somewhere to be noticed.

test("every site the database knows has a label, a group and a unit", () => {
  assert.equal(MEASUREMENT_SITES.length, 14, "the enum gained exactly fourteen types");
  for (const site of MEASUREMENT_SITES) {
    assert.ok(site.label.length > 0, site.type);
    assert.ok(GROUP_LABEL[site.group], site.type);
    assert.ok(site.unit === "cm" || site.unit === "%", site.type);
  }
});

test("exactly one site is a percentage, and it is body fat", () => {
  const pct = MEASUREMENT_SITES.filter((s) => s.unit === "%");
  assert.deepEqual(
    pct.map((s) => s.type),
    ["body_fat_pct"]
  );
});

test("the types list and the sites agree", () => {
  assert.deepEqual(MEASUREMENT_TYPES, MEASUREMENT_SITES.map((s) => s.type));
  assert.equal(siteFor("waist")?.label, "Waist");
  assert.equal(isMeasurementType("waist"), true);
  assert.equal(isMeasurementType("weight"), false, "weight is its own thing with its own consent");
  assert.equal(isMeasurementType("nonsense"), false);
});

// --- the ranges --------------------------------------------------------------

test("an ordinary reading passes", () => {
  assert.equal(checkValue("waist", 81), null);
  assert.equal(checkValue("arm_left", 34.5), null);
  assert.equal(checkValue("body_fat_pct", 18), null);
});

test("the bounds themselves are inside the range, not outside it", () => {
  assert.equal(checkValue("waist", RANGE.cm.min), null);
  assert.equal(checkValue("waist", RANGE.cm.max), null);
  assert.equal(checkValue("body_fat_pct", RANGE["%"].min), null);
  assert.equal(checkValue("body_fat_pct", RANGE["%"].max), null);
});

test("a body fat FRACTION is refused, which is what the floor of 2 is for", () => {
  assert.match(checkValue("body_fat_pct", 0.18) ?? "", /between 2% and 75%/);
});

test("a millimetre entry and a decimal slip are refused", () => {
  assert.ok(checkValue("waist", 810), "810 cm is a millimetre reading");
  assert.ok(checkValue("chest", 9), "9 cm is a decimal slip or an inch reading");
});

test("an empty field coerced to zero is refused rather than stored", () => {
  assert.ok(checkValue("hips", 0));
  assert.ok(checkValue("body_fat_pct", 0));
});

test("a negative never reaches the column", () => {
  assert.ok(checkValue("thigh_left", -40));
});

test("something that is not a number says so", () => {
  assert.match(checkValue("neck", Number.NaN) ?? "", /doesn't look like a number/);
  assert.match(checkValue("neck", Number.POSITIVE_INFINITY) ?? "", /doesn't look like a number/);
});

// The constraint is DELIBERATELY loose — a child's forearm and a very large
// waist are both real, and being told your own body is invalid by a form is
// worse than an outlier on a chart.
test("an unusual but real body is not refused", () => {
  assert.equal(checkValue("forearm_left", 15), null, "a child's forearm");
  assert.equal(checkValue("waist", 160), null, "a very large waist");
  assert.equal(checkValue("body_fat_pct", 3), null, "contest week");
  assert.equal(checkValue("body_fat_pct", 62), null);
});

test("the message names the site and its unit, so it can be acted on", () => {
  assert.match(checkValue("calf_right", 400) ?? "", /Right calf should be between 10 cm and 300 cm/);
});
