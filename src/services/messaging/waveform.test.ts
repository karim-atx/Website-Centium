import { strict as assert } from "node:assert";
import { test } from "node:test";
import { levelsFromSamples } from "./waveform";

test("levels are 0..100, loudest bucket 100, silence floored at 4", () => {
  const s = new Float32Array(400);
  for (let i = 100; i < 200; i++) s[i] = 0.5;
  for (let i = 200; i < 300; i++) s[i] = 0.25;
  const levels = levelsFromSamples(s, 4);
  assert.deepEqual(levels, [4, 100, 50, 4]);
});

test("empty or all-silent input gives nothing to draw rather than NaN", () => {
  assert.deepEqual(levelsFromSamples(new Float32Array(0), 10), []);
  assert.deepEqual(levelsFromSamples(new Float32Array(20), 4), [0, 0, 0, 0]);
});
