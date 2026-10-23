import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arrangeMemberships,
  classRow,
  hireRow,
  membershipRow,
  pastRow,
  pastRows,
  pastStub,
  sessionMeta,
  sessionRow,
  splitSchedule,
  tabFromQuery,
  tileInitials,
  upcomingStub,
  type MembershipInput,
} from "./myBookingsModel.ts";
import type { PastBooking } from "../../services/instructor-reviews/model.ts";

const NOW = new Date(2026, 9, 15, 12, 0); // Thu Oct 15 2026, local

const gym = (over: Partial<MembershipInput> = {}): MembershipInput => ({
  id: "m1",
  gymId: "g1",
  gymName: "Hamra Strength Club",
  planName: "Monthly",
  status: "active",
  passState: "valid",
  priceAgreed: 45,
  startedOn: "2026-10-15",
  expiresOn: "2026-11-15",
  cancelAtPeriodEnd: false,
  ...over,
});

test("tab query falls back to Memberships", () => {
  assert.equal(tabFromQuery("past"), "past");
  assert.equal(tabFromQuery("upcoming"), "upcoming");
  assert.equal(tabFromQuery(null), "memberships");
  assert.equal(tabFromQuery("nope"), "memberships");
});

test("tile initials are two letters, as the board's tiles", () => {
  assert.equal(tileInitials("Hamra Strength Club"), "HS");
  assert.equal(tileInitials("Cedar Fitness"), "CF");
  assert.equal(tileInitials("Noor"), "NO");
  assert.equal(tileInitials("  "), "?");
});

test("stubs and meta are month first and 12-hour (D-02, D-03)", () => {
  const d = new Date(2026, 9, 16, 18, 30);
  assert.equal(upcomingStub(d), "Fri 6:30 PM");
  assert.equal(pastStub(new Date(2026, 9, 12, 7, 0)), "Mon Oct 12");
  assert.equal(sessionMeta(d, new Date(2026, 9, 16, 19, 15)), "Fri, Oct 16 · 6:30 PM · 45 min");
  assert.equal(sessionMeta(new Date(2026, 9, 19, 7, 0), new Date(2026, 9, 19, 8, 0), 35), "Mon, Oct 19 · 7:00 AM · 60 min · $35");
});

test("an active membership reads as the board's bookMembers row", () => {
  const r = membershipRow(gym());
  assert.equal(r.title, "Hamra Strength Club");
  assert.equal(r.sub, "Monthly");
  assert.equal(r.meta, "Valid until Nov 15, 2026 · $45");
  assert.equal(r.stub, "Ends Nov 15");
  assert.equal(r.tone, "pale");
  assert.equal(r.href, "/app/marketplace/gym?id=g1");
  assert.equal(r.note, null);
});

test("a run-out day pass is Used, muted; other endings are muted too", () => {
  const pass = membershipRow(gym({ planName: "Day pass", planType: "day_pass", status: "expired", passState: "expired", priceAgreed: 8, startedOn: "2026-10-03", expiresOn: "2026-10-03" }));
  assert.equal(pass.stub, "Used");
  assert.equal(pass.meta, "Used Oct 3, 2026 · $8");
  assert.equal(pass.tone, "muted");
  assert.equal(membershipRow(gym({ status: "expired", passState: "expired" })).stub, "Expired");
  assert.equal(membershipRow(gym({ status: "cancelled", passState: "cancelled" })).stub, "Ended");
});

test("an end requested this session, an unpaid pass and an upcoming period", () => {
  assert.equal(membershipRow(gym({ expiresOn: "2026-12-01" }), "2026-11-20").stub, "Ends Nov 20");
  assert.equal(membershipRow(gym({ passState: "awaiting_payment" })).note, "Pay on your first visit");
  const up = membershipRow(gym({ status: "upcoming", passState: "upcoming", startedOn: "2026-11-01" }));
  assert.equal(up.stub, "Starts Nov 1");
  assert.equal(membershipRow(gym({ expiresOn: null })).stub, "Active");
});

