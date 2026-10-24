import { strict as assert } from "node:assert";
import { test } from "node:test";
import { personUsesSeat } from "./seats";

// Database PR #39 correction 1: employee_credentials.uses_seat asks business_seats_used()'s
// own test (source <> 'hire' and role_uses_seat), so the server's flag is the answer.
test("personUsesSeat: the server's flag, else the role rule", () => {
  // A Centium hire: the server says no seat.
  assert.equal(personUsesSeat({ role: "instructor", usesSeat: false }), false);
  // An existing-team addition uses a seat ("free" is the fee).
  assert.equal(personUsesSeat({ role: "trainer", usesSeat: true }), true);
  // Not answered (an invitation): the role rule.
  assert.equal(personUsesSeat({ role: "trainer", usesSeat: null }), true);
  assert.equal(personUsesSeat({ role: "front_desk", usesSeat: null }), false);
});
