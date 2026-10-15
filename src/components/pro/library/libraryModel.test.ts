import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  assignedLine,
  compareLog,
  currentWeek,
  deltaKg,
  parseSwaps,
  programmeEnd,
  programmeWeeks,
  targetFor,
  targetsSummary,
  templateMeta,
  topLift,
  weekCell,
} from "./libraryModel";
import { setTypesColumn } from "../../../services/templates/setTypes";
import type { Exercise, LoggedSet, WorkoutSession } from "../../../types";

const ex = (name: string, extra: Partial<Exercise> = {}): Exercise => ({ id: name, name, weightKg: null, ...extra });
const set = (reps: number, weightKg: number, extra: Partial<LoggedSet> = {}): LoggedSet => ({ setNumber: 1, reps, weightKg, completed: true, ...extra });

test("templateMeta says only what is stored", () => {
  assert.equal(templateMeta({ durationWeeks: 8, exercises: [ex("a"), ex("b")] }), "8 weeks · 2 exercises");
  assert.equal(templateMeta({ durationWeeks: null, exercises: [ex("a")] }), "1 exercise");
  assert.equal(templateMeta({ durationWeeks: 1, exercises: [] }), "1 week · 0 exercises");
});

test("programmeEnd mirrors assign_template_to_client", () => {
  // Strength foundations fixture: starts 2026-10-01, 4 weeks, week 1 -> ends 2026-10-28.
  assert.equal(programmeEnd("2026-10-01", 1, 4), "2026-10-28");
  assert.equal(programmeEnd("2026-10-12", 3, 8), "2026-11-22");
  assert.equal(programmeEnd("2026-10-12", 1, null), null);
});

test("currentWeek counts from the join week and stops at the end", () => {
  assert.deepEqual(currentWeek("2026-10-01", 1, 4, "2026-10-15"), { n: 3, of: 4 });
  assert.deepEqual(currentWeek("2026-10-01", 3, 4, "2026-10-08"), { n: 4, of: 4 });
  assert.equal(currentWeek("2026-10-01", 1, 4, "2026-09-30"), null);
  assert.equal(currentWeek("2026-10-01", 1, 4, "2026-10-29"), null);
  assert.deepEqual(currentWeek("2026-10-01", 1, null, "2026-10-29"), { n: 5, of: null });
});

test("assignedLine drops what it doesn't know", () => {
  assert.equal(assignedLine({ n: 3, of: 8 }, 86), "Week 3 of 8 · 86% done");
  assert.equal(assignedLine({ n: 3, of: 8 }, null), "Week 3 of 8");
  assert.equal(assignedLine(null, null), null);
});

test("programmeWeeks and weekCell", () => {
  const w = programmeWeeks({ startsOn: "2026-10-01", joinWeek: 3 }, 4);
  assert.deepEqual(w, [
    { week: 3, from: "2026-10-01", until: "2026-10-07" },
    { week: 4, from: "2026-10-08", until: "2026-10-14" },
  ]);
  assert.equal(weekCell(2, 2, false), "all");
  assert.equal(weekCell(2, 1, false), "part");
  assert.equal(weekCell(2, 0, false), "none");
  assert.equal(weekCell(null, null, false), "none");
  assert.equal(weekCell(2, 2, true), "future");
});

test("targets per client: resolve_weight and the summary", () => {
  assert.deepEqual(targetFor("a", 100, 80), { clientId: "a", oneRmKg: 100, fromOneRm: 80 });
  assert.deepEqual(targetFor("b", 52, 80), { clientId: "b", oneRmKg: 52, fromOneRm: 42.5 });
  assert.deepEqual(targetFor("c", null, 80), { clientId: "c", oneRmKg: null, fromOneRm: null });
  assert.equal(targetsSummary([{ name: "John Doe", kg: 82.5 }, { name: "Omar", kg: null }, { name: "Jane Smith", kg: 40 }]), "John Doe 82.5 kg · Jane Smith 40 kg");
  assert.equal(targetsSummary([{ name: "Omar", kg: null }]), null);
});

