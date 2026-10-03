import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EDIT_TAP_LOCK_MS, createEditTapGuard, widgetColumns, widgetSpans } from "./widgetGrid.ts";

test("widgetColumns is 2 below 400 and 3 from 400", () => {
  assert.equal(widgetColumns(360), 2);
  assert.equal(widgetColumns(393), 2);
  assert.equal(widgetColumns(399), 2);
  assert.equal(widgetColumns(400), 3);
  assert.equal(widgetColumns(430), 3);
});

test("a small widget is always one column wide, even alone in its row", () => {
  assert.deepEqual(widgetSpans(["small", "small", "small"], 2), [3, 3, 3]);
  assert.deepEqual(widgetSpans(["small", "small", "small"], 3), [2, 2, 2]);
  assert.deepEqual(widgetSpans(["small", "small", "small", "small"], 3), [2, 2, 2, 2]);
});

test("a large widget takes the full row; the small next to it does not stretch", () => {
  assert.deepEqual(widgetSpans(["small", "large", "small", "small"], 3), [2, 6, 2, 2]);
  assert.deepEqual(widgetSpans(["large", "small", "large"], 2), [6, 3, 6]);
  assert.deepEqual(widgetSpans(["small", "small", "small", "large", "small"], 2), [3, 3, 3, 6, 3]);
  assert.deepEqual(widgetSpans(["large", "large"], 2), [6, 6]);
  assert.deepEqual(widgetSpans([], 3), []);
});

test("after a resize, every edit control ignores taps until the board has settled", () => {
  const guard = createEditTapGuard();
  assert.equal(guard.allowed(1000), true);
  guard.resized(1000);
  // rapid repeat taps land wherever the reflow put something: all ignored
  for (const t of [1050, 1200, 1499]) assert.equal(guard.allowed(t), false);
  assert.equal(guard.allowed(1000 + EDIT_TAP_LOCK_MS), true);
});
