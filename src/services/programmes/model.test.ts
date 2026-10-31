import test from "node:test";
import assert from "node:assert/strict";
import {
  addToDay,
  builderMoveTargets,
  canMoveTo,
  clientMaySkip,
  moveTargets,
  skipPositions,
  unskipTargets,
  yesterdaysOpen,
  assignmentEnd,
  assignmentStatus,
  buildGrid,
  doneLine,
  groupSchedule,
  isoDay,
  lastUsedWeek,
  mondayOf,
  moveInDay,
  programmeErrorMessage,
  programmeMeta,
  removeFromDay,
  sessionDate,
  sessionsOn,
  summariseProgress,
  totalSoFar,
  weekDayOn,
  workoutsAWeek,
  type ScheduleRow,
} from "./model";

test("buildGrid: weeks × Mon–Sun in position order, out-of-range slots dropped", () => {
  const grid = buildGrid(2, [
    { week: 1, day: 1, position: 1, workoutTemplateId: "b" },
    { week: 1, day: 1, position: 0, workoutTemplateId: "a" },
    { week: 2, day: 7, position: 0, workoutTemplateId: "c" },
    { week: 3, day: 1, position: 0, workoutTemplateId: "x" },
  ]);
  assert.equal(grid.length, 2);
  assert.deepEqual(grid[0][0], ["a", "b"]);
  assert.deepEqual(grid[1][6], ["c"]);
  assert.deepEqual(grid[0][1], []);
});

test("day edits: four at most, remove and move", () => {
  assert.deepEqual(addToDay(["a"], "b"), ["a", "b"]);
  assert.equal(addToDay(["a", "b", "c", "d"], "e"), null);
  assert.deepEqual(removeFromDay(["a", "b", "c"], 1), ["a", "c"]);
  assert.deepEqual(moveInDay(["a", "b", "c"], 2, -1), ["a", "c", "b"]);
  assert.deepEqual(moveInDay(["a", "b"], 0, -1), ["a", "b"]);
});

test("workouts a week, the header line and the last used week", () => {
  const same = buildGrid(3, [
    { week: 1, day: 1, position: 0, workoutTemplateId: "a" },
    { week: 2, day: 3, position: 0, workoutTemplateId: "a" },
  ]);
  assert.equal(workoutsAWeek(same), "1 workout a week");
  assert.equal(lastUsedWeek(same), 2);
  const mixed = buildGrid(2, [
    { week: 1, day: 1, position: 0, workoutTemplateId: "a" },
    { week: 1, day: 2, position: 0, workoutTemplateId: "a" },
    { week: 2, day: 3, position: 0, workoutTemplateId: "a" },
  ]);
  assert.equal(workoutsAWeek(mixed), "1–2 workouts a week");
  assert.equal(workoutsAWeek(buildGrid(4, [])), null);
  assert.equal(programmeMeta(4, buildGrid(4, [])), "4 weeks · No workouts yet");
  assert.equal(programmeMeta(3, same, 2), "3 weeks · 1 workout a week · used by 2 clients");
  assert.equal(lastUsedWeek(buildGrid(2, [])), 0);
});

test("dates follow programme_session_dates", () => {
  // 2026-10-29 is a Thursday.
  assert.equal(isoDay("2026-10-29"), 4);
  assert.equal(isoDay("2026-11-01"), 7);
  assert.equal(mondayOf("2026-10-29"), "2026-10-26");
  // Joining at week 2 on a Thursday: week 2 is that week, week 3 the next.
  assert.equal(sessionDate("2026-10-29", 2, 2, 1), "2026-10-26");
  assert.equal(sessionDate("2026-10-29", 2, 3, 5), "2026-11-06");
  // 4 weeks from week 2: three weeks, ending on a Sunday.
  assert.equal(assignmentEnd("2026-10-29", 2, 4), "2026-11-15");
  assert.equal(assignmentEnd("2026-10-26", 1, 1), "2026-11-01");
});

