import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  BODY_WEIGHT_MAX_KG,
  BODY_WEIGHT_MIN_KG,
  SET_REPS_CONFIRM,
  SET_REPS_MAX,
  SET_WEIGHT_CONFIRM_KG,
  SET_WEIGHT_MAX_KG,
  bodyWeightAllowed,
  checkSet,
  onlyImplausibleSets,
  plausibleOneRm,
  plausibleSet,
  plausibleVolumeKg,
  repsFromInput,
  setsOverCeiling,
  validReps,
} from "./setLimits";
import { isWorkingSet, lastSessionPrefill } from "./stats";
import { liftMaxes } from "./oneRepMax";
import { pointStats, trainingFrequency, volumePoints } from "./metrics";
import { exerciseHistory } from "./history";
import type { LoggedSet, WorkoutSession } from "../../types";

// Batch D GH: the client limits, which must match the Database session's
// CHECKs (logged_sets_weight_ceiling, logged_sets_reps_ceiling,
// health_metrics_weight_possible).

const set = (weightKg: number | null, reps: number, extra: Partial<LoggedSet> = {}) => ({ setNumber: 1, weightKg, reps, completed: true, ...extra }) as LoggedSet;
const session = (id: string, date: string, sets: LoggedSet[], totalVolumeKg: number, extra: Partial<WorkoutSession> = {}) =>
  ({ id, date, startedAt: `${date}T10:00:00Z`, routineId: "r1", routineName: "Push", durationSec: 60, totalVolumeKg, exercises: [{ exerciseId: "x", name: "Bench Press", catalogExerciseId: "c1", sets }], ...extra }) as WorkoutSession;

test("the figures: confirm above 300 kg / 100 reps, refuse above 1,000 kg / 1,000 reps, body weight 20–500", () => {
  assert.deepEqual([SET_WEIGHT_CONFIRM_KG, SET_WEIGHT_MAX_KG, SET_REPS_CONFIRM, SET_REPS_MAX, BODY_WEIGHT_MIN_KG, BODY_WEIGHT_MAX_KG], [300, 1000, 100, 1000, 20, 500]);
});

test("weight boundaries: 300 ok, 300.5 confirm, 1000 confirm, 1000.5 refuse", () => {
  assert.equal(checkSet(300, 5).level, "ok");
  assert.deepEqual(checkSet(300.5, 5), { level: "confirm", weight: true, reps: false });
  assert.equal(checkSet(1000, 1).level, "confirm");
  assert.deepEqual(checkSet(1000.5, 1), { level: "refuse", weight: true, reps: false });
  // Stored to 2 decimals (numeric(7,2)): 1000.004 is the 1000.00 the server takes, 1000.01 is not.
  assert.equal(checkSet(1000.004, 1).level, "confirm");
  assert.equal(checkSet(1000.01, 1).level, "refuse");
  // Bodyweight (0) and an untyped weight (null) are fine.
  assert.equal(checkSet(0, 10).level, "ok");
  assert.equal(checkSet(null, 10).level, "ok");
});

test("reps boundaries: 100 ok, 101 confirm, 1000 confirm, 1001 refuse; both values can be flagged", () => {
  assert.equal(checkSet(50, 100).level, "ok");
  assert.deepEqual(checkSet(50, 101), { level: "confirm", weight: false, reps: true });
  assert.equal(checkSet(50, 1000).level, "confirm");
  assert.deepEqual(checkSet(50, 1001), { level: "refuse", weight: false, reps: true });
  assert.deepEqual(checkSet(400, 150), { level: "confirm", weight: true, reps: true });
  assert.deepEqual(checkSet(2000, 2000), { level: "refuse", weight: true, reps: true });
  // A refusal wins over a confirm on the other value.
  assert.deepEqual(checkSet(1200, 150), { level: "refuse", weight: true, reps: false });
});

test("reps are whole numbers, at least 1", () => {
  assert.equal(validReps(0), false);
  assert.equal(validReps(1), true);
  assert.equal(validReps(2.5), false);
  assert.equal(validReps(-3), false);
  assert.equal(repsFromInput("12"), 12);
  assert.equal(repsFromInput("2.5"), 2);
  assert.equal(repsFromInput("2,5"), 2);
  assert.equal(repsFromInput(""), 0);
  assert.equal(repsFromInput("abc"), 0);
  assert.equal(repsFromInput("0"), 0);
});

