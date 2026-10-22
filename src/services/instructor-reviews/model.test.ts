import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canSend,
  contextLine,
  findPast,
  firstName,
  parsePastBookings,
  reviewErrorOf,
  reviewMetaTail,
  reviewNote,
  reviewTitle,
  sentText,
  shortDay,
  starKey,
  targetOf,
} from "./model.ts";

const row = (over: Record<string, unknown> = {}) => ({
  kind: "class",
  ref_id: "bk1",
  class_session_id: "s1",
  title: "Spin 45",
  provider_name: "Hamra Strength Club",
  professional_id: "p1",
  professional_name: "Rana Khoury",
  starts_at: new Date(2026, 9, 9, 18, 30).toISOString(),
  status: "attended",
  reviewable: true,
  reviewed: false,
  ...over,
});

test("my_bookings past rows parse tolerantly; unknown kinds and rows without an id drop", () => {
  const list = parsePastBookings([row(), { kind: "nope", ref_id: "x" }, { kind: "class" }, row({ ref_id: "bk2", reviewable: "true", reviewed: 1, my_rating: 5 })]);
  assert.equal(list.length, 2);
  assert.equal(list[0].sessionId, "s1");
  assert.equal(list[0].professionalName, "Rana Khoury");
  assert.equal(list[1].reviewable, true);
  assert.equal(list[1].reviewed, true);
  assert.equal(list[1].myRating, 5);
  assert.equal(parsePastBookings(null).length, 0);
  // instructor_* aliases and a session under class_id
  const alt = parsePastBookings([{ kind: "class", booking_id: "b9", class_id: "s9", instructor_id: "p9", instructor_name: "Nour Fares", reviewable: true }])[0];
  assert.equal(alt.refId, "b9");
  assert.equal(alt.sessionId, "s9");
  assert.equal(alt.professionalName, "Nour Fares");
});

test("only a reviewable, unreviewed class with a Team instructor is a review target", () => {
  const [b] = parsePastBookings([row()]);
  const t = targetOf(b);
  assert.ok(t);
  assert.equal(t.sessionId, "s1");
  assert.equal(t.gymName, "Hamra Strength Club");
  assert.equal(targetOf({ ...b, reviewable: false }), null);
  assert.equal(targetOf({ ...b, reviewed: true }), null);
  assert.equal(targetOf({ ...b, professionalName: null }), null);
  assert.equal(targetOf({ ...b, kind: "professional_session" }), null);
  assert.equal(targetOf({ ...b, sessionId: null }), null);
});

test("the calendar finds the row by booking, else by session", () => {
  const list = parsePastBookings([row(), row({ ref_id: "bk2", class_session_id: "s2" })]);
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

test("documented refusals map by name", () => {
  assert.equal(reviewErrorOf({ code: "P0001", message: "already_reviewed" }), "already_reviewed");
  assert.equal(reviewErrorOf({ code: "P0001", message: "x", details: "not_attended" }), "not_attended");
  assert.equal(reviewErrorOf({ code: "P0001", message: "other" }), null);
  assert.equal(reviewErrorOf(null), null);
});
