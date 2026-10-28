// Release A: the care referral decline reason (MO7 v3 dropdown → decline_reason text).
import { test } from "node:test";
import assert from "node:assert/strict";
import { bandWords, COLLEAGUE_FILTERS, declineReasonText, matchesFilter, nearbyLine, REFERRAL_DECLINE_REASONS } from "./careModel.ts";

test("decline reason: a preset saves its label, Other its own words, none saves nothing", () => {
  assert.deepEqual(REFERRAL_DECLINE_REASONS.map((r) => r.label), ["Fully booked", "Outside my specialty", "Not taking referrals right now", "Too far from the client", "Other"]);
  assert.equal(declineReasonText("fully_booked", "ignored"), "Fully booked");
  assert.equal(declineReasonText("other", "  Books are full until March "), "Books are full until March");
  assert.equal(declineReasonText("other", "   "), null);
  assert.equal(declineReasonText(null, "x"), null);
});

test("W6B-5 Nearby: the frame's chip order, and a band in place of a distance", () => {
  assert.deepEqual(COLLEAGUE_FILTERS.map((f) => f.label).slice(0, 5), ["Care network", "Nearby", "Dietitians", "Physios", "Doctors"]);
  assert.equal(matchesFilter("doctor", "nearby"), true);
  assert.equal(bandWords(1), "under 2 km");
  assert.equal(bandWords(2), "2 to 5 km");
  assert.equal(bandWords(6), "over 50 km");
  assert.equal(nearbyLine("physiotherapist", 2, false), "Physiotherapist · 2 to 5 km");
  assert.equal(nearbyLine("dietitian", 1, true), "Dietitian · under 2 km · in your network");
});