test("parseSwaps reads the documented shape (ids only) and names from the library", () => {
  const names = {
    prescribed: [{ name: "Bench press", exerciseId: "x0" }, { name: "Back squat", exerciseId: "x1" }, { name: "Row", customExerciseId: "c1" }],
    catalog: [{ id: "x1", name: "Back squat" }, { id: "x9", name: "Goblet squat" }],
    custom: [{ id: "c1", name: "Row" }],
    logged: [{ name: "Bench press" }, { name: "Goblet squat" }, { name: "My band row" }],
  };
  assert.deepEqual(
    parseSwaps(
      [
        { position: 1, from_exercise_id: "x1", from_custom_exercise_id: null, to_exercise_id: "x9", to_custom_exercise_id: null, reason: "The rack was taken." },
        // The client's own movement: unreadable by id, named from the logged exercise at that position.
        { position: 2, from_exercise_id: null, from_custom_exercise_id: "c1", to_exercise_id: null, to_custom_exercise_id: "theirs" },
        { position: 0, to_exercise_id: "unknown" },
        { x: 1 },
        "no",
      ],
      names
    ),
    [
      { from: "Back squat", to: "Goblet squat", reason: "The rack was taken." },
      { from: "Row", to: "My band row", reason: null },
    ]
  );
  assert.deepEqual(parseSwaps(null, names), []);
});

test("compareLog: changed, as planned, above, skipped", () => {
  const prescribed = [
    ex("Back squat", { sets: 4, reps: 6, weightKg: 82.5 }),
    ex("Romanian deadlift", { sets: 3, reps: 8 }),
    ex("Walking lunge", { sets: 3, reps: 10 }),
    ex("Calf raise", { sets: 3, reps: 12 }),
  ];
  const session = {
    exercises: [
      { exerciseId: "1", name: "Goblet squat", sets: [set(8, 28), set(8, 28), set(8, 28)] },
      { exerciseId: "2", name: "Romanian deadlift", sets: [set(8, 70), set(8, 70), set(8, 70)] },
      { exerciseId: "3", name: "Walking lunge", sets: [set(12, 0), set(12, 0), set(12, 0)] },
    ],
  };
  const rows = compareLog(prescribed, session, [{ from: "Back squat", to: "Goblet squat", reason: null }]);
  assert.deepEqual(
    rows.map((r) => [r.name, r.status, r.target, r.logged]),
    [
      ["Goblet squat", "changed", "Target 4 × 6 at 82.5 kg", "logged 3 × 8 at 28 kg"],
      ["Romanian deadlift", "planned", "Target 3 × 8", "logged 3 × 8 at 70 kg"],
      ["Walking lunge", "above", "Target 3 × 10", "logged 3 × 12"],
      ["Calf raise", "skipped", "Target 3 × 12", null],
    ]
  );
});

test("topLift picks the biggest change between first and latest", () => {
  const s = (startedAt: string, kg: number): Pick<WorkoutSession, "startedAt" | "exercises"> => ({
    startedAt,
    exercises: [{ exerciseId: "x", name: "Back squat", sets: [set(5, kg)] }],
  });
  const lift = topLift([s("2026-10-08T10:00:00Z", 80), s("2026-10-01T10:00:00Z", 70)]);
  assert.deepEqual(lift, { exercise: "Back squat", firstKg: 70, lastKg: 80, reps: 5 });
  assert.equal(deltaKg(lift!), "+10 kg");
  assert.equal(topLift([s("2026-10-01T10:00:00Z", 70)]), null);
});

test("setTypesColumn matches set_types_valid", () => {
  assert.equal(setTypesColumn(undefined), null);
  assert.equal(setTypesColumn([null, "normal", null]), null);
  assert.deepEqual(setTypesColumn(["warmup", null, "dropset", null]), ["warmup", null, "dropset"]);
  assert.equal(setTypesColumn(Array(60).fill("pr"))!.length, 50);
});
