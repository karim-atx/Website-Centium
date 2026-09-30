import { strict as assert } from "node:assert";
import { test } from "node:test";
import { widgetColumns, widgetSpans, withFixedSize } from "./widgetGrid.ts";

test("widgetColumns is 2 below 400 and 3 from 400", () => {
  assert.equal(widgetColumns(360), 2);
  assert.equal(widgetColumns(393), 2);
  assert.equal(widgetColumns(399), 2);
  assert.equal(widgetColumns(400), 3);
  assert.equal(widgetColumns(430), 3);
});

test("widgetSpans fills whole rows and stretches the partial row at the end", () => {
  assert.deepEqual(widgetSpans(["small", "small", "small"], 2), [3, 3, 6]);
  assert.deepEqual(widgetSpans(["small", "small", "small"], 3), [2, 2, 2]);
  assert.deepEqual(widgetSpans(["small", "small", "small", "small"], 3), [2, 2, 2, 6]);
  assert.deepEqual(widgetSpans(["small", "small", "small", "small", "small"], 3), [2, 2, 2, 3, 3]);
});

test("widgetSpans gives large widgets the full row and stretches a partial row before one", () => {
  assert.deepEqual(widgetSpans(["small", "large", "small", "small"], 3), [6, 6, 3, 3]);
  assert.deepEqual(widgetSpans(["small", "small", "small", "large", "small"], 2), [3, 3, 6, 6, 6]);
  assert.deepEqual(widgetSpans(["large", "large"], 2), [6, 6]);
  assert.deepEqual(widgetSpans([], 3), []);
});

test("withFixedSize keeps Water and Food large and leaves the rest alone (decision 7)", () => {
  assert.equal(withFixedSize({ type: "water", size: "small" }).size, "large");
  assert.equal(withFixedSize({ type: "nutrition", size: "small" }).size, "large");
  assert.equal(withFixedSize({ type: "steps", size: "small" }).size, "small");
  assert.equal(withFixedSize({ type: "sleep", size: "large" }).size, "large");
});
