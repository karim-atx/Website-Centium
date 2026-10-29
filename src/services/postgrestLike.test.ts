import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeLike } from "./postgrestLike.ts";

test("every like wildcard, PostgREST's * included, is escaped", () => {
  assert.equal(escapeLike("banana"), "banana");
  assert.equal(escapeLike("*"), "\\*");
  assert.equal(escapeLike("50% fat_free"), "50\\% fat\\_free");
  assert.equal(escapeLike("a\\b"), "a\\\\b");
  assert.equal(escapeLike("*a*"), "\\*a\\*");
});
