import { strict as assert } from "node:assert";
import { test } from "node:test";
import { combine, floorToFive, formatMeasured, laterThanNow, pickedInstant, timeParts } from "./measuredAt.ts";

// The frame's "now": Sep 28, 9:30 AM (local).
const now = new Date(2026, 8, 28, 9, 32, 10);

test("the field defaults to now in five-minute steps and reads like the frame", () => {
  const d = floorToFive(now);
  assert.deepEqual(timeParts(d), { hour: 9, minute: 30, meridiem: "AM" });
  assert.equal(formatMeasured(d), "Sep 28, 2026 · 9:30 AM");
  assert.deepEqual(timeParts(new Date(2026, 8, 28, 0, 5)), { hour: 12, minute: 5, meridiem: "AM" });
  assert.equal(combine("2026-09-28", { hour: 12, minute: 0, meridiem: "PM" }).getHours(), 12);
  assert.equal(combine("2026-09-28", { hour: 12, minute: 0, meridiem: "AM" }).getHours(), 0);
});

test("on today, later hours, minutes and PM are disabled; earlier days allow everything", () => {
  const t = { hour: 9, minute: 30, meridiem: "AM" as const };
  const today = laterThanNow("2026-09-28", t, now);
  assert.equal(today.hour(9), false);
  assert.equal(today.hour(10), true);
  assert.equal(today.hour(12), false, "12 AM is midnight, long past");
  assert.equal(today.minute(30), false);
  assert.equal(today.minute(35), true);
  assert.equal(today.meridiem("PM"), true);
  const earlier = laterThanNow("2026-09-27", t, now);
  assert.equal(earlier.hour(11) || earlier.minute(55) || earlier.meridiem("PM"), false);
});

test("a picked time past now is brought back to now", () => {
  assert.deepEqual(timeParts(pickedInstant("2026-09-28", { hour: 11, minute: 0, meridiem: "AM" }, now)), {
    hour: 9,
    minute: 30,
    meridiem: "AM",
  });
  assert.equal(pickedInstant("2026-09-27", { hour: 11, minute: 0, meridiem: "PM" }, now).getHours(), 23);
});
