import test from "node:test";
import assert from "node:assert/strict";
import { readReturnedAuthError, withoutAuthError } from "../../../lib/supabase/oauthReturn";
import { SUSPENDED_MESSAGE } from "../../../lib/supabase/suspensionMessage";
import {
  DISPOSABLE_EMAIL_MESSAGE,
  RETURNED_AUTH_ERROR_MESSAGE,
  describeReturnedAuthError,
  isDisposableEmailText,
} from "./messages";

const HOOK = encodeURIComponent(DISPOSABLE_EMAIL_MESSAGE);

test("reads the error from the query (PKCE) or the fragment (implicit)", () => {
  assert.deepEqual(readReturnedAuthError(`?error=server_error&error_code=unexpected_failure&error_description=${HOOK}`, ""), {
    error: "server_error",
    code: "unexpected_failure",
    description: DISPOSABLE_EMAIL_MESSAGE,
  });
  assert.deepEqual(readReturnedAuthError("", "#error=access_denied&error_description=User+cancelled"), {
    error: "access_denied",
    code: null,
    description: "User cancelled",
  });
  assert.equal(readReturnedAuthError("?code=abc", ""), null, "an ordinary PKCE return is not an error");
  assert.equal(readReturnedAuthError("", ""), null);
});

test("clearing keeps every other parameter", () => {
  assert.equal(withoutAuthError("/app/onboarding", `?error=server_error&error_description=${HOOK}`, ""), "/app/onboarding");
  assert.equal(withoutAuthError("/app/onboarding", "?ref=x&error=e", "#error_code=c&keep=1"), "/app/onboarding?ref=x#keep=1");
});

test("a burner refusal gets the hook's sentence; a suspension its own; anything else the generic one", () => {
  assert.equal(describeReturnedAuthError({ error: "server_error", code: null, description: DISPOSABLE_EMAIL_MESSAGE }), DISPOSABLE_EMAIL_MESSAGE);
  assert.equal(describeReturnedAuthError({ error: "access_denied", code: "user_banned", description: "User is banned" }), SUSPENDED_MESSAGE);
  for (const description of ["User cancelled", "Unable to exchange external code: 4/0Ab...", null]) {
    const shown = describeReturnedAuthError({ error: "server_error", code: "unexpected_failure", description });
    assert.equal(shown, RETURNED_AUTH_ERROR_MESSAGE, "never the raw text");
  }
  assert.equal(isDisposableEmailText("please use a PERMANENT email address"), true);
  assert.equal(isDisposableEmailText("Invalid login credentials"), false);
});
