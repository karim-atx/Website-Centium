import test from "node:test";
import assert from "node:assert/strict";
import { parentOf } from "./useBack";

test("parentOf: a page's parent when there is no history to pop", () => {
  assert.equal(parentOf("/app/settings/notifications"), "/app/settings");
  assert.equal(parentOf("/app/settings/two-factor/setup"), "/app/settings/two-factor");
  assert.equal(parentOf("/app/settings"), "/app/more");
  assert.equal(parentOf("/app/mind/journal"), "/app/mind");
  assert.equal(parentOf("/app/mind"), "/app/more");
  assert.equal(parentOf("/app/professionals/abc/reviews"), "/app/professionals/abc");
  assert.equal(parentOf("/app/professionals/abc"), "/app/professionals");
  assert.equal(parentOf("/app/forum/post/p1"), "/app/forum");
  assert.equal(parentOf("/app/forum/courses/c1"), "/app/forum?tab=courses");
  assert.equal(parentOf("/app/forum/courses/c1/lessons/l1"), "/app/forum/courses/c1");
  assert.equal(parentOf("/app/forum/courses/mine/c1"), "/app/forum/courses/mine");
  assert.equal(parentOf("/app/food/nutrient-summary"), "/app/food");
  assert.equal(parentOf("/app/cycle"), "/app/profile");
  assert.equal(parentOf("/app/marketplace/gyms"), "/app/marketplace");
});