test("weekDayOn mirrors my_programmes' current week and day", () => {
  const a = { startsOn: "2026-10-29", endsOn: "2026-11-15", joinWeek: 2 };
  assert.equal(weekDayOn(a, "2026-10-28"), null);
  assert.deepEqual(weekDayOn(a, "2026-10-29"), { week: 2, day: 4 });
  assert.deepEqual(weekDayOn(a, "2026-11-02"), { week: 3, day: 1 });
  assert.deepEqual(weekDayOn(a, "2026-11-15"), { week: 4, day: 7 });
  assert.equal(weekDayOn(a, "2026-11-16"), null);
  const fmt = (d: string) => d;
  assert.equal(assignmentStatus(a, 4, "2026-10-20", fmt), "Starts 2026-10-29");
  assert.equal(assignmentStatus(a, 4, "2026-11-03", fmt), "Week 3 of 4");
  assert.equal(assignmentStatus({ ...a, endedAt: "2026-11-01T10:00:00Z" }, 4, "2026-11-03", fmt), "Ended");
  assert.equal(assignmentStatus(a, 4, "2026-11-20", fmt), "Finished");
});

const row = (p: Partial<ScheduleRow>): ScheduleRow => ({
  week: 1,
  day: 1,
  onDate: "2026-10-26",
  position: 0,
  workoutTemplateId: "a",
  workoutName: "A",
  routineId: "r",
  done: false,
  skipped: false,
  movedFrom: null,
  ...p,
});

test("groupSchedule and sessionsOn", () => {
  const rows = [
    row({ week: 2, day: 1, onDate: "2026-11-02", workoutName: "C" }),
    row({ position: 1, workoutName: "B" }),
    row({ workoutName: "A" }),
  ];
  const g = groupSchedule(rows);
  assert.deepEqual(g.map((w) => w.week), [1, 2]);
  assert.deepEqual(g[0].days[0].sessions.map((s) => s.workoutName), ["A", "B"]);
  assert.deepEqual(sessionsOn(rows, "2026-10-26").map((s) => s.workoutName), ["A", "B"]);
  assert.deepEqual(sessionsOn(rows, "2026-10-27"), []);
});

test("summariseProgress: sums per week, null stays null (Not shared, never 0)", () => {
  const weeks = summariseProgress([
    { week: 1, weekStartsOn: "2026-10-26", workoutTemplateId: "a", workoutName: "A", planned: 2, done: 1, skipped: 0, weekNote: null },
    { week: 1, weekStartsOn: "2026-10-26", workoutTemplateId: "b", workoutName: "B", planned: 1, done: 1, skipped: 0, weekNote: null },
    { week: 2, weekStartsOn: "2026-11-02", workoutTemplateId: "a", workoutName: "A", planned: 2, done: 0, skipped: 0, weekNote: null },
  ]);
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0].planned, 3);
  assert.equal(weeks[0].done, 2);
  assert.deepEqual(totalSoFar(weeks, "2026-10-30"), { planned: 3, done: 2 });
  assert.deepEqual(totalSoFar(weeks, "2026-11-03"), { planned: 5, done: 2 });
  const hidden = summariseProgress([{ week: 1, weekStartsOn: "2026-10-26", workoutTemplateId: "a", workoutName: "A", planned: 2, done: null, skipped: 0, weekNote: null }]);
  assert.equal(hidden[0].done, null);
  assert.equal(totalSoFar(hidden, "2026-10-30").done, null);
  assert.equal(doneLine(2, null), "Not shared");
  assert.equal(doneLine(3, 0), "0 of 3 sessions done");
  assert.equal(doneLine(1, 1), "1 of 1 session done");
});

test("programmeErrorMessage: each refusal has a sentence", () => {
  const f = "Couldn't save.";
  assert.equal(programmeErrorMessage({ code: "ATX12", message: "no active client relationship" }, f), "That person isn't your client any more.");
  assert.equal(programmeErrorMessage({ code: "ATX09", message: "only your own workouts go in a programme" }, f), "Only your own workouts can go in a programme.");
  assert.equal(programmeErrorMessage({ code: "ATX08", message: "no such programme of yours" }, f), "This programme isn't available any more.");
  assert.equal(
    programmeErrorMessage({ code: "22023", message: "week 5 has sessions; clear it before shortening the programme" }, f),
    "Week 5 has workouts. Clear it before shortening the programme."
  );
  assert.equal(
    programmeErrorMessage({ code: "22023", message: "nothing is scheduled from that week on" }, f),
    "Nothing is planned from that week on. Pick an earlier week or add workouts."
  );
  assert.equal(programmeErrorMessage({ code: "22023", message: "up to four workouts a day" }, f), "A day can hold up to four workouts.");
  assert.equal(programmeErrorMessage({ code: "XX000", message: "boom" }, f), f);
  assert.equal(programmeErrorMessage(null, f), f);
});

