import { strict as assert } from "node:assert";
import { test } from "node:test";
import { activeBarLine, loggedFraction, sessionElapsedSec } from "./activeBar";
import type { LoggedExercise } from "../../types";

const T0 = Date.parse("2026-09-30T10:00:00Z");
const running = (minutesIn: number, pausedMin = 0, currentExercise = 0) => ({
  routineId: "r",
  currentExercise,
  startedAt: new Date(T0).toISOString(),
  pausedAt: null,
  pausedMs: pausedMin * 60000,
  status: "running" as const,
  now: T0 + minutesIn * 60000,
});

test("time left = estimate − elapsed, excluding paused time", () => {
  const { now, ...s } = running(15, 5);
  // 15 min on the clock, 5 of them paused: 10 elapsed of 60.
  assert.equal(sessionElapsedSec(s, now), 600);
  assert.equal(activeBarLine(s, 3, 60, now), "Exercise 1 of 3 · 50m left");
});

test("over the estimate shows elapsed instead", () => {
  const { now, ...s } = running(65, 0, 2);
  assert.equal(activeBarLine(s, 3, 60, now), "Exercise 3 of 3 · 1h 5m elapsed");
});

test("no estimate shows elapsed", () => {
  const { now, ...s } = running(12);
  assert.equal(activeBarLine(s, 4, 0, now), "Exercise 1 of 4 · 12m elapsed");
});

test("the last partial minute still reads 1m left", () => {
  const { now, ...s } = running(59.5);
  assert.equal(activeBarLine(s, 3, 60, now), "Exercise 1 of 3 · 1m left");
});

test("paused reads 'Paused · Exercise X of Y' and the clock stops at pausedAt", () => {
  const s = {
    routineId: "r",
    currentExercise: 1,
    startedAt: new Date(T0).toISOString(),
    pausedAt: new Date(T0 + 20 * 60000).toISOString(),
    pausedMs: 0,
    status: "paused" as const,
  };
  assert.equal(activeBarLine(s, 3, 60, T0 + 90 * 60000), "Paused · Exercise 2 of 3");
  assert.equal(sessionElapsedSec(s, T0 + 90 * 60000), 1200);
});

test("loggedFraction counts ticked sets and sets with an outcome", () => {
  const set = (completed: boolean, outcome?: "failed") => ({ reps: 5, weightKg: 50, completed, outcome }) as unknown as LoggedExercise["sets"][number];
  const logged = [
    { sets: [set(true), set(false, "failed"), set(false)] },
    { sets: [set(false)] },
  ] as unknown as LoggedExercise[];
  assert.equal(loggedFraction(logged), 0.5);
  assert.equal(loggedFraction(undefined), 0);
  assert.equal(loggedFraction([]), 0);
});
