import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  confirmProblem,
  confirmProblemLine,
  deviceStepLine,
  deviceUseLabel,
  explainLines,
  firstLockSeen,
  firstLockSeenKey,
  markFirstLockSeen,
  isFirstLock,
  nextFirstLockStep,
  offerDeviceStep,
} from "./firstLockModel";
import { accountStorageKeys } from "../../../lib/supabase/tabIdentity";

test("first lock: no folder locked now and not walked through on this device", () => {
  assert.equal(isFirstLock(0, false), true);
  assert.equal(isFirstLock(0, true), false);
  // Later locks behave as before: a folder already locked means it isn't the first.
  assert.equal(isFirstLock(1, false), false);
  assert.equal(isFirstLock(3, true), false);
});

test("the marker is the account's own, so sign-out clears it", () => {
  const key = firstLockSeenKey("u-123");
  assert.equal(key, "centium-journal-first-lock-seen:u-123");
  assert.deepEqual(accountStorageKeys([[key, "1"]], "u-123"), [key]);
  // Another account's marker isn't this one's.
  assert.notEqual(firstLockSeenKey("u-456"), key);
});

test("the marker: set after the first lock, per account, and a refused storage reads as not seen", () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  assert.equal(firstLockSeen(storage, "u-1"), false);
  markFirstLockSeen(storage, "u-1");
  assert.equal(firstLockSeen(storage, "u-1"), true);
  assert.equal(firstLockSeen(storage, "u-2"), false);
  assert.equal(firstLockSeen(storage, null), false);
  const refused = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  };
  assert.equal(firstLockSeen(refused, "u-1"), false);
  assert.doesNotThrow(() => markFirstLockSeen(refused, "u-1"));
});

test("the two fields must both be filled and match exactly", () => {
  assert.equal(confirmProblem("", ""), "empty");
  assert.equal(confirmProblem("", "x"), "empty");
  assert.equal(confirmProblem("Secret-1", ""), "confirm");
  assert.equal(confirmProblem("Secret-1", "secret-1"), "mismatch");
  assert.equal(confirmProblem("Secret-1", "Secret-1 "), "mismatch");
  assert.equal(confirmProblem("Secret-1", "Secret-1"), null);
  assert.equal(confirmProblemLine("mismatch"), "The passwords don't match.");
  assert.equal(confirmProblemLine("empty"), "Enter your password.");
});

test("the steps: protect, explain, then the phone only where it can be set up", () => {
  assert.equal(nextFirstLockStep("protect", false), "explain");
  assert.equal(nextFirstLockStep("protect", true), "explain");
  assert.equal(nextFirstLockStep("explain", false), "done");
  assert.equal(nextFirstLockStep("explain", true), "device");
  assert.equal(nextFirstLockStep("device", true), "done");
});

test("step 3 is offered only on a phone that can set it up and hasn't", () => {
  assert.equal(offerDeviceStep("setup"), true);
  // A browser or a switched-off phone, one with no fingerprint enrolled, and one already set up.
  assert.equal(offerDeviceStep("off"), false);
  assert.equal(offerDeviceStep("enrol"), false);
  assert.equal(offerDeviceStep("ready"), false);
});

test("the explanation follows how this account unlocks", () => {
  const pw = explainLines("password");
  assert.equal(pw.length, 3);
  assert.match(pw[0], /account password/);
  assert.match(pw[1], /five minutes/);
  assert.match(pw[2], /removing the lock asks again/);
  assert.match(explainLines("code")[0], /code we email you/);
});

test("step 3's words follow the phone", () => {
  assert.equal(deviceUseLabel("fingerprint"), "Use fingerprint");
  assert.equal(deviceUseLabel("face"), "Use Face ID");
  assert.equal(deviceUseLabel(undefined), "Use fingerprint or face");
  assert.match(deviceStepLine("fingerprint", "password"), /Your password still works/);
  assert.match(deviceStepLine("face", "code"), /emailed code still works/);
});
