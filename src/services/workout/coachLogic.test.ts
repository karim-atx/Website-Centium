import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildSwap,
  derivedSwaps,
  optionsTargetText,
  loggedOffText,
  resultsSentMessage,
  seedPrescribedTypes,
  sentLine,
  swapsPayload,
  SWAPS_MAX_BYTES,
  targetLine,
} from "./coachLogic";
import type { LoggedSet } from "../../types";

const squat = { reps: 6, weightKg: 82.5, rpe: 8, setTypes: ["warmup", "normal", "normal", "normal", "dropset"] as const };

test("target line per prescribed set type", () => {
  const ex = { ...squat, setTypes: [...squat.setTypes] };
  assert.equal(targetLine(ex, 0), "Warm-up · 6 × 82.5 kg");
  assert.equal(targetLine(ex, 1), "Target 6 × 82.5 kg · RPE 8");
  assert.equal(targetLine(ex, 4), "Drop set · 6 × 82.5 kg");
  // Past the prescribed list: a normal set.
  assert.equal(targetLine(ex, 7), "Target 6 × 82.5 kg · RPE 8");
  assert.equal(targetLine({ ...ex, setTypes: ["pr"] }, 0), "Personal record · 6 × 82.5 kg");
});

test("target line without a weight, with a range, from 1RM", () => {
  assert.equal(targetLine({ reps: 8, weightKg: null }, 0), "Target 8 reps");
  assert.equal(targetLine({ reps: 8, weightKg: 0, rpe: 7 }, 0), "Target 8 reps · RPE 7");
  assert.equal(targetLine({ minReps: 8, maxReps: 12, weightKg: 70 }, 0), "Target 8 to 12 reps × 70 kg");
  // resolve_weight's result wins over the stored weight.
  assert.equal(targetLine({ reps: 5, weightKg: 60 }, 0, 102.5), "Target 5 × 102.5 kg");
  assert.equal(targetLine({ weightKg: null }, 0), null);
});

const set = (p: Partial<LoggedSet>): LoggedSet => ({ setNumber: 1, reps: 0, weightKg: null, completed: false, ...p });

test("what a logged set changed from its target", () => {
  const ex = { reps: 6, weightKg: 82.5 };
  assert.equal(loggedOffText(ex, set({ reps: 6, weightKg: 82.5, completed: true })), null);
  assert.equal(loggedOffText(ex, set({ reps: 6, weightKg: 80, completed: true })), "80 kg");
  assert.equal(loggedOffText(ex, set({ reps: 8, weightKg: 82.5, completed: true })), "8 reps");
  assert.equal(loggedOffText(ex, set({ reps: 8, weightKg: 28, completed: true })), "8 × 28 kg");
  // Not done: nothing to compare.
  assert.equal(loggedOffText(ex, set({ reps: 8, weightKg: 28 })), null);
  // A range is met by any number in it.
  assert.equal(loggedOffText({ minReps: 8, maxReps: 12, weightKg: 70 }, set({ reps: 10, weightKg: 70, completed: true })), null);
});

test("prescribed warm-up and drop sets seed the asked rows only", () => {
  const sets = [set({ setNumber: 1 }), set({ setNumber: 2 }), set({ setNumber: 3, optional: true }), set({ setNumber: 4, setType: "normal" })];
  const out = seedPrescribedTypes({ setTypes: ["warmup", "pr", "dropset", "dropset"] }, sets);
  assert.equal(out[0].setType, "warmup");
  assert.equal(out[1].setType, undefined); // PR is how a set went, not a plan
  assert.equal(out[2].setType, undefined); // optional rows stay untouched
  assert.equal(out[3].setType, "normal"); // already set
  assert.equal(seedPrescribedTypes({}, sets), sets);
});

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

