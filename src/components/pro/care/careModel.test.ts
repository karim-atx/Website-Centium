// Release A: the care referral decline reason (MO7 v3 dropdown → decline_reason text).
import { test } from "node:test";
import assert from "node:assert/strict";
import { declineReasonText, REFERRAL_DECLINE_REASONS } from "./careModel.ts";

test("decline reason: a preset saves its label, Other its own words, none saves nothing", () => {
  assert.deepEqual(REFERRAL_DECLINE_REASONS.map((r) => r.label), ["Fully booked", "Outside my specialty", "Not taking referrals right now", "Too far from the client", "Other"]);
  assert.equal(declineReasonText("fully_booked", "ignored"), "Fully booked");
  assert.equal(declineReasonText("other", "  Books are full until March "), "Books are full until March");
  assert.equal(declineReasonText("other", "   "), null);
  assert.equal(declineReasonText(null, "x"), null);
});
