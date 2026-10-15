import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fromLine, groupItems, noteLine, relativeDay, shortDay, type CarePlanItem } from "./logic.ts";

test("shortDay", () => {
  assert.equal(shortDay("2026-10-29"), "Oct 29");
  assert.equal(shortDay("2026-01-01T10:00:00Z"), "Jan 1");
  assert.equal(shortDay(null), "");
  assert.equal(shortDay("nope"), "");
});

test("relativeDay", () => {
  assert.equal(relativeDay("2026-10-15", "2026-10-15"), "today");
  assert.equal(relativeDay("2026-10-16", "2026-10-15"), "tomorrow");
  assert.equal(relativeDay("2026-11-01", "2026-10-31"), "tomorrow");
  assert.equal(relativeDay("2026-10-17", "2026-10-15"), "Sat, Oct 17");
});

test("fromLine", () => {
  assert.equal(fromLine("Alex Morgan", "GP", true), "Alex Morgan, GP");
  assert.equal(fromLine("Sara", "Dietitian", false), "Sara, dietitian");
  assert.equal(fromLine("Sara", null, false), "Sara");
});

test("groupItems keeps the professional's order per kind", () => {
  const mk = (id: string, kind: CarePlanItem["kind"], position: number): CarePlanItem => ({
    id,
    kind,
    body: id,
    metric: null,
    thresholdLow: null,
    thresholdHigh: null,
    position,
  });
  const g = groupItems([mk("r2", "recommendation", 3), mk("g1", "goal", 0), mk("r1", "recommendation", 1), mk("m", "monitoring", 2)]);
  assert.deepEqual(g.goal.map((i) => i.id), ["g1"]);
  assert.deepEqual(g.recommendation.map((i) => i.id), ["r1", "r2"]);
  assert.deepEqual(g.monitoring.map((i) => i.id), ["m"]);
});

test("noteLine", () => {
  assert.equal(noteLine(" Review iron levels. "), "Review iron levels");
  assert.equal(noteLine(null), "");
});
