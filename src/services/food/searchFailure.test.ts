import { strict as assert } from "node:assert";
import { test } from "node:test";
import { searchEmptyLine, searchFailure } from "./searchFailure";

test("no errors is no failure", () => {
  assert.equal(searchFailure([null, undefined]), null);
});

test("a dropped connection reads as offline", () => {
  assert.equal(searchFailure([{ message: "TypeError: Failed to fetch", code: "" }, null]), "offline");
  assert.equal(searchFailure([null, new TypeError("Load failed")]), "offline");
});

test("a database refusal reads as an error", () => {
  assert.equal(searchFailure([{ message: "permission denied", code: "42501" }, null]), "error");
});

test("offline outranks a refusal when both queries fail", () => {
  assert.equal(
    searchFailure([{ message: "permission denied", code: "42501" }, { message: "Failed to fetch" }]),
    "offline"
  );
});

test("the empty-state line", () => {
  assert.equal(searchEmptyLine(null, true), null);
  assert.equal(searchEmptyLine(null, false), null);
  assert.equal(searchEmptyLine("offline", true), "You're offline. Search needs a connection.");
  assert.equal(searchEmptyLine("error", true), "Couldn't search. Try again.");
  assert.equal(searchEmptyLine("error", false), "You're offline. Search needs a connection.");
});
