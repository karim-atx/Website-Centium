import { test } from "node:test";
import assert from "node:assert/strict";
import { SENSITIVE_STATS, shareLocks, statAllowed, statDefaultOn, visibleStats } from "./shareLocks.ts";

const STATS = [{ key: "volume" }, { key: "duration" }, { key: "avg_heart_rate" }, { key: "body_weight" }, { key: "body_fat" }, { key: "biomarkers" }];

test("D-28: weight, body fat, biomarkers and average heart rate start off", () => {
  for (const s of SENSITIVE_STATS) assert.equal(statDefaultOn(s), false, s);
  assert.equal(statDefaultOn("volume"), true);
});

test("an adult outside recovery mode may switch them on", () => {
  const l = shareLocks({ recovery: false, age: "adult" });
  assert.equal(l.sensitiveLocked, false);
  assert.equal(l.lockLine, null);
  const on = new Set(["volume", "body_weight", "avg_heart_rate"]);
  assert.deepEqual(visibleStats(STATS, on, l).map((s) => s.key), ["volume", "avg_heart_rate", "body_weight"]);
});

test("recovery mode locks them, the food-day card and the streak entry", () => {
  const l = shareLocks({ recovery: true, age: "adult" });
  assert.equal(l.sensitiveLocked, true);
  assert.equal(l.foodDayLocked, true);
  assert.equal(l.streakHidden, true);
  for (const s of SENSITIVE_STATS) assert.equal(statAllowed(s, l), false);
  // Even a switch left on never reaches the card.
  assert.deepEqual(visibleStats(STATS, new Set(STATS.map((s) => s.key)), l).map((s) => s.key), ["volume", "duration"]);
});

test("under-18s: locked, and Community is hidden", () => {
  const l = shareLocks({ recovery: false, age: "minor" });
  assert.equal(l.sensitiveLocked, true);
  assert.equal(l.communityHidden, true);
  assert.equal(l.foodDayLocked, false);
  assert.equal(l.streakHidden, false);
});

test("no date of birth fails closed", () => {
  assert.equal(shareLocks({ recovery: false, age: "unknown-age" }).sensitiveLocked, true);
});

test("Community stays hidden for everyone until it takes image posts (D-49)", () => {
  assert.equal(shareLocks({ recovery: false, age: "adult" }).communityHidden, true);
});
