import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HIRING_ERROR_TEXT,
  applicantCard,
  applicationStatus,
  hhmmOf,
  hiringErrorOf,
  isoWeekdays,
  parseApplication,
  parseHiringFee,
  parseInvites,
  parseOpening,
  parseSearchRows,
  parseWindow,
  windowUsed,
} from "./model.ts";

test("my_openings rows: the exact columns, counts and enrichment", () => {
  const o = parseOpening(
    { id: "o1", type: "class_slot", title: "Saturday Spin cover", pay: "60.00", pay_unit: "per_slot", status: "open", applicants: 3, shortlisted: 1, new_applicants: 2, schedule_label: "Spin 45 · Sat, Oct 24, 9:00 AM", hidden_at: null, class_series_ids: [] },
    { className: "Spin 45", startsAt: "2026-10-24T09:00" },
  );
  assert.equal(o.payUnit, "per_slot");
  assert.equal(o.pay, 60);
  assert.equal(o.applicantCount, 3);
  assert.equal(o.shortlistedCount, 1);
  assert.equal(o.newApplicantCount, 2);
  assert.equal(o.scheduleLabel, "Spin 45 · Sat, Oct 24, 9:00 AM");
  assert.equal(o.className, "Spin 45");
  assert.equal(o.hidden, false);
  assert.equal(parseOpening({ id: "o2", status: "weird" }).status, "open");
  assert.equal(parseOpening({ id: "o3", hidden_at: "2026-10-20T00:00:00Z" }).hidden, true);
});

test("opening_applicants: the card (no contact fields), status, attachments", () => {
  const r = { application_id: "a1", professional_id: "p1", first_name: "Rana", avatar_url: null, specialty: null, headline: "Cycling coach", message: "Sundays suit me", proposed_pay: "95", attachments: [{ kind: "credential", label: "Spin certification" }, { label: "" }, 3], status: "shortlisted", average_rating: "4.8", review_count: 38, hired_via_centium: 2, created_at: "2026-10-20T10:00:00Z", phone: "x" };
  const a = parseApplication(r, "o1", applicantCard(r, true), { hireStartsOn: null, fee: null });
  assert.equal(a.id, "a1");
  assert.equal(a.openingId, "o1");
  assert.equal(a.status, "SHORTLISTED");
  assert.equal(a.isNew, false);
  assert.equal(a.attachments.length, 1);
  assert.equal(a.proposedPay, 95);
  assert.equal(a.professional.specialty, "Cycling coach");
  assert.equal(a.professional.rating, 4.8);
  assert.equal(a.professional.hiredViaCentiumCount, 2);
  assert.equal(a.professional.onTeam, true);
  assert.equal(JSON.stringify(a).includes('"x"'), false);
  assert.equal(parseApplication({ ...r, status: "applied" }, "o1", applicantCard(r, false)).isNew, true);
  assert.equal(applicationStatus("nope"), "APPLIED");
});

test("search_professionals: the server's order is the rank", () => {
  const [a, b] = parseSearchRows([
    { professional_id: "p1", first_name: "Rana", average_rating: 4.8, review_count: 38, hired_via_centium: 2, on_this_team: false, open_to_gym_work: true },
    { professional_id: "p2", first_name: "Joe", average_rating: null, review_count: 0, hired_via_centium: 0, on_this_team: true },
    { first_name: "no id" },
  ]);
  assert.equal(a.rank, 1);
  assert.equal(b.rank, 2);
  assert.equal(b.onTeam, true);
  assert.equal(b.rating, null);
  assert.equal(a.distanceKm, null);
});

test("my_hiring_fees rows: the server's arithmetic, DUE / PAID, the quote kept", () => {
  const f = parseHiringFee({ id: "f1", hire_id: "h1", first_name: "Rana", role_title: "Coach", type: "role", base: "100.00", basis: "first_month_pay", percent_amount: "8.00", minimum: "25.00", amount: "25.00", minimum_applied: true, quoted_amount: "25.00", status: "paid", charged_at: "2026-10-20T10:00:00Z" })!;
  assert.equal(f.quote.fee, 25);
  assert.equal(f.quote.minimumApplied, true);
  assert.equal(f.status, "PAID");
  assert.equal(f.quotedAmount, 25);
  assert.equal(f.professionalName, "Rana");
  assert.equal(parseHiringFee({ id: "f2", type: "role", base: 100 }), null);
  assert.equal(parseHiringFee({ id: "f3", type: "class_slot", base: 60, percent_amount: 4.8, minimum: 3, amount: 4.8, minimum_applied: false, status: "due" })!.status, "DUE");
});

test("existing_team_window: closed with no dates until the start is set", () => {
  assert.equal(parseWindow([]), null);
  const shut = parseWindow([{ business_id: "b", opens_at: null, closes_at: null, days_left: 0, open: false }])!;
  assert.equal(shut.open, false);
  assert.equal(shut.opensAt, null);
  const w = parseWindow([{ opens_at: "2026-10-20T00:00:00Z", closes_at: "2026-11-19T00:00:00Z", days_left: 24, open: true }])!;
  assert.equal(w.open, true);
  assert.equal(w.daysLeft, 24);
  assert.equal(windowUsed(24), 0.2);
  assert.equal(windowUsed(30), 0);
  assert.equal(windowUsed(-3), 1);
});

