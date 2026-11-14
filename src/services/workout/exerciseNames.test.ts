import { strict as assert } from "node:assert";
import { test } from "node:test";
import { libraryNameSet, nameClash, nameShared, shownExerciseName } from "./exerciseNames";
import { definitionOf, exerciseKey, recordKey, refKey, routineExerciseKey } from "./stats";
import { liftMaxes } from "./oneRepMax";
import { exerciseHistory } from "./history";
import type { LoggedSet, WorkoutSession } from "../../types";

// Batch D GH: a library "Bench Press" and a custom "Bench Press" are two
// movements: records match by id, never by name, and the custom one reads
// "(custom)" wherever both could appear.

const set = (weightKg: number, reps: number) => ({ setNumber: 1, weightKg, reps, completed: true }) as LoggedSet;
const LIB = { id: "lib-bench", name: "Bench Press", classification: "barbell" };
const CUSTOM = { id: "cus-bench", name: "Bench Press", classification: "dumbbell" };
const SQUAT = { id: "lib-squat", name: "Back Squat", classification: "barbell" };
const catalog = [LIB, SQUAT];
const custom = [CUSTOM];

const session = (id: string, date: string, exercises: { name: string; catalogExerciseId?: string; customExerciseId?: string; sets: LoggedSet[] }[]) =>
  ({ id, date, startedAt: `${date}T10:00:00Z`, routineName: "Push", exercises: exercises.map((e, i) => ({ exerciseId: `le${i}`, ...e })) }) as unknown as WorkoutSession;

test("library and custom Bench Press keep separate 1RMs", () => {
  const lifts = liftMaxes(
    [
      session("a", "2026-11-01", [
        { name: "Bench Press", catalogExerciseId: LIB.id, sets: [set(100, 5)] },
        { name: "Bench Press", customExerciseId: CUSTOM.id, sets: [set(40, 10)] },
      ]),
    ],
    "2026-11-13"
  );
  assert.deepEqual(lifts.map((l) => [l.key, l.catalogId ?? null, l.customId ?? null, Math.round(l.oneRm)]).sort(), [
    ["c:lib-bench", "lib-bench", null, 117],
    ["u:cus-bench", null, "cus-bench", 53],
  ]);
});

test("record keys are ids, never names", () => {
  assert.equal(recordKey({ exerciseId: LIB.id, name: "Bench Press" }), "c:lib-bench");
  assert.equal(recordKey({ customExerciseId: CUSTOM.id, name: "Bench Press" }), "u:cus-bench");
  assert.equal(refKey({ exercise_id: null, custom_exercise_id: CUSTOM.id }, "Bench Press"), "u:cus-bench");
  assert.equal(refKey({ exercise_id: LIB.id, custom_exercise_id: null }, "Bench Press"), "c:lib-bench");
  // A logged exercise and a routine exercise for the same movement share the key.
  assert.equal(exerciseKey({ customExerciseId: CUSTOM.id, name: "Bench Press" }), routineExerciseKey({ customExerciseId: CUSTOM.id, name: "Bench Press" }));
  assert.equal(routineExerciseKey({ exerciseId: LIB.id, name: "Bench Press" }), "c:lib-bench");
  // Only a movement with no id at all falls back to its name.
  assert.equal(exerciseKey({ name: " Bench Press " }), "n:bench press");
});

test("a definition is found by id; a shared name is never guessed", () => {
  assert.equal(definitionOf({ name: "Bench Press", catalogExerciseId: LIB.id }, catalog, custom), LIB);
  assert.equal(definitionOf({ name: "Bench Press", customExerciseId: CUSTOM.id }, catalog, custom), CUSTOM);
  // No id, a name both lists have: no definition (no 1RM guessed for either).
  assert.equal(definitionOf({ name: "bench press" }, catalog, custom), undefined);
  // No id, a name only one list has: that one.
  assert.equal(definitionOf({ name: "Back Squat" }, catalog, custom), SQUAT);
  // A custom id that no longer resolves (replaced on upload): the custom movement by name, never the library one.
  assert.equal(definitionOf({ name: "Bench Press", customExerciseId: "cx123" }, catalog, custom), CUSTOM);
  assert.equal(definitionOf({ name: "Back Squat", customExerciseId: "cx123" }, catalog, custom), undefined);
});

test("\"(custom)\" only after a custom movement that shares a library name", () => {
  const names = libraryNameSet(catalog);
  assert.equal(shownExerciseName("Bench Press", true, names), "Bench Press (custom)");
  assert.equal(shownExerciseName("bench press ", true, names), "bench press  (custom)");
  assert.equal(shownExerciseName("Bench Press", false, names), "Bench Press");
  assert.equal(shownExerciseName("Cable Fly", true, names), "Cable Fly");
  assert.equal(nameClash("Back Squat", true, names), true);
  assert.equal(nameShared("Bench Press", catalog, custom), true);
  assert.equal(nameShared("Back Squat", catalog, custom), false);
});

test("history by id; an id-less legacy row with a shared name is in neither history", () => {
  const sessions = [
    session("a", "2026-11-01", [
      { name: "Bench Press", catalogExerciseId: LIB.id, sets: [set(100, 5)] },
      { name: "Bench Press", customExerciseId: CUSTOM.id, sets: [set(40, 10)] },
    ]),
    session("b", "2026-10-01", [{ name: "Bench Press", sets: [set(60, 5)] }]),
  ];
  assert.deepEqual(exerciseHistory(sessions, { catalogId: LIB.id, name: "Bench Press", nameShared: true }).map((h) => h.line), ["100×5"]);
  assert.deepEqual(exerciseHistory(sessions, { customId: CUSTOM.id, name: "Bench Press", nameShared: true }).map((h) => h.line), ["40×10"]);
  // Not shared: the legacy row still joins by name, as before.
  assert.deepEqual(exerciseHistory(sessions, { catalogId: LIB.id, name: "Bench Press" }).map((h) => h.line), ["100×5", "60×5"]);
});
