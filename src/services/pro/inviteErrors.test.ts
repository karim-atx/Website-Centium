// Release 3 W9: invite_client 22023 messages (raised text from the 20261124120000 function).
import { test } from "node:test";
import assert from "node:assert/strict";
import { invite22023 } from "./inviteErrors";

test("invite_client 22023: each raised message has its sentence", () => {
  assert.equal(invite22023("the first name is at most 40 characters", "email"), "Keep the first name to 40 characters or fewer.");
  assert.equal(invite22023("the message is at most 500 characters", "email"), "Keep the message to 500 characters or fewer.");
  assert.equal(invite22023("you already invited them today", "phone"), "You already invited them today.");
  assert.equal(invite22023("that is not an email address", "email"), "Enter a valid email address.");
  assert.equal(invite22023("that is not a phone number", "phone"), "Enter a valid phone number.");
  assert.equal(invite22023(undefined, "phone"), "Enter a valid phone number.");
});
