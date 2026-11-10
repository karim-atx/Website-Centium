import { strict as assert } from "node:assert";
import { test } from "node:test";
import { googleSignInOfferedOn } from "./googleSignInModel.ts";
import { appleSignInOfferedOn } from "./appleSignInModel.ts";

test("Google sign-in: offered on the web, Android and, with Apple, the iPhone", () => {
  assert.equal(googleSignInOfferedOn("web"), true);
  assert.equal(googleSignInOfferedOn("android"), true);
  assert.equal(googleSignInOfferedOn("ios"), true);
});

test("Sign in with Apple: the iPhone app, and the website once production is ready; not Android or the desktop app yet", () => {
  assert.equal(appleSignInOfferedOn("ios", false, false), true, "the iPhone app needs no switch");
  assert.equal(appleSignInOfferedOn("web", false, true), true);
  assert.equal(appleSignInOfferedOn("web", false, false), false, "until NEXT_PUBLIC_APPLE_SIGN_IN_WEB=1");
  assert.equal(appleSignInOfferedOn("android", false, true), false);
  assert.equal(appleSignInOfferedOn("web", true, true), false);
});
