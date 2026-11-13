import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  habitRemindersOff,
  isMissingReminderColumn,
  parseReminderTime,
  reminderFromMinutes,
  reminderMinutes,
  sameReminder,
} from "./reminder.ts";

test("the server's time column reads as HH:MM", () => {
  assert.equal(parseReminderTime("07:05:00"), "07:05");
  assert.equal(parseReminderTime("21:30:00.000"), "21:30");
  assert.equal(parseReminderTime("07:05"), "07:05");
  assert.equal(parseReminderTime("7:05"), "07:05");
  assert.equal(parseReminderTime("00:00:00"), "00:00");
});

test("no reminder is null", () => {
  assert.equal(parseReminderTime(null), null);
  assert.equal(parseReminderTime(undefined), null);
  assert.equal(parseReminderTime(""), null);
});

test("an unreadable time is null, never shown as set", () => {
  assert.equal(parseReminderTime("24:00"), null);
  assert.equal(parseReminderTime("12:60"), null);
  assert.equal(parseReminderTime("12:5"), null);
  assert.equal(parseReminderTime("12:05:61"), null);
  assert.equal(parseReminderTime("noon"), null);
  assert.equal(parseReminderTime(720), null);
});

test("minutes both ways", () => {
  assert.equal(reminderMinutes("07:05:00"), 425);
  assert.equal(reminderMinutes(null), null);
  assert.equal(reminderMinutes("bad"), null);
  assert.equal(reminderFromMinutes(425), "07:05");
  assert.equal(reminderFromMinutes(0), "00:00");
  assert.equal(reminderFromMinutes(1439), "23:59");
  assert.equal(reminderFromMinutes(1440), "00:00");
  assert.equal(reminderFromMinutes(-5), "23:55");
});

test("same reminder ignores seconds and treats none as equal to none", () => {
  assert.ok(sameReminder("07:05:00", "07:05"));
  assert.ok(sameReminder(null, undefined));
  assert.ok(!sameReminder(null, "07:05"));
  assert.ok(!sameReminder("07:05", "07:06"));
});

test("only an error naming reminder_time is the missing column", () => {
  assert.ok(isMissingReminderColumn({ code: "42703", message: "column habit_items.reminder_time does not exist" }));
  assert.ok(isMissingReminderColumn({ code: "PGRST204", message: "Could not find the 'reminder_time' column of 'habit_items' in the schema cache" }));
  assert.ok(isMissingReminderColumn({ code: "", message: "column \"reminder_time\" of relation \"habit_items\" does not exist" }));
  assert.ok(!isMissingReminderColumn({ code: "42703", message: "column habit_items.colour does not exist" }));
  assert.ok(!isMissingReminderColumn({ code: "42501", message: "permission denied for column reminder_time" }));
  assert.ok(!isMissingReminderColumn({ code: "PGRST301", message: "JWT expired" }));
  assert.ok(!isMissingReminderColumn(null));
});

test("why a habit reminder would not arrive", () => {
  const on = { allow: true, habits: true, remindersPaused: false };
  assert.equal(habitRemindersOff(on), null);
  assert.equal(habitRemindersOff({ ...on, allow: false }), "all");
  assert.equal(habitRemindersOff({ ...on, allow: false, remindersPaused: true, habits: false }), "all");
  assert.equal(habitRemindersOff({ ...on, remindersPaused: true }), "paused");
  assert.equal(habitRemindersOff({ ...on, habits: false }), "habits");
  assert.equal(habitRemindersOff(null), null);
});
