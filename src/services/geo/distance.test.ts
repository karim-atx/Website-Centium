import { strict as assert } from "node:assert";
import { test } from "node:test";
import { coarsePoint, describeDistance, distanceKm, groupByPoint } from "./distance";

test("Hamra to Achrafieh is about 4 km", () => {
  const km = distanceKm({ lat: 33.896, lng: 35.482 }, { lat: 33.887, lng: 35.52 });
  assert.ok(km > 3 && km < 5, String(km));
});

test("distances read as approximate, with under 1 km at the low end", () => {
  assert.equal(describeDistance(0.3), "under 1 km away");
  assert.equal(describeDistance(2.6), "about 3 km away");
  assert.equal(describeDistance(41.2), "about 41 km away");
  assert.equal(describeDistance(NaN), "");
});

test("only a point rounded to one decimal place leaves the device", () => {
  assert.deepEqual(coarsePoint({ lat: 33.89612, lng: 35.48234 }), { lat: 33.9, lng: 35.5 });
});

test("professionals in the same ~1 km area share one pin", () => {
  const groups = groupByPoint([
    { id: "a", lat: 33.9, lng: 35.48 },
    { id: "b", lat: 33.9, lng: 35.48 },
    { id: "c", lat: 33.89, lng: 35.52 },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.find((g) => g.items.length === 2)?.items.map((i) => i.id), ["a", "b"]);
});
