import { strict as assert } from "node:assert";
import { test } from "node:test";
import { hasEmailPassword, passwordChangeOutcome, usesGoogle } from "./passwordChangeLogic.ts";

test("an email account has a password to ask for", () => {
  assert.equal(hasEmailPassword({ identities: [{ provider: "email" }] }), true);
  assert.equal(hasEmailPassword({ app_metadata: { providers: ["email"] } }), true);
  assert.equal(hasEmailPassword({ identities: [{ provider: "email" }, { provider: "google" }] }), true);
});

test("a Google-only account has none", () => {
  const google = { identities: [{ provider: "google" }], app_metadata: { providers: ["google"] } };
  assert.equal(hasEmailPassword(google), false);
  assert.equal(usesGoogle(google), true);
  assert.equal(hasEmailPassword({}), false);
  assert.equal(usesGoogle({ identities: [{ provider: "email" }] }), false);
});

test("Secure password change asks for the emailed code", () => {
  assert.deepEqual(passwordChangeOutcome("reauthentication_needed"), { status: "code_needed" });
  assert.deepEqual(passwordChangeOutcome("reauth_nonce_missing"), { status: "code_needed" });
});

test("a wrong code and an unchanged password read as sentences", () => {
  assert.equal(passwordChangeOutcome("reauthentication_not_valid")?.status, "error");
  assert.match(
    (passwordChangeOutcome("same_password") as { message: string }).message,
    /different from your current one/
  );
  assert.equal(passwordChangeOutcome("weak_password"), null);
  assert.equal(passwordChangeOutcome(undefined), null);
});
