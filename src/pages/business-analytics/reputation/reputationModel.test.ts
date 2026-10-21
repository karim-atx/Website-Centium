import { strict as assert } from "node:assert";
import { test } from "node:test";
import type {
  BizReview,
  ReviewMetrics,
} from "../../../services/reputation/types";
import { presetRange } from "../analyticsRange.ts";
import {
  ago,
  allReviewsLine,
  distLines,
  filterReviews,
  flagLine,
  instructorsOf,
  heroLead,
  metricsOf,
  replyTimeTone,
  reviewTag,
  weekSeries,
} from "./reputationModel.ts";

const TODAY = "2026-10-14";
const rv = (
  id: string,
  rating: number,
  day: string,
  extra: Partial<BizReview> = {},
): BizReview => ({
  id,
  gymId: "g1",
  gymName: "Flex Gym",
  rating,
  body: "Text",
  label: "Member #" + id.toUpperCase(),
  createdAt: `${day}T10:00:00Z`,
  editedAt: null,
  redacted: false,
  classTitle: null,
  instructor: null,
  reply: null,
  flagged: false,
  ...extra,
});
const met = (p: Partial<ReviewMetrics>): ReviewMetrics => ({
  reviews: 0,
  average: null,
  previousAverage: null,
  previousReviews: 0,
  distribution: [0, 0, 0, 0, 0],
  replyRate: null,
  averageHoursToReply: null,
  flagged: 0,
  ...p,
});
const range = presetRange("4w", TODAY);
const vocab = { people: "members", rateWhat: "their classes or your business" };

test("reputation: the row tag is class · instructor, led by the venue with several venues", () => {
  const r = rv("a", 5, "2026-10-01", {
    classTitle: "Lunch HIIT",
    instructor: "Jane",
  });
  assert.equal(reviewTag(r, false), "Lunch HIIT · Jane");
  assert.equal(reviewTag(r, true), "Flex Gym · Lunch HIIT · Jane");
  assert.equal(reviewTag(rv("b", 4, "2026-10-01"), false), null);
});

test("reputation: no reviews gives dashes and the per-type empty lead", () => {
  const m = metricsOf([], range, null, TODAY);
  assert.equal(m.total, 0);
  assert.equal(m.rating, null);
  assert.equal(
    heroLead(m, vocab),
    "Reviews appear here once members rate their classes or your business on Centium.",
  );
});

test("reputation: rating shows from 3 reviews, redacted reviews do not count", () => {
  const two = [rv("a", 5, "2026-08-01"), rv("b", 4, "2026-08-02")];
  assert.equal(metricsOf(two, range, null, TODAY).rating, null);
  const list = [
    ...two,
    rv("c", 3, "2026-08-03"),
    rv("d", 1, "2026-08-04", { redacted: true, rating: null }),
  ];
  const m = metricsOf(list, range, null, TODAY);
  assert.equal(m.total, 3);
  assert.equal(m.rating, 4);
  assert.deepEqual(m.dist, [1, 1, 1, 0, 0]);
});

test("reputation: early data under 4 weeks hides deltas", () => {
  const list = [
    rv("a", 5, "2026-10-01"),
    rv("b", 4, "2026-10-02"),
    rv("c", 5, "2026-10-03"),
  ];
  const m = metricsOf(
    list,
    range,
    { cur: met({ replyRate: 50 }), prev: met({ replyRate: 20 }) },
    TODAY,
  );
  assert.equal(m.early, true);
  assert.equal(m.ratingDelta, null);
  assert.equal(m.replyRateDelta, null);
  assert.equal(
    heroLead(m, vocab),
    "Your first reviews came in less than 4 weeks ago. Trends start after a full period.",
  );
});

