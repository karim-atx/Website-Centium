import { strict as assert } from "node:assert";
import { test } from "node:test";
import { PRESCRIPTION_COLUMNS, prescriptionOf, toExercise, type PrescriptionRow } from "./prescription";
import { cleanRoutineCopy } from "./duplicate";
import type { Routine } from "../../types";

// Release 3 PRIORITY (data loss): a client's save replaces every
// routine_exercises row, so any column the read returns but the write leaves
// out is erased. A coach-assigned routine carries coach_note and set_types;
// these tests hold every read column to a lossless round trip.

const row: PrescriptionRow = {
  id: "11111111-1111-4111-8111-111111111111",
  position: 2,
  sets: 4,
  reps: 8,
  weight_kg: 60,
  min_sets: 3,
  max_sets: 5,
  min_reps: 6,
  max_reps: 10,
  intensity_pct: 75,
  rep_max_kg: 100,
  rep_max_update_mode: "prompt",
  rest_seconds: 120,
  rpe: 8.5,
  tempo: "3-1-1-0",
  estimated_one_rep_max_kg: 95,
  duration_seconds: 45,
  endurance_plan: null,
  block_id: "22222222-2222-4222-8222-222222222222",
  pinned_note: "Rack at 3",
  cardio_duration_min: 12,
  cardio_distance_km: 2.5,
  cardio_incline_pct: 3,
  cardio_pace_min_per_km: 5.5,
  cardio_avg_heart_rate: 140,
  coach_note: "Pause at the bottom of each rep.",
  set_types: ["warmup", "normal", null, "pr", "dropset"],
  exercises: {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Bench Press",
    classification: "barbell",
    muscle_groups: [],
    secondary_muscle_groups: [],
  },
  custom_exercise_library_items: null,
};

const columns = PRESCRIPTION_COLUMNS.split(",").map((c) => c.trim());

test("the read selects coach_note and set_types", () => {
  assert.ok(columns.includes("coach_note"));
  assert.ok(columns.includes("set_types"));
});

test("every column the routine reads is written back unchanged by a save", () => {
  const ex = toExercise(row)!;
  const written = prescriptionOf(
    ex,
    { exercise_id: ex.exerciseId!, custom_exercise_id: null },
    "routine",
    row.position,
    row.block_id
  ) as Record<string, unknown>;
  for (const col of columns) {
    // id is carried separately (writeExercises keeps the row id).
    if (col === "id") {
      assert.equal(ex.id, row.id);
      continue;
    }
    assert.ok(col in written, `the save drops ${col}`);
    const read = (row as unknown as Record<string, unknown>)[col];
    assert.deepEqual(written[col], read, `the save changes ${col}`);
  }
});

test("a coach-assigned routine keeps the coach's note and set types through a client edit", () => {
  const ex = toExercise(row)!;
  // The client edits their own fields only (here: reps and their pinned note).
  const edited = { ...ex, reps: 10, pinnedNote: "Rack at 4" };
  const written = prescriptionOf(edited, { exercise_id: ex.exerciseId!, custom_exercise_id: null }, "r", 0, null);
  assert.equal(written.coach_note, "Pause at the bottom of each rep.");
  assert.deepEqual(written.set_types, ["warmup", "normal", null, "pr", "dropset"]);
  assert.equal(written.reps, 10);
});

test("a routine with no coach data writes null for both, as before", () => {
  const ex = toExercise({ ...row, coach_note: null, set_types: null })!;
  assert.equal(ex.coachNote, undefined);
  assert.equal(ex.setTypes, undefined);
  const written = prescriptionOf(ex, { exercise_id: ex.exerciseId!, custom_exercise_id: null }, "r", 0, null);
  assert.equal(written.coach_note, null);
  assert.equal(written.set_types, null);
});

test("Duplicate keeps the prescribed set types but not the coach's exercise note", () => {
  const ex = toExercise(row)!;
  const routine = { id: "r", folderId: null, name: "Push", color: "#7D6BB5", estimatedDurationMin: 40, exercises: [ex], blocks: [] } as unknown as Routine;
  const copy = cleanRoutineCopy(routine, "Push (copy)", null);
  assert.equal(copy.exercises[0].coachNote, undefined);
  assert.deepEqual(copy.exercises[0].setTypes, ["warmup", "normal", null, "pr", "dropset"]);
});
