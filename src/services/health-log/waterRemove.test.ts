import { test } from "node:test";
import assert from "node:assert/strict";
import { canChangeWaterDay, NOTHING_TO_REMOVE, removableWaterMl, removedMessage, REMOVED, REMOVED_ALL } from "./waterRemove";

test("only today and the 7 days before it can be changed", () => {
  const today = "2026-11-05";
  assert.equal(canChangeWaterDay("2026-11-05", today), true);
  assert.equal(canChangeWaterDay("2026-10-29", today), true);
  assert.equal(canChangeWaterDay("2026-10-28", today), false);
  assert.equal(canChangeWaterDay("2026-11-06", today), false);
  // Across a month and a year.
  assert.equal(canChangeWaterDay("2025-12-26", "2026-01-02"), true);
  assert.equal(canChangeWaterDay("2025-12-25", "2026-01-02"), false);
});

const drinks = [
  { day: "2026-11-05", ml: 250, source: "manual" },
  { day: "2026-11-05", ml: 500, source: "manual" },
  { day: "2026-11-05", ml: 400, source: "apple_health" },
  { day: "2026-11-04", ml: 300, source: "manual" },
];

test("only hand-logged water of that day can be taken back", () => {
  assert.equal(removableWaterMl("2026-11-05", drinks), 750);
  assert.equal(removableWaterMl("2026-11-04", drinks), 300);
  assert.equal(removableWaterMl("2026-11-03", drinks), 0);
});

test("waiting entries count, in order, and never below 0", () => {
  const day = "2026-11-05";
  assert.equal(removableWaterMl(day, drinks, [{ kind: "water", ml: 250, day }]), 1000);
  assert.equal(removableWaterMl(day, drinks, [{ kind: "water_remove", ml: 500, day }]), 250);
  assert.equal(removableWaterMl(day, drinks, [{ kind: "water_remove", ml: 5000, day }]), 0);
  assert.equal(removableWaterMl(day, drinks, [{ kind: "water_clear", day }, { kind: "water", ml: 250, day }]), 250);
  assert.equal(removableWaterMl(day, drinks, [{ kind: "water_remove", ml: 250, day: "2026-11-04" }, { kind: "weight", day }]), 750);
});

test("the toast shows what the server removed", () => {
  assert.deepEqual(removedMessage(250, 250), { key: REMOVED, n: 250 });
  assert.deepEqual(removedMessage(500, 300), { key: REMOVED_ALL, n: 300 });
  assert.deepEqual(removedMessage(250, 0), { key: NOTHING_TO_REMOVE, n: 0 });
});