test("reputation: rating delta against the period before, lead from numbers only", () => {
  const list = [
    rv("a", 5, "2026-07-01"),
    rv("b", 5, "2026-07-02"),
    rv("c", 5, "2026-07-03"),
    rv("d", 1, "2026-10-10"),
  ];
  const m = metricsOf(list, range, null, TODAY);
  assert.equal(m.rating, 4);
  assert.equal(m.ratingDelta, -1);
  assert.equal(m.inRange, 1);
  assert.equal(
    heroLead(m, vocab),
    "Your rating is down 1.0 on the period before, with 1 new review.",
  );
});

test("reputation: reply rate and time come from business_review_metrics; replied from the rows", () => {
  const list = [
    rv("a", 5, "2026-07-01", {
      reply: { body: "Thanks", at: "2026-07-01T20:00:00Z", redacted: false },
    }),
    rv("b", 4, "2026-07-02"),
  ];
  const m = metricsOf(
    list,
    range,
    {
      cur: met({ replyRate: 66.7, averageHoursToReply: 9.6 }),
      prev: met({ replyRate: 50, averageHoursToReply: 20 }),
    },
    TODAY,
  );
  assert.equal(m.replyRate, 67);
  assert.equal(m.replyRateDelta, 17);
  assert.equal(m.replyHours, 10);
  assert.equal(m.replyHoursDelta, -10);
  assert.equal(m.replied, 1);
  assert.equal(m.recentReplied, 1);
  const none = metricsOf(list, range, { cur: met({}), prev: null }, TODAY);
  assert.equal(none.replyRate, null);
  assert.equal(none.replyRateDelta, null);
});

test("reputation: weeks start on Monday, the chart is 12 weeks, 3 replies in a week make a marker", () => {
  const at = { body: "x", at: "2026-10-13T09:00:00Z", redacted: false };
  const ws = weekSeries(
    [
      rv("a", 5, "2026-10-13", { reply: at }),
      rv("b", 5, "2026-10-12", { reply: at }),
      rv("c", 4, "2026-10-12", { reply: at }),
    ],
    range,
    TODAY,
  );
  assert.equal(ws.labels.length, 12);
  assert.equal(ws.labels[11], "Week of Oct 12");
  assert.equal(ws.count[11], 3);
  assert.equal(ws.early, true);
  assert.deepEqual(ws.markers, [{ i: 11, t: "Replied to 3", kind: "reply" }]);
});

test("reputation: filters, lines, flag line and reply-time tone", () => {
  const list = [
    rv("a", 5, "2026-10-01"),
    rv("b", 2, "2026-10-02"),
    rv("c", 5, "2026-10-03", {
      reply: { body: "Thanks", at: "2026-10-03T12:00:00Z", redacted: false },
    }),
  ];
  assert.equal(filterReviews(list, "low").length, 1);
  assert.equal(filterReviews(list, "unreplied").length, 2);
  const tagged = [rv("x", 5, "2026-10-01", { instructor: "Jane" }), rv("y", 4, "2026-10-01", { instructor: "Sam" }), rv("z", 3, "2026-10-01", { instructor: "Jane" })];
  assert.deepEqual(instructorsOf(tagged), [{ name: "Jane", n: 2 }, { name: "Sam", n: 1 }]);
  assert.equal(filterReviews(tagged, "inst:Jane").length, 2);
  assert.equal(
    allReviewsLine(list, range),
    "Mostly 5 stars this period, from 3 new reviews.",
  );
  assert.equal(
    distLines(metricsOf(list, range, null, TODAY)).insight,
    "67% are 5 stars. 1 of 3 are 2 stars or lower.",
  );
  assert.equal(
    flagLine("2026-10-08T09:00:00Z"),
    "You reported this to Centium on Oct 8. We're reviewing it.",
  );
  assert.equal(
    flagLine(null),
    "Centium is reviewing this review. You can still reply.",
  );
  assert.equal(replyTimeTone(19), "good");
  assert.equal(replyTimeTone(60), "caution");
  assert.equal(replyTimeTone(80), "high");
  assert.equal(ago("2026-10-13T08:00:00Z", TODAY), "1 day ago");
});
