import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  REPORT_REASONS,
  inFlagQueue,
  mapBizReview,
  mapInstructorRating,
  mapMetrics,
  mapMyReport,
  reputationError,
} from "./mapping.ts";

const venues = new Map([["g1", "Flex Gym"]]);
const row = {
  review_id: "9e21abcd-0000-4000-8000-000000000001",
  gym_id: "g1",
  rating: 4,
  body: "Great class",
  reviewer_label: "Member #9E21",
  created_at: "2026-10-01T10:00:00Z",
  edited_at: null,
  redacted: false,
  class_title: "Lunch HIIT",
  instructor_first_name: "Jane",
  reply_body: "Thanks!",
  reply_at: "2026-10-01T12:00:00Z",
  reply_redacted: false,
  flagged: true,
  total_count: 1,
  instructor_id: "p1",
  flag_kind: "injury",
};

test("B14 mapping: business_reviews_page row, with the reply, tags and flag", () => {
  const r = mapBizReview(row, venues);
  assert.equal(r.id, row.review_id);
  assert.equal(r.gymName, "Flex Gym");
  assert.equal(r.rating, 4);
  assert.equal(r.label, "Member #9E21");
  assert.equal(r.classTitle, "Lunch HIIT");
  assert.equal(r.instructor, "Jane");
  assert.deepEqual(r.reply, {
    body: "Thanks!",
    at: "2026-10-01T12:00:00Z",
    redacted: false,
  });
  assert.equal(r.flagged, true);
  assert.equal(r.instructorId, "p1");
  assert.equal(r.flagKind, "injury");
  assert.equal(r.handledAt, null);
  assert.equal(inFlagQueue(r), true);
  const handled = mapBizReview({ ...row, handled_at: "2026-10-03T10:00:00Z" }, venues);
  assert.equal(handled.handledAt, "2026-10-03T10:00:00Z");
  assert.equal(inFlagQueue(handled), false);
  assert.equal(mapBizReview({ ...row, flag_kind: "weird" }, venues).flagKind, null);
  assert.equal(mapBizReview({ ...row, flagged: false }, venues).flagKind, null);
});

test("B14 mapping: no venue, no reply, a removed reply, a redacted review", () => {
  const venueLess = mapBizReview(
    { ...row, gym_id: null, reply_at: null, reply_body: null, flagged: false },
    venues,
  );
  assert.equal(venueLess.gymId, null);
  assert.equal(venueLess.gymName, null);
  assert.equal(venueLess.reply, null);
  assert.equal(venueLess.flagged, false);
  const removed = mapBizReview(
    { ...row, reply_body: null, reply_redacted: true },
    venues,
  );
  assert.deepEqual(removed.reply, {
    body: null,
    at: "2026-10-01T12:00:00Z",
    redacted: true,
  });
  const red = mapBizReview(
    { ...row, redacted: true, rating: null, body: null },
    venues,
  );
  assert.equal(red.rating, null);
  assert.equal(red.body, null);
  // The label never falls back to a person: 4 characters of the review id.
  assert.equal(
    mapBizReview({ ...row, reviewer_label: null }, venues).label,
    "Member #9E21",
  );
});

test("B14 mapping: metrics with a jsonb distribution and numeric strings", () => {
  const m = mapMetrics({
    reviews: 3,
    average: "4.33",
    previous_average: null,
    previous_reviews: 0,
    distribution: { "1": 0, "2": 0, "3": 1, "4": 0, "5": 2 },
    weekly: [],
    reply_rate: "66.7",
    average_hours_to_reply: "3.5",
    flagged: 1,
  });
  assert.equal(m.average, 4.33);
  assert.deepEqual(m.distribution, [2, 0, 1, 0, 0]);
  assert.equal(m.replyRate, 66.7);
  assert.equal(m.averageHoursToReply, 3.5);
  assert.equal(m.flagged, 1);
  const empty = mapMetrics(null);
  assert.equal(empty.reviews, 0);
  assert.equal(empty.replyRate, null);
});

test("B14 mapping: instructor ratings, own reports, reasons and refusals", () => {
  assert.deepEqual(
    mapInstructorRating({
      professional_id: "p1",
      first_name: "Jane",
      reviews: 4,
      average: "4.75",
    }),
    { professionalId: "p1", firstName: "Jane", reviews: 4, average: 4.75 },
  );
  assert.deepEqual(
    mapMyReport({ review_id: "r1", created_at: "2026-10-02T00:00:00Z", status: "weird" }),
    { reviewId: "r1", reportedAt: "2026-10-02T00:00:00Z", status: "open" },
  );
  // Every key is a review_report_reason value.
  assert.deepEqual(
    REPORT_REASONS.map((r) => r.key).sort(),
    [
      "harassment",
      "injury",
      "not_about_this_business",
      "other",
      "shares_private_information",
      "spam",
    ],
  );
  assert.equal(
    reputationError("ATXF9"),
    "This review already has a reply. Edit it instead.",
  );
  assert.equal(reputationError("ATXG0"), "You've already reported this review.");
  assert.equal(reputationError("XX000"), null);
});
