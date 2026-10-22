import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayText,
  parseDirectory,
  parsePublicProfile,
  parseReviews,
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
    { id: "a", business_name: "Cedar", role_title: "HIIT", type: "role", from: "2025-01-01", to: "2025-06-01" },
    { id: "b", business_name: "Hamra", role_title: "Cover", type: "class_slot", from: "2026-09-12" },
    { id: "c", business_name: "Hamra", role_title: "Spin", type: "role", from: "2026-03-01" },
  ]);
  assert.deepEqual(sortWork(list, TODAY).map((w) => w.id), ["c", "b", "a"]);
});

test("reviews keep the class and gym context (D-43); client reviews have none", () => {
  const r = parseReviews([
    { id: "r1", reviewer_name: "Maya K.", rating: 5, text: "Great", class_name: "Spin 45", business_name: "Hamra" },
    { id: "r2", reviewer_name: "Jad", rating: 4 },
    { id: "r3", rating: 0 },
  ]);
  assert.equal(r.length, 2);
  assert.equal(reviewContext(r[0]!), "Spin 45 · Hamra");
  assert.equal(reviewContext(r[1]!), null);
});

test("public profile: never contact fields (D-27)", () => {
  const p = parsePublicProfile([
    {
      professional_id: "p1",
      name: "R K",
      specialty: "Spin",
      rating: 4.8,
      review_count: 38,
      hired_via_centium_count: 2,
      phone: "+961",
      email: "a@b.c",
      instagram: "x",
      website: "y",
      services: [{ id: "s1", kind: "hire", name: "Pack", price: 120 }, { id: "s2", name: "1:1", price: "35" }],
      offers: [{ offer_id: "o1", headline: "20% off", points_cost: 1200 }],
      teaches_at: [{ title: "Spin 45", business_name: "Hamra", weekday: 5, start_time: "18:30" }],
    },
  ])!;
  assert.equal(p.card.id, "p1");
  assert.equal(p.card.hiredViaCentiumCount, 2);
  const flat = JSON.stringify(p);
  for (const k of ["+961", "a@b.c", "instagram", "website"]) assert.equal(flat.includes(k), false, k);
  assert.deepEqual(p.services.map((s) => s.kind), ["hire", "book"]);
  assert.equal(p.offers[0]!.pointsCost, 1200);
  assert.equal(parsePublicProfile([]), null);
});

test("directory hits: ranked cards without contact fields", () => {
  const [h] = parseDirectory([{ professional_id: "p1", name: "A", rank: 1, from_price: 15, distance_km: 1.2, phone: "1" }]);
  assert.equal(h!.rank, 1);
  assert.equal(h!.fromPriceValue, 15);
  assert.equal("phone" in h!, false);
});

test("teaches at: later start and weekday label", () => {
  assert.equal(teachesTitle({ title: "Spin 45", startsOn: "2026-11-01" }, TODAY), "Spin 45 · from Nov 1");
  assert.equal(teachesTitle({ title: "Spin 45", startsOn: "2026-10-01" }, TODAY), "Spin 45");
  assert.equal(weekdayCaps(5), "FRI");
  assert.equal(weekdayCaps(7), "SUN");
  assert.equal(weekdayCaps(null), "");
});
