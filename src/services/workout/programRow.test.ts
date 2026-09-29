import { strict as assert } from "node:assert";
import { test } from "node:test";
import { compactSeconds, programRow } from "./programRow";
import type { Exercise } from "../../types";

const ex = (e: Partial<Exercise>): Exercise => ({ id: "e", name: "X", ...e }) as Exercise;

test("strength: {sets} × {reps} over 'sets × reps', ranges with an en dash", () => {
  assert.deepEqual(programRow(ex({ classification: "barbell", sets: 4, reps: 8 })), { value: "4 × 8", label: "sets × reps", detail: "" });
  assert.deepEqual(programRow(ex({ classification: "dumbbell", sets: 3, minReps: 10, maxReps: 12 })).value, "3 × 10–12");
  assert.equal(programRow(ex({ classification: "machine_other", minSets: 3, maxSets: 5, minReps: 8, maxReps: 12 })).value, "3–5 × 8–12");
});

test("strength qualifiers move under the name", () => {
  assert.equal(programRow(ex({ classification: "barbell", sets: 5, reps: 5, intensityPct: 75, rpe: 8 })).detail, "@ 75% · RPE 8");
});

test("a hold is timed: duration over 'duration', the set count under the name", () => {
  assert.deepEqual(programRow(ex({ classification: "duration", sets: 3, durationSeconds: 45 })), { value: "45s", label: "duration", detail: "3 sets" });
  assert.deepEqual(programRow(ex({ classification: "duration", sets: 1, durationSeconds: 600 })), { value: "10m", label: "duration", detail: "" });
});

test("steady cardio is timed; repeated steady cardio is rounds with the step under the name", () => {
  const steady = (seconds: number, sets: number) =>
    ex({
      classification: "cardio",
      sets,
      endurancePlan: { version: 1, main: { type: "steady", step: { measure: "time", seconds, target: { kind: "pace", min_sec_per_km: 420, max_sec_per_km: 420 } } } },
    } as Partial<Exercise>);
  assert.deepEqual(programRow(steady(1200, 1)), { value: "20m", label: "duration", detail: "@ 7:00 /km" });
  const r = programRow(steady(60, 6));
  assert.equal(r.value, "6");
  assert.equal(r.label, "rounds");
  assert.equal(r.detail, "1 min @ 7:00 /km");
});

test("interval cardio: repeats over 'rounds', work / recovery under the name", () => {
  const r = programRow(
    ex({
      classification: "cardio",
      endurancePlan: {
        version: 1,
        main: {
          type: "intervals",
          repeats: 6,
          work: { measure: "time", seconds: 120, mode: "run", target: { kind: "open" } },
          recovery: { measure: "time", seconds: 60, mode: "walk", target: { kind: "open" } },
        },
      },
    } as Partial<Exercise>)
  );
  assert.deepEqual(r, { value: "6", label: "rounds", detail: "2 min run / 1 min walk" });
});

test("compact seconds: below a minute and remainders", () => {
  assert.equal(compactSeconds(45), "45s");
  assert.equal(compactSeconds(90), "1m 30s");
  assert.equal(compactSeconds(600), "10m");
  assert.equal(compactSeconds(3900), "1h 5m");
});
