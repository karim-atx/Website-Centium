import { strict as assert } from "node:assert";
import { test } from "node:test";
import { nextRoutine } from "./nextRoutine.ts";

const r = (id: string, name = id) => ({ id, name, exercises: [1, 2] });

test("NO ROUTINES MEANS NO SUGGESTION, never an invented one", () => {
  // The whole point: the widget printed "Upper Body · 4 exercises" here, from
  // a program nobody had made.
  assert.equal(nextRoutine([], []), null);
  assert.equal(nextRoutine([], [{ routineId: "anything" }]), null);
});

test("the most recently trained routine wins", () => {
  const routines = [r("a"), r("b"), r("c")];
  const sessions = [{ routineId: "a" }, { routineId: "c" }, { routineId: "b" }];
  assert.equal(nextRoutine(routines, sessions)?.id, "b");
});

test("a session whose routine was deleted is skipped, not fatal", () => {
  const routines = [r("a"), r("b")];
  // Trained "gone" most recently, but it no longer exists.
  const sessions = [{ routineId: "a" }, { routineId: "gone" }];
  assert.equal(nextRoutine(routines, sessions)?.id, "a");
});

test("a freeform session carries no routine and is passed over", () => {
  const routines = [r("a"), r("b")];
  assert.equal(nextRoutine(routines, [{ routineId: "b" }, { routineId: null }])?.id, "b");
});

test("nothing trained yet falls back to the first routine", () => {
  assert.equal(nextRoutine([r("a"), r("b")], [])?.id, "a");
  assert.equal(nextRoutine([r("a"), r("b")], [{ routineId: null }])?.id, "a");
});

test("every session pointing at deleted routines still falls back", () => {
  assert.equal(nextRoutine([r("a")], [{ routineId: "x" }, { routineId: "y" }])?.id, "a");
});
