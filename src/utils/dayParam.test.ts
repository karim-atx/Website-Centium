import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dayParam } from "./dayParam.ts";

// Batch D GA · ?day= on /app/calendar and /app/business/calendar.

test("a real YYYY-MM-DD opens that day and its month (0-based)", () => {
  assert.deepEqual(dayParam("2026-11-13"), { iso: "2026-11-13", year: 2026, month: 10 });
  assert.deepEqual(dayParam("2027-01-01"), { iso: "2027-01-01", year: 2027, month: 0 });
  assert.deepEqual(dayParam("2026-12-31"), { iso: "2026-12-31", year: 2026, month: 11 });
  // Leap day only in a leap year.
  assert.deepEqual(dayParam("2028-02-29"), { iso: "2028-02-29", year: 2028, month: 1 });
  assert.equal(dayParam("2026-02-29"), null);
});

test("anything else is ignored", () => {
  for (const bad of [null, undefined, "", "today", "2026-1-5", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "2026-11-00", "2026-11-13T00:00", " 2026-11-13", "20261113"]) {
    assert.equal(dayParam(bad), null, String(bad));
  }
});
