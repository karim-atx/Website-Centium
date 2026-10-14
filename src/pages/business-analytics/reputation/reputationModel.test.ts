import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { BizReview, ReviewReply } from "../../../services/reputation/types";
import { presetRange } from "../analyticsRange.ts";
import {
  ago,
  allReviewsLine,
  distLines,
  filterReviews,
  heroLead,
  metricsOf,
  replyTimeTone,
  reviewerLabel,
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
  authorName: null,
  authorIsMember: false,
  createdAt: `${day}T10:00:00Z`,
  redacted: false,
  ...extra,
});
const range = presetRange("4w", TODAY);
const vocab = { people: "members", rateWhat: "their classes or your business" };

test("reputation: masked label is Member # plus 4 characters of the review id", () => {
  assert.equal(
    reviewerLabel({ id: "9e21abcd-0000", authorName: null }).who,
    "Member #9E21",
  );
  assert.equal(reviewerLabel({ id: "x", authorName: "Taylor" }).who, "Taylor");
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
  const m = metricsOf(list, range, null, TODAY);
  assert.equal(m.early, true);
  assert.equal(m.ratingDelta, null);
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

test("reputation: reply rate and hours come from replies only", () => {
  const list = [rv("a", 5, "2026-10-01"), rv("b", 4, "2026-10-02")];
  const replies = new Map<string, ReviewReply>([
    [
      "a",
      {
        id: "r",
        reviewId: "a",
        body: "Thanks",
        createdAt: "2026-10-01T20:00:00Z",
        editedAt: null,
      },
    ],
  ]);
  const m = metricsOf(list, range, replies, TODAY);
  assert.equal(m.replyRate, 50);
  assert.equal(m.replyHours, 10);
  assert.equal(metricsOf(list, range, null, TODAY).replyRate, null);
});

test("reputation: weeks start on Monday and the chart is 12 weeks", () => {
  const ws = weekSeries([rv("a", 5, "2026-10-13")], range, null, TODAY);
  assert.equal(ws.labels.length, 12);
  assert.equal(ws.labels[11], "Week of 12 Oct");
  assert.equal(ws.count[11], 1);
  assert.equal(ws.early, true);
});

test("reputation: filters, lines and reply-time tone", () => {
  const list = [
    rv("a", 5, "2026-10-01"),
    rv("b", 2, "2026-10-02"),
    rv("c", 5, "2026-10-03"),
  ];
  assert.equal(filterReviews(list, "low", null).length, 1);
  assert.equal(filterReviews(list, "unreplied", null).length, 0);
  assert.equal(
    allReviewsLine(list, range),
    "Mostly 5 stars this period, from 3 new reviews.",
  );
  assert.equal(
    distLines(metricsOf(list, range, null, TODAY)).insight,
    "67% are 5 stars. 1 of 3 are 2 stars or lower.",
  );
  assert.equal(replyTimeTone(19), "good");
  assert.equal(replyTimeTone(60), "caution");
  assert.equal(replyTimeTone(80), "high");
  assert.equal(ago("2026-10-13T08:00:00Z", TODAY), "1 day ago");
});
