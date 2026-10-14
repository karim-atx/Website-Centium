import { strict as assert } from "node:assert";
import { test } from "node:test";
import { availabilityFor, coverageIssues, initialsOf, teamStats } from "./model";
import type { ClassRow, TeamPerson } from "./teamData";

const person = (id: string, seat: number, accepted = true): TeamPerson => ({
  id,
  name: id === "a" ? "Rami" : "Jane Smith",
  role: "instructor",
  acceptedAt: accepted ? "2026-09-01T00:00:00Z" : null,
  createdAt: "2026-09-01T00:00:00Z",
  payRate: null,
  seat,
});
const cls = (id: string, date: string, start: string, end: string, pro: string | null, booked = 0, capacity = 10): ClassRow => ({
  id,
  title: id,
  classType: "",
  date,
  start,
  end,
  capacity,
  professionalId: pro,
  booked,
});

test("coverage: no instructor, someone who left, and overlaps within the next 14 days only", () => {
  const team = new Set(["a", "b"]);
  const classes = [
    cls("none", "2026-10-15", "19:30", "20:30", null),
    cls("left", "2026-10-16", "09:00", "10:00", "gone"),
    cls("y", "2026-10-15", "07:30", "08:30", "a"),
    cls("t", "2026-10-15", "08:00", "09:00", "a"),
    cls("touch", "2026-10-15", "09:00", "09:30", "a"), // starts when t ends: no overlap
    cls("late", "2026-10-29", "08:00", "09:00", null), // outside 14 days
    cls("past", "2026-10-14", "06:00", "07:00", null), // earlier today
  ];
  const { issues, upcoming } = coverageIssues(classes, team, "2026-10-14", "2026-10-27", 8 * 60);
  assert.equal(upcoming.length, 5);
  assert.deepEqual(
    issues.map((i) => i.kind),
    ["overlap", "none", "left"]
  );
  const ov = issues[0];
  assert.ok(ov.kind === "overlap" && ov.a.id === "y" && ov.b.id === "t");
});

test("availability: free first, busy after, pending invites and the excluded person left out", () => {
  const people = [person("a", 1), person("b", 2), person("c", 3, false)];
  const session = cls("s", "2026-10-15", "08:00", "09:00", null);
  const rows = availabilityFor(session, people, [session, cls("x", "2026-10-15", "08:30", "09:30", "a")]);
  assert.deepEqual(
    rows.map((r) => [r.person.id, !!r.busyWith]),
    [
      ["b", false],
      ["a", true],
    ]
  );
  assert.deepEqual(availabilityFor(session, people, [session], "b").map((r) => r.person.id), ["a"]);
});

test("team stats: fill from 3 sessions, deltas from the previous period, future sessions not taught", () => {
  const people = [person("a", 1)];
  const classes = [
    cls("1", "2026-10-01", "08:00", "09:00", "a", 8),
    cls("2", "2026-10-02", "08:00", "09:00", "a", 6),
    cls("3", "2026-10-03", "08:00", "09:00", "a", 7),
    cls("future", "2026-10-20", "08:00", "09:00", "a", 9),
    cls("prev", "2026-09-10", "08:00", "09:00", "a", 5),
  ];
  const s = teamStats(people, classes, { from: "2026-09-17", to: "2026-10-14" }, { from: "2026-08-20", to: "2026-09-16" }, "2026-10-14", 28);
  assert.equal(s.classesTaught, 3);
  assert.equal(s.prevTaught, 1);
  assert.equal(s.studioFill, 70);
  assert.equal(s.perPerson[0].fill, 70);
  assert.equal(s.perPerson[0].hoursPerWeek, 0.8);
  assert.equal(s.onTarget, 1);
  assert.equal(s.perPerson[0].upcoming.length, 1);
});

test("initials come from the shown name", () => {
  assert.equal(initialsOf("Rami"), "R");
  assert.equal(initialsOf("Jane Smith"), "JS");
});
