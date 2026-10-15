import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatShortDate } from "./date.ts";

test("formatShortDate writes September as Sep, like every frame", () => {
  const d = new Date(2026, 8, 27);
  assert.equal(formatShortDate(d, { day: "numeric", month: "short" }), "27 Sep");
  assert.equal(formatShortDate(d, { day: "numeric", month: "short", year: "numeric" }), "27 Sep 2026");
  assert.equal(formatShortDate(new Date(2026, 9, 2), { day: "numeric", month: "short" }), "2 Oct");
});
