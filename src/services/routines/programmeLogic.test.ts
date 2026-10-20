import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  coachRoutineMeta,
  fullGroupIndex,
  isCurrentAssignment,
  nextSession,
  pastProgrammesLine,
  programmeCountLine,
  splitAssignments,
  wasUpdatedByCoach,
  weekDayOf,
  type ProgrammeAssignment,
} from "./programmeLogic";

// The r3-fc-active fixture: "Strength foundations", 4 weeks from Oct 1,
// joined at week 1 (ends_on = Oct 1 + 4 * 7 - 1 = Oct 28).
const strength: ProgrammeAssignment = {
  id: "a",
  routineId: "r",
  startsOn: "2026-10-01",
  endsOn: "2026-10-28",
  joinWeek: 1,
  endedAt: null,
  assignedAt: "2026-10-01T12:00:00Z",
  createdAt: "2026-10-01T12:00:00Z",
  templateName: "Strength foundations",
  durationWeeks: 4,
};

test("week x from the assignment's dates, y from the template's duration_weeks", () => {
  assert.deepEqual(weekDayOf(strength, "2026-10-01"), { week: 1, day: 1 });
  assert.deepEqual(weekDayOf(strength, "2026-10-15"), { week: 3, day: 1 });
  assert.deepEqual(weekDayOf(strength, "2026-10-17"), { week: 3, day: 3 });
  assert.equal(programmeCountLine(strength, "2026-10-15", 1), "Week 3 of 4 · 1 routine");
  assert.equal(programmeCountLine(strength, "2026-10-28", 3), "Week 4 of 4 · 3 routines");
});

test("joining at a later week counts from that week", () => {
  // An 8-week programme joined at week 3: ends_on = start + (8 - 3 + 1) * 7 - 1.
  const joined: ProgrammeAssignment = { ...strength, startsOn: "2026-10-05", endsOn: "2026-11-15", joinWeek: 3, durationWeeks: 8 };
  assert.equal(programmeCountLine(joined, "2026-10-05", 3), "Week 3 of 8 · 3 routines");
  assert.equal(programmeCountLine(joined, "2026-10-12", 3), "Week 4 of 8 · 3 routines");
});

test("not started, and no end date", () => {
  assert.equal(programmeCountLine({ ...strength, startsOn: "2026-10-20", endsOn: "2026-11-16" }, "2026-10-15", 1), "Starts Oct 20 · 1 routine");
  assert.equal(programmeCountLine({ ...strength, endsOn: null, durationWeeks: null }, "2026-10-15", 2), "Week 3 · 2 routines");
  // y is the template's length, never derived from the dates.
  assert.equal(programmeCountLine({ ...strength, endsOn: "2026-12-31", durationWeeks: 6 }, "2026-10-15", 1), "Week 3 of 6 · 1 routine");
  assert.equal(programmeCountLine({ ...strength, startsOn: null, endsOn: null }, "2026-10-15", 1), "1 routine");
});

test("current and past programmes", () => {
  const ended = { ...strength, id: "e", endedAt: "2026-09-28T09:00:00Z", assignedAt: "2026-08-01T00:00:00Z" };
  const lapsed = { ...strength, id: "l", startsOn: "2026-06-01", endsOn: "2026-07-02", assignedAt: "2026-06-01T00:00:00Z" };
  const future = { ...strength, id: "f", startsOn: "2026-11-01", endsOn: "2026-11-28", assignedAt: "2026-10-10T00:00:00Z" };
  assert.equal(isCurrentAssignment(strength, "2026-10-28"), true);
  assert.equal(isCurrentAssignment(strength, "2026-10-29"), false);
  assert.equal(isCurrentAssignment(ended, "2026-10-15"), false);
  const { current, past } = splitAssignments([lapsed, future, ended, strength], "2026-10-15");
  assert.deepEqual(current.map((a) => a.id), ["a", "f"]);
  // Most recently ended first.
  assert.deepEqual(past.map((a) => a.id), ["e", "l"]);
  assert.equal(
    pastProgrammesLine([
      { name: "Foundations", endedOn: "2026-09-28" },
      { name: "Mobility reset", endedOn: "2026-07-02" },
    ]),
    "Foundations, ended Sep 28 · Mobility reset, ended Jul 2"
  );
});

test("TODAY and the routine meta come from the next scheduled session", () => {
  const days = ["2026-10-13", "2026-10-15", "2026-10-17", "2026-10-29"];
  assert.equal(nextSession(days, "2026-10-15", strength), "2026-10-15");
  assert.equal(nextSession(days, "2026-10-16", strength), "2026-10-17");
  // After ends_on nothing is next.
  assert.equal(nextSession(days, "2026-10-18", strength), null);
  assert.equal(coachRoutineMeta(strength, "2026-10-15", 3, 45), "Week 3, day 1 • 3 exercises • ~45 min");
  assert.equal(coachRoutineMeta(strength, null, 3, 45), "3 exercises • ~45 min");
});

test("updated means re-assigned after the first assignment", () => {
  assert.equal(wasUpdatedByCoach(strength), false);
  assert.equal(wasUpdatedByCoach({ createdAt: "2026-10-01T12:00:00Z", assignedAt: "2026-10-09T08:00:00Z" }), true);
  // The seed's created_at after assigned_at is not an update.
  assert.equal(wasUpdatedByCoach({ createdAt: "2026-10-15T12:00:00Z", assignedAt: "2026-10-01T12:00:00Z" }), false);
});

test("a drop among the visible rows lands at the same place in the whole group", () => {
  const group = ["c1", "u1", "c2", "u2", "u3"];
  const hidden = new Set(["c1", "c2"]);
  // Visible (without the moving u3): u1, u2. Slot 1 = before u2.
  assert.equal(fullGroupIndex(group, hidden, "u3", 1), 3);
  assert.equal(fullGroupIndex(group, hidden, "u3", 0), 1);
  // Past the end: after everything.
  assert.equal(fullGroupIndex(group, hidden, "u3", 2), 4);
  // Nothing hidden: unchanged.
  assert.equal(fullGroupIndex(["a", "b", "c"], new Set(), "c", 1), 1);
});
