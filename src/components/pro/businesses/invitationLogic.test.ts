import { strict as assert } from "node:assert";
import { test } from "node:test";
import { deadInvitationLine, invitationExpiry, invitationState } from "./invitationLogic";

const now = new Date(2026, 9, 21, 12);
const in9 = new Date(2026, 9, 30, 9).toISOString();
const ago7 = new Date(2026, 9, 14, 9).toISOString();

test("Batch 2 CO: the invitee's card state, from the window or a refused accept", () => {
  // Unknown window: open, no expiry line (never guessed).
  assert.equal(invitationState(null, null, now), "open");
  assert.equal(invitationExpiry(null, "open", now), null);
  assert.equal(invitationState({ expiresAt: in9, revokedAt: null }, null, now), "open");
  assert.equal(invitationExpiry({ expiresAt: in9, revokedAt: null }, "open", now), "Expires Oct 30");
  assert.equal(invitationState({ expiresAt: ago7, revokedAt: null }, null, now), "expired");
  assert.equal(invitationExpiry({ expiresAt: ago7, revokedAt: null }, "expired", now), "Expired Oct 14");
  assert.equal(invitationState({ expiresAt: null, revokedAt: null }, null, now), "expired");
  assert.equal(invitationState({ expiresAt: in9, revokedAt: ago7 }, null, now), "withdrawn");
  assert.equal(invitationExpiry({ expiresAt: in9, revokedAt: ago7 }, "withdrawn", now), null);
  // A refused accept overrides an unknown or stale window; "gone" drops out on the reload instead.
  assert.equal(invitationState(null, "withdrawn", now), "withdrawn");
  assert.equal(invitationState({ expiresAt: in9, revokedAt: null }, "expired", now), "expired");
  assert.equal(invitationState(null, "gone", now), "open");
  // The server's `acceptable` (my_business_employments) decides over the dates.
  assert.equal(invitationState({ expiresAt: ago7, revokedAt: null, acceptable: true }, null, now), "open");
  assert.equal(invitationState({ expiresAt: in9, revokedAt: null, acceptable: false }, null, now), "expired");
  assert.equal(invitationState({ expiresAt: in9, revokedAt: ago7, acceptable: false }, null, now), "withdrawn");
});

test("Batch 2 CO: the line on an invitation that can't be accepted", () => {
  assert.equal(deadInvitationLine("open", "Flex Fitness"), null);
  assert.equal(deadInvitationLine("expired", "Flex Fitness"), "This invitation has expired. Ask Flex Fitness to send it again.");
  assert.equal(deadInvitationLine("withdrawn", "Flex Fitness"), "Flex Fitness withdrew this invitation, so it can't be accepted.");
});
