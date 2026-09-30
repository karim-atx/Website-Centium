import { strict as assert } from "node:assert";
import { test } from "node:test";
import { trendTicks } from "./chartTicks.ts";

test("three round ticks spanning the data, as the WO16 frame shows", () => {
  assert.deepEqual(trendTicks([97.8, 97.2, 97.2, 96]), [96, 97, 98]);
  assert.deepEqual(trendTicks([96]), [95, 96, 97]);
  assert.deepEqual(trendTicks([90, 99.5]), [90, 95, 100]);
  assert.deepEqual(trendTicks([90, 99]), [90, 95, 100], "an odd span widens so the middle tick is round");
});
