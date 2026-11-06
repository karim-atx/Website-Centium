import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stepsByDay, stepsDayParts, stepsOfDay, syncedStepsOf } from "./stepsRule.ts";

describe("stepsOfDay", () => {
  it("the hand-logged reading wins on a day with both", () => {
    assert.equal(stepsOfDay(5000, 8123), 5000);
  });
  it("otherwise the synced day, else nothing", () => {
    assert.equal(stepsOfDay(null, 8123), 8123);
    assert.equal(stepsOfDay(0, 8123), 8123);
    assert.equal(stepsOfDay(null, 0), null);
    assert.equal(stepsOfDay(undefined, null), null);
  });
});

describe("stepsByDay", () => {
  it("merges both, hand-logged over synced on a shared day", () => {
    const out = stepsByDay(
      [
        { date: "2026-11-05", value: 5000 },
        { date: "2026-11-04", value: 3000 },
      ],
      { "2026-11-05": { steps: 8123 }, "2026-11-06": { steps: 6100 }, "2026-11-03": { steps: null } }
    );
    assert.deepEqual(out, { "2026-11-04": 3000, "2026-11-05": 5000, "2026-11-06": 6100 });
  });
});

describe("stepsDayParts", () => {
  it("a day with both: shows the hand-logged count and keeps the synced one apart", () => {
    assert.deepEqual(stepsDayParts(5000, 8123), { shown: 5000, manual: 5000, synced: 8123, both: true });
  });
  it("hand-logged only and synced only are not both", () => {
    assert.deepEqual(stepsDayParts(5000, null), { shown: 5000, manual: 5000, synced: null, both: false });
    assert.deepEqual(stepsDayParts(undefined, 8123), { shown: 8123, manual: null, synced: 8123, both: false });
  });
  it("zero counts as nothing on either side", () => {
    assert.deepEqual(stepsDayParts(0, 8123), { shown: 8123, manual: null, synced: 8123, both: false });
    assert.deepEqual(stepsDayParts(5000, 0), { shown: 5000, manual: 5000, synced: null, both: false });
    assert.deepEqual(stepsDayParts(null, null), { shown: null, manual: null, synced: null, both: false });
  });
});

describe("syncedStepsOf", () => {
  it("the day's steps only when a phone source gave them", () => {
    assert.equal(syncedStepsOf({ steps: 8123, sources: { steps: "android_health" } }), 8123);
    assert.equal(syncedStepsOf({ steps: 5000, sources: { steps: "manual" } }), null);
    assert.equal(syncedStepsOf({ steps: 8123, sources: { resting_bpm: "apple_health" } }), null);
    assert.equal(syncedStepsOf({ steps: 8123 }), null);
    assert.equal(syncedStepsOf(undefined), null);
  });
});