test("body weight 20–500 inclusive: 19.9 no, 20 yes, 500 yes, 500.1 no", () => {
  assert.equal(bodyWeightAllowed(19.9), false);
  assert.equal(bodyWeightAllowed(20), true);
  assert.equal(bodyWeightAllowed(500), true);
  assert.equal(bodyWeightAllowed(500.1), false);
  assert.equal(bodyWeightAllowed(Number.NaN), false);
});

test("what readers ignore: over a ceiling, or an estimated 1RM over 1,000 kg", () => {
  assert.equal(plausibleSet(set(1000, 1)), true); // 1RM 1000
  assert.equal(plausibleSet(set(1000, 2)), false); // 1RM 1066.7
  assert.equal(plausibleSet(set(1000.5, 1)), false);
  assert.equal(plausibleSet(set(10, 1001)), false);
  assert.equal(plausibleSet(set(10, 1000)), true);
  assert.equal(plausibleSet(set(900, 5)), false); // 1050
  assert.equal(plausibleSet(set(0, 1000)), true);
  assert.equal(plausibleOneRm(1000), true);
  assert.equal(plausibleOneRm(1000.01), false);
  assert.equal(plausibleOneRm(0), false);
});

test("an old impossible set counts toward no 1RM, chart, history or prefill", () => {
  const sessions = [session("a", "2026-11-02", [set(100, 5), set(5000, 3)], 15500), session("b", "2026-11-09", [set(9999, 1)], 9999)];
  assert.equal(isWorkingSet(set(5000, 3)), false);
  const [bench] = liftMaxes(sessions, "2026-11-13");
  assert.equal(bench.sessions.length, 1);
  assert.equal(Math.round(bench.oneRm), 117);
  assert.deepEqual(volumePoints(sessions, "workout").map((p) => p.volumeKg), [500, 0]);
  assert.deepEqual(volumePoints(sessions, "week").map((p) => p.volumeKg), [500, 0]);
  const stats = pointStats(sessions);
  assert.equal(stats.volumeKg, 500);
  assert.equal(stats.sets, 1);
  assert.equal(stats.reps, 5);
  assert.equal(stats.maxWeightKg, 100);
  // Session b logged nothing possible: not a training day.
  assert.equal(onlyImplausibleSets(sessions[1]), true);
  assert.equal(trainingFrequency(sessions, "2026-11-13").weeks.reduce((a, b) => a + b, 0), 1);
  const hist = exerciseHistory(sessions, { catalogId: "c1", name: "Bench Press" });
  assert.deepEqual(hist.map((h) => [h.sets, h.volumeKg, h.line]), [[1, 500, "100×5"]]);
  const prefill = lastSessionPrefill([session("c", "2026-11-10", [set(80, 8), set(2000, 2000)], 640)], "r1").get("c:c1");
  assert.deepEqual(prefill, [{ weight: 80, reps: 8 }, { weight: null, reps: null }]);
});

test("an ordinary session reads exactly its stored total", () => {
  assert.equal(plausibleVolumeKg(session("a", "2026-11-02", [set(100, 5), set(300, 2)], 1100)), 1100);
});

test("the sets the server would refuse, in the logger's indexes", () => {
  const ex = [{ sets: [set(100, 5), set(1001, 1)] }, { sets: [set(20, 1001)] }];
  assert.deepEqual(setsOverCeiling(ex), ["0-1", "1-0"]);
  assert.deepEqual(setsOverCeiling([{ sets: [set(1000, 1000)] }]), []);
});

test("professional reads: impossible sets and weights are skipped", async () => {
  const { plausibleLift, plausibleReading, withoutImplausibleSets } = await import("./setLimits");
  assert.equal(plausibleLift(1000, 1), true);
  assert.equal(plausibleLift(1000.5, 1), false);
  assert.equal(plausibleLift(20, 1001), false);
  assert.equal(plausibleLift(null, 10), true);
  const r = withoutImplausibleSets([
    { kg: 100, reps: 5, completed: true },
    { kg: 5000, reps: 3, completed: true },
    { kg: 2000, reps: 1, completed: false },
  ]);
  assert.deepEqual(r.sets.map((s) => s.kg), [100]);
  assert.equal(r.droppedVolumeKg, 15000);
  assert.equal(plausibleReading("weight", 19.9), false);
  assert.equal(plausibleReading("weight", 20), true);
  assert.equal(plausibleReading("weight", 500), true);
  assert.equal(plausibleReading("weight", 500.1), false);
  assert.equal(plausibleReading("steps", 90000), true);
});
