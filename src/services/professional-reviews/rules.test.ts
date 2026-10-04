import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  EDIT_WINDOW_OVER,
  asReviewStatus,
  bodyLength,
  counterLabel,
  describeReviewError,
  editWindowLabel,
  ratingLabel,
  reviewCountLabel,
  sortByRating,
} from "./rules.ts";

test("an average shows only from three reviews", () => {
  assert.deepEqual(ratingLabel(null, 0), { kind: "new" });
  assert.deepEqual(ratingLabel(5, 2), { kind: "new" });
  assert.deepEqual(ratingLabel(4.666, 3), { kind: "average", value: "4.7", count: 3 });
  assert.equal(reviewCountLabel(1), "1 review");
  assert.equal(reviewCountLabel(12), "12 reviews");
});

test("characters count as Postgres counts them", () => {
  assert.equal(bodyLength("  hi  "), 2);
  assert.equal(bodyLength("💪🏽"), 2); // two code points, four UTF-16 units
  assert.equal(counterLabel("a".repeat(3812), 4000), "3,812 / 4,000");
});

test("the time left to edit, then the closed line", () => {
  const created = "2026-10-01T12:00:00Z";
  const t = (iso: string) => new Date(iso).getTime();
  assert.equal(editWindowLabel(created, t("2026-10-01T12:00:00Z")), "You can edit this for 30 more days.");
  assert.equal(editWindowLabel(created, t("2026-10-19T13:00:00Z")), "You can edit this for 11 more days.");
  assert.equal(editWindowLabel(created, t("2026-10-30T00:00:00Z")), "You can edit this for 1 more day.");
  assert.equal(editWindowLabel(created, t("2026-10-31T06:30:00Z")), "You can edit this for 5 more hours.");
  assert.equal(editWindowLabel(created, t("2026-10-31T10:30:00Z")), "You can edit this for 1 more hour.");
  assert.equal(editWindowLabel(created, t("2026-10-31T11:30:00Z")), "You can edit this for less than an hour.");
  assert.equal(editWindowLabel(created, t("2026-10-31T12:00:00Z")), null);
  assert.equal(EDIT_WINDOW_OVER, "Reviews can be edited for 30 days.");
});

test("status strings outside the five read as none", () => {
  assert.equal(asReviewStatus("editable"), "editable");
  assert.equal(asReviewStatus("withdrawn"), "withdrawn");
  assert.equal(asReviewStatus("something"), "none");
  assert.equal(asReviewStatus(null), "none");
});

test("top rated: averages first, then count; New keeps its order", () => {
  const l = (name: string, averageRating: number | null, reviewCount: number) => ({ name, averageRating, reviewCount });
  const sorted = sortByRating([l("a", 5, 1), l("b", 4.5, 10), l("c", null, 0), l("d", 4.8, 3), l("e", 4.8, 7)]);
  assert.deepEqual(sorted.map((x) => x.name), ["e", "d", "b", "a", "c"]);
});

test("refusals read as sentences", () => {
  assert.match(
    describeReviewError({ code: "23514", message: 'violates check constraint "professional_reviews_body_check"' }, "create"),
    /up to 4,000 characters/
  );
  assert.match(
    describeReviewError({ code: "23514", message: 'violates check constraint "professional_reviews_rating_check"' }, "create"),
    /rating from 1 to 5/
  );
  assert.match(
    describeReviewError({ code: "23514", message: 'violates check constraint "professional_review_replies_body_check"' }, "reply"),
    /up to 2,000 characters/
  );
  assert.match(describeReviewError({ code: "ATX02" }, "edit"), /20 review edits a day/);
  assert.match(describeReviewError({ code: "ATX02" }, "report"), /10 reports a day/);
  assert.match(describeReviewError({ code: "ATX02" }, "reply"), /30 replies a day/);
  assert.equal(describeReviewError({ code: "ATX71" }, "edit"), EDIT_WINDOW_OVER);
  assert.match(describeReviewError({ code: "ATX73" }, "reply"), /already replied/);
  assert.match(describeReviewError({ code: "ATX10" }, "edit"), /moderator removed this review/);
  assert.match(describeReviewError({ code: "ATX10" }, "editReply"), /moderator removed your reply/);
  assert.match(describeReviewError({ code: "ATX72" }, "edit"), /withdrawn/);
  assert.match(describeReviewError({ code: "22023", message: "a reply cannot be empty" }, "reply"), /Write a reply/);
  assert.match(describeReviewError({ code: "XX000" }, "withdraw"), /Couldn't withdraw/);
});
