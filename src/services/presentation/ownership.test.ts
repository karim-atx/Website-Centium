import { test } from "node:test";
import assert from "node:assert/strict";
import { afterRead } from "./ownership";
import { SIGNED_OUT_OWNER } from "../../../lib/supabase/tabIdentity";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("unchanged: the row wins unless this account's own change is pending", () => {
  assert.equal(afterRead(true, false, B, B), "server");
  assert.equal(afterRead(true, true, B, B), "save");
  assert.equal(afterRead(true, true, null, B), "save");
  // Another account's pending change is never written here.
  assert.equal(afterRead(true, true, A, B), "server");
  assert.equal(afterRead(true, false, A, B), "server");
});

test("unchanged: no row, this account's copy is saved; another account's is not", () => {
  assert.equal(afterRead(false, false, B, B), "save");
  assert.equal(afterRead(false, false, null, B), "save");
  assert.equal(afterRead(false, false, A, B), "default");
  assert.equal(afterRead(false, true, A, B), "default");
});

test("Batch D GE: kept through a Sign out, the next account's row wins", () => {
  assert.equal(afterRead(true, false, SIGNED_OUT_OWNER, B), "server");
  // Even a pending flag (never this account's after a sign-out) doesn't write over the row.
  assert.equal(afterRead(true, true, SIGNED_OUT_OWNER, B), "server");
  // The same account signing back in: its own row wins too.
  assert.equal(afterRead(true, false, SIGNED_OUT_OWNER, A), "server");
});

test("Batch D GE: kept through a Sign out and no row: shown, not saved, not claimed", () => {
  assert.equal(afterRead(false, false, SIGNED_OUT_OWNER, B), "keep");
  assert.equal(afterRead(false, true, SIGNED_OUT_OWNER, B), "keep");
});
