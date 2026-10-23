import { test } from "node:test";
import assert from "node:assert/strict";
import { composeMyApplications, inviteFromNotification, parseOpportunity } from "./model";

// Database #38 (release/hiring-team-calendar-and-reviews 8d3e9f3): the
// professional side's documented shapes.

test("opportunities: the series times and the gym's venue-only rating (Database #38)", () => {
  const o = parseOpportunity({
    id: "o1",
    business_id: "b1",
    business_name: "Calendar Probe Gym",
    type: "role",
    title: "Head coach",
    pay: 80,
    pay_unit: "per_class",
    classes_per_month: 8,
    weekdays: [3, 1],
    start_time: "07:00:00",
    end_time: "08:00:00",
    business_rating: 3,
    business_review_count: 2,
    distance_km: 1.2,
    applied: false,
  });
  assert.deepEqual(o.weekdays, [1, 3]);
  assert.equal(o.startTime, "07:00");
  assert.equal(o.endTime, "08:00");
  assert.equal(o.businessRating, 3);
  assert.equal(o.businessReviewCount, 2);
  const none = parseOpportunity({ id: "o2", type: "class_slot", weekdays: null, start_time: null, end_time: null, business_rating: null, business_review_count: 0 });
  assert.deepEqual(none.weekdays, []);
  assert.equal(none.startTime, null);
  assert.equal(none.businessRating, null, "no venue reviews, no rating");
});

test("My applications: my_applications rows follow their offer; direct offers come from my_hire_offers (Database #38)", () => {
  const apps = [
    // applied, the opening since closed: still listed, with the proposed pay
    { application_id: "a1", opening_id: "op1", business_id: "b1", business_name: "Gym A", type: "role", title: "Spin coach", pay: 80, pay_unit: "per_class", classes_per_month: 4, opening_status: "closed", status: "applied", message: "Hi", proposed_pay: 90, hire_offer_id: null, offer_status: null, created_at: "2026-10-20T09:00:00Z" },
    // offered: the offer's terms and start
    { application_id: "a2", opening_id: "op2", business_id: "b2", business_name: "Gym B", type: "role", title: "HIIT coach", pay: 70, pay_unit: "per_class", classes_per_month: 4, opening_status: "open", status: "offered", message: "Me", proposed_pay: null, hire_offer_id: "h2", offer_status: "pending", created_at: "2026-10-18T09:00:00Z" },
    // a withdrawn offer: back to the application's own status
    { application_id: "a3", opening_id: "op3", business_id: "b3", business_name: "Gym C", type: "class_slot", title: "Sat cover", pay: 60, pay_unit: "per_slot", status: "shortlisted", hire_offer_id: "h3", offer_status: "withdrawn", created_at: "2026-10-21T09:00:00Z" },
  ];
  const offers = [
    { id: "h2", business_id: "b2", business_name: "Gym B", path: "opening", type: "role", title: "HIIT coach", pay: 75, pay_unit: "per_class", classes_per_month: 6, starts_on: "2026-11-02", message: "Welcome", status: "pending", created_at: "2026-10-22T09:00:00Z" },
    { id: "h3", business_id: "b3", path: "opening", type: "class_slot", title: "Sat cover", pay: 60, pay_unit: "per_slot", status: "withdrawn", created_at: "2026-10-21T10:00:00Z" },
    { id: "h9", business_id: "b9", business_name: "Gym D", path: "direct", type: "role", title: "Yoga", pay: 900, pay_unit: "per_month", starts_on: "2026-11-09", message: null, status: "accepted", created_at: "2026-10-19T09:00:00Z" },
    { id: "h8", path: "direct", type: "role", title: "Gone", status: "withdrawn", created_at: "2026-10-19T09:00:00Z" },
  ];
  const list = composeMyApplications(apps, offers);
  assert.deepEqual(
    list.map((a) => [a.id, a.status, a.path]),
    [
      ["a2", "OFFERED", "opening"],
      ["a3", "SHORTLISTED", "opening"],
      ["a1", "APPLIED", "opening"],
      ["h9", "HIRED", "direct"],
    ],
  );
  const offered = list[0];
  assert.equal(offered.offerId, "h2");
  assert.equal(offered.pay, 75);
  assert.equal(offered.classesPerMonth, 6);
  assert.equal(offered.startsOn, "2026-11-02");
  assert.equal(offered.note, "Welcome");
  assert.equal(list[1].offerId, null, "a withdrawn offer isn't the card's offer");
  assert.equal(list[1].payUnit, "per_slot");
  assert.equal(list[2].pay, 90, "the proposed pay");
  assert.equal(list[2].businessName, "Gym A");
  assert.equal(list[3].payUnit, "per_month");
});

test("existing_team_invite in the documented form: subject business_employee (the invitation), accept_by a date (Database #38)", () => {
  const n = {
    kind: "existing_team_invite",
    subjectType: "business_employee",
    subjectId: "inv1",
    payload: { business_name: "Friend Fitness Hamra", business_id: "b1", accept_by: "2026-11-14", fee_text: "free", invite_id: "inv1" },
    createdAt: "2026-10-23T09:00:00Z",
  };
  const inv = inviteFromNotification(n);
  assert.equal(inv?.id, "inv1");
  assert.equal(inv?.businessId, "b1");
  assert.equal(inv?.businessName, "Friend Fitness Hamra");
  assert.equal(inv?.expiresAt, "2026-11-14T23:59:59", "open to the end of the accept-by day");
  // The pre-#38 form (subject business, expires_at) is no longer read.
  assert.equal(inviteFromNotification({ ...n, subjectType: "business", payload: { invite_id: "inv1", expires_at: "2026-11-14T00:00:00Z" } }), null);
  assert.equal(inviteFromNotification({ ...n, kind: "hired" }), null);
});
