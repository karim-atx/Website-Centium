// Release 3 W4: the calendar's pure parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dateRange,
  dayBounds,
  dayDate,
  fieldDate,
  groupTimeOff,
  isoWeekday,
  offBands,
  remindersLabel,
  repeatOf,
  slotWindows,
  timeOffDates,
  weeklyDates,
  workingWindows,
} from "./calendarModel";

test("weekdays are ISO (Monday 1, Sunday 7) and labels are Monday-first copy", () => {
  assert.equal(isoWeekday("2026-10-12"), 1);
  assert.equal(isoWeekday("2026-10-18"), 7);
  assert.equal(dayDate("2026-10-08"), "Thu 8 Oct");
  assert.equal(fieldDate("2026-10-08"), "Thu 8 Oct 2026");
  assert.equal(dateRange("2026-10-05", "2026-10-11"), "5 Oct to 11 Oct, 2026");
  assert.equal(dateRange("2026-12-28", "2027-01-03"), "28 Dec, 2026 to 3 Jan, 2027");
});

test("working windows read only pro-wide rows; off bands fill the rest of the timeline", () => {
  const rows = [
    { businessId: null, weekday: 4, start: "08:00", end: "18:30" },
    { businessId: "b1", weekday: 4, start: "07:00", end: "13:00" },
  ];
  assert.deepEqual(workingWindows(rows, "2026-10-08"), [{ start: "08:00", end: "18:30" }]);
  assert.deepEqual(workingWindows(rows, "2026-10-09"), []);
  assert.deepEqual(offBands([{ start: "08:00", end: "18:30" }], 7, 20), [
    { start: 420, end: 480 },
    { start: 1110, end: 1200 },
  ]);
  assert.deepEqual(offBands([], 7, 20), [{ start: 420, end: 1200 }]);
  assert.deepEqual(dayBounds([{ start: "06:30", end: "21:15" }]), { from: 6, to: 22 });
  assert.deepEqual(dayBounds([]), { from: 7, to: 20 });
});

test("the engine's 15-minute starts merge into open windows", () => {
  const at = (h: number, m: number) => new Date(2026, 9, 16, h, m).toISOString();
  const slots = [
    { startsAt: at(8, 0), endsAt: at(9, 0) },
    { startsAt: at(8, 15), endsAt: at(9, 15) },
    { startsAt: at(14, 0), endsAt: at(15, 0) },
  ];
  assert.deepEqual(slotWindows(slots)["2026-10-16"], [
    { start: "08:00", end: "09:15" },
    { start: "14:00", end: "15:00" },
  ]);
});

test("time off rows written together are one entry, with the repeat read back", () => {
  const row = (id: string, date: string, createdAt = "t1") => ({ id, businessId: null, date, start: "12:00", end: "12:45", reason: "Lunch", createdAt });
  const weekdays = timeOffDates("2026-10-08", "weekdays", "2026-10-14");
  assert.deepEqual(weekdays, ["2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14"]);
  const entries = groupTimeOff([...weekdays.map((d, i) => row(`w${i}`, d)), row("x", "2026-12-22", "t2")]);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].repeat, "weekdays");
  assert.equal(entries[0].ids.length, 5);
  assert.equal(entries[1].repeat, "none");
  assert.equal(repeatOf(["2026-12-22", "2026-12-23", "2026-12-24"]), "daily");
  assert.equal(repeatOf(["2026-10-08", "2026-10-15"]), "weekly");
  assert.deepEqual(timeOffDates("2026-10-08", "none", "2026-10-20"), ["2026-10-08"]);
});

test("reminders and weekly repeats", () => {
  assert.equal(remindersLabel("day_1", "hour_1"), "24 hours and 1 hour before");
  assert.equal(remindersLabel("hour_1", "none"), "1 hour before");
  assert.equal(remindersLabel("none", "none"), "No reminder");
  assert.deepEqual(weeklyDates("2026-10-08", 3), ["2026-10-08", "2026-10-15", "2026-10-22"]);
});
