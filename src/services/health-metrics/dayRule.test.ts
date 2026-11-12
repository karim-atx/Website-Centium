import { strict as assert } from "node:assert";
import { test } from "node:test";
import { kcalBurnedOn, ownFirst, sleepHistory, sleepHoursOn, workoutOfDay } from "./dayRule.ts";

test("own entries first, then synced; zero and missing count as none", () => {
  assert.equal(ownFirst(7, 9), 7);
  assert.equal(ownFirst(null, 9), 9);
  assert.equal(ownFirst(0, 9), 9);
  assert.equal(ownFirst(undefined, 0), null);
  assert.equal(ownFirst(null, null), null);
});

test("sleep: hand-logged hours win, else the synced night's time asleep", () => {
  assert.equal(sleepHoursOn(6.5, 480), 6.5);
  assert.equal(sleepHoursOn(null, 450), 7.5);
  assert.equal(sleepHoursOn(null, 0), null);
  assert.equal(sleepHoursOn(null, null), null);
});

test("sleep history merges both, hand-logged winning the same date, oldest first", () => {
  assert.deepEqual(
    sleepHistory(
      [{ date: "2026-11-10", value: 6 }],
      [
        { date: "2026-11-11", asleepMin: 420 },
        { date: "2026-11-10", asleepMin: 480 },
        { date: "2026-11-09", asleepMin: null },
      ]
    ),
    [
      { date: "2026-11-10", value: 6 },
      { date: "2026-11-11", value: 7 },
    ]
  );
});

test("calories burned: hand-logged, else the synced day", () => {
  assert.equal(kcalBurnedOn(2100, 2600), 2100);
  assert.equal(kcalBurnedOn(null, 2600), 2600);
  assert.equal(kcalBurnedOn(null, null), null);
});

test("the day's workout: the latest logged in Centium, else the latest synced, never another day", () => {
  const s = [
    { id: "a", date: "2026-11-12", source: "apple_health" as const },
    { id: "b", date: "2026-11-12", source: "manual" as const },
    { id: "c", date: "2026-11-12", source: "android_health" as const },
    { id: "d", date: "2026-11-11", source: "manual" as const },
  ];
  assert.equal(workoutOfDay(s, "2026-11-12")?.id, "b");
  assert.equal(workoutOfDay(s.filter((x) => x.id !== "b"), "2026-11-12")?.id, "c");
  assert.equal(workoutOfDay(s, "2026-11-13"), null);
  // A session saved before `source` existed (local cache) counts as logged in Centium.
  assert.equal(workoutOfDay([{ id: "e", date: "2026-11-12" }, { id: "f", date: "2026-11-12", source: "whoop" as const }], "2026-11-12")?.id, "e");
});
