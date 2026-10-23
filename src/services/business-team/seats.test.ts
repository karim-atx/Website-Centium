import { strict as assert } from "node:assert";
import { test } from "node:test";
import { personUsesSeat, seatAnswer } from "./seats";

// Database #38 (20261213190000): a seat is used by everyone except a Centium hire.
test("seatAnswer: a Centium hire never uses a seat; otherwise the server's flag", () => {
  assert.equal(seatAnswer(true, "hire"), false);
  assert.equal(seatAnswer(null, "hire"), false);
  // An existing-team addition (the free window) uses a seat: "free" is the fee.
  assert.equal(seatAnswer(true, "existing_team"), true);
  // A role that uses no seat stays seat-free whatever the source.
  assert.equal(seatAnswer(false, "existing_team"), false);
  // A non-professional (no my_team row): the server's flag.
  assert.equal(seatAnswer(true, undefined), true);
  assert.equal(seatAnswer(undefined, undefined), null);
});

test("personUsesSeat: the seat answer, else the role rule", () => {
  assert.equal(personUsesSeat({ role: "instructor", usesSeat: seatAnswer(true, "hire") }), false);
  assert.equal(personUsesSeat({ role: "trainer", usesSeat: seatAnswer(true, "existing_team") }), true);
  assert.equal(personUsesSeat({ role: "trainer", usesSeat: null }), true);
  assert.equal(personUsesSeat({ role: "front_desk", usesSeat: null }), false);
});
