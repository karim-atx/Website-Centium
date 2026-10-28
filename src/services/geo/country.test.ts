import { test } from "node:test";
import assert from "node:assert/strict";
import { countryNear, countryOfArea } from "./country.ts";
import { areaById } from "./areas.ts";

test("a chosen area is in Lebanon; none is unknown", () => {
  assert.equal(countryOfArea(areaById("hamra")), "LB");
  assert.equal(countryOfArea(undefined), null);
});

test("a point takes the country of a known area only when it is close", () => {
  assert.equal(countryNear({ lat: 33.9, lng: 35.5 }), "LB"); // Beirut
  assert.equal(countryNear({ lat: 34.44, lng: 35.83 }), "LB"); // Tripoli
  assert.equal(countryNear({ lat: 33.513, lng: 36.292 }), null); // Damascus
  assert.equal(countryNear({ lat: 48.85, lng: 2.35 }), null); // Paris
  assert.equal(countryNear(null), null);
  assert.equal(countryNear({ lat: Number.NaN, lng: 35.5 }), null);
});
