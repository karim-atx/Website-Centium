import { test } from "node:test";
import assert from "node:assert/strict";
import {
  describeNotificationError,
  describeQuietWindow,
  inQuietWindow,
  NOTIFICATION_COLUMNS,
  NOTIFICATION_SELECT,
  notificationPatchToRow,
  rowToNotificationPrefs,
  SAME_QUIET_TIME_MESSAGE,
  sameQuietTime,
  toHhmm,
  wrapsMidnight,
} from "./notifications";
import { OFFLINE_MESSAGE } from "../network-error";

// The database's own defaults (20261031000000), as PostgREST returns them.
const DEFAULT_ROW = {
  notification_allow: true,
  notification_meal_reminders: true,
  notification_workout_reminders: true,
  notification_water: true,
  notification_habits: true,
  notification_journal: true,
  notification_streak_alerts: true,
  notification_weekly_summary: true,
  notification_forum_replies: true,
  notification_mentions: true,
  notification_professional_messages: true,
  notification_calendar_events: true,
  notification_memberships: true,
  notification_referral_rewards: true,
  quiet_hours_enabled: false,
  quiet_hours_from: "22:00:00",
  quiet_hours_to: "07:00:00",
};

test("every MO1.8.3 row has its contract column, and the select names all seventeen", () => {
  assert.equal(Object.keys(NOTIFICATION_COLUMNS).length, 17);
  assert.deepEqual(new Set(Object.values(NOTIFICATION_COLUMNS)), new Set(Object.keys(DEFAULT_ROW)));
  assert.equal(NOTIFICATION_SELECT.split(", ").length, 17);
  assert.ok(!NOTIFICATION_SELECT.includes("notification_reviews"), "reviews is not on MO1.8.3");
});

test("a row maps to the screen's values, times as HH:MM", () => {
  const p = rowToNotificationPrefs(DEFAULT_ROW);
  assert.ok(p);
  assert.equal(p.allow, true);
  assert.equal(p.water, true);
  assert.equal(p.quietHoursEnabled, false);
  assert.equal(p.quietHoursFrom, "22:00");
  assert.equal(p.quietHoursTo, "07:00");
  assert.equal(rowToNotificationPrefs({ ...DEFAULT_ROW, notification_journal: false })?.journal, false);
});

test("a missing or malformed column is not filled in with a guess", () => {
  const { notification_water: _drop, ...noWater } = DEFAULT_ROW;
  assert.equal(rowToNotificationPrefs(noWater), null);
  assert.equal(rowToNotificationPrefs({ ...DEFAULT_ROW, notification_allow: null }), null);
  assert.equal(rowToNotificationPrefs({ ...DEFAULT_ROW, quiet_hours_to: "7am" }), null);
  assert.equal(rowToNotificationPrefs(null), null);
});

test("a patch names only its own columns", () => {
  assert.deepEqual(notificationPatchToRow({ water: false }), { notification_water: false });
  assert.deepEqual(notificationPatchToRow({ allow: false }), { notification_allow: false });
  assert.deepEqual(notificationPatchToRow({ quietHoursFrom: "21:30:00", quietHoursEnabled: true }), {
    quiet_hours_enabled: true,
    quiet_hours_from: "21:30",
  });
  assert.deepEqual(notificationPatchToRow({}), {});
});

test("time normalising", () => {
  assert.equal(toHhmm("07:00:00"), "07:00");
  assert.equal(toHhmm("7:05"), "07:05");
  assert.equal(toHhmm("23:59:59.5"), "23:59");
  assert.equal(toHhmm("24:00"), null);
  assert.equal(toHhmm(700), null);
});

test("quiet hours: same time refused, the window wraps midnight", () => {
  assert.equal(sameQuietTime("22:00", "22:00"), true);
  assert.equal(sameQuietTime("22:00", "07:00"), false);
  assert.equal(wrapsMidnight("22:00", "07:00"), true);
  assert.equal(wrapsMidnight("09:00", "17:00"), false);

  // 22:00-07:00 is "at or after 22:00 OR before 07:00", never a plain range.
  assert.equal(inQuietWindow("23:30", "22:00", "07:00"), true);
  assert.equal(inQuietWindow("03:00", "22:00", "07:00"), true);
  assert.equal(inQuietWindow("22:00", "22:00", "07:00"), true, "From is inclusive");
  assert.equal(inQuietWindow("07:00", "22:00", "07:00"), false, "To is exclusive");
  assert.equal(inQuietWindow("12:00", "22:00", "07:00"), false);
  // A window inside one day is the ordinary comparison.
  assert.equal(inQuietWindow("12:00", "09:00", "17:00"), true);
  assert.equal(inQuietWindow("20:00", "09:00", "17:00"), false);

  assert.match(describeQuietWindow("22:00", "07:00"), /from 22:00 until 07:00 the next morning/);
  assert.doesNotMatch(describeQuietWindow("09:00", "17:00"), /next morning/);
});

test("errors read as sentences", () => {
  assert.equal(describeNotificationError({ code: "23514", message: "check" }), SAME_QUIET_TIME_MESSAGE);
  assert.match(describeNotificationError({ code: "42501", message: "denied" }), /session expired/);
  assert.equal(describeNotificationError(new TypeError("Failed to fetch")), OFFLINE_MESSAGE);
  assert.equal(describeNotificationError({ code: "XX000", message: "boom" }), "Couldn't save that. Try again.");
  assert.equal(describeNotificationError({ code: "XX000", message: "boom" }, true), "Couldn't load your notification settings.");
});
