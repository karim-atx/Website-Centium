import { strict as assert } from "node:assert";
import { test } from "node:test";
import { firstNameOf, joinWithAnd, requestBody, requestSummary, requestTitle } from "./copy.ts";

test("joinWithAnd", () => {
  assert.equal(joinWithAnd([]), "");
  assert.equal(joinWithAnd(["A"]), "A");
  assert.equal(joinWithAnd(["A", "B"]), "A and B");
  assert.equal(joinWithAnd(["Workout activity", "Food diary", "Weight"]), "Workout activity, Food diary and Weight");
});

test("firstNameOf", () => {
  assert.equal(firstNameOf("Alex Morgan"), "Alex");
  assert.equal(firstNameOf("  Alex  "), "Alex");
});

test("CU8 title and body", () => {
  assert.equal(requestTitle("Alex", ["Lab results"]), "Alex asked to see your lab results");
  assert.equal(
    requestBody("Alex", ["Lab results"], "For your training plan"),
    "For your training plan. Either answer is fine; Alex sees only what you turn on."
  );
  assert.equal(requestBody("Alex", ["Lab results"], null), "Either answer is fine; Alex sees only what you turn on.");
  assert.equal(requestTitle("Alex", ["Weight", "Habits"]), "Alex asked to see 2 things");
  assert.equal(
    requestBody("Alex", ["Weight", "Habits"], "  "),
    "Weight and Habits. Either answer is fine; Alex sees only what you turn on."
  );
});

test("CU11 summary", () => {
  assert.equal(requestTitle("Alex", ["A", "B", "C"], "asks"), "Alex asks to see 3 things");
  assert.equal(
    requestSummary(["Workout activity", "Food diary", "Weight"], "for your programme"),
    "Workout activity, Food diary and Weight, for your programme. You choose each one."
  );
  assert.equal(requestSummary(["Weight"]), "Weight. You choose each one.");
});
