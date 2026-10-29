import { test } from "node:test";
import assert from "node:assert/strict";
import {
  afterFailure,
  afterOnline,
  canSave,
  FIRST_DELAY_MS,
  isPermissionCode,
  MAX_DELAY_MS,
  MAX_FAILURES,
  retryDelayMs,
  RETRY_START,
} from "./retry";

test("the delay doubles from the first and stops at the cap", () => {
  assert.equal(retryDelayMs(0), 0);
  assert.equal(retryDelayMs(1), FIRST_DELAY_MS);
  assert.equal(retryDelayMs(2), FIRST_DELAY_MS * 2);
  assert.equal(retryDelayMs(3), FIRST_DELAY_MS * 4);
  assert.equal(retryDelayMs(30), MAX_DELAY_MS);
});

test("a fresh sign-in may save at once", () => {
  assert.equal(canSave(RETRY_START, 0), "now");
});

test("after a failure a save waits for the backoff, then may go", () => {
  const s = afterFailure(RETRY_START, false, 1_000);
  assert.equal(s.failures, 1);
  assert.equal(canSave(s, 1_000 + FIRST_DELAY_MS - 1), "later");
  assert.equal(canSave(s, 1_000 + FIRST_DELAY_MS), "now");
});

test("a permission refusal stops retrying straight away", () => {
  const s = afterFailure(RETRY_START, true, 0);
  assert.equal(s.blocked, true);
  assert.equal(canSave(s, Number.MAX_SAFE_INTEGER), "never");
});

test("retrying stops after the limit of failures in a row", () => {
  let s = RETRY_START;
  for (let i = 1; i < MAX_FAILURES; i++) {
    s = afterFailure(s, false, 0);
    assert.notEqual(canSave(s, Number.MAX_SAFE_INTEGER), "never", `failure ${i}`);
  }
  s = afterFailure(s, false, 0);
  assert.equal(canSave(s, Number.MAX_SAFE_INTEGER), "never");
});

test("only session and grant codes count as permission refusals", () => {
  for (const code of ["ATX01", "PGRST301", "PGRST302", "42501"]) assert.equal(isPermissionCode(code), true, code);
  for (const code of ["23505", "PGRST116", "", undefined, null]) assert.equal(isPermissionCode(code), false, String(code));
});

test("reconnecting starts a fresh count after failures, but not after a permission refusal", () => {
  let s = RETRY_START;
  for (let i = 0; i < MAX_FAILURES; i++) s = afterFailure(s, false, 0);
  assert.equal(canSave(s, Number.MAX_SAFE_INTEGER), "never");
  assert.deepEqual(afterOnline(s), RETRY_START);
  assert.equal(canSave(afterOnline(s), 0), "now");

  const refused = afterFailure(afterFailure(RETRY_START, false, 0), true, 0);
  assert.equal(afterOnline(refused), refused);
  assert.equal(canSave(afterOnline(refused), Number.MAX_SAFE_INTEGER), "never");
});
