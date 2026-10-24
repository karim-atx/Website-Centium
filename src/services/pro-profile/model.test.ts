import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayText,
  parseDirectory,
  parseProfileOffers,
  parsePublicProfile,
  parseWork,
  reviewContext,
  sortWork,
  teachesTitle,
  weekdayCaps,
  workDates,
  workRoleLine,
  workStub,
} from "./model.ts";

const TODAY = "2026-10-22";

test("work stub: current role, class slot, ended role", () => {
  assert.equal(workStub({ type: "role", to: null }, TODAY), "Role");
  assert.equal(workStub({ type: "role", to: "2027-01-01" }, TODAY), "Role");
  assert.equal(workStub({ type: "role", to: "2025-06-30" }, TODAY), "Ended");
  assert.equal(workStub({ type: "class_slot", to: "2026-09-12" }, TODAY), "Class slot");
});

test("work dates are month first (D-02)", () => {
  assert.equal(workDates({ type: "role", from: "2026-03-02", to: null }, TODAY), "Mar 2026 to now");
  assert.equal(workDates({ type: "role", from: "2025-01-10", to: "2025-06-30" }, TODAY), "Jan to Jun 2025");
  assert.equal(workDates({ type: "role", from: "2024-11-01", to: "2025-02-01" }, TODAY), "Nov 2024 to Feb 2025");
  assert.equal(workDates({ type: "role", from: "2025-04-01", to: "2025-04-20" }, TODAY), "Apr 2025");
  assert.equal(workDates({ type: "class_slot", from: "2026-09-12", to: "2026-09-12" }, TODAY), "Sep 12, 2026");
  assert.equal(dayText(null), "");
});

test("role line and sort: current roles first, then newest", () => {
  assert.equal(workRoleLine({ roleTitle: "Spin instructor", type: "role" }), "Spin instructor · Role");
  assert.equal(workRoleLine({ roleTitle: "Saturday Spin cover", type: "class_slot" }), "Saturday Spin cover · Class slot");
  const list = parseWork([
    { hire_id: "a", business_name: "Cedar", role_title: "HIIT", type: "role", from_on: "2025-01-01", to_on: "2025-06-01", status: "ended" },
    { hire_id: "b", business_name: "Hamra", role_title: "Cover", type: "class_slot", from_on: "2026-09-12", status: "active" },
    { hire_id: "c", business_name: "Hamra", role_title: "Spin", type: "role", from_on: "2026-03-01", status: "active" },
  ]);
  assert.deepEqual(sortWork(list, TODAY).map((w) => w.id), ["c", "b", "a"]);
});

test("a review's class and gym context (D-43); a client review has none", () => {
  const base = { id: "r1", reviewerName: "Maya K.", rating: 5, text: "Great", createdAt: null };
  assert.equal(reviewContext({ ...base, className: "Spin 45", businessName: "Hamra" }), "Spin 45 · Hamra");
  assert.equal(reviewContext({ ...base, className: null, businessName: null }), null);
});

test("public profile: professional_public_profile + work_history, never contact fields (D-27)", () => {
  const p = parsePublicProfile(
    [{ professional_id: "p1", first_name: "Rana", avatar_url: null, specialty: "Spin", headline: null, bio: "Coach", skills: ["HIIT"], area_label: "Hamra", average_rating: "4.8", review_count: 38, client_reviews: 30, class_reviews: 8, hired_via_centium: 2, gyms_worked_with: 1, handle: "rana", phone: "+961", email: "a@b.c", website: "y" }],
    [{ hire_id: "h1", business_id: "b1", business_name: "Hamra Gym", role_title: "Spin", type: "role", from_on: "2026-03-01", to_on: null, status: "active" }],
  )!;
  assert.equal(p.card.id, "p1");
  assert.equal(p.card.name, "Rana");
  assert.equal(p.card.rating, 4.8);
  assert.equal(p.card.reviewCount, 38);
  assert.equal(p.card.hiredViaCentiumCount, 2);
  assert.equal(p.card.area, "Hamra");
  assert.deepEqual(p.specialties, ["HIIT"]);
  assert.equal(p.workHistory.length, 1);
  // No reader in the contract for these (Database gap): empty, never invented. No offers passed: none.
  assert.deepEqual([p.services, p.offers, p.reviews, p.teachesAt], [[], [], [], []]);
  const flat = JSON.stringify(p);
  for (const k of ["+961", "a@b.c", "website"]) assert.equal(flat.includes(k), false, k);
  assert.equal(parsePublicProfile([], []), null);
});

test("public profile offers: public_offers('professional', id) rows, in the server's order", () => {
  const offers = [
    { id: "o1", title: "Free first session", kind: "free_item", value: null, points_cost: 250, where_used: "in_person", terms: null, starts_on: "2026-10-01", ends_on: null, per_member_limit: 1, quantity_cap: null, redeemed_count: 0, category: "professionals" },
    { id: "o2", title: "20% off a 4-pack", kind: "percent_off", value: 20, points_cost: "900", where_used: "both", terms: "x", starts_on: "2026-10-01", ends_on: "2026-12-31", per_member_limit: 1, quantity_cap: 30, redeemed_count: 2, category: "professionals" },
    { id: "o3", title: null, points_cost: 10 },
  ];
  assert.deepEqual(parseProfileOffers(offers), [
    { id: "o1", headline: "Free first session", endsOn: null, pointsCost: 250 },
    { id: "o2", headline: "20% off a 4-pack", endsOn: "2026-12-31", pointsCost: 900 },
  ]);
  const p = parsePublicProfile([{ professional_id: "p1", first_name: "Rana" }], [], offers)!;
  assert.equal(p.offers.length, 2);
});

test("professionals_ranked: the server's order, the cursor score, From $X, every row kept", () => {
  const [h, g] = parseDirectory([
    { professional_id: "p1", first_name: "A", consultation_rate: 35, monthly_rate: 15, average_rating: 4.6, review_count: 9, hired_via_centium: 3, area_label: "Hamra", distance_band: "under 2 km", band_rank: 1, rank_score: "0.8123", phone: "1" },
    { professional_id: "p2", first_name: null, rank_score: 0.5 },
  ]);
  assert.equal(h!.rank, 1);
  assert.equal(h!.score, 0.8123);
  assert.equal(h!.fromPriceValue, 15);
  assert.equal(h!.hiredViaCentiumCount, 3);
  assert.equal("phone" in h!, false);
  assert.equal(g!.name, "Professional");
  assert.equal(g!.rank, 2);
});

test("teaches at: later start and weekday label", () => {
  assert.equal(teachesTitle({ title: "Spin 45", startsOn: "2026-11-01" }, TODAY), "Spin 45 · from Nov 1");
  assert.equal(teachesTitle({ title: "Spin 45", startsOn: "2026-10-01" }, TODAY), "Spin 45");
  assert.equal(weekdayCaps(5), "FRI");
  assert.equal(weekdayCaps(7), "SUN");
  assert.equal(weekdayCaps(null), "");
});
