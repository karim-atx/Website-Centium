import { strict as assert } from "node:assert";
import { test } from "node:test";
import { LB_PLATES, nearestKgPlate, perSideKg, plateBreakdown, plateLoad } from "./plates";

test("90 kg on a 20 kg bar with 2.5 kg collars loads 32.5 kg a side", () => {
  assert.equal(perSideKg(90, 20, 2.5), 32.5);
});

test("the collar is one per sleeve, so it is subtracted twice", () => {
  // 100 − 20 − 2 × 5 = 70, 35 a side
  assert.equal(perSideKg(100, 20, 5), 35);
  // No collars: only the bar comes off.
  assert.equal(perSideKg(100, 20, 0), 40);
});

test("a working weight at or below bar + collars needs no plates", () => {
  assert.equal(perSideKg(20, 20, 2.5), 0);
  assert.equal(perSideKg(24, 20, 2.5), 0);
  assert.deepEqual(plateBreakdown(0).plates, []);
});

test("32.5 kg a side is 25 + 5 + 2.5, nothing left over", () => {
  assert.deepEqual(plateBreakdown(32.5), {
    plates: [
      { kg: 25, count: 1 },
      { kg: 5, count: 1 },
      { kg: 2.5, count: 1 },
    ],
    remainderKg: 0,
  });
});

test("an unloadable weight leaves a remainder", () => {
  // 101 − 20 − 5 = 76, 38 a side: 25 + 10 + 2.5 = 37.5, 0.5 short
  const { remainderKg } = plateBreakdown(perSideKg(101, 20, 2.5));
  assert.equal(remainderKg, 0.5);
});

test("plateLoad: 100 kg at 90% on a 20 kg bar with 2.5 kg collars", () => {
  const load = plateLoad(100, 90, 20, 2.5, "kg");
  assert.equal(load.working, 90);
  assert.equal(load.perSide, 32.5);
  assert.deepEqual(load.plates.map((p) => `${p.kg}x${p.count}`), ["25x1", "5x1", "2.5x1"]);
  assert.equal(load.loaded, 90);
  assert.equal(load.closest, null);
});

test("plateLoad: an unloadable target loads the closest LOWER weight", () => {
  // 91 − 20 − 5 = 66, 33 a side: 25 + 5 + 2.5 = 32.5, 0.5 short a side.
  const load = plateLoad(91, 100, 20, 2.5, "kg");
  assert.equal(load.perSide, 32.5);
  assert.equal(load.loaded, 90);
  assert.equal(load.closest, 90);
});

test("plateLoad: the bar alone is 'bar only' (no plates)", () => {
  const load = plateLoad(20, 100, 20, 0, "kg");
  assert.equal(load.perSide, 0);
  assert.deepEqual(load.plates, []);
  assert.equal(load.closest, null);
});

test("plateLoad in lb uses the lb plate set", () => {
  // 225 lb on a 45 lb bar, no collars: 90 a side = 45 + 45.
  const load = plateLoad(225, 100, 45, 0, "lb");
  assert.deepEqual(load.plates.map((p) => `${p.kg}x${p.count}`), ["45x2"]);
  assert.equal(load.loaded, 225);
});

test("lb plates are drawn in the nearest kg plate's colour", () => {
  assert.deepEqual(LB_PLATES.map(nearestKgPlate), [20, 15, 10, 5, 2.5, 1.25]);
});
