import { strict as assert } from "node:assert";
import { test } from "node:test";
import { daysBefore, liftMaxes, sortLifts } from "./oneRepMax";
import type { LoggedSet, WorkoutSession } from "../../types";

const set = (weightKg: number, reps: number, extra: Partial<LoggedSet> = {}) =>
  ({ weightKg, reps, completed: true, ...extra }) as LoggedSet;
const session = (id: string, date: string, exercises: { name: string; id?: string; sets: LoggedSet[] }[]) =>
  ({
    id,
    date,
    startedAt: `${date}T10:00:00Z`,
    exercises: exercises.map((e) => ({ name: e.name, catalogExerciseId: e.id, sets: e.sets })),
  }) as unknown as WorkoutSession;

test("Epley over Normal, PR and Drop sets only: Bench 80 × 5 = 93", () => {
  const [bench] = liftMaxes(
    [
      session("a", "2026-09-24", [
        {
          name: "Bench Press",
          id: "bench",
          sets: [set(100, 3, { setType: "warmup" }), set(95, 2, { outcome: "failed" }), set(90, 1, { outcome: "skipped" }), set(80, 5)],
        },
      ]),
    ],
    "2026-09-30"
  );
  assert.equal(Math.round(bench.oneRm), 93);
  assert.deepEqual(bench.best, { weightKg: 80, reps: 5, date: "2026-09-24" });
  assert.equal(bench.lastTrained, "2026-09-24");
  assert.equal(bench.change30, null, "no 1RM 30 days ago means no change");
});

test("reps = 1 is the weight; PR and drop sets count", () => {
  const lifts = liftMaxes(
    [session("a", "2026-09-01", [{ name: "Deadlift", sets: [set(150, 1, { isPr: true }), set(100, 8, { setType: "dropset" })] }])],
    "2026-09-30"
  );
  assert.equal(lifts[0].oneRm, 150);
  assert.equal(lifts[0].sessions[0].isPr, true);
});

test("30-day change = current minus the best as of 30 days ago; one entry per session", () => {
  const lifts = liftMaxes(
    [
      session("old", "2026-08-20", [{ name: "Squat", id: "sq", sets: [set(100, 5)] }]),
      session("edge", "2026-08-31", [{ name: "Squat", id: "sq", sets: [set(105, 5)] }]),
      session("new", "2026-09-26", [
        { name: "Squat", id: "sq", sets: [set(110, 5)] },
        { name: "Squat", id: "sq", sets: [set(112, 5)] },
      ]),
    ],
    "2026-09-30"
  );
  assert.equal(daysBefore("2026-09-30", 30), "2026-08-31");
  const [sq] = lifts;
  assert.equal(sq.sessions.length, 3);
  assert.equal(sq.oneRm, 130.7);
  assert.equal(sq.change30, 8.2);
  assert.equal(sq.lastTrained, "2026-09-26");
});

test("sorts: highest, recently trained, biggest change (none last), A–Z", () => {
  const lifts = liftMaxes(
    [
      session("1", "2026-08-01", [{ name: "B", sets: [set(50, 1)] }]),
      session("2", "2026-09-20", [{ name: "B", sets: [set(60, 1)] }, { name: "A", sets: [set(70, 1)] }]),
      session("3", "2026-09-25", [{ name: "C", sets: [set(40, 1)] }]),
    ],
    "2026-09-30"
  );
  assert.deepEqual(sortLifts(lifts, "highest").map((l) => l.name), ["A", "B", "C"]);
  assert.deepEqual(sortLifts(lifts, "recent").map((l) => l.name), ["C", "A", "B"]);
  assert.deepEqual(sortLifts(lifts, "change").map((l) => l.name), ["B", "A", "C"]);
  assert.deepEqual(sortLifts(lifts, "az").map((l) => l.name), ["A", "B", "C"]);
});
