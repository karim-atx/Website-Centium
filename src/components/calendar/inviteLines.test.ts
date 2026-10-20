import { test } from "node:test";
import assert from "node:assert/strict";
import { monthReminderLine, packLine, reminderLine, reminderPhrase } from "./inviteLines.ts";

test("CU7 card and Month lines as the frames write them", () => {
  assert.equal(reminderLine("Alex", "hour_1", "none"), "Alex reminds you 1 h before");
  assert.equal(monthReminderLine("Alex", "hour_1", "none"), "Reminder 1 h before · from Alex");
  assert.equal(packLine("$60", 6), "$60 from your session pack · 6 left");
});

test("no reminder set gives no line", () => {
  assert.equal(reminderPhrase("none", "none"), null);
  assert.equal(reminderLine("Alex", "none", "none"), null);
  assert.equal(monthReminderLine("Alex", "none", "none"), null);
});

test("two reminders, the earlier first, either slot", () => {
  assert.equal(reminderPhrase("hour_1", "day_1"), "1 day and 1 h before");
  assert.equal(reminderPhrase("day_1", "hour_1"), "1 day and 1 h before");
  assert.equal(monthReminderLine("Alex", "hour_1", "day_1"), "Reminders 1 day and 1 h before · from Alex");
  assert.equal(reminderPhrase("none", "min_30"), "30 min before");
});

test("the same reminder twice reads once", () => {
  assert.equal(reminderPhrase("hour_2", "hour_2"), "2 h before");
  assert.equal(monthReminderLine("Alex", "hour_2", "hour_2"), "Reminder 2 h before · from Alex");
});

test("at the start", () => {
  assert.equal(reminderPhrase("at_time", "none"), "at the start");
  assert.equal(reminderPhrase("at_time", "hour_1"), "1 h before and at the start");
});

test("a pack session without a price", () => {
  assert.equal(packLine("", 0), "From your session pack · 0 left");
});