// ---------------------------------------------------------------------------
// Round F (DW1–DW3, Database 20261226000000)
// ---------------------------------------------------------------------------

test("summariseProgress: skipped is counted apart from planned, and the week's note comes through", () => {
  const weeks = summariseProgress([
    { week: 1, weekStartsOn: "2026-10-26", workoutTemplateId: "a", workoutName: "A", planned: 1, done: 1, skipped: 1, weekNote: "Keep RPE at 7." },
    { week: 1, weekStartsOn: "2026-10-26", workoutTemplateId: "b", workoutName: "B", planned: 0, done: 0, skipped: 1, weekNote: "Keep RPE at 7." },
    { week: 2, weekStartsOn: "2026-11-02", workoutTemplateId: "a", workoutName: "A", planned: 2, done: 0, skipped: 0, weekNote: null },
  ]);
  assert.equal(weeks[0].planned, 1);
  assert.equal(weeks[0].skipped, 2);
  assert.equal(weeks[0].weekNote, "Keep RPE at 7.");
  assert.deepEqual(weeks[0].byWorkout.map((w) => w.skipped), [1, 1]);
  assert.equal(weeks[1].skipped, 0);
  assert.equal(weeks[1].weekNote, null);
  // A skipped session is not planned: it never lowers done of planned.
  assert.deepEqual(totalSoFar(weeks, "2026-10-30"), { planned: 1, done: 1 });
});

// The week of Monday 2026-10-26; "today" is Thursday 2026-10-29.
const TODAY = "2026-10-29";
const A = { startsOn: "2026-10-26", endsOn: "2026-11-08" };

test("clientMaySkip: a day of this week with an unfinished session (ATXP1 for any other week)", () => {
  const mon = [row({ onDate: "2026-10-26" })];
  assert.equal(clientMaySkip("2026-10-26", mon, TODAY), true);
  assert.equal(clientMaySkip("2026-11-01", [row({ onDate: "2026-11-01", day: 7 })], TODAY), true);
  assert.equal(clientMaySkip("2026-11-02", [row({ onDate: "2026-11-02" })], TODAY), false);
  assert.equal(clientMaySkip("2026-10-26", [row({ done: true })], TODAY), false);
  assert.equal(clientMaySkip("2026-10-26", [row({ skipped: true })], TODAY), false);
});

test("skipPositions: the whole day unless something on it is done", () => {
  assert.deepEqual(skipPositions([row({}), row({ position: 1 })]), [null]);
  assert.deepEqual(skipPositions([row({ done: true }), row({ position: 1 }), row({ position: 2, skipped: true })]), [1]);
  assert.deepEqual(skipPositions([row({ done: true })]), []);
  // A professional without consent sees done as null: it is not done.
  assert.deepEqual(skipPositions([row({ done: null })]), [null]);
});

test("unskipTargets: Undo goes by the planned date and position", () => {
  assert.deepEqual(unskipTargets([row({ onDate: "2026-10-27", position: 1 }), row({ onDate: "2026-10-29", movedFrom: "2026-10-28", position: 0 })]), [
    { onDate: "2026-10-27", position: 1 },
    { onDate: "2026-10-28", position: 0 },
  ]);
});

