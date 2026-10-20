// Release 3 W9: request plan lines and the 5-minute undo window.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextUndoClose, requestPlanLine, undoOpen, UNDO_WINDOW_MS } from "./requestModel";

test("plan line: name, price and billing as HO7 draws it", () => {
  assert.equal(requestPlanLine("Monthly coaching", 120, "monthly"), "Monthly coaching · $120 a month");
  assert.equal(requestPlanLine("Ten sessions", 540, "annually"), "Ten sessions · $540 a year");
  assert.equal(requestPlanLine("Plan", 0, "daily"), "Plan · $0 a day");
  assert.equal(requestPlanLine("Plan", 60, null), "Plan · $60");
  assert.equal(requestPlanLine("Plan", null, "monthly"), "Plan");
  assert.equal(requestPlanLine(null, 120, "monthly"), null);
  assert.equal(requestPlanLine("  ", 120, "monthly"), null);
});

test("undo window: open for 5 minutes from the decline", () => {
  const at = "2026-10-20T10:00:00.000Z";
  const t = Date.parse(at);
  assert.equal(undoOpen(at, t), true);
  assert.equal(undoOpen(at, t + UNDO_WINDOW_MS - 1), true);
  assert.equal(undoOpen(at, t + UNDO_WINDOW_MS), false);
  assert.equal(undoOpen("not a date", t), false);
});

test("next close: the earliest open window", () => {
  const t = Date.parse("2026-10-20T10:00:00.000Z");
  const a = new Date(t - 60_000).toISOString();
  const b = new Date(t - 4 * 60_000).toISOString();
  const gone = new Date(t - 10 * 60_000).toISOString();
  assert.equal(nextUndoClose([a, b, gone], t), 60_000);
  assert.equal(nextUndoClose([gone], t), null);
  assert.equal(nextUndoClose([], t), null);
});
