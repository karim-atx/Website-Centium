import { strict as assert } from "node:assert";
import { test } from "node:test";
import { deviceReminderState } from "./deviceReminderState";

test("a browser without push is unsupported, whatever else it says", () => {
  assert.equal(deviceReminderState({ supported: false, permission: "granted", registered: true }), "unsupported");
});

test("a refused permission is blocked", () => {
  assert.equal(deviceReminderState({ supported: true, permission: "denied", registered: null }), "blocked");
  assert.equal(deviceReminderState({ supported: true, permission: "denied", registered: true }), "blocked");
});

test("not asked yet needs the prompt", () => {
  assert.equal(deviceReminderState({ supported: true, permission: "default", registered: false }), "needed");
});

test("permission without a registered device is not on (G13)", () => {
  assert.equal(deviceReminderState({ supported: true, permission: "granted", registered: false }), "needed");
});

test("permission while the registration is being read is checking", () => {
  assert.equal(deviceReminderState({ supported: true, permission: "granted", registered: null }), "checking");
});

test("permission and a registered device is on", () => {
  assert.equal(deviceReminderState({ supported: true, permission: "granted", registered: true }), "on");
});
