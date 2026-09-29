import { strict as assert } from "node:assert";
import { test } from "node:test";
import { perSideKg, plateBreakdown } from "./plates";

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
