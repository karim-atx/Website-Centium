import { test } from "node:test";
import assert from "node:assert/strict";
import { badgeCount } from "./badgeModel.ts";

test("the badge is unread inbox plus unread messages, as push_badge_count", () => {
  assert.equal(badgeCount(0, 0), 0);
  assert.equal(badgeCount(1, 0), 1);
  assert.equal(badgeCount(0, 1), 1);
  assert.equal(badgeCount(3, 4), 7);
});

test("each part at most 99, and the sum at most 99", () => {
  assert.equal(badgeCount(150, 0), 99);
  assert.equal(badgeCount(0, 150), 99);
  assert.equal(badgeCount(60, 60), 99);
  assert.equal(badgeCount(98, 1), 99);
});

test("nothing odd reaches the phone", () => {
  assert.equal(badgeCount(-2, 3), 3);
  assert.equal(badgeCount(Number.NaN, 2), 2);
  assert.equal(badgeCount(2.7, 0), 2);
});
