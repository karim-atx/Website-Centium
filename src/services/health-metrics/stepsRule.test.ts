import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stepsByDay, stepsOfDay } from "./stepsRule.ts";

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
