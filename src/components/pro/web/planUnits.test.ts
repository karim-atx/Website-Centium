import { test } from "node:test";
import assert from "node:assert/strict";
import { convertUnit, unitOptions } from "./planUnits";

test("plan unit menu: grams only for a food whose serving states its gram weight", () => {
  assert.deepEqual(unitOptions(true, 156), ["g", "serving"]);
  assert.deepEqual(unitOptions(true, null), ["serving"]);
  assert.deepEqual(unitOptions(false, 156), ["serving"]);
});

test("plan unit menu: the same portion in the other unit", () => {
  assert.deepEqual(convertUnit({ grams: null, servings: 2 }, 156, "g"), { grams: 312, servings: null });
  assert.deepEqual(convertUnit({ grams: 78, servings: null }, 156, "serving"), { grams: null, servings: 0.5 });
  assert.deepEqual(convertUnit({ grams: 60, servings: null }, 156, "g"), { grams: 60, servings: null });
  assert.deepEqual(convertUnit({ grams: null, servings: 1 }, null, "g"), { grams: null, servings: 1 });
});
