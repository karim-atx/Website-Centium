import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mondayOf, presetRange, previousOf, rangeLine } from "./analyticsRange.ts";

test("analyticsRange: weeks start on Monday", () => {
  assert.equal(mondayOf("2026-10-14"), "2026-10-12");
  assert.equal(mondayOf("2026-10-18"), "2026-10-12");
  assert.equal(mondayOf("2026-10-12"), "2026-10-12");
});

test("analyticsRange: presets end today (This week is Monday to Sunday)", () => {
  const four = presetRange("4w", "2026-10-05");
  assert.equal(four.from, "2026-09-08");
  assert.equal(four.to, "2026-10-05");
  const week = presetRange("week", "2026-10-14");
  assert.equal(week.from, "2026-10-12");
  assert.equal(week.to, "2026-10-18");
});

test("analyticsRange: the range line and the previous period", () => {
  assert.equal(rangeLine(presetRange("4w", "2026-10-05"), "2026-10-05"), "8 Sep to 5 Oct, compared with the 4 weeks before");
  const custom = { key: "custom" as const, from: "2026-09-14", to: "2026-09-27", compare: true };
  assert.deepEqual(previousOf(custom), { from: "2026-08-31", to: "2026-09-13" });
  assert.equal(rangeLine(custom, "2026-10-05"), "14 Sep to 27 Sep, compared with 31 Aug to 13 Sep");
  assert.equal(rangeLine({ ...custom, compare: false }, "2026-10-05"), "14 Sep to 27 Sep");
});
