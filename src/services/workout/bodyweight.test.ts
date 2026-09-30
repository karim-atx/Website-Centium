import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatSetWeight, loadKg, volumeForSets } from "./index";
import { isWorkingSet } from "./stats";
import type { LoggedSet } from "../../types";

const set = (weightKg: number | null, reps: number, completed = true): LoggedSet => ({ setNumber: 1, weightKg, reps, completed });

test("0 kg shows as Bodyweight (BW where tight); blank shows nothing", () => {
  assert.equal(formatSetWeight(0), "Bodyweight");
  assert.equal(formatSetWeight(0, true), "BW");
  assert.equal(formatSetWeight(62.5), "62.5 kg");
  assert.equal(formatSetWeight(null), null);
});

test("bodyweight adds 0 kg of external load to volume", () => {
  assert.equal(volumeForSets([set(0, 12), set(0, 10)]), 0);
  assert.equal(volumeForSets([set(0, 12), set(20, 10)]), 200);
  assert.equal(loadKg(set(null, 5)), 0);
});

test("a bodyweight set is not a working set for load: no top set, no 1RM", () => {
  assert.equal(isWorkingSet(set(0, 12)), false);
  assert.equal(isWorkingSet(set(20, 12)), true);
});

test("an old-format paused session's untouched 0 rows become blank; typed and logged rows stay", async () => {
  const { upgradeLegacyBlankWeights } = await import("./session");
  const legacy = [{ exerciseId: "e", name: "Squat", sets: [set(0, 0, false), set(0, 10, true), set(60, 0, false)] }];
  const up = upgradeLegacyBlankWeights(legacy);
  assert.deepEqual(up[0].sets.map((s) => s.weightKg), [null, 0, 60]);
  // A new-format session (it already has a null) is left exactly as it is.
  const modern = [{ exerciseId: "e", name: "Squat", sets: [set(null, 0, false), set(0, 0, false)] }];
  assert.equal(upgradeLegacyBlankWeights(modern), modern);
});
