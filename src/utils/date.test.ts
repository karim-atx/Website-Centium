import { strict as assert } from "node:assert";
import { test } from "node:test";
import { detailDate, formatShortDate } from "./date.ts";

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

test("detailDate: an ISO date from a refusal's details, month first", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  assert.equal(detailDate("2026-10-09", now), "Oct 9");
  assert.equal(detailDate("2026-10-09T18:30:00+00:00", now), "Oct 9");
  assert.equal(detailDate("until 2027-01-04", now), "Jan 4, 2027");
  assert.equal(detailDate("2026-09-05", now), "Sep 5");
  assert.equal(detailDate(null, now), null);
  assert.equal(detailDate("no date here", now), null);
});
