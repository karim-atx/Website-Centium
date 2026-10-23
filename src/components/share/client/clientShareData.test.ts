import { test } from "node:test";
import assert from "node:assert/strict";
import { foodFacts, isNewPr, prFacts, streakFacts, weightOn, workoutFacts } from "./clientShareData.ts";
import type { FoodLogEntry, WorkoutSession } from "../../../types/index.ts";

const set = (weightKg: number, reps: number, extra: Record<string, unknown> = {}) => ({ setNumber: 1, reps, weightKg, completed: true, ...extra });

test("a session's facts: completed sets only, personal bests, per-exercise volume", () => {
  const s = {
    id: "s1",
    routineId: null,
    routineName: "Push day",
    date: "2026-10-16",
    startedAt: "2026-10-16T08:00:00Z",
    durationSec: 3120,
    totalVolumeKg: 8450,
    exercises: [
      { exerciseId: "a", name: "Bench press", sets: [set(80, 6), set(80, 6, { isPr: true }), set(80, 6, { completed: false })] },
      { exerciseId: "b", name: "Skipped", sets: [set(20, 10, { completed: false })] },
      { exerciseId: "c", name: "Overhead press", sets: [set(45, 8)] },
    ],
  } as unknown as WorkoutSession;
  const f = workoutFacts(s, 74.2);
  assert.equal(f.sets, 3);
  assert.equal(f.prs, 1);
  assert.equal(f.exercises, 2);
  assert.deepEqual(f.exerciseVolumes, [960, 360]);
  assert.equal(f.bodyWeightKg, 74.2);
  assert.equal(workoutFacts(s, 0).bodyWeightKg, null);
});

test("personal best facts and the new-PR window", () => {
  const p = prFacts({ name: "Back squat", oneRm: 120, best: { weightKg: 110, reps: 3, date: "2026-10-16" }, change30: 5, sessions: [{ oneRm: 110 }, { oneRm: 120 }] }, "2026-10-20");
  assert.equal(p.since, "2026-09-20");
  assert.deepEqual(p.history, [110, 120]);
  assert.equal(isNewPr("2026-10-16", "2026-10-20"), true);
  assert.equal(isNewPr("2026-09-01", "2026-10-20"), false);
});

test("streak: the run, its first day, workouts and meals since", () => {
  const days = ["2026-10-14", "2026-10-15", "2026-10-16"];
  const src = {
    foodLog: days.flatMap((d) => [{ date: d, meal: "breakfast" }, { date: d, meal: "lunch" }, { date: d, meal: "lunch" }]),
    waterByDate: Object.fromEntries(days.map((d) => [d, 500])),
    workoutLog: [{ date: "2026-10-15", completed: true }, { date: "2026-10-10", completed: true }],
    journalEntries: [],
  };
  const s = streakFacts(src, "2026-10-17")!;
  assert.equal(s.days, 3);
  assert.equal(s.since, "2026-10-14");
  assert.equal(s.workouts, 1);
  assert.equal(s.meals, 6);
  assert.equal(streakFacts({ foodLog: [], waterByDate: {}, workoutLog: [], journalEntries: [] }, "2026-10-17"), null);
});

test("food day totals; none logged is null", () => {
  const e = (date: string, calories: number, protein: number, carbs: number, fat: number) => ({ date, calories, protein, carbs, fat }) as FoodLogEntry;
  const f = foodFacts([e("2026-10-16", 500, 30, 50, 10), e("2026-10-16", 700, 40, 80, 20), e("2026-10-15", 900, 1, 1, 1)], "2026-10-16", 2100)!;
  assert.deepEqual([f.kcal, f.protein, f.carbs, f.fat, f.goalKcal], [1200, 70, 130, 30, 2100]);
  assert.equal(foodFacts([], "2026-10-16", 2100), null);
});

test("body weight on or before the session's day", () => {
  const w = { "2026-10-01": 75, "2026-10-10": 74.2, "2026-10-20": 73.9 };
  assert.equal(weightOn(w, "2026-10-16"), 74.2);
  assert.equal(weightOn(w, "2026-09-01"), null);
});