test("hires sit in Memberships: pending pale, ended muted", () => {
  const h = { id: "h1", professionalId: "p1", professionalFirstName: "Noor", planName: "Monthly coaching", status: "pending" as const, priceAgreed: 180, startedOn: "2026-10-20", expiresOn: "2026-11-20", cancelledAt: null };
  const r = hireRow(h, "Personal trainer");
  assert.equal(r.title, "Noor");
  assert.equal(r.sub, "Monthly coaching · Personal trainer");
  assert.equal(r.stub, "Pending");
  assert.equal(r.tone, "pale");
  assert.equal(hireRow({ ...h, status: "active" }, null).stub, "Ends Nov 20");
  assert.equal(hireRow({ ...h, status: "cancelled", cancelledAt: "2026-10-21T10:00:00Z" }, null).tone, "muted");
  const sorted = arrangeMemberships([hireRow({ ...h, status: "cancelled", cancelledAt: "2026-10-21T10:00:00Z" }, null), membershipRow(gym())]);
  assert.equal(sorted[0].kind, "membership");
});

test("classes split by their end; upcoming ascending, past descending", () => {
  const a = classRow({ bookingId: "b1", classId: "c1", title: "Spin 45", place: "Hamra Strength Club", eventDate: "2026-10-16", startTime: "18:30:00", endTime: "19:15:00", cancelledAt: null }, NOW);
  const b = classRow({ bookingId: "b2", classId: "c2", title: "Mat Pilates", place: "Achrafieh Athletic", eventDate: "2026-10-17", startTime: "09:00:00", endTime: "09:50:00", cancelledAt: null }, NOW);
  const old1 = classRow({ bookingId: "b3", classId: "c3", title: "Strength Foundations", place: "Cedar Fitness", eventDate: "2026-10-05", startTime: "12:30", endTime: "13:30", cancelledAt: null }, NOW);
  const old2 = classRow({ bookingId: "b4", classId: "c4", title: "Spin 45", place: "Hamra Strength Club", eventDate: "2026-10-09", startTime: "18:30", endTime: "19:15", cancelledAt: null }, NOW);
  assert.equal(a.row.stub, "Fri 6:30 PM");
  assert.equal(a.row.tone, "teal");
  assert.equal(a.row.meta, "Fri, Oct 16 · 6:30 PM · 45 min");
  assert.equal(a.row.href, "/app/marketplace/class?id=c1");
  assert.equal(old1.row.stub, "Mon Oct 5");
  assert.equal(old1.row.tone, "muted");
  const s = splitSchedule([old1, b, old2, a]);
  assert.deepEqual(s.upcoming.map((r) => r.refId), ["b1", "b2"]);
  assert.deepEqual(s.past.map((r) => r.refId), ["b4", "b3"]);
});

test("a class cancelled by the venue says so", () => {
  const c = classRow({ bookingId: "b1", classId: "c1", title: "Core 20", place: "Cedar Fitness", eventDate: "2026-11-06", startTime: "07:00", endTime: "07:20", cancelledAt: "2026-10-14T10:00:00Z" }, NOW);
  assert.equal(c.row.stub, "Cancelled");
  assert.equal(c.row.tone, "muted");
  assert.match(c.row.meta, /Cancelled by the venue$/);
});

test("a hired session: 'Name · Type', the price, requested and cancelled states", () => {
  const base = { id: "a1", serviceName: "1:1 strength session", professionalId: "p1", who: "Rami · Coach or instructor", startsAt: new Date(2026, 9, 19, 7, 0).toISOString(), endsAt: new Date(2026, 9, 19, 8, 0).toISOString(), status: "booked", price: 35 };
  const s = sessionRow(base, NOW);
  assert.equal(s.past, false);
  assert.equal(s.row.sub, "Rami · Coach or instructor");
  assert.equal(s.row.tile, "RA");
  assert.equal(s.row.meta, "Mon, Oct 19 · 7:00 AM · 60 min · $35");
  assert.equal(s.row.stub, "Mon 7:00 AM");
  assert.equal(sessionRow({ ...base, status: "requested" }, NOW).row.stub, "Requested");
  assert.equal(sessionRow({ ...base, status: "cancelled" }, NOW).row.tone, "muted");
  assert.equal(sessionRow({ ...base, startsAt: new Date(2026, 9, 12, 7).toISOString(), endsAt: new Date(2026, 9, 12, 8).toISOString() }, NOW).row.stub, "Mon Oct 12");
});

