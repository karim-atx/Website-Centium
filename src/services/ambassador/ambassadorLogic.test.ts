import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  APPLY_FALLBACK,
  APPLY_REFUSALS,
  applyRefusalLine,
  canSend,
  checklistRows,
  friendsToGoLine,
  linkProblem,
  shortDayMonth,
  showEntryRow,
  statusCard,
  toAmbassadorStatus,
  whatYouGetLine,
  type MyAmbassadorApplicationRow,
} from "./ambassadorLogic.ts";

// my_ambassador_application()'s row for a member with nothing sent.
const row = (over: Partial<MyAmbassadorApplicationRow> = {}): MyAmbassadorApplicationRow => ({
  application_id: null,
  status: null,
  motivation: null,
  link: null,
  created_at: null,
  decided_at: null,
  reason: null,
  next_eligible_at: null,
  is_ambassador: false,
  confirmed_adult: true,
  account_age_days: 45,
  required_account_days: 30,
  account_old_enough: true,
  successful_referrals: 1,
  required_referrals: 3,
  enough_referrals: false,
  no_suspension: true,
  can_apply: false,
  ...over,
});
const eligible = row({ successful_referrals: 3, enough_referrals: true, can_apply: true });

test("toAmbassadorStatus: the one row; a missing row is not eligible and nothing sent", () => {
  const s = toAmbassadorStatus(row());
  assert.equal(s.application, null);
  assert.equal(s.successfulReferrals, 1);
  assert.equal(s.requiredReferrals, 3);
  const none = toAmbassadorStatus(null);
  assert.deepEqual([none.canApply, none.isAmbassador, none.confirmedAdult, none.application], [false, false, false, null]);
  // An unknown status is not an application.
  assert.equal(toAmbassadorStatus(row({ application_id: "a", status: "withdrawn", created_at: "2026-10-01T10:00:00Z" })).application, null);
});

test("checklist: the server's booleans with its thresholds; the friends line counts down", () => {
  const rows = checklistRows(toAmbassadorStatus(row()));
  assert.deepEqual(
    rows.map((r) => [r.label, r.done]),
    [
      ["18 or older", true],
      ["On Centium for 30 days", true],
      ["3 friends joined with your code", false],
      ["No suspensions on record", true],
    ]
  );
  assert.equal(friendsToGoLine(toAmbassadorStatus(row())), "2 more friends to go.");
  assert.equal(friendsToGoLine(toAmbassadorStatus(row({ successful_referrals: 2 }))), "1 more friend to go.");
  assert.equal(friendsToGoLine(toAmbassadorStatus(eligible)), null);
  assert.equal(whatYouGetLine(), "2,000 points per friend who joins");
});

test("status card: pending, approved while it holds, declined while the 90 days run", () => {
  const pending = toAmbassadorStatus(row({ application_id: "a1", status: "pending", created_at: "2026-10-28T09:00:00" }));
  assert.deepEqual(statusCard(pending), { kind: "pending", heading: "Application under review", line: "Sent Oct 28. We'll let you know." });
  assert.equal(showEntryRow(pending), false);

  const approved = toAmbassadorStatus(row({ application_id: "a1", status: "approved", created_at: "2026-10-01T09:00:00", is_ambassador: true }));
  assert.equal(statusCard(approved)?.heading, "You're a Centium Ambassador");
  assert.equal(statusCard(approved)?.line, "Your new rewards apply to friends who join from now on.");
  assert.equal(showEntryRow(approved), false);
  // Granted by invitation (no application): no card, no entry row.
  const invited = toAmbassadorStatus(row({ is_ambassador: true }));
  assert.deepEqual([statusCard(invited), showEntryRow(invited)], [null, false]);

  const declined = toAmbassadorStatus(
    row({ application_id: "a1", status: "declined", created_at: "2026-10-01T09:00:00", reason: "We're looking for more activity first", next_eligible_at: "2027-01-26T12:00:00" })
  );
  assert.deepEqual(statusCard(declined), { kind: "declined", heading: "Not this time", line: "We're looking for more activity first. You can apply again from Jan 26." });
  assert.equal(statusCard(toAmbassadorStatus(row({ application_id: "a1", status: "declined", created_at: "2026-10-01T09:00:00", next_eligible_at: "2027-01-26T12:00:00" })))?.line, "You can apply again from Jan 26.");
  // After the 90 days: the entry row is back.
  const over = toAmbassadorStatus(row({ application_id: "a1", status: "declined", created_at: "2026-01-01T09:00:00", next_eligible_at: null }));
  assert.deepEqual([statusCard(over), showEntryRow(over)], [null, true]);
  assert.equal(showEntryRow(toAmbassadorStatus(row())), true);
});

test("send: every row green, why written (500 max), a web link or none, the terms ticked", () => {
  const ok = toAmbassadorStatus(eligible);
  const form = { motivation: "I share Centium with my running club.", link: "", terms: true };
  assert.equal(canSend(ok, form), true);
  assert.equal(canSend(toAmbassadorStatus(row()), form), false);
  assert.equal(canSend(ok, { ...form, terms: false }), false);
  assert.equal(canSend(ok, { ...form, motivation: "   " }), false);
  assert.equal(canSend(ok, { ...form, motivation: "x".repeat(501) }), false);
  assert.equal(canSend(ok, { ...form, link: "instagram.com/me" }), false);
  assert.equal(canSend(ok, { ...form, link: "https://instagram.com/me" }), true);
  assert.equal(linkProblem("https://a b"), "Start the link with https:// (or http://).");
  assert.equal(linkProblem(" "), null);
});

test("refusals: each code its own plain line; ATXJ2 names the date from the HINT; never the server's message", () => {
  for (const code of ["ATX10", "ATXJ0", "ATXJ1", "ATXJ3", "ATXJ4", "ATXJ5", "ATX47", "ATX48", "22023"]) {
    const line = applyRefusalLine({ code });
    assert.equal(line, APPLY_REFUSALS[code], code);
    assert.notEqual(line, APPLY_FALLBACK, code);
  }
  assert.equal(applyRefusalLine({ code: "ATXJ2", hint: "2027-01-26" }), "You can apply again from Jan 26.");
  assert.equal(applyRefusalLine({ code: "ATXJ2", hint: null }), "You can apply again later.");
  assert.equal(applyRefusalLine({ code: "ATX02" }), "Please wait a little before trying again.");
  assert.equal(applyRefusalLine({ code: "ATX06" }), "You need to be signed in to apply. Sign in and try again.");
  assert.equal(applyRefusalLine({ code: "XX000" }), APPLY_FALLBACK);
  assert.equal(applyRefusalLine({ code: "toString" }), APPLY_FALLBACK);
  assert.equal(shortDayMonth("not a date"), null);
});
