import { test } from "node:test";
import assert from "node:assert/strict";
import { ALERT_OPTIONS, alertLabel, alertNeedsWrite, toEventAlert } from "./eventAlert.ts";

test("the eleven alert options MO1.6.4.2 lists, None first, 1 week before last", () => {
  assert.equal(ALERT_OPTIONS.length, 11);
  assert.deepEqual(
    ALERT_OPTIONS.map((o) => o.label),
    [
      "None",
      "At time of event",
      "5 minutes before",
      "10 minutes before",
      "15 minutes before",
      "30 minutes before",
      "1 hour before",
      "2 hours before",
      "1 day before",
      "2 days before",
      "1 week before",
    ]
  );
});

test("each option maps to the calendar_alert enum value, in the enum's order (HANDOVER_API Stage 2)", () => {
  // enum_range(null::public.calendar_alert) on the local stack.
  assert.deepEqual(
    ALERT_OPTIONS.map((o) => o.value),
    ["none", "at_time", "min_5", "min_10", "min_15", "min_30", "hour_1", "hour_2", "day_1", "day_2", "week_1"]
  );
  assert.equal(alertLabel("min_15"), "15 minutes before");
  assert.equal(alertLabel("week_1"), "1 week before");
});

test("a stored value reads back as itself; null or unknown reads as None", () => {
  for (const o of ALERT_OPTIONS) assert.equal(toEventAlert(o.value), o.value);
  assert.equal(toEventAlert(null), "none");
  assert.equal(toEventAlert(undefined), "none");
  assert.equal(toEventAlert("min_45"), "none");
  assert.equal(alertLabel(toEventAlert(null)), "None");
});

test("the alert gets its own write only when the sheet's choice differs from the saved row", () => {
  // A new row comes back at the column default 'none'.
  assert.equal(alertNeedsWrite("none", "min_15"), true);
  assert.equal(alertNeedsWrite("none", "none"), false);
  // Edits: unchanged is no write; switching back to None is a write.
  assert.equal(alertNeedsWrite("day_1", "day_1"), false);
  assert.equal(alertNeedsWrite("day_1", "none"), true);
  // A caller that didn't say (the local-event upload) never writes.
  assert.equal(alertNeedsWrite("week_1", undefined), false);
});
