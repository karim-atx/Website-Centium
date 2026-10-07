import { strict as assert } from "node:assert";
import { test } from "node:test";
import { describeLockError, isFolderOpen, liveWindows, msUntilNextExpiry } from "./lockLogic";

const NOW = Date.parse("2026-10-07T12:00:00Z");

test("an unlocked folder is always open; a missing one never is", () => {
  assert.equal(isFolderOpen({ id: "a" }, {}, NOW), true);
  assert.equal(isFolderOpen({ id: "a", locked: false }, {}, NOW), true);
  assert.equal(isFolderOpen(undefined, {}, NOW), false);
});

test("a locked folder is open only while its window is ahead", () => {
  const f = { id: "a", locked: true };
  assert.equal(isFolderOpen(f, {}, NOW), false);
  assert.equal(isFolderOpen(f, { a: "2026-10-07T12:04:59Z" }, NOW), true);
  assert.equal(isFolderOpen(f, { a: "2026-10-07T12:00:00Z" }, NOW), false);
  assert.equal(isFolderOpen(f, { a: "2026-10-07T11:59:00Z" }, NOW), false);
  // Another folder's window opens nothing here.
  assert.equal(isFolderOpen(f, { b: "2026-10-07T12:04:59Z" }, NOW), false);
});

test("lapsed windows are dropped, live ones kept", () => {
  assert.deepEqual(
    liveWindows({ a: "2026-10-07T12:03:00Z", b: "2026-10-07T11:00:00Z", c: "2026-10-07T12:00:00Z" }, NOW),
    { a: "2026-10-07T12:03:00Z" }
  );
});

test("the next expiry is the soonest window, never negative", () => {
  assert.equal(msUntilNextExpiry({}, NOW), null);
  assert.equal(msUntilNextExpiry({ a: "2026-10-07T12:05:00Z", b: "2026-10-07T12:01:00Z" }, NOW), 60_000);
  assert.equal(msUntilNextExpiry({ a: "2026-10-07T11:59:00Z" }, NOW), 0);
  assert.equal(msUntilNextExpiry({ a: "not a date" }, NOW), null);
});

test("errors: rate limit passes through verbatim, the rest are sentences", () => {
  assert.equal(describeLockError("ATX02", "Try again in 12 minutes."), "Try again in 12 minutes.");
  assert.match(describeLockError("ATX02", ""), /Too many tries/);
  assert.match(describeLockError("ATX77", "raw"), /without a password/);
  assert.match(describeLockError("ATX78", "raw"), /no longer exists/);
  assert.match(describeLockError("ATX01", "raw"), /Sign in again/);
  assert.match(describeLockError("PGRST000", "raw"), /connection/);
});
