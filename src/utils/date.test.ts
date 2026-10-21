import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatShortDate } from "./date.ts";

test("formatShortDate writes September as Sep, like every frame", () => {
  const d = new Date(2026, 8, 27);
  assert.equal(formatShortDate(d, { day: "numeric", month: "short" }), "Sep 27");
  assert.equal(formatShortDate(d, { day: "numeric", month: "short", year: "numeric" }), "Sep 27, 2026");
  // Another locale passed in explicitly still gets the three-letter month.
  assert.equal(formatShortDate(d, { day: "numeric", month: "short" }, "en-GB"), "27 Sep");
});

test("formatShortDate defaults to month first", () => {
  const d = new Date(2026, 9, 21);
  assert.equal(formatShortDate(d, { day: "numeric", month: "short" }), "Oct 21");
  assert.equal(formatShortDate(new Date(2026, 9, 2), { day: "numeric", month: "short" }), "Oct 2");
  assert.equal(formatShortDate(d, { day: "numeric", month: "short", year: "numeric" }), "Oct 21, 2026");
  assert.equal(formatShortDate(d, { weekday: "short", day: "numeric", month: "short" }), "Wed, Oct 21");
});
