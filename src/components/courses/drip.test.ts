import { test } from "node:test";
import assert from "node:assert/strict";
import { courseDripLine, hasDrip, lessonDripLine, nextLocked, openingDay, type DripRow } from "./drip.ts";

const rows: DripRow[] = [
  { moduleId: "w1", position: 0, opensAt: null, isOpen: true },
  { moduleId: "w3", position: 2, opensAt: "2026-10-22T00:00:00+00:00", isOpen: false },
  { moduleId: "w2", position: 1, opensAt: "2026-10-15T00:00:00+00:00", isOpen: false },
];

test("no drip: every module open from the start (all at once, the author, not enrolled)", () => {
  const flat = rows.map((r) => ({ ...r, opensAt: null, isOpen: true }));
  assert.equal(hasDrip(flat), false);
  assert.equal(nextLocked(flat), null);
  assert.equal(hasDrip(rows), true);
});

test("the next week to open is the lowest locked position", () => {
  assert.equal(nextLocked(rows)?.moduleId, "w2");
  const opened = rows.map((r) => (r.moduleId === "w2" ? { ...r, isOpen: true } : r));
  assert.equal(nextLocked(opened)?.moduleId, "w3");
  assert.equal(nextLocked(rows.map((r) => ({ ...r, isOpen: true }))), null);
});

test("the opening day keeps its UTC date", () => {
  assert.deepEqual(openingDay("2026-10-15T00:00:00+00:00"), { weekday: "Thursday", date: "15 Oct" });
});

test("CU25 course page line: the weekday within a week, the date further out", () => {
  const now = new Date("2026-10-12T09:00:00Z");
  assert.equal(courseDripLine("Alex", 2, "2026-10-15T00:00:00+00:00", now), "Alex opens a week at a time. Week 2 opens Thursday.");
  assert.equal(courseDripLine("Alex", 3, "2026-10-22T00:00:00+00:00", now), "Alex opens a week at a time. Week 3 opens Thursday 22 Oct.");
});

test("CU25 lesson line", () => {
  assert.equal(lessonDripLine("Alex", 2, "2026-10-15T00:00:00+00:00"), "Week 2 opens Thursday 15 Oct. Alex opens a week at a time.");
});

test("a fallback author name starts the sentence capitalised", () => {
  assert.equal(lessonDripLine("the professional", 2, "2026-10-15T00:00:00+00:00"), "Week 2 opens Thursday 15 Oct. The professional opens a week at a time.");
});
