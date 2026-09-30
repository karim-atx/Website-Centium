import { strict as assert } from "node:assert";
import { test } from "node:test";
import { trendTicks } from "./chartTicks.ts";

test("three round ticks covering the data, as the WO16 and WO19 frames show", () => {
  assert.deepEqual(trendTicks([97.8, 97.2, 97.2, 96]), [96, 97, 98]);
  assert.deepEqual(trendTicks([83.9, 86, 86, 87.5, 88.5, 90, 93]), [80, 88, 96]);
  assert.deepEqual(trendTicks([96]), [96, 97, 98]);
  assert.deepEqual(trendTicks([90, 99.5]), [90, 95, 100]);
  assert.deepEqual(trendTicks([150, 203]), [150, 200, 250]);
});
