import { test } from "node:test";
import assert from "node:assert/strict";
import { abroadLabel, anyCountryChosen, arrangeDirectory, chosenRadiusKm, chosenWhere, deviceDistance, keptByWhere, serverSort } from "./directoryFilterModel.ts";

test("chosenRadiusKm: the widest checked option, null for none", () => {
  assert.equal(chosenRadiusKm([]), null);
  assert.equal(chosenRadiusKm(["Within 5 km"]), 5);
  assert.equal(chosenRadiusKm(["Within 25 km", "Within 10 km"]), 25);
  assert.equal(chosenRadiusKm(["In person"]), null);
});

test("deviceDistance: from the point to the ~1 km area, null when either is missing", () => {
  const hamra = { lat: 33.896, lng: 35.482 };
  const d = deviceDistance(hamra, { approxLat: 33.9, approxLng: 35.5 });
  assert.ok(d != null && d > 1 && d < 2.5);
  assert.equal(deviceDistance(null, { approxLat: 33.9, approxLng: 35.5 }), null);
  assert.equal(deviceDistance(hamra, { approxLat: null, approxLng: null }), null);
});

const H = [
  { id: "a", distanceKm: 12 },
  { id: "b", distanceKm: 3 },
  { id: "c", distanceKm: null },
  { id: "d", distanceKm: 30 },
];

test("arrangeDirectory: Best match with no distance keeps the server's order", () => {
  assert.deepEqual(arrangeDirectory(H, null, "Best match").map((h) => h.id), ["a", "b", "c", "d"]);
});

test("arrangeDirectory: a radius keeps the measured ones in range, in order, and the unmeasured last", () => {
  assert.deepEqual(arrangeDirectory(H, 25, "Best match").map((h) => h.id), ["a", "b", "c"]);
  assert.deepEqual(arrangeDirectory(H, 5, "Best match").map((h) => h.id), ["b", "c"]);
});

test("arrangeDirectory: Nearest sorts the measured ones, unmeasured last; ties keep the server's order", () => {
  assert.deepEqual(arrangeDirectory(H, null, "Nearest").map((h) => h.id), ["b", "a", "d", "c"]);
  const tie = [{ id: "x", distanceKm: 2 }, { id: "y", distanceKm: 2 }];
  assert.deepEqual(arrangeDirectory(tie, null, "Nearest").map((h) => h.id), ["x", "y"]);
});

// Release B rows, as professionals_ranked returns them (captured in a rolled-back psql):
// an in-person one with an area, an online-only one, a both-modes one out of reach (online),
// a both-modes one within reach, and an old row with no work_mode and no area.
const R = [
  { id: "inp", distanceKm: 8, workMode: "in_person" as const, isOnlineOnly: false },
  { id: "onl", distanceKm: null, workMode: "online" as const, isOnlineOnly: true },
  { id: "bothFar", distanceKm: null, workMode: "both" as const, isOnlineOnly: false },
  { id: "bothNear", distanceKm: 2, workMode: "both" as const, isOnlineOnly: false },
  { id: "unset", distanceKm: null, workMode: null, isOnlineOnly: false },
];

test("chosenWhere / anyCountryChosen / serverSort read the popup's rows", () => {
  assert.deepEqual(chosenWhere([]), { inPerson: false, online: false });
  assert.deepEqual(chosenWhere(["Within 5 km", "Online"]), { inPerson: false, online: true });
  assert.equal(anyCountryChosen(["Include other countries"]), true);
  assert.equal(anyCountryChosen(["Online"]), false);
  assert.equal(serverSort("Nearest"), "distance");
  assert.equal(serverSort("Best match"), "weighted");
});

test("keptByWhere: on work_mode, both counts for both, unset counts as in person", () => {
  const ip = { inPerson: true, online: false };
  const on = { inPerson: false, online: true };
  assert.equal(keptByWhere({ workMode: "both", isOnlineOnly: false }, ip), true);
  assert.equal(keptByWhere({ workMode: "both", isOnlineOnly: false }, on), true);
  assert.equal(keptByWhere({ workMode: null, isOnlineOnly: false }, ip), true);
  assert.equal(keptByWhere({ workMode: null, isOnlineOnly: false }, on), false);
  assert.equal(keptByWhere({ workMode: "online", isOnlineOnly: true }, ip), false);
  assert.equal(keptByWhere({ workMode: "in_person", isOnlineOnly: false }, { inPerson: true, online: true }), true);
});

test("arrangeDirectory: nothing in Where keeps online and no-area results, and Distance cuts in-person ones only", () => {
  assert.deepEqual(arrangeDirectory(R, null, "Best match").map((h) => h.id), ["inp", "onl", "bothFar", "bothNear", "unset"]);
  assert.deepEqual(arrangeDirectory(R, 5, "Best match").map((h) => h.id), ["bothNear", "onl", "bothFar", "unset"]);
});

test("arrangeDirectory: In person drops the online-only; Online keeps online and both-modes", () => {
  const ip = { inPerson: true, online: false };
  const on = { inPerson: false, online: true };
  assert.deepEqual(arrangeDirectory(R, null, "Best match", ip).map((h) => h.id), ["inp", "bothNear", "unset"]);
  assert.deepEqual(arrangeDirectory(R, null, "Best match", on).map((h) => h.id), ["onl", "bothFar", "bothNear"]);
  // Online with a distance: the online results stay; the in-person both-modes one is still measured.
  assert.deepEqual(arrangeDirectory(R, 5, "Best match", on).map((h) => h.id), ["bothNear", "onl", "bothFar"]);
});

test("arrangeDirectory: Nearest puts the measured first, then no-area, then online-only", () => {
  assert.deepEqual(arrangeDirectory(R, null, "Nearest").map((h) => h.id), ["bothNear", "inp", "bothFar", "unset", "onl"]);
});

test("abroadLabel: only with the override on and a different country", () => {
  assert.equal(abroadLabel("FR", "LB", true), "France");
  assert.equal(abroadLabel("FR", "LB", false), null);
  assert.equal(abroadLabel("LB", "LB", true), null);
  assert.equal(abroadLabel("lb", "LB", true), null);
  assert.equal(abroadLabel(null, "LB", true), null);
  assert.equal(abroadLabel("FR", null, true), null);
});