test("existing_team_invites rows", () => {
  const [i] = parseInvites([{ id: "i1", business_id: "b1", contact: "a@b.c", name: "Maya", professional_type: "trainer", sent_at: "2026-10-20T00:00:00Z", expires_at: "2026-11-19T00:00:00Z" }]);
  assert.equal(i.professionalType, "trainer");
  assert.equal(i.expiresAt, "2026-11-19T00:00:00Z");
  assert.equal(JSON.stringify(i).includes("a@b.c"), false);
});

test("class series helpers", () => {
  assert.deepEqual(isoWeekdays([3, 1, 1, 9, "x"]), [1, 3]);
  assert.equal(hhmmOf("18:30:00"), "18:30");
  assert.equal(hhmmOf(null), null);
});

test("the 27 ATXH codes map by code (HANDOVER_API Release 2 Error codes)", () => {
  const cases: [string, string, string][] = [
    ["ATXH0: hiring is for gyms and studios", "ATX09", "not_a_gym"],
    ["ATXH1: this opening does not take pay proposals", "22023", "pay_locked"],
    ["ATXH2: you have already applied to this opening", "ATX10", "already_applied"],
    ["ATXH3: one of those class series is not yours", "22023", "not_your_class"],
    ["ATXH4: only a professional can apply to an opening", "ATX09", "not_a_professional"],
    ["ATXH5: confirm you are available for this schedule", "22023", "availability_required"],
    ["ATXH6: that opening is no longer open", "ATX08", "opening_closed"],
    ["ATXH7: you cannot apply to your own opening", "22023", "own_opening"],
    ["ATXH8: this opening has been taken down", "42501", "opening_hidden"],
    ["ATXH9: a paused or closed business cannot hire", "ATX09", "business_paused"],
    ["ATXH10: this application has an offer against it", "ATX10", "has_offer"],
    ["ATXH11: that professional is not open to gym work", "ATX09", "not_open_to_gym_work"],
    ["ATXH12: a per-class role needs the number of classes a month", "22023", "invalid_pay"],
    ["ATXH13: this professional already has a pending offer for that job", "ATX10", "offer_pending"],
    ["ATXH14: that offer is already accepted", "ATX10", "offer_closed"],
    ["ATXH15: that would clash with 2 of your existing sessions -- accept again to confirm", "ATX10", "conflicts"],
    ["ATXH16: they are not on your team", "ATX08", "not_on_team"],
    ["ATXH17: add professionals to your team through Hiring", "22023", "professional_code"],
    ["ATXH18: name somebody to add", "22023", "nobody_named"],
    ["ATXH19: that window has closed -- new professionals join through Hiring", "ATX10", "window_closed"],
    ["ATXH20: that person has already been invited", "ATX10", "already_invited"],
    ["ATXH21: that invitation has expired", "ATX10", "invite_expired"],
    ["ATXH22: you did not attend that class", "ATX94", "not_attended"],
    ["ATXH23: that class had no named instructor", "ATX08", "no_instructor"],
    ["ATXH24: that hire is not yours to dispute", "42501", "not_your_hire"],
    ["ATXH25: you already have an open dispute about that hire", "ATX10", "dispute_open"],
    ["ATXH26: 2 have applied to this opening -- close it instead, so their applications survive", "ATX10", "has_applicants"],
  ];
  for (const [message, code, name] of cases) assert.equal(hiringErrorOf({ code, message }), name, message);
  assert.equal(hiringErrorOf({ code: "22023", message: "ATXH17: add professionals to your team through Hiring", hint: "the free existing-team window for this business has closed" }), "professional_account");
  assert.equal(hiringErrorOf({ code: "23514", message: "ATXC0: no free seats (3 of 3 used) -- buy a seat block or remove somebody first" }), "no_seats");
  assert.equal(hiringErrorOf({ code: "42501", message: "ATXB8: that is not your business" }), "not_your_business");
  assert.equal(hiringErrorOf({ code: "ATX08", message: "no such offer" }), "offer_closed");
  assert.equal(hiringErrorOf({ code: "ATX08", message: "no such invitation" }), "invite_gone");
  assert.equal(hiringErrorOf({ code: "ATX02", message: "rate limited" }), "rate_limited");
  assert.equal(hiringErrorOf({ code: "23514", message: "new row violates check constraint \"openings_title_check\"" }), "invalid_opening");
  // Database #38: the Team-only instructor rule is ATX76 (business_team_professional).
  assert.equal(hiringErrorOf({ code: "ATX76", message: "a class can only name a professional on that business's team" }), "instructor_not_on_team");
  assert.equal(hiringErrorOf({ code: "P0001", message: "instructor_not_on_team" }), null);
  assert.equal(hiringErrorOf({ message: "something else" }), null);
  assert.equal(hiringErrorOf(null), null);
  for (const k of Object.keys(HIRING_ERROR_TEXT)) assert.ok(HIRING_ERROR_TEXT[k as keyof typeof HIRING_ERROR_TEXT].length > 0);
});
