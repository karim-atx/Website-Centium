import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  countsTowardVolume,
  finalizeSets,
  isTouched,
  seedReps,
  seedSets,
  setRowCount,
} from "./session.ts";
import type { Exercise, LoggedSet } from "../../types";

const ex = (patch: Partial<Exercise> = {}): Exercise => ({
  id: "e1",
  name: "Back Squat",
  weightKg: 0,
  classification: "barbell",
  ...patch,
});

const set = (patch: Partial<LoggedSet> = {}): LoggedSet => ({
  setNumber: 1,
  reps: 0,
  weightKg: 0,
  completed: false,
  ...patch,
});

// --- how many rows -----------------------------------------------------------

test("a range offers its maximum and asks for its minimum", () => {
  assert.deepEqual(setRowCount(ex({ minSets: 3, maxSets: 5 })), { offered: 5, asked: 3 });
});

test("a fixed count asks for all of what it offers", () => {
  assert.deepEqual(setRowCount(ex({ sets: 4 })), { offered: 4, asked: 4 });
});

test("a minimum with no maximum offers exactly the minimum", () => {
  assert.deepEqual(setRowCount(ex({ minSets: 3 })), { offered: 3, asked: 3 });
});

test("nothing prescribed still offers one row to log into", () => {
  assert.deepEqual(setRowCount(ex()), { offered: 1, asked: 0 });
});

test("a nonsensical range never offers fewer rows than it asks for", () => {
  assert.equal(setRowCount(ex({ minSets: 5, maxSets: 2 })).offered, 5);
});

// --- which rows are optional -------------------------------------------------

test("3–5 sets gives five rows, the last two optional", () => {
  const rows = seedSets(ex({ minSets: 3, maxSets: 5 }));
  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.map((r) => !!r.optional),
    [false, false, false, true, true]
  );
});

test("a fixed prescription marks nothing optional", () => {
  assert.ok(seedSets(ex({ sets: 4 })).every((r) => !r.optional));
});

test("an unprescribed exercise's single row is not optional", () => {
  const rows = seedSets(ex());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].optional, undefined, "there is nothing to be optional against");
});

// --- what goes in the boxes --------------------------------------------------

test("a single rep target is pre-filled", () => {
  assert.equal(seedReps(ex({ reps: 8 })), 8);
});

test("a rep RANGE pre-fills nothing — it belongs in the placeholder", () => {
  assert.equal(seedReps(ex({ minReps: 8, maxReps: 12 })), 0);
});

test("an open-ended AMRAP target pre-fills nothing either", () => {
  // "8+ reps" asks for as many as possible. Putting 8 in the box answers the
  // question for them, and answers it with the least they could have done.
  assert.equal(seedReps(ex({ minReps: 8 })), 0);
  assert.equal(seedReps(ex()), 0);
});

test("the prescribed weight is carried in", () => {
  assert.equal(seedSets(ex({ sets: 1, weightKg: 60 }))[0].weightKg, 60);
});

// --- finishing ---------------------------------------------------------------

test("an untouched optional row is dropped, not recorded as skipped", () => {
  const rows = seedSets(ex({ minSets: 3, maxSets: 5 })).map((s, i) =>
    i < 3 ? { ...s, completed: true, reps: 8, weightKg: 60 } : s
  );
  const done = finalizeSets(rows);
  assert.equal(done.length, 3, "the two that were only offered are gone");
  assert.ok(done.every((s) => s.outcome === "completed"));
});

test("a touched optional row is kept", () => {
  const rows = seedSets(ex({ minSets: 3, maxSets: 5 })).map((s, i) =>
    i < 4 ? { ...s, completed: true, reps: 8, weightKg: 60 } : s
  );
  assert.equal(finalizeSets(rows).length, 4);
});

test("an untouched REQUIRED row is a skip, and says so", () => {
  const rows = seedSets(ex({ sets: 3 })).map((s, i) =>
    i < 2 ? { ...s, completed: true, reps: 8, weightKg: 60 } : s
  );
  const done = finalizeSets(rows);
  assert.equal(done.length, 3);
  assert.equal(done[2].outcome, "skipped");
  assert.equal(done[2].completed, false);
});

test("set numbers close up after a drop", () => {
  const rows = [
    set({ setNumber: 1, completed: true, reps: 8 }),
    set({ setNumber: 2, optional: true }),
    set({ setNumber: 3, completed: true, reps: 8 }),
  ];
  assert.deepEqual(
    finalizeSets(rows).map((s) => s.setNumber),
    [1, 2]
  );
});

test("an explicit outcome survives finishing, and completed follows it", () => {
  const rows = [
    set({ outcome: "failed", reps: 5, weightKg: 100 }),
    set({ setNumber: 2, outcome: "skipped" }),
  ];
  const done = finalizeSets(rows);
  assert.deepEqual(
    done.map((s) => [s.outcome, s.completed]),
    [
      ["failed", true],
      ["skipped", false],
    ]
  );
});

test("a PR flag is not a reason to keep an otherwise-empty optional row... unless set", () => {
  assert.equal(isTouched(set({ optional: true })), false);
  assert.equal(isTouched(set({ optional: true, isPr: true })), true);
});

// --- volume ------------------------------------------------------------------

test("a skipped set is worth nothing", () => {
  assert.equal(countsTowardVolume(set({ outcome: "skipped", reps: 8, weightKg: 60 })), false);
});

test("a failed set counts the reps actually done", () => {
  assert.equal(countsTowardVolume(set({ outcome: "failed", reps: 5, weightKg: 100 })), true);
});

test("a row with no outcome falls back to the completed flag", () => {
  assert.equal(countsTowardVolume(set({ completed: true, reps: 8 })), true);
  assert.equal(countsTowardVolume(set({ completed: false, reps: 8 })), false);
});
