import test from "node:test";
import assert from "node:assert/strict";
import { buildZoneOptions, filterZones, formatOffset, zoneCity, zoneDisplay, zoneOffsetMinutes } from "./timezoneOptions";

const JAN = new Date("2026-01-15T12:00:00Z");

test("zoneDisplay: real offsets with the city (MO1.8 #64, V6-149)", () => {
  assert.equal(zoneDisplay("Asia/Riyadh", JAN), "(GMT+03:00) Riyadh");
  // The board says -03:00; the real offset is -05:00.
  assert.equal(zoneDisplay("America/Rio_Branco", JAN), "(GMT-05:00) Rio Branco");
  assert.equal(zoneDisplay("Asia/Kathmandu", JAN), "(GMT+05:45) Kathmandu");
  assert.equal(zoneDisplay("UTC", JAN), "(GMT+00:00) UTC");
});

test("zoneOffsetMinutes: follows daylight saving", () => {
  assert.equal(zoneOffsetMinutes("Europe/London", new Date("2026-07-01T12:00:00Z")), 60);
  assert.equal(zoneOffsetMinutes("Europe/London", JAN), 0);
});

test("formatOffset and zoneCity", () => {
  assert.equal(formatOffset(-300), "-05:00");
  assert.equal(formatOffset(0), "+00:00");
  assert.equal(zoneCity("America/Argentina/Rio_Gallegos"), "Rio Gallegos");
});

test("buildZoneOptions: city order, Etc hidden, unlisted stored zone kept (K1, K2, O11)", () => {
  const opts = buildZoneOptions(["Asia/Riyadh", "Europe/Riga", "Etc/GMT+2", "America/Rio_Branco"], "Mars/Olympus", null, JAN);
  assert.deepEqual(
    opts.map((o) => o.zone),
    ["Mars/Olympus", "Europe/Riga", "America/Rio_Branco", "Asia/Riyadh"]
  );
  assert.deepEqual(
    buildZoneOptions([], "Asia/Beirut", "Europe/Paris", JAN).map((o) => o.zone),
    ["Asia/Beirut", "Europe/Paris"]
  );
});

test("filterZones: from the start of a word or zone segment (S1)", () => {
  const opts = buildZoneOptions(["Asia/Riyadh", "Europe/Riga", "America/Rio_Branco", "America/New_York", "Europe/Paris"], null, null, JAN);
  assert.deepEqual(filterZones(opts, "ri").map((o) => o.city), ["Riga", "Rio Branco", "Riyadh"]);
  assert.deepEqual(filterZones(opts, "America/").map((o) => o.city), ["New York", "Rio Branco"]);
  assert.deepEqual(filterZones(opts, "york").map((o) => o.city), ["New York"]);
  assert.deepEqual(filterZones(opts, "zzz"), []);
  const more = buildZoneOptions(["America/Costa_Rica", "Europe/Riga", "Asia/Riyadh"], null, null, JAN);
  assert.deepEqual(filterZones(more, "ri").map((o) => o.city), ["Riga", "Riyadh", "Costa Rica"]);
});
