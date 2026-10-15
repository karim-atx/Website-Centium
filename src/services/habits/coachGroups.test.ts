import { strict as assert } from "node:assert";
import { test } from "node:test";
import { groupCoachHabits } from "./coachGroups";

test("coach habits group per professional; the rest stay the client's own", () => {
  const habits = [{ id: "own1" }, { id: "c1" }, { id: "r1" }, { id: "own2" }, { id: "c2" }];
  const { groups, own } = groupCoachHabits(habits, { c1: "alex", c2: "alex", r1: "rami" });
  assert.deepEqual(groups.map((g) => [g.professionalId, g.habits.map((h) => h.id)]), [
    ["alex", ["c1", "c2"]],
    ["rami", ["r1"]],
  ]);
  assert.deepEqual(own.map((h) => h.id), ["own1", "own2"]);
});

test("no coach habits: every habit is the client's own, in order", () => {
  const habits = [{ id: "a" }, { id: "b" }];
  const { groups, own } = groupCoachHabits(habits, {});
  assert.equal(groups.length, 0);
  assert.deepEqual(own.map((h) => h.id), ["a", "b"]);
});
