// Release 3 W9: every notification key the backend writes (HANDOVER_API
// "Invite codes and the hub's speed") has its own sentence, and no stale
// pro.notify.* key or team-invitation row is mapped. notificationText.ts
// reaches Supabase through its label imports, so this reads its source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./notificationText.ts", import.meta.url), "utf8");

const DOCUMENTED = [
  "pro.request.new",
  "pro.hire.new",
  "pro.hire.cancelled",
  "pro.booking.requested",
  "pro.booking.booked",
  "pro.booking.cancelled",
  "pro.booking.late_cancel",
  "pro.form.submitted",
  "pro.form.flagged",
  "pro.workout.finished",
  "pro.client.allergies_updated",
  "pro.diary.reply",
  "pro.result.shared",
  "pro.access.granted",
  "pro.access.declined",
  "pro.review.new",
  "pro.session.unpaid",
  // Round D: a member booked a place from a group's session card.
  "pro.session.booked",
  "pro.share.removal_requested",
  // Round D · DV (20261222030000): a held card.
  "pro.share.held",
  // pro.referral.* and pro.care_network.*: the keys the migrations write.
  "pro.referral.received",
  "pro.referral.client_agreed",
  "pro.referral.client_declined",
  "pro.referral.accepted",
  "pro.referral.declined",
  "pro.care_network.request",
  "pro.care_network.accepted",
  "pro.care_network.declined",
  // Database 20261219030000: the ambassador decision.
  "pro.ambassador.approved",
  "pro.ambassador.declined",
];

test("each documented key has its own case", () => {
  for (const k of DOCUMENTED) assert.ok(src.includes(`case "${k}":`), k);
});

test("the wildcard families fall back to a sentence of their own", () => {
  assert.ok(src.includes('key.startsWith("pro.referral.")'));
  assert.ok(src.includes('key.startsWith("pro.care_network.")'));
  assert.ok(src.includes('key.startsWith("pro.share.")'));
});

test("no stale keys: no pro.notify.* and no team invitation", () => {
  assert.ok(!src.includes("pro.notify."));
  assert.ok(!/team_invitation|invited you to their team/.test(src));
});
