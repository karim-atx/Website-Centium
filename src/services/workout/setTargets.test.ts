import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  TARGET_RPE_CHOICES,
  cleanSetTarget,
  isTargetRpe,
  prescribedSetCount,
  readSetTargets,
  resizeSetTargets,
  setTargetLines,
  setTargetText,
  setTargetsColumn,
  withSetTarget,
} from "./setTargets.ts";

test("a target RPE is 1 to 10 in halves", () => {
  for (const ok of [1, 1.5, 6, 7.5, 10]) assert.equal(isTargetRpe(ok), true, String(ok));
  for (const bad of [0, 0.5, 10.5, 12, 7.25, 8.1, Number.NaN, "8", null, undefined]) assert.equal(isTargetRpe(bad), false, String(bad));
  assert.equal(TARGET_RPE_CHOICES.length, 19);
  assert.equal(TARGET_RPE_CHOICES[0], 1);
  assert.equal(TARGET_RPE_CHOICES[18], 10);
  assert.ok(TARGET_RPE_CHOICES.every(isTargetRpe));
});

test("an entry is cleaned to what the column takes", () => {
  assert.deepEqual(cleanSetTarget({ rpe: 8, note: "  keep the back flat " }), { rpe: 8, note: "keep the back flat" });
  assert.deepEqual(cleanSetTarget({ rpe: 12, note: "x" }), { note: "x" });
  assert.deepEqual(cleanSetTarget({ rpe: 7.5 }), { rpe: 7.5 });
  assert.equal(cleanSetTarget({ rpe: 0, note: "   " }), null);
  assert.equal(cleanSetTarget(null), null);
  assert.equal(cleanSetTarget([1]), null);
  assert.equal(cleanSetTarget("RPE 8"), null);
  // Unknown keys never reach the column (set_targets_valid refuses them).
  assert.deepEqual(cleanSetTarget({ rpe: 9, reps: 5 } as never), { rpe: 9 });
  assert.equal(cleanSetTarget({ note: "a".repeat(250) })?.note?.length, 200);
});

test("the list keeps in step with the sets", () => {
  const list = [{ rpe: 8 }, null, { note: "slow" }];
  assert.deepEqual(resizeSetTargets(list, 2), [{ rpe: 8 }, null]);
  assert.deepEqual(resizeSetTargets(list, 5), [{ rpe: 8 }, null, { note: "slow" }, null, null]);
  assert.deepEqual(resizeSetTargets(undefined, 2), [null, null]);
  assert.equal(resizeSetTargets(list, 80).length, 50);
  assert.deepEqual(resizeSetTargets(list, -1), []);
});

test("one set's target is set or cleared", () => {
  assert.deepEqual(withSetTarget(undefined, 1, { rpe: 9 }, 3), [null, { rpe: 9 }, null]);
  assert.deepEqual(withSetTarget([{ rpe: 8 }, { rpe: 9 }], 1, null, 2), [{ rpe: 8 }, null]);
  // A set past the count grows the list to reach it.
  assert.deepEqual(withSetTarget([], 2, { note: "x" }, 1), [null, null, { note: "x" }]);
});

test("the column value: trailing nulls dropped, null when empty, cut to the sets", () => {
  assert.equal(setTargetsColumn(undefined), null);
  assert.equal(setTargetsColumn([null, null]), null);
  assert.deepEqual(setTargetsColumn([{ rpe: 8 }, null, null]), [{ rpe: 8 }]);
  assert.deepEqual(setTargetsColumn([null, { rpe: 8 }, { note: "x" }], 2), [null, { rpe: 8 }]);
  assert.equal(setTargetsColumn([null, null, { rpe: 8 }], 2), null);
  assert.deepEqual(setTargetsColumn([{ rpe: 13, note: " " }, { rpe: 6.5 }]), [null, { rpe: 6.5 }]);
  assert.equal(setTargetsColumn(Array.from({ length: 70 }, () => ({ rpe: 7 })))?.length, 50);
});

test("a stored value is read, and an empty one is none", () => {
  assert.equal(readSetTargets(null), undefined);
  assert.equal(readSetTargets({ rpe: 8 }), undefined);
  assert.equal(readSetTargets([null, null]), undefined);
  assert.deepEqual(readSetTargets([null, { rpe: 8, note: "flat back" }]), [null, { rpe: 8, note: "flat back" }]);
});

test("the quiet line under a set", () => {
  assert.equal(setTargetText({ rpe: 8, note: "keep the back flat" }), "RPE 8 · keep the back flat");
  assert.equal(setTargetText({ rpe: 7.5 }), "RPE 7.5");
  assert.equal(setTargetText({ note: "pause at the bottom" }), "pause at the bottom");
  assert.equal(setTargetText(null), null);
  assert.deepEqual(setTargetLines([null, { rpe: 8 }, { note: "slow" }]), ["Set 2 · RPE 8", "Set 3 · slow"]);
});

test("the set count follows max, then sets, then min", () => {
  assert.equal(prescribedSetCount({ sets: 3, maxSets: 5 }), 5);
  assert.equal(prescribedSetCount({ sets: 3 }), 3);
  assert.equal(prescribedSetCount({ minSets: 2 }), 2);
  assert.equal(prescribedSetCount({}), 0);
  assert.equal(prescribedSetCount({ sets: 99 }), 50);
});
