import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkNewEmail,
  EMAIL_TAKEN,
  emailChangeMessage,
  emailStage,
  LINK_EXPIRED,
  NOT_AN_EMAIL,
  readEmailReturn,
  SAME_EMAIL,
  SESSION_EXPIRED,
} from "./emailChangeLogic";

test("readEmailReturn: only an arrival marked email=confirmed counts", () => {
  assert.deepEqual(readEmailReturn("", ""), { kind: "none" });
  assert.deepEqual(readEmailReturn("?message=x", ""), { kind: "none" });
  assert.deepEqual(readEmailReturn("?email=confirmed", ""), { kind: "link", firstOfTwo: false });
  assert.deepEqual(readEmailReturn("?email=confirmed&code=abc", ""), { kind: "link", firstOfTwo: false });
});

test("readEmailReturn: the first of two links carries GoTrue's message, in the query or the fragment", () => {
  const msg = "Confirmation+link+accepted.+Please+proceed+to+confirm+link+sent+to+the+other+email";
  assert.deepEqual(readEmailReturn(`?email=confirmed&message=${msg}`, ""), { kind: "link", firstOfTwo: true });
  assert.deepEqual(readEmailReturn("?email=confirmed", `#message=${msg}`), { kind: "link", firstOfTwo: true });
});

test("readEmailReturn: a refused link is an error in words, never GoTrue's English", () => {
  assert.deepEqual(readEmailReturn("?email=confirmed&error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid", ""), {
    kind: "error",
    message: LINK_EXPIRED,
  });
  const other = readEmailReturn("?email=confirmed", "#error=server_error&error_description=boom");
  assert.equal(other.kind, "error");
  assert.ok(other.kind === "error" && !/boom/.test(other.message));
});

test("emailStage: new_email set means waiting; after a link with nothing waiting, done", () => {
  const none = { kind: "none" } as const;
  assert.deepEqual(emailStage({ email: "a@x.io", new_email: null }, none), { stage: "idle" });
  assert.deepEqual(emailStage({ email: "a@x.io", new_email: "b@x.io" }, none), { stage: "pending", newEmail: "b@x.io", afterFirst: false });
  assert.deepEqual(emailStage({ email: "a@x.io", new_email: "b@x.io" }, { kind: "link", firstOfTwo: true }), {
    stage: "pending",
    newEmail: "b@x.io",
    afterFirst: true,
  });
  assert.deepEqual(emailStage({ email: "b@x.io", new_email: null }, { kind: "link", firstOfTwo: false }), { stage: "done", email: "b@x.io" });
  // A refused link changes nothing.
  assert.deepEqual(emailStage({ email: "a@x.io" }, { kind: "error", message: LINK_EXPIRED }), { stage: "idle" });
});

test("checkNewEmail: a full address, not the current one (any case)", () => {
  assert.deepEqual(checkNewEmail("  new@example.com ", "old@example.com"), { ok: true, email: "new@example.com" });
  assert.deepEqual(checkNewEmail("new@", "old@example.com"), { ok: false, message: NOT_AN_EMAIL });
  assert.deepEqual(checkNewEmail("no spaces@x.io", null), { ok: false, message: NOT_AN_EMAIL });
  assert.deepEqual(checkNewEmail("Old@Example.com", "old@example.com"), { ok: false, message: SAME_EMAIL });
});

test("emailChangeMessage: GoTrue's codes the page words itself; others fall through", () => {
  assert.equal(emailChangeMessage("email_exists"), EMAIL_TAKEN);
  assert.equal(emailChangeMessage("email_address_invalid"), NOT_AN_EMAIL);
  assert.equal(emailChangeMessage("session_not_found"), SESSION_EXPIRED);
  assert.equal(emailChangeMessage("over_email_send_rate_limit"), null);
  assert.equal(emailChangeMessage("insufficient_aal"), null);
  assert.equal(emailChangeMessage(undefined), null);
});
