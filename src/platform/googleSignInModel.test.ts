import { strict as assert } from "node:assert";
import { test } from "node:test";
import { googleSignInOfferedOn } from "./googleSignInModel.ts";

test("Google sign-in: offered on the web and in the Android app", () => {
  assert.equal(googleSignInOfferedOn("web"), true);
  assert.equal(googleSignInOfferedOn("android"), true);
});

test("Google sign-in: not on the iPhone until iPhone Round 1 (native Google and Sign in with Apple)", () => {
  assert.equal(googleSignInOfferedOn("ios"), false);
});
