import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  capReached,
  elapsedSeconds,
  intervalPosition,
  pause,
  remainingSeconds,
  resume,
  startedStopwatch,
  stoppedStopwatch,
} from "./clock.ts";

const T0 = 1_700_000_000_000;
const at = (seconds: number) => T0 + seconds * 1000;

test("a stopped watch reads zero however long you wait", () => {
  assert.equal(elapsedSeconds(stoppedStopwatch(), at(600)), 0);
});

test("elapsed time is the difference, not a count of ticks", () => {
  const w = startedStopwatch(T0);
  assert.equal(elapsedSeconds(w, at(1)), 1);
  assert.equal(elapsedSeconds(w, at(90)), 90);
});

// The reason this module exists: a backgrounded tab gets no callbacks, and
// every one of these numbers has to be right the moment it comes back.
test("30 seconds backgrounded is 30 seconds elapsed", () => {
  const w = startedStopwatch(T0);
  assert.equal(elapsedSeconds(w, at(2)), 2, "before the screen locks");
  assert.equal(elapsedSeconds(w, at(32)), 32, "and after, with nothing in between");
});

test("pausing banks what was done and stops the clock", () => {
  let w = startedStopwatch(T0);
  w = pause(w, at(20));
  assert.equal(elapsedSeconds(w, at(500)), 20, "paused time does not accrue");
  w = resume(w, at(500));
  assert.equal(elapsedSeconds(w, at(505)), 25);
});

test("pausing twice and resuming twice are both no-ops", () => {
  const w = pause(startedStopwatch(T0), at(10));
  assert.equal(pause(w, at(99)), w);
  const r = resume(w, at(20));
  assert.equal(resume(r, at(99)), r);
});

// --- caps --------------------------------------------------------------------

test("a countdown rounds up, so it shows 1 for the whole last second", () => {
  const w = startedStopwatch(T0);
  assert.equal(remainingSeconds(w, 720, T0), 720);
  assert.equal(remainingSeconds(w, 720, at(719.4)), 1);
  assert.equal(remainingSeconds(w, 720, at(720)), 0);
});

test("a countdown floors at zero rather than going negative", () => {
  assert.equal(remainingSeconds(startedStopwatch(T0), 60, at(300)), 0);
});

test("the cap is reached exactly at the cap", () => {
  const w = startedStopwatch(T0);
  assert.equal(capReached(w, 60, at(59.9)), false);
  assert.equal(capReached(w, 60, at(60)), true);
});

// --- EMOM --------------------------------------------------------------------

test("an EMOM's round comes from division, so it is right after a long sleep", () => {
  const w = startedStopwatch(T0);
  assert.deepEqual(intervalPosition(w, 60, 10, T0), { round: 1, remaining: 60, done: false });
  assert.deepEqual(intervalPosition(w, 60, 10, at(59)), { round: 1, remaining: 1, done: false });
  assert.deepEqual(intervalPosition(w, 60, 10, at(60)), { round: 2, remaining: 60, done: false });
  // Phone asleep from round 2 to round 8. No callbacks fired; the answer is
  // still correct because nothing was counting.
  assert.deepEqual(intervalPosition(w, 60, 10, at(450)), { round: 8, remaining: 30, done: false });
});

test("an EMOM is done when the last interval runs out, and stays on its last round", () => {
  const w = startedStopwatch(T0);
  assert.deepEqual(intervalPosition(w, 60, 10, at(599)), { round: 10, remaining: 1, done: false });
  assert.deepEqual(intervalPosition(w, 60, 10, at(600)), { round: 10, remaining: 0, done: true });
  assert.deepEqual(intervalPosition(w, 60, 10, at(9999)), { round: 10, remaining: 0, done: true });
});

test("a 90-second interval is not assumed to be a minute", () => {
  const w = startedStopwatch(T0);
  assert.equal(intervalPosition(w, 90, 8, at(180)).round, 3);
  assert.equal(intervalPosition(w, 90, 8, at(180)).remaining, 90);
});
