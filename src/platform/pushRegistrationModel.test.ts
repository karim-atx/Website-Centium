import { strict as assert } from "node:assert";
import { test } from "node:test";
import { failedStep, pushRegistrationMessage, withTimeout } from "./pushRegistrationModel.ts";

test("push registration: the step it stopped at decides the message", () => {
  assert.equal(failedStep(false, null), "no-token", "no token ever came");
  assert.equal(failedStep(true, null), "save", "a token came, the save never finished");
  assert.equal(failedStep(false, "refused"), "refused");
  assert.equal(failedStep(true, "save"), "save");
  const messages = new Set((["no-token", "refused", "save", "check"] as const).map(pushRegistrationMessage));
  assert.equal(messages.size, 4, "every step has its own message");
});

test("push registration: a call that never answers gives up at its limit", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10, "the save"), /the save took longer than 10 ms/);
  assert.equal(await withTimeout(Promise.resolve(7), 1000, "x"), 7);
});
