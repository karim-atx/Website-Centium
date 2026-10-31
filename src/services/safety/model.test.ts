import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  firstMessageCapLine,
  PROFESSIONAL_REVIEW_LIMIT_LINE,
  REVIEW_INSIDER_LINE,
  reviewOpensAt,
  reviewRefusalLine,
  reviewWaitLine,
  whenLabel,
} from "./model.ts";

// Device-local instants, so the day words don't depend on the test machine's zone.
const now = new Date(2026, 9, 31, 12, 0);
const local = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);

test("whenLabel: today, tomorrow, else the weekday and date, always with the time", () => {
  assert.equal(whenLabel(local(31, 21, 40), now), "today at 9:40 PM");
  assert.equal(whenLabel(new Date(2026, 10, 1, 9, 40), now), "tomorrow at 9:40 AM");
  assert.equal(whenLabel(new Date(2026, 10, 3, 9, 5), now), "Tue, Nov 3 at 9:05 AM");
});

test("reviewOpensAt: 7 days after created_at, null once old enough or unknown", () => {
  const created = new Date(2026, 9, 28, 8, 0);
  assert.equal(reviewOpensAt(created.toISOString(), now)?.getTime(), new Date(2026, 10, 4, 8, 0).getTime());
  assert.equal(reviewOpensAt(new Date(2026, 9, 20).toISOString(), now), null);
  assert.equal(reviewOpensAt(null, now), null);
  assert.equal(reviewOpensAt("not a date", now), null);
});

test("reviewWaitLine: the sentence, with the date when known", () => {
  assert.equal(reviewWaitLine(new Date(2026, 10, 4, 8, 0), now), "You can write reviews 7 days after joining Centium (from Nov 4).");
  assert.equal(reviewWaitLine(new Date(2027, 0, 2), now), "You can write reviews 7 days after joining Centium (from Jan 2, 2027).");
  assert.equal(reviewWaitLine(null, now), "You can write reviews 7 days after joining Centium.");
});

test("reviewRefusalLine: ATXW0 from its DETAIL; ATX03 and ATX02 only where they're F2's", () => {
  const at = new Date(2026, 10, 4, 8, 0).toISOString();
  assert.equal(reviewRefusalLine({ code: "ATXW0", details: at, message: "your account is too new to write a review" }, { now }), "You can write reviews 7 days after joining Centium (from Nov 4).");
  assert.equal(reviewRefusalLine({ code: "ATXW0", details: null }, { now }), "You can write reviews 7 days after joining Centium.");
  assert.equal(reviewRefusalLine({ code: "ATX03" }, { insider: true }), REVIEW_INSIDER_LINE);
  assert.equal(reviewRefusalLine({ code: "ATX03" }), null);
  // Never the server's "Too many review_professional attempts…".
  assert.equal(reviewRefusalLine({ code: "ATX02", message: "Too many review_professional attempts. Please try again in 1440 minute(s)." }, { professional: true }), PROFESSIONAL_REVIEW_LIMIT_LINE);
  assert.equal(reviewRefusalLine({ code: "ATX02" }), null);
  assert.equal(reviewRefusalLine({ code: "ATX92" }, { professional: true, insider: true }), null);
  assert.equal(reviewRefusalLine(null), null);
});

test("firstMessageCapLine: no hard-coded number (10, or 3 for a new account), with when it frees", () => {
  const line = firstMessageCapLine(new Date(2026, 10, 1, 9, 40).toISOString(), now);
  assert.equal(line, "You've messaged a lot of new people today. You can keep talking with people you've already messaged, and start new conversations again tomorrow at 9:40 AM.");
  assert.doesNotMatch(line, /\b(10|3) new people\b/);
  assert.match(firstMessageCapLine(null, now), /start new conversations again within a day\.$/);
  // A DETAIL already past reads as "within a day", not a time gone by.
  assert.match(firstMessageCapLine(local(31, 9, 0).toISOString(), now), /within a day\.$/);
});

test("firstMessageCapLine: later today reads today", () => {
  assert.match(firstMessageCapLine(local(31, 18, 0).toISOString(), now), /again today at 6:00 PM\.$/);
});
