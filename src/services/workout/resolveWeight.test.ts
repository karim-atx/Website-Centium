import { strict as assert } from "node:assert";
import { test } from "node:test";
import { resolveWeight } from "./resolveWeight";

test("kg rounds to the nearest 2.5 (the migration's probe: 100 kg at 77.5% is 77.5)", () => {
  assert.equal(resolveWeight(100, 77.5), 77.5);
  assert.equal(resolveWeight(100, 80), 80);
  assert.equal(resolveWeight(52, 80), 42.5);
  assert.equal(resolveWeight(103, 80), 82.5);
});

test("lb rounds to the nearest 5 (the probe: 225 lb at 80% is 180)", () => {
  assert.equal(resolveWeight(225, 80, "lb"), 180);
  assert.equal(resolveWeight(231, 70, "lb"), 160);
});

test("a half step rounds up, like Postgres round() on a positive numeric", () => {
  // 105 × 50% = 52.5 → 52.5 / 2.5 = 21 exactly; 101 × 50% = 50.5 → 20.2 → 50
  assert.equal(resolveWeight(101, 50), 50);
  // 1.25 / 2.5 = 0.5 → 1 step
  assert.equal(resolveWeight(2.5, 50), 2.5);
});

test("missing or non-positive inputs give null, as the SQL does", () => {
  assert.equal(resolveWeight(null, 80), null);
  assert.equal(resolveWeight(100, null), null);
  assert.equal(resolveWeight(0, 80), null);
  assert.equal(resolveWeight(100, 0), null);
  assert.equal(resolveWeight(-5, 80), null);
});