test("moveTargets: its own week, today or later, within the dates, four a day at most (ATXP2, ATXP3)", () => {
  const s = row({ onDate: "2026-10-29", day: 4 });
  const full = [0, 1, 2, 3].map((p) => row({ onDate: "2026-10-31", day: 6, position: p }));
  const rows = [s, row({ onDate: "2026-10-30", day: 5 }), ...full, row({ onDate: "2026-11-01", day: 7, skipped: true })];
  const t = moveTargets(s, rows, TODAY, A);
  // Today is the session's own day; Friday to Sunday remain.
  assert.deepEqual(t.map((d) => d.date), ["2026-10-30", "2026-10-31", "2026-11-01"]);
  assert.deepEqual(t.map((d) => d.count), [1, 4, 0]);
  assert.deepEqual(t.map((d) => d.full), [false, true, false]);
  assert.equal(canMoveTo(s, "2026-10-30", rows, TODAY, A), true);
  assert.equal(canMoveTo(s, "2026-10-31", rows, TODAY, A), false);
  assert.equal(canMoveTo(s, "2026-11-02", rows, TODAY, A), false);
  assert.equal(canMoveTo(s, "2026-10-28", rows, TODAY, A), false);
  // A past session of this week can come to today.
  const tue = row({ onDate: "2026-10-27", day: 2 });
  assert.deepEqual(moveTargets(tue, [tue], TODAY, A).map((d) => d.date), ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  // Not past the end of the programme.
  assert.deepEqual(moveTargets(s, [s], TODAY, { startsOn: A.startsOn, endsOn: "2026-10-30" }).map((d) => d.date), ["2026-10-30"]);
  // Done or skipped: none (ATXP0, ATXP4).
  assert.deepEqual(moveTargets(row({ onDate: TODAY, done: true }), [], TODAY, A), []);
  assert.deepEqual(moveTargets(row({ onDate: TODAY, skipped: true }), [], TODAY, A), []);
});

test("moveTargets: a moved session marks its planned day, and its week is the planned one", () => {
  const moved = row({ onDate: "2026-10-31", day: 6, movedFrom: "2026-10-30" });
  const t = moveTargets(moved, [moved], TODAY, A);
  assert.deepEqual(t.map((d) => d.date), ["2026-10-29", "2026-10-30", "2026-11-01"]);
  assert.deepEqual(t.filter((d) => d.planned).map((d) => d.date), ["2026-10-30"]);
});

test("yesterdaysOpen: D-S4 only while yesterday is in this week", () => {
  const rows = [row({ onDate: "2026-10-28", day: 3 }), row({ onDate: "2026-10-28", day: 3, position: 1, done: true }), row({ onDate: "2026-11-01", day: 7 })];
  assert.deepEqual(yesterdaysOpen(rows, TODAY).map((r) => r.position), [0]);
  // Monday: yesterday was last week's Sunday.
  assert.deepEqual(yesterdaysOpen(rows, "2026-11-02"), []);
});

test("builderMoveTargets: the other six days, four is full", () => {
  const week = [["a"], [], ["a", "b", "c", "d"], [], [], [], ["e"]];
  const t = builderMoveTargets(week, 1);
  assert.deepEqual(t.map((d) => d.day), [2, 3, 4, 5, 6, 7]);
  assert.deepEqual(t.filter((d) => d.full).map((d) => d.day), [3]);
  assert.equal(t.find((d) => d.day === 7)?.count, 1);
});

test("programmeErrorMessage: Round F's refusals", () => {
  const f = "Couldn't save.";
  assert.equal(programmeErrorMessage({ code: "ATXP0", message: "that workout is already done" }, f), "That workout is already done.");
  assert.equal(programmeErrorMessage({ code: "ATXP1", message: "you can skip a day of this week only" }, f), "You can skip a day of this week only.");
  assert.equal(programmeErrorMessage({ code: "ATXP2", message: "a session moves within its own week, to today or later" }, f), "A workout moves within its own week, to today or a later day.");
  assert.equal(programmeErrorMessage({ code: "ATXP3", message: "that day already has four sessions" }, f), "That day already has four workouts.");
  assert.equal(programmeErrorMessage({ code: "ATXP4", message: "that session is skipped; undo the skip first" }, f), "That workout is skipped. Undo the skip first.");
  assert.equal(programmeErrorMessage({ code: "22023", message: "a note of up to 280 characters on week 1 to 8" }, f), "A week note can be up to 280 characters.");
  assert.equal(programmeErrorMessage({ code: "22023", message: "week 1 to 8, day 1 (Monday) to 7 (Sunday)" }, f), "That day isn't in the programme.");
  assert.equal(programmeErrorMessage({ code: "ATX08", message: "nothing skipped on that day" }, f), "That workout has changed. Refresh and try again.");
  assert.equal(programmeErrorMessage({ code: "ATX08", message: "no such programme" }, f), "This programme isn't available any more.");
});
