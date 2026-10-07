import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_PATH_SHAPE,
  SCREENSHOT_TOO_LARGE,
  SCREENSHOT_WRONG_TYPE,
  screenshotPath,
  screenshotProblem,
} from "./screenshotRules.ts";

test("JPEG, PNG and WebP up to 5 MB are accepted", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(screenshotProblem({ type, size: 1000 }), null);
  }
  assert.equal(screenshotProblem({ type: "image/png", size: SCREENSHOT_MAX_BYTES }), null);
});

test("anything else says why", () => {
  assert.equal(screenshotProblem({ type: "image/gif", size: 10 }), SCREENSHOT_WRONG_TYPE);
  assert.equal(screenshotProblem({ type: "image/heic", size: 10 }), SCREENSHOT_WRONG_TYPE);
  assert.equal(screenshotProblem({ type: "", size: 10 }), SCREENSHOT_WRONG_TYPE);
  assert.equal(screenshotProblem({ type: "image/png", size: SCREENSHOT_MAX_BYTES + 1 }), SCREENSHOT_TOO_LARGE);
});

test("the path is <uid>/<generated file>, matching the column CHECK", () => {
  const uid = "ccadde63-8bbc-4c0b-ac14-0305f918b22a";
  const path = screenshotPath(uid, "0b6f6f9e-1f7c-4b8e-9a51-6d2a3c1d0e11");
  assert.equal(path, `${uid}/0b6f6f9e-1f7c-4b8e-9a51-6d2a3c1d0e11.jpg`);
  assert.match(path, SCREENSHOT_PATH_SHAPE);
  assert.doesNotMatch("no-uid-here.png", SCREENSHOT_PATH_SHAPE);
});