test("swap payload in the documented shape", () => {
  const s = buildSwap(2, { exerciseId: A }, { customExerciseId: B }, "  The rack was taken.  ");
  assert.deepEqual(s, {
    position: 2,
    from_exercise_id: A,
    from_custom_exercise_id: null,
    to_exercise_id: null,
    to_custom_exercise_id: B,
    reason: "The rack was taken.",
  });
  assert.equal(buildSwap(0, { exerciseId: A }, { exerciseId: B }, "x".repeat(80)).reason!.length, 60);
  assert.equal(buildSwap(0, { exerciseId: A }, { exerciseId: B }, "   ").reason, null);
  // Local (non-uuid) ids never reach the column.
  assert.equal(buildSwap(0, { exerciseId: "ex1" }, { exerciseId: B }, null).from_exercise_id, null);
});

test("swaps payload: last swap per position wins, swap-backs drop, routine order, null when none", () => {
  const out = swapsPayload([
    buildSwap(3, { exerciseId: A }, { exerciseId: B }, null),
    buildSwap(1, { exerciseId: A }, { exerciseId: B }, null),
    buildSwap(3, { exerciseId: A }, { exerciseId: C }, "later"),
  ]);
  assert.deepEqual(out!.map((s) => [s.position, s.to_exercise_id, s.reason]), [
    [1, B, null],
    [3, C, "later"],
  ]);
  // Swapped back to the routine's own exercise: no swap.
  assert.equal(swapsPayload([buildSwap(1, { exerciseId: A }, { exerciseId: B }, null), buildSwap(1, { exerciseId: A }, { exerciseId: A }, null)]), null);
  assert.equal(swapsPayload([]), null);
});

test("swaps payload stays within 8 KB", () => {
  const many = Array.from({ length: 80 }, (_, i) => buildSwap(i, { exerciseId: A }, { exerciseId: B }, "r".repeat(60)));
  const out = swapsPayload(many)!;
  assert.ok(new TextEncoder().encode(JSON.stringify(out)).length <= SWAPS_MAX_BYTES);
  assert.ok(out.length > 0);
});

test("results sent and history lines", () => {
  assert.equal(resultsSentMessage("Alex", 1, 2), "Results sent to Alex, with your swap and changed sets.");
  assert.equal(resultsSentMessage("Alex", 0, 0), "Results sent to Alex.");
  assert.equal(resultsSentMessage("Alex", 2, 0), "Results sent to Alex, with your 2 swaps.");
  assert.equal(resultsSentMessage("Rami", 0, 1), "Results sent to Rami, with changed sets.");
  assert.equal(sentLine("Alex", 1), "Sent to Alex · 1 swap");
  assert.equal(sentLine("Alex", 0), "Sent to Alex");
});

test("set options target line", () => {
  const ex = { reps: 6, weightKg: 82.5, rpe: 8, setTypes: ["warmup" as const] };
  assert.equal(optionsTargetText("Alex", ex, 1), "Alex's target: 6 × 82.5 kg at RPE 8");
  assert.equal(optionsTargetText("Alex", ex, 0), "Alex's target: warm-up, 6 × 82.5 kg");
  assert.equal(optionsTargetText(null, { reps: 8, weightKg: null }, 0), "Your coach's target: 8 reps");
  assert.equal(optionsTargetText("Alex", { weightKg: null }, 0), null);
});

test("swaps derived from the logged exercises, by position", () => {
  const template = [
    { name: "Back squat", exerciseId: A },
    { name: "Bench press", exerciseId: B },
  ];
  const logged = [
    { name: "Goblet squat", catalogExerciseId: C },
    { name: "Bench press", catalogExerciseId: B },
  ];
  const swaps = derivedSwaps(template, logged, { 0: "The rack was taken." });
  assert.deepEqual(swaps, [
    { position: 0, from_exercise_id: A, from_custom_exercise_id: null, to_exercise_id: C, to_custom_exercise_id: null, reason: "The rack was taken." },
  ]);
  assert.deepEqual(derivedSwaps(template, [logged[1], logged[1]]).map((s) => s.position), [0]);
  assert.deepEqual(derivedSwaps(template, [{ name: "Back squat", catalogExerciseId: A }, logged[1]]), []);
});
