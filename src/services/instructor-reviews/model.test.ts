import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canSend,
  contextLine,
  findPast,
  firstName,
  isOver,
  parseClassBookings,
  reviewErrorOf,
  reviewMetaTail,
  reviewNote,
  reviewTitle,
  sentText,
  shortDay,
  starKey,
  targetOf,
} from "./model.ts";

/** A my_class_bookings row (Database 20261211100000), as PostgREST returns it. */
const row = (over: Record<string, unknown> = {}) => ({
  booking_id: "bk1",
  session_id: "s1",
  series_id: "cs1",
  class_title: "Spin 45",
  starts_at: new Date(2026, 9, 9, 18, 30).toISOString(),
  ends_at: new Date(2026, 9, 9, 19, 15).toISOString(),
  business_id: "b1",
  business_name: "Friend Fitness",
  gym_id: "g1",
  instructor_id: "p1",
  instructor_name: "Rana Khoury",
  instructor_avatar: null,
  payment_method: "cash",
  payment_status: "pending",
  price_agreed: 10,
  cancelled_at: null,
  my_rating: null,
  can_review: true,
  booked_at: new Date(2026, 9, 1).toISOString(),
  ...over,
});

test("my_class_bookings rows parse; rows without a booking id drop; my_rating is the caller's own", () => {
  const list = parseClassBookings([row(), { session_id: "x" }, row({ booking_id: "bk2", can_review: false, my_rating: 5 }), row({ booking_id: "bk3", cancelled_at: "2026-10-08T10:00:00Z", can_review: false })]);
  assert.equal(list.length, 3);
  assert.deepEqual([list[0].refId, list[0].sessionId, list[0].seriesId, list[0].gymId, list[0].providerName], ["bk1", "s1", "cs1", "g1", "Friend Fitness"]);
  assert.equal(list[0].professionalName, "Rana Khoury");
  assert.deepEqual([list[0].reviewable, list[0].reviewed, list[0].myRating, list[0].cancelled], [true, false, null, false]);
  assert.deepEqual([list[1].reviewable, list[1].reviewed, list[1].myRating], [false, true, 5]);
  assert.equal(list[2].cancelled, true);
  assert.equal(parseClassBookings(null).length, 0);
  assert.equal(parseClassBookings([row({ my_rating: 9 })])[0].myRating, null);
});

test("past means over: a class still running is not past yet", () => {
  const now = new Date(2026, 9, 9, 19, 0);
  assert.equal(isOver({ startsAt: new Date(2026, 9, 9, 18, 30).toISOString(), endsAt: new Date(2026, 9, 9, 19, 15).toISOString() }, now), false);
  assert.equal(isOver({ startsAt: new Date(2026, 9, 9, 18, 0).toISOString(), endsAt: new Date(2026, 9, 9, 18, 45).toISOString() }, now), true);
  assert.equal(isOver({ startsAt: new Date(2026, 9, 9, 18, 0).toISOString(), endsAt: null }, now), true);
  assert.equal(isOver({ startsAt: null, endsAt: null }, now), false);
});

test("only a reviewable, unrated, uncancelled class with an instructor is a review target", () => {
  const [b] = parseClassBookings([row()]);
  const t = targetOf(b);
  assert.ok(t);
  assert.equal(t.sessionId, "s1");
  assert.equal(t.bookingId, "bk1");
  assert.equal(t.gymName, "Friend Fitness");
  assert.equal(targetOf({ ...b, reviewable: false }), null);
  assert.equal(targetOf({ ...b, reviewed: true }), null);
  assert.equal(targetOf({ ...b, cancelled: true }), null);
  assert.equal(targetOf({ ...b, professionalName: null }), null);
  assert.equal(targetOf({ ...b, sessionId: null }), null);
});

test("the calendar finds the row by booking, else by session", () => {
  const list = parseClassBookings([row(), row({ booking_id: "bk2", session_id: "s2" })]);
  assert.equal(findPast(list, "bk2")?.sessionId, "s2");
  assert.equal(findPast(list, "zz", "s1")?.refId, "bk1");
  assert.equal(findPast(list, "zz", "s9"), null);
  assert.equal(findPast(list, "zz"), null);
});

test("the board's copy, with the instructor's first name (D-02 dates)", () => {
  assert.equal(firstName("Rana Khoury"), "Rana");
  assert.equal(reviewTitle("Rana Khoury"), "How was Rana's class?");
  assert.equal(reviewNote("Rana Khoury"), "Shown on Rana's profile with your first name and the gym's name.");
  assert.equal(sentText("Rana Khoury", "Hamra Strength Club"), "Review sent · it shows on Rana's profile with Hamra Strength Club");
  const at = new Date(2026, 9, 9, 18, 30).toISOString();
  assert.equal(shortDay(at), "Fri, Oct 9");
  assert.equal(shortDay(null), "");
  assert.equal(contextLine({ title: "Spin 45", gymName: "Hamra Strength Club", startsAt: at }), "Spin 45 · Hamra Strength Club · Fri, Oct 9");
  assert.equal(reviewMetaTail({ reviewed: false, rating: null }), "Rate your instructor");
  assert.equal(reviewMetaTail({ reviewed: true, rating: 5 }), "you rated 5");
  assert.equal(reviewMetaTail({ reviewed: true, rating: null }), null);
});

test("Send needs a star; the radiogroup keys move and clamp", () => {
  assert.equal(canSend(0), false);
  assert.equal(canSend(3), true);
  assert.equal(canSend(6), false);
  assert.equal(starKey(0, "ArrowRight"), 1);
  assert.equal(starKey(0, "ArrowLeft"), 5);
  assert.equal(starKey(4, "ArrowRight"), 5);
  assert.equal(starKey(5, "ArrowUp"), 5);
  assert.equal(starKey(2, "ArrowDown"), 1);
  assert.equal(starKey(1, "ArrowLeft"), 1);
  assert.equal(starKey(3, "Home"), 1);
  assert.equal(starKey(3, "End"), 5);
  assert.equal(starKey(3, "Enter"), null);
});

test("review_instructor's refusals map by code (HANDOVER_API Release 2)", () => {
  assert.equal(reviewErrorOf({ code: "ATX94", message: "ATXH22: you did not attend that class" }), "not_attended");
  assert.equal(reviewErrorOf({ code: "ATX08", message: "ATXH23: that class had no named instructor" }), "no_instructor");
  assert.equal(reviewErrorOf({ code: "ATX08", message: "ATXH23: that instructor is not on this gym's team" }), "no_instructor");
  assert.equal(reviewErrorOf({ code: "ATX10", message: "you can rate a class once it has happened" }), "not_yet");
  assert.equal(reviewErrorOf({ code: "ATX91", message: "a rating must be between 1 and 5" }), "bad_rating");
  assert.equal(reviewErrorOf({ code: "22023", message: "keep it under 2000 characters" }), "too_long");
  assert.equal(reviewErrorOf({ code: "ATX02", message: "rate limited" }), "rate_limited");
  // Database #38: stars alone are a review, so the old not-null refusal no longer has a name.
  assert.equal(reviewErrorOf({ code: "23502", message: "null value in column \"body\" of relation \"gym_reviews\" violates not-null constraint" }), null);
  assert.equal(reviewErrorOf({ code: "P0001", message: "other" }), null);
  assert.equal(reviewErrorOf(null), null);
});
