import { test } from "node:test";
import assert from "node:assert/strict";
import { conflictsFor, dayHeading, figures, findIssues, hourLabel, isLowSoon, longDate, mondayOf, shortDate, weekHours, type Session } from "./scheduleModel";

const S = (o: Partial<Session>): Session => ({
  id: o.id ?? Math.random().toString(36),
  title: "Spin 45",
  classType: "Spin",
  date: "2026-10-14",
  startTime: "18:00",
  endTime: "18:45",
  maxCapacity: 20,
  professionalId: "p1",
  booked: 10,
  ...o,
});

test("dates read Monday-first, card style", () => {
  assert.equal(shortDate("2026-10-07"), "Wed 7 Oct");
  assert.equal(longDate("2026-10-06"), "Tue 6 Oct 2026");
  assert.equal(mondayOf("2026-10-14"), "2026-10-12");
  assert.equal(dayHeading("2026-10-14", "2026-10-14"), "Today · Wed 14 Oct");
  assert.equal(dayHeading("2026-10-15", "2026-10-14"), "Tomorrow · Thu 15 Oct");
  assert.equal(hourLabel(13), "1 PM");
});

test("overlap is strict: back to back is fine", () => {
  const a = S({ id: "a", startTime: "07:00", endTime: "08:00" });
  assert.equal(conflictsFor({ date: a.date, startTime: "08:00", endTime: "09:00", professionalId: "p1" }, [a]).length, 0);
  assert.equal(conflictsFor({ date: a.date, startTime: "07:30", endTime: "08:30", professionalId: "p1" }, [a]).length, 1);
  assert.equal(conflictsFor({ date: a.date, startTime: "07:30", endTime: "08:30", professionalId: "p2" }, [a]).length, 0);
});

test("amber only within 48 hours, and issues in order", () => {
  const now = new Date("2026-10-14T01:00:00");
  assert.equal(isLowSoon(S({ booked: 1, date: "2026-10-15" }), now), true);
  assert.equal(isLowSoon(S({ booked: 1, date: "2026-10-20" }), now), false);
  const issues = findIssues(
    [S({ id: "n", professionalId: null, booked: 2 }), S({ id: "d1", startTime: "09:00", endTime: "10:00" }), S({ id: "d2", startTime: "09:30", endTime: "10:00" })],
    now
  );
  assert.deepEqual(issues.map((i) => i.kind), ["noinst", "double", "low"]);
});

test("figures compare with the 7 days before; nothing ahead is the empty card", () => {
  const f = figures([S({ date: "2026-10-14", booked: 10 }), S({ date: "2026-10-10", booked: 5 })], "2026-10-14");
  assert.equal(f.sessions, 1);
  assert.equal(f.bookedPct, 50);
  assert.equal(f.sessionsDelta, 0);
  assert.equal(f.pctDelta, 25);
  assert.equal(figures([S({ date: "2026-10-10" })], "2026-10-14").empty, true);
  assert.deepEqual(weekHours([S({ startTime: "06:00", endTime: "22:30" })]), { h0: 6, h1: 23 });
});

test("B9: cancelled sessions never count; the server's clash pairs replace the local check", () => {
  const now = new Date("2026-10-14T01:00:00");
  const d1 = S({ id: "d1", startTime: "09:00", endTime: "10:00" });
  const d2 = S({ id: "d2", startTime: "09:30", endTime: "10:00" });
  // A cancelled twin is neither a clash nor a session this week.
  assert.equal(findIssues([d1, { ...d2, cancelled: true }], now).some((i) => i.kind === "double"), false);
  assert.equal(figures([d1, { ...d2, cancelled: true }], "2026-10-14").sessions, 1);
  assert.equal(conflictsFor({ date: d1.date, startTime: "09:15", endTime: "09:45", professionalId: "p1" }, [{ ...d1, cancelled: true }]).length, 0);
  // An empty answer from class_instructor_conflicts() means no double-booking, whatever the local times say.
  assert.equal(findIssues([d1, d2], now, []).some((i) => i.kind === "double"), false);
  const pairs = findIssues([d1, d2, S({ id: "x", startTime: "12:00", endTime: "13:00" })], now, [{ classId: "d1", otherClassId: "x" }]).find((i) => i.kind === "double");
  assert.deepEqual(pairs?.sessions.map((s) => s.id), ["d1", "x"]);
});
