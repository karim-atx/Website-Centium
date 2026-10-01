import { strict as assert } from "node:assert";
import { test } from "node:test";
import { deviceZoneUpdate, zoneLabel } from "./logic.ts";

test("a missing zone is filled from the device", () => {
  assert.equal(deviceZoneUpdate({ timezone: null, chosenAt: null }, "Asia/Beirut"), "Asia/Beirut");
});

test("a device-following zone follows the device when it changes", () => {
  assert.equal(deviceZoneUpdate({ timezone: "Asia/Beirut", chosenAt: null }, "Europe/Paris"), "Europe/Paris");
  assert.equal(deviceZoneUpdate({ timezone: "Asia/Beirut", chosenAt: null }, "Asia/Beirut"), null);
});

test("a hand-picked zone is never overwritten by the device", () => {
  const picked = { timezone: "Asia/Tokyo", chosenAt: "2026-10-01T12:00:00Z" };
  assert.equal(deviceZoneUpdate(picked, "Asia/Beirut"), null);
  assert.equal(deviceZoneUpdate(picked, "Asia/Tokyo"), null);
});

test("a device that cannot say writes nothing", () => {
  assert.equal(deviceZoneUpdate({ timezone: null, chosenAt: null }, null), null);
});

test("labels read naturally", () => {
  assert.equal(zoneLabel("America/Los_Angeles"), "America/Los Angeles");
});
