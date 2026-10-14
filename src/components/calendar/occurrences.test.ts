import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dayBefore, expandOccurrences, occurrenceDates } from "./occurrences.ts";

const base = { title: "Swim", allDay: false, startTime: "18:00", endTime: "19:00" };

test("a one-off falls on its own date only", () => {
  assert.deepEqual(occurrenceDates({ id: "a", date: "2026-10-08", repeat: "none" }, "2026-10-01", "2026-10-31"), ["2026-10-08"]);
  assert.deepEqual(occurrenceDates({ id: "a", date: "2026-11-08", repeat: "none" }, "2026-10-01", "2026-10-31"), []);
});

test("weekly keeps the weekday and starts inside the window", () => {
  assert.deepEqual(occurrenceDates({ id: "a", date: "2026-09-03", repeat: "weekly" }, "2026-10-01", "2026-10-20"), [
    "2026-10-01",
    "2026-10-08",
    "2026-10-15",
  ]);
});

test("a repeat stops at repeat_until", () => {
  assert.deepEqual(
    occurrenceDates({ id: "a", date: "2026-10-01", repeat: "daily", repeatUntil: "2026-10-03" }, "2026-10-01", "2026-10-31"),
    ["2026-10-01", "2026-10-02", "2026-10-03"]
  );
});

test("monthly skips a month without that day, as the reminder sweep does", () => {
  assert.deepEqual(occurrenceDates({ id: "a", date: "2026-01-31", repeat: "monthly" }, "2026-01-01", "2026-05-31"), [
    "2026-01-31",
    "2026-03-31",
    "2026-05-31",
  ]);
});

test("a cancelled day is dropped and an override applies to its day only", () => {
  const out = expandOccurrences(
    [{ id: "s", date: "2026-10-01", repeat: "daily" as const, ...base }],
    {
      s: {
        "2026-10-02": { cancelled: true, override: null },
        "2026-10-03": { cancelled: false, override: { title: "Late swim", start_time: "20:00:00" } },
      },
    },
    "2026-10-01",
    "2026-10-04"
  );
  assert.deepEqual(
    out.map((o) => o.date),
    ["2026-10-01", "2026-10-03", "2026-10-04"]
  );
  assert.equal(out[1].title, "Late swim");
  assert.equal(out[1].startTime, "20:00");
  assert.equal(out[1].endTime, "19:00");
  assert.equal(out[1].overridden, true);
  assert.equal(out[1].seriesDate, "2026-10-01");
  assert.equal(out[2].title, "Swim");
  assert.equal(out[2].overridden, false);
});

test("date helpers cross a month end", () => {
  assert.equal(dayBefore("2026-11-01"), "2026-10-31");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});
