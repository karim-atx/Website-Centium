import { strict as assert } from "node:assert";
import { test } from "node:test";
import { percentFromRpe, weightFromRpe } from "./index.ts";

// WO23: "Calculation unchanged". The frame's example: 100 kg, 5 reps, RPE 8.
test("100 kg for 5 reps at RPE 8 suggests 83.7 kg, 83.7% of 1RM", () => {
  assert.equal(weightFromRpe(100, 5, 8), 83.7);
  assert.equal(percentFromRpe(5, 8), 83.7);
  assert.equal(Math.round(percentFromRpe(5, 8)), 84);
});

test("reps outside 1–10 clamp to the chart's edges", () => {
  assert.equal(percentFromRpe(0, 10), 100);
  assert.equal(percentFromRpe(15, 10), 79.1);
});