test("DB4: Past classes from my_class_bookings, the Review stub, then Reviewed · you rated N", () => {
  const base: PastBooking = {
    refId: "bk1",
    sessionId: "s1",
    seriesId: "cs1",
    title: "Spin 45",
    providerName: "Hamra Strength Club",
    gymId: "g1",
    professionalId: "p1",
    professionalName: "Rana Khoury",
    professionalPhotoUrl: null,
    startsAt: new Date(2026, 9, 9, 18, 30).toISOString(),
    endsAt: new Date(2026, 9, 9, 19, 15).toISOString(),
    cancelled: false,
    reviewable: true,
    reviewed: false,
    myRating: null,
  };
  const r = pastRow(base);
  assert.equal(r.sub, "Hamra Strength Club · Rana Khoury");
  assert.equal(r.meta, "Fri, Oct 9 · 6:30 PM · Rate your instructor");
  assert.equal(r.stub, "Review");
  assert.equal(r.tone, "teal");
  assert.equal(r.review?.sessionId, "s1");
  assert.equal(r.href, "/app/marketplace/class?id=s1");
  assert.equal(r.kind, "class");
  const sent = pastRow(base, 5);
  assert.equal(sent.stub, "Reviewed");
  assert.equal(sent.tone, "muted");
  assert.equal(sent.meta, "Fri, Oct 9 · 6:30 PM · you rated 5");
  assert.equal(sent.review, null);
  // my_rating from the server (can_review is then false)
  const done = pastRow({ ...base, reviewable: false, reviewed: true, myRating: 4 });
  assert.equal(done.meta, "Fri, Oct 9 · 6:30 PM · you rated 4");
  assert.equal(done.stub, "Reviewed");
  // Not reviewable (no instructor named, or the server says no): the composed look.
  const plain = pastRow({ ...base, reviewable: false, professionalName: null, professionalId: null });
  assert.equal(plain.stub, "Fri Oct 9");
  assert.equal(plain.sub, "Hamra Strength Club");
  assert.equal(plain.meta, "Fri, Oct 9 · 6:30 PM · 45 min");
  assert.equal(plain.review, null);
  // The venue cancelled it: as the composed class row.
  const off = pastRow({ ...base, cancelled: true, reviewable: false });
  assert.equal(off.stub, "Cancelled");
  assert.equal(off.meta, "Fri, Oct 9 · 6:30 PM · 45 min · Cancelled by the venue");
  assert.equal(off.review, null);
  // Past = the DB4 classes + the composed rows that aren't classes, newest first.
  const session = sessionRow({ id: "a1", serviceName: "1:1 strength", professionalId: "p2", who: "Rami · Coach", startsAt: new Date(2026, 9, 7, 9).toISOString(), endsAt: new Date(2026, 9, 7, 10).toISOString(), status: "confirmed", price: 35 }, NOW).row;
  const composedClass = classRow({ bookingId: "bk1", classId: "s1", title: "Spin 45", place: "Hamra Strength Club", eventDate: "2026-10-09", startTime: "18:30", endTime: "19:15", cancelledAt: null }, NOW).row;
  const sorted = pastRows([{ ...base, refId: "old", reviewable: false, startsAt: new Date(2026, 9, 5, 12, 30).toISOString() }, base], { bk1: 5 }, [composedClass, session]);
  assert.deepEqual(
    sorted.map((x) => x.stub),
    ["Reviewed", "Wed Oct 7", "Mon Oct 5"]
  );
  assert.equal(sorted.filter((x) => x.kind === "class").length, 2);
});
