import { strict as assert } from "node:assert";
import { test } from "node:test";
import { STATUS_REVIEWED, cadenceOf, checkState, nextDueLine } from "./checkStatus.ts";

const today = "2026-10-08";

test("status words stay held for clinical review (V6-09)", () => {
  assert.equal(STATUS_REVIEWED, false);
});

test("an unknowable check makes no claim", () => {
  assert.deepEqual(checkState({ kind: "once" }, undefined, today), { word: "Ask your doctor", tone: "neutral", last: null, next: null });
});

test("never done before review: grey Not yet, never red", () => {
  const s = checkState(cadenceOf({ id: "bp", frequency: "" }), null, today);
  assert.equal(s.word, "Not yet");
  assert.equal(s.tone, "neutral");
  assert.equal(s.next, "ask your doctor");
});

test("doctor-timed checks say as advised", () => {
  assert.equal(checkState(cadenceOf({ id: "psa", frequency: "" }), null, today).next, "as advised");
});

test("Next is last + the interval's lower bound, month and year", () => {
  const s = checkState(cadenceOf({ id: "cholesterol", frequency: "" }), "2024-03-12", today);
  assert.equal(s.word, "Done");
  assert.equal(s.next, "Mar 2028");
});

test("a once-only check has no Next", () => {
  assert.equal(checkState(cadenceOf({ id: "hepatitis_c", frequency: "" }), "2025-01-01", today).next, null);
  assert.match(nextDueLine({ kind: "once" }), /This one isn't repeated\.$/);
});

test("after review the interval statuses apply", () => {
  const c = cadenceOf({ id: "bp", frequency: "" });
  assert.equal(checkState(c, "2026-05-01", today, true).word, "Up to date");
  assert.equal(checkState(c, "2025-10-02", today, true).word, "Due now");
  assert.equal(checkState(c, "2024-01-01", today, true).word, "Overdue");
  assert.equal(checkState(c, null, today, true).next, "ask now");
});
