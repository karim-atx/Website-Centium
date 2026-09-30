import { strict as assert } from "node:assert";
import { test } from "node:test";
import { byNewest, comparisonPhrase, exerciseHistory, historySummary, inRange, periodRange, topSet } from "./history";
import type { LoggedExercise, LoggedSet, WorkoutSession } from "../../types";

const set = (weightKg: number, reps: number, extra: Partial<LoggedSet> = {}) =>
  ({ weightKg, reps, completed: true, ...extra }) as LoggedSet;

test("the comparison phrase ends with its emoji and hides at 0 kg", () => {
  assert.equal(comparisonPhrase(9850), "That's the equivalent of lifting a school bus 🚌");
  assert.equal(comparisonPhrase(8410), "That's the equivalent of lifting an elephant 🐘");
  assert.equal(comparisonPhrase(0), null);
});

test("top set = heaviest completed working set; warm-up, failed and skipped excluded", () => {
  const ex = {
    sets: [
      set(100, 3, { setType: "warmup" }),
      set(90, 1, { outcome: "failed" }),
      set(60, 8),
      set(60, 10),
      set(80, 5, { completed: false }),
      set(70, 6, { setType: "dropset" }),
    ],
  } as unknown as LoggedExercise;
  assert.deepEqual(topSet(ex), { weightKg: 70, reps: 6 });
  assert.equal(topSet({ sets: [set(50, 5, { outcome: "skipped" })] } as unknown as LoggedExercise), null);
});

test("periods: this week starts Monday, this month on the 1st, all time is open", () => {
  // 2026-09-30 is a Wednesday.
  assert.deepEqual(periodRange("week", "2026-09-30"), { from: "2026-09-28", to: "2026-09-30" });
  assert.deepEqual(periodRange("month", "2026-09-30"), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(periodRange("year", "2026-09-30"), { from: "2026-01-01", to: "2026-09-30" });
  assert.deepEqual(periodRange("all", "2026-09-30"), { from: null, to: null });
  assert.equal(inRange("2026-08-30", periodRange("month", "2026-09-30")), false);
  assert.equal(inRange("2026-09-20", periodRange("custom", "2026-09-30", { from: "2026-09-20", to: "2026-09-20" })), true);
});

test("summary sums volume, time, workouts and completed sets; newest first by day", () => {
  const s = (id: string, date: string, startedAt: string, sets: LoggedSet[]) =>
    ({ id, date, startedAt, durationSec: 600, totalVolumeKg: 100, exercises: [{ sets }] }) as unknown as WorkoutSession;
  const list = [s("a", "2026-09-20", "2026-09-26T10:00:00Z", [set(1, 1), set(1, 1, { completed: false })]), s("b", "2026-09-24", "2026-09-24T10:00:00Z", [set(1, 1)])];
  assert.deepEqual(historySummary(list), { volumeKg: 200, seconds: 1200, workouts: 2, sets: 2 });
  // "a" was moved to the 20th: it sorts by its new day, not its start time.
  assert.deepEqual([...list].sort(byNewest).map((x) => x.id), ["b", "a"]);
});

test("exercise history: sessions that included it, newest first, completed sets only", () => {
  const ses = (id: string, date: string, exs: LoggedExercise[]) =>
    ({ id, date, startedAt: `${date}T10:00:00Z`, routineName: `R ${id}`, exercises: exs }) as unknown as WorkoutSession;
  const squat = (sets: LoggedSet[]) => ({ name: "Back Squat", catalogExerciseId: "sq", sets }) as unknown as LoggedExercise;
  const bench = { name: "Bench Press", catalogExerciseId: "bp", sets: [set(60, 5)] } as unknown as LoggedExercise;
  const list = [
    ses("a", "2026-09-14", [squat([set(112.5, 5), set(112.5, 5), set(110, 5)])]),
    ses("b", "2026-09-24", [bench, squat([set(120, 5), set(120, 5), set(115, 6), set(130, 1, { completed: false })])]),
    ses("c", "2026-09-20", [bench]),
  ];
  const h = exerciseHistory(list, { catalogId: "sq", name: "Back Squat" });
  assert.deepEqual(h.map((e) => e.sessionId), ["b", "a"]);
  assert.deepEqual(h[0], {
    sessionId: "b",
    date: "2026-09-24",
    routineName: "R b",
    sets: 3,
    top: { weightKg: 120, reps: 5 },
    volumeKg: 1890,
    line: "120×5 · 120×5 · 115×6",
  });
  assert.deepEqual(exerciseHistory(list, { catalogId: "nope", name: "Ab Wheel Rollout" }), []);
});

test("periodRange: a picked day covers exactly that day", () => {
  const r = periodRange("day", "2026-09-30", { from: "2026-09-22", to: "2026-09-22" });
  assert.equal(inRange("2026-09-22", r), true);
  assert.equal(inRange("2026-09-21", r), false);
  assert.equal(inRange("2026-09-23", r), false);
});
