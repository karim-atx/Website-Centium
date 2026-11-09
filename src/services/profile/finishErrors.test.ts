import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ACCOUNT_TYPE_SET, finishRefusal } from "./finishErrors.ts";

test("ATXG1 is an account already set up, by code or in the message", () => {
  assert.equal(finishRefusal({ code: "ATXG1", message: "your account type is set when you sign up" }), "accountTypeSet");
  assert.equal(finishRefusal({ code: "P0001", message: "ATXG1: your account type is set when you sign up" }), "accountTypeSet");
  assert.match(ACCOUNT_TYPE_SET, /set when you sign up/);
});

test("a write not signed in as this account is the session problem", () => {
  // The legal_acceptances insert as anon, or with another account's JWT.
  assert.equal(finishRefusal({ code: "42501", message: "new row violates row-level security policy", status: 403 }), "session");
  assert.equal(finishRefusal({ code: "42501", message: "permission denied for table legal_acceptances", status: 401 }), "session");
  // An expired JWT.
  assert.equal(finishRefusal({ code: "PGRST301", status: 401 }), "session");
  assert.equal(finishRefusal({ code: "PGRST303", status: 401 }), "session");
  assert.equal(finishRefusal({ status: 401 }), "session");
});

test("anything else is left to the caller's own line", () => {
  assert.equal(finishRefusal({ code: "ATX51" }), null);
  assert.equal(finishRefusal({ code: "ATX52" }), null);
  assert.equal(finishRefusal({ code: "23514", message: "profiles_first_name_single_line" }), null);
  assert.equal(finishRefusal({ message: "Failed to fetch" }), null);
  assert.equal(finishRefusal(null), null);
  assert.equal(finishRefusal(undefined), null);
});
