import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cleanRoutineCopy } from "./duplicate";
import type { Routine } from "../../types";

const original: Routine = {
  id: "r1",
  folderId: "F",
  position: 3,
  createdAt: "2026-09-01",
  name: "Push",
  color: "#7D6BB5",
  estimatedDurationMin: 50,
  coachNote: "Go easy on the shoulders",
  coachNoteUpdatedAt: "2026-09-02",
  assignedByProfessionalId: "pro",
  sourceTemplateId: "tpl",
  blocks: [{ id: "b1", kind: "superset" }],
  exercises: [
    { id: "e1", name: "Bench Press", sets: 4, reps: 8, weightKg: 60, restSeconds: 120, pinnedNote: "Rack at 3", blockId: "b1", exerciseId: "x1" },
    { id: "e2", name: "Row", sets: 4, reps: 10, weightKg: 50, blockId: "b1", exerciseId: "x2" },
    { id: "e3", name: "Dip", minSets: 2, maxSets: 3, minReps: 8, maxReps: 12, rpe: 8, exerciseId: "x3" },
  ],
} as Routine;

test("the copy keeps exercises, order, sets, template weight and reps, and the prescription", () => {
  const c = cleanRoutineCopy(original, "Push (copy)", "F");
  assert.equal(c.name, "Push (copy)");
  assert.equal(c.folderId, "F");
  assert.deepEqual(c.exercises.map((e) => [e.name, e.sets, e.reps, e.weightKg, e.exerciseId]), [
    ["Bench Press", 4, 8, 60, "x1"],
    ["Row", 4, 10, 50, "x2"],
    ["Dip", undefined, undefined, undefined, "x3"],
  ]);
  assert.deepEqual([c.exercises[2].minSets, c.exercises[2].maxSets, c.exercises[2].minReps, c.exercises[2].maxReps, c.exercises[2].rpe], [2, 3, 8, 12, 8]);
  assert.equal(c.color, "#7D6BB5");
  assert.equal(c.estimatedDurationMin, 50);
});

test("super-set pairings are copied under new block ids", () => {
  const c = cleanRoutineCopy(original, "Push (copy)", "F");
  assert.equal(c.blocks!.length, 1);
  assert.notEqual(c.blocks![0].id, "b1");
  assert.equal(c.exercises[0].blockId, c.blocks![0].id);
  assert.equal(c.exercises[1].blockId, c.blocks![0].id);
  assert.equal(c.exercises[2].blockId, undefined);
});

test("no pinned notes, rest timers, coach fields, provenance or order", () => {
  const c = cleanRoutineCopy(original, "Push (copy)", "F") as Partial<Routine>;
  assert.equal(c.exercises!.some((e) => "pinnedNote" in e || "restSeconds" in e), false);
  for (const k of ["coachNote", "coachNoteUpdatedAt", "assignedByProfessionalId", "sourceTemplateId", "position", "createdAt"] as const) {
    assert.equal(k in c, false, k);
  }
  assert.equal(new Set(c.exercises!.map((e) => e.id)).size, 3);
  assert.equal(c.exercises!.some((e) => ["e1", "e2", "e3"].includes(e.id)), false);
});
