import { strict as assert } from "node:assert";
import { test } from "node:test";
import { RECOVERY_MODE_OFF, syncRecoveryMode } from "./logic.ts";

const on = { enabled: true, introSeen: true };
const off = { enabled: false, introSeen: false };

test("a server row always wins, and nothing is uploaded", () => {
  assert.deepEqual(syncRecoveryMode(off, on), { mode: off, upload: null });
  assert.deepEqual(syncRecoveryMode(on, off), { mode: on, upload: null });
  assert.deepEqual(syncRecoveryMode(on, null), { mode: on, upload: null });
});

test("no server row: a device 'on' is uploaded once, with its intro state", () => {
  assert.deepEqual(syncRecoveryMode(null, on), { mode: on, upload: on });
  const freshOn = { enabled: true, introSeen: false };
  assert.deepEqual(syncRecoveryMode(null, freshOn), { mode: freshOn, upload: freshOn });
});

test("no server row and the device off or empty: off, nothing written", () => {
  assert.deepEqual(syncRecoveryMode(null, off), { mode: RECOVERY_MODE_OFF, upload: null });
  assert.deepEqual(syncRecoveryMode(null, null), { mode: RECOVERY_MODE_OFF, upload: null });
});
