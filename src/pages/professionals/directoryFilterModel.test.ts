import { test } from "node:test";
import assert from "node:assert/strict";
import { arrangeDirectory, chosenRadiusKm, deviceDistance } from "./directoryFilterModel.ts";

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
