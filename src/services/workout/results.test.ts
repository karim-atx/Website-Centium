import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  averagePace,
  blockResultLine,
  blockScore,
  checkBlockResult,
  enduranceResultLine,
  serializeEnduranceResult,
} from "./results.ts";
import type { BlockResult } from "../../types";

const result = (patch: Partial<BlockResult> & Pick<BlockResult, "kind">): BlockResult => ({
  id: "b1",
  ...patch,
});

// --- block scores ------------------------------------------------------------

test("an AMRAP scores rounds, and leftover reps when there are any", () => {
  assert.equal(blockScore(result({ kind: "amrap", roundsCompleted: 7, extraReps: 5 })), "7 rounds + 5 reps");
  assert.equal(blockScore(result({ kind: "amrap", roundsCompleted: 7 })), "7 rounds");
  assert.equal(blockScore(result({ kind: "amrap", roundsCompleted: 1 })), "1 round");
});

test("an AMRAP with nothing finished says so rather than nothing", () => {
  assert.equal(blockScore(result({ kind: "amrap", roundsCompleted: 0, extraReps: 4 })), "0 rounds + 4 reps");
});

test("an EMOM says how many of how many", () => {
  assert.equal(blockScore(result({ kind: "emom", rounds: 10, roundsCompleted: 8 })), "8 of 10 rounds");
});

test("an EMOM with no planned round count still reads", () => {
  assert.equal(blockScore(result({ kind: "emom", roundsCompleted: 8 })), "8 rounds");
});

test("a For Time is a clock", () => {
  assert.equal(blockScore(result({ kind: "for_time", timeSeconds: 872 })), "14:32");
});

test("a capped For Time says it was capped, and how far they got", () => {
  assert.equal(
    blockScore(result({ kind: "for_time", timeSeconds: 1200, capped: true, rounds: 5, roundsCompleted: 3 })),
    "capped at 20:00, 3 of 5 rounds"
  );
  assert.equal(
    blockScore(result({ kind: "for_time", timeSeconds: 1200, capped: true, roundsCompleted: 3 })),
    "capped at 20:00, 3 rounds"
  );
  assert.equal(
    blockScore(result({ kind: "for_time", timeSeconds: 1200, capped: true })),
    "capped at 20:00"
  );
});

test("a superset scores nothing, because it is not a thing you win", () => {
  assert.equal(blockScore(result({ kind: "superset" })), "");
  assert.equal(blockResultLine(result({ kind: "superset" })), "Superset A", "just its heading");
});

test("the line pairs the block's own heading with its score", () => {
  assert.equal(
    blockResultLine(result({ kind: "amrap", timeCapSeconds: 720, roundsCompleted: 7, extraReps: 5 })),
    "AMRAP · 12 min: 7 rounds + 5 reps"
  );
  assert.equal(
    blockResultLine(result({ kind: "for_time", rounds: 5, timeCapSeconds: 1200, timeSeconds: 1200, capped: true, roundsCompleted: 3 })),
    "For Time · 5 rounds (cap 20 min): capped at 20:00, 3 of 5 rounds"
  );
});

test("a label the athlete wrote wins over the generated heading", () => {
  assert.equal(
    blockResultLine(result({ kind: "emom", label: "Finisher", rounds: 8, roundsCompleted: 8 })),
    "Finisher: 8 of 8 rounds"
  );
});

// --- what the database will accept -------------------------------------------

test("an AMRAP and an EMOM must say how many rounds", () => {
  assert.match(checkBlockResult(result({ kind: "amrap" })) ?? "", /how many rounds/i);
  assert.match(checkBlockResult(result({ kind: "emom" })) ?? "", /how many rounds/i);
  assert.equal(checkBlockResult(result({ kind: "amrap", roundsCompleted: 0 })), null, "zero is an answer");
});

test("a For Time must carry a time above zero, which the column requires", () => {
  assert.ok(checkBlockResult(result({ kind: "for_time" })));
  assert.ok(checkBlockResult(result({ kind: "for_time", timeSeconds: 0 })));
  assert.equal(checkBlockResult(result({ kind: "for_time", timeSeconds: 1 })), null);
});

test("a superset needs nothing", () => {
  assert.equal(checkBlockResult(result({ kind: "superset" })), null);
});

// --- endurance ---------------------------------------------------------------

test("an endurance result reads as time, distance, pace and heart rate", () => {
  assert.equal(
    enduranceResultLine({ duration_seconds: 2290, distance_meters: 6400, avg_pace_sec_per_km: 358, avg_hr: 148 }),
    "38:10 · 6.4 km · avg 5:58 /km · avg 148 bpm"
  );
});

test("intervals completed sit between distance and pace", () => {
  assert.equal(
    enduranceResultLine({ duration_seconds: 2290, distance_meters: 4800, intervals_completed: 6, avg_pace_sec_per_km: 264 }),
    "38:10 · 4.8 km · 6 intervals · avg 4:24 /km"
  );
});

test("what the watch did not report is left out, not printed as zero", () => {
  assert.equal(enduranceResultLine({ duration_seconds: 1800 }), "30:00");
  assert.equal(enduranceResultLine({}), "");
});

test("pace is derived from time and distance", () => {
  assert.equal(averagePace(2290, 6400), 358);
  assert.equal(averagePace(1500, 5000), 300);
});

test("pace is undefined rather than infinite when a side is missing", () => {
  assert.equal(averagePace(1800, 0), undefined);
  assert.equal(averagePace(0, 5000), undefined);
  assert.equal(averagePace(undefined, 5000), undefined);
});

// valid_endurance_result() rejects an empty object, an unknown key, a negative
// and a non-integer. A 23514 at the end of a session costs the whole workout,
// so none of those may leave here.
test("serializing drops empties and rounds to whole numbers", () => {
  assert.deepEqual(
    serializeEnduranceResult({ duration_seconds: 1800.4, distance_meters: 5000, avg_hr: 0, intervals_completed: undefined }),
    { duration_seconds: 1800, distance_meters: 5000 }
  );
});

test("a result with nothing in it becomes null, not an empty object", () => {
  assert.equal(serializeEnduranceResult({}), null);
  assert.equal(serializeEnduranceResult({ avg_hr: 0, duration_seconds: 0 }), null);
});

test("a negative never reaches the column", () => {
  assert.equal(serializeEnduranceResult({ avg_hr: -5 }), null);
});
