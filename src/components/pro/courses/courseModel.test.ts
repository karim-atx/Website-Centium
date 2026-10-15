import { strict as assert } from "node:assert";
import { test } from "node:test";
import { accessLine, dripMatches, dripPlan, lessonEyebrow, lessonMeta, parsePrice, ratingBars, ratingsLine, sizeLine, statusLabel, tabOf, titleError } from "./courseModel";

test("tabs group the five course statuses", () => {
  assert.equal(tabOf("published"), "Published");
  assert.equal(tabOf("unpublished"), "Archived");
  assert.equal(tabOf("draft"), "Drafts");
  assert.equal(tabOf("submitted"), "Drafts");
  assert.equal(tabOf("changes_requested"), "Drafts");
  assert.equal(statusLabel("submitted"), "In review");
});

test("size line follows the plural rule", () => {
  assert.equal(sizeLine(6, 18), "6 weeks · 18 lessons");
  assert.equal(sizeLine(1, 1), "1 week · 1 lesson");
  assert.equal(sizeLine(0, 0), "0 weeks · 0 lessons");
});

test("title needs 8 characters, trimmed", () => {
  assert.equal(titleError("Abs"), "Use at least 8 characters");
  assert.equal(titleError("  Strength  "), null);
  assert.equal(titleError("Mobility"), null);
});

test("weekly drip opens week n after 7 × n days; all at once opens everything", () => {
  assert.deepEqual(dripPlan(["a", "b", "c"], "weekly"), [
    { moduleId: "a", days: 0 },
    { moduleId: "b", days: 7 },
    { moduleId: "c", days: 14 },
  ]);
  assert.deepEqual(dripPlan(["a", "b"], "all_at_once"), [
    { moduleId: "a", days: 0 },
    { moduleId: "b", days: 0 },
  ]);
  assert.equal(dripPlan(Array.from({ length: 60 }, (_, i) => `m${i}`), "weekly")[59].days, 365);
  assert.equal(dripMatches(dripPlan(["a", "b"], "weekly"), new Map([["a", 0], ["b", 7]])), true);
  assert.equal(dripMatches(dripPlan(["a", "b"], "weekly"), new Map([["a", 0]])), false);
});

test("ratings bars count stars 5 to 1", () => {
  assert.deepEqual(ratingBars([5, 5, 4, 3, 5]), [
    { stars: 5, count: 3 },
    { stars: 4, count: 1 },
    { stars: 3, count: 1 },
    { stars: 2, count: 0 },
    { stars: 1, count: 0 },
  ]);
  assert.equal(ratingsLine(4.66, 21), "4.7 from 21 ratings");
  assert.equal(ratingsLine(null, 0), "No ratings yet");
  assert.equal(ratingsLine(5, 1), "5.0 from 1 rating");
});

test("price parsing and the access line", () => {
  assert.equal(parsePrice("$19"), 1900);
  assert.equal(parsePrice("19.5"), 1950);
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("600"), null);
  assert.equal(accessLine("$19", "weekly"), "Public · $19 · one week at a time");
  assert.equal(accessLine("Free", "all_at_once"), "Public · Free · all at once");
});

test("lesson meta and the preview eyebrow", () => {
  assert.equal(lessonMeta("video", 6), "Video · 6 min");
  assert.equal(lessonMeta("pdf", null), "PDF");
  assert.equal(lessonMeta("quiz", null, 4), "Quiz · 4 questions");
  assert.equal(lessonMeta("quiz", null, 1), "Quiz · 1 question");
  assert.equal(lessonEyebrow(0, "Reading", 4), "Week 1 · Reading · 4 min");
  assert.equal(lessonEyebrow(1, "Quiz", null), "Week 2 · Quiz");
});
