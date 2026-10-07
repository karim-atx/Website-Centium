import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  INSTAGRAM_FORMAT,
  X_FORMAT,
  bareHandle,
  describeHandleSaveError,
  handleProblem,
  instagramUrl,
  legacyHandlesToMove,
  storedHandle,
  xUrl,
} from "./socialHandleRules.ts";

test("handles are stored bare, without the @", () => {
  assert.equal(bareHandle("  @@jpw.lifts "), "jpw.lifts");
  assert.equal(storedHandle("@jpwlifts"), "jpwlifts");
  assert.equal(storedHandle("   "), null);
  assert.equal(storedHandle(undefined), null);
});

test("Instagram: up to 30 letters, digits, dots, underscores", () => {
  assert.equal(handleProblem("instagram", "jpw.lifts"), null);
  assert.equal(handleProblem("instagram", "@lina.reads"), null);
  assert.equal(handleProblem("instagram", ""), null);
  assert.equal(handleProblem("instagram", "a".repeat(30)), null);
  assert.equal(handleProblem("instagram", "a".repeat(31)), INSTAGRAM_FORMAT);
  assert.equal(handleProblem("instagram", "no spaces"), INSTAGRAM_FORMAT);
  assert.equal(handleProblem("instagram", "dash-no"), INSTAGRAM_FORMAT);
});

test("X: up to 15 letters, digits, underscores, and no dot", () => {
  assert.equal(handleProblem("x", "jpwlifts"), null);
  assert.equal(handleProblem("x", "a_b_c"), null);
  assert.equal(handleProblem("x", "a".repeat(15)), null);
  assert.equal(handleProblem("x", "a".repeat(16)), X_FORMAT);
  assert.equal(handleProblem("x", "jpw.lifts"), X_FORMAT);
});

test("a CHECK refusal turns the right field red", () => {
  assert.deepEqual(describeHandleSaveError("23514", 'violates check constraint "profiles_x_shape_check"'), {
    field: "x",
    message: X_FORMAT,
  });
  assert.deepEqual(
    describeHandleSaveError("23514", 'violates check constraint "profiles_instagram_shape_check"'),
    { field: "instagram", message: INSTAGRAM_FORMAT }
  );
  assert.equal(describeHandleSaveError("42501", "permission denied").field, null);
  assert.match(describeHandleSaveError("PGRST301", "JWT expired").message, /session expired/);
});

test("the device copy moves up only when the account has none", () => {
  const empty = { instagram: null, x: null };
  assert.deepEqual(legacyHandlesToMove(empty, { instagramHandle: "jpw.lifts", xHandle: "jpwlifts" }), {
    instagram: "jpw.lifts",
    x: "jpwlifts",
  });
  // The account wins.
  assert.equal(legacyHandlesToMove({ instagram: "server", x: null }, { instagramHandle: "local" }), null);
  // Nothing valid to move.
  assert.equal(legacyHandlesToMove(empty, {}), null);
  assert.equal(legacyHandlesToMove(empty, { xHandle: "has.dot" }), null);
  // One valid, one not: the valid one goes.
  assert.deepEqual(legacyHandlesToMove(empty, { instagramHandle: "ok_one", xHandle: "has.dot" }), {
    instagram: "ok_one",
    x: null,
  });
});

test("links go to the handle's own page", () => {
  assert.equal(instagramUrl("jpw.lifts"), "https://instagram.com/jpw.lifts");
  assert.equal(xUrl("jpwlifts"), "https://x.com/jpwlifts");
});
