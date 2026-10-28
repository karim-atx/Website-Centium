import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesFilter } from "../../components/market/filterModel.ts";
import { classCountLine, classFilterGroups, gymFilterGroups, priceMatches, stripDays, timeMatches } from "./classFilterModel.ts";

const C = [
  { id: "a", classType: "Cycling", startTime: "18:30", businessName: "Hamra", priceValue: 12, km: 0.8 },
  { id: "b", classType: "Strength", startTime: "12:30", businessName: "Cedar", priceValue: 15, km: 1.6 },
  { id: "c", classType: "Mobility", startTime: "07:00", businessName: "Mar", priceValue: null, km: 3.1 },
];

test("time and price rules (FG, D-20)", () => {
  assert.ok(timeMatches("07:00", "Morning"));
  assert.ok(timeMatches("12:30", "Afternoon"));
  assert.ok(timeMatches("17:00", "Evening"));
  assert.ok(priceMatches(null, "Free"));
  assert.ok(!priceMatches(15, "Under $15"));
  assert.ok(priceMatches(14.99, "Under $15"));
});

test("groups come from the listed classes; Distance only with a position", () => {
  assert.deepEqual(classFilterGroups(C, false).map((g) => g.heading), ["Type", "Time", "Gym", "Price"]);
  assert.deepEqual(classFilterGroups(C, true).map((g) => g.heading), ["Type", "Time", "Gym", "Distance", "Price"]);
});

test("Cycling · Evening keeps Spin (the board's classFiltered); within a group choices OR", () => {
  const g = classFilterGroups(C, true);
  assert.deepEqual(C.filter((c) => matchesFilter(g, ["Cycling", "Evening"], c)).map((c) => c.id), ["a"]);
  assert.deepEqual(C.filter((c) => matchesFilter(g, ["Morning", "Afternoon"], c)).map((c) => c.id), ["b", "c"]);
  assert.deepEqual(C.filter((c) => matchesFilter(g, ["Under 1 km"], c)).map((c) => c.id), ["a"]);
});

test("count line and the day strip", () => {
  assert.equal(classCountLine("Friday, October 16", 1), "Friday, October 16 · 1 class");
  const days = stripDays(new Date(2026, 9, 16), ["2026-11-20"]);
  assert.equal(days[0], "2026-10-16");
  assert.equal(days.at(-1), "2026-11-20");
  assert.equal(stripDays(new Date(2026, 9, 16), []).length, 14);
});

test("Release B: Explore Gyms filters by distance only with a known position", () => {
  assert.deepEqual(gymFilterGroups(false), []);
  const groups = gymFilterGroups<{ km: number | null }>(true);
  assert.deepEqual(groups.map((g) => g.heading), ["Distance"]);
  assert.deepEqual(groups[0].options, ["Under 1 km", "Under 3 km", "Under 5 km"]);
  const gyms = [{ km: 0.5 }, { km: 2.9 }, { km: 3 }, { km: null }];
  assert.deepEqual(gyms.filter((g) => matchesFilter(groups, ["Under 3 km"], g)).map((g) => g.km), [0.5, 2.9]);
  assert.equal(gyms.filter((g) => matchesFilter(groups, [], g)).length, 4);
});
