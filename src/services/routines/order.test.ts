import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyPlacements, compareRoutineOrder, moveId, nextPosition, placeBelow, placeRoutine, routinesIn } from "./order";

const r = (id: string, folderId: string | null, position?: number, createdAt = "2026-09-01") => ({ id, folderId, position, createdAt });

const list = [
  r("a", "F", 0),
  r("b", "F", 1),
  r("c", "F", 2),
  r("x", "G", 0),
  r("u1", null, 0),
  r("u2", null, 1),
];
const order = (rs: typeof list, f: string | null) => routinesIn(rs, f).map((x) => x.id).join("");

test("order is position, then created_at (positions are not unique mid-reorder)", () => {
  const tied = [r("late", "F", 1, "2026-09-03"), r("early", "F", 1, "2026-09-02"), r("first", "F", 0, "2026-09-09")];
  assert.deepEqual([...tied].sort(compareRoutineOrder).map((x) => x.id), ["first", "early", "late"]);
});

test("a routine with no row yet (no position) sorts last", () => {
  assert.deepEqual([r("m", "F"), r("a", "F", 5)].sort(compareRoutineOrder).map((x) => x.id), ["a", "m"]);
});

test("create appends at max(position) + 1 in its folder; an empty folder starts at 0", () => {
  assert.equal(nextPosition(list, "F"), 3);
  assert.equal(nextPosition(list, "H"), 0);
  assert.equal(nextPosition(list, null), 2);
});

test("reordering within a folder writes only the rows that change", () => {
  // c to the top: c0 a1 b2
  const p = placeRoutine(list, "c", "F", 0);
  assert.deepEqual(p, [
    { id: "c", folderId: "F", position: 0 },
    { id: "a", folderId: "F", position: 1 },
    { id: "b", folderId: "F", position: 2 },
  ]);
  assert.equal(order(applyPlacements(list, p), "F"), "cab");
  // A no-op move writes nothing.
  assert.deepEqual(placeRoutine(list, "b", "F", 1), []);
});

test("moving to another folder sets folder_id + position on the moved row and closes the gap it left", () => {
  const p = placeRoutine(list, "a", "G", 99);
  assert.deepEqual(p, [
    { id: "a", folderId: "G", position: 1 },
    { id: "b", folderId: "F", position: 0 },
    { id: "c", folderId: "F", position: 1 },
  ]);
  const after = applyPlacements(list, p);
  assert.equal(order(after, "G"), "xa");
  assert.equal(order(after, "F"), "bc");
});

test("to and from Unfiled", () => {
  const toUnfiled = placeRoutine(list, "x", null, 1);
  assert.equal(order(applyPlacements(list, toUnfiled), null), "u1xu2");
  const fromUnfiled = placeRoutine(list, "u1", "F", 1);
  const after = applyPlacements(list, fromUnfiled);
  assert.equal(order(after, "F"), "au1bc");
  assert.equal(order(after, null), "u2");
});

test("a duplicate goes directly below its original and shifts the rows after it", () => {
  const copy = r("a2", "F", undefined);
  const p = placeBelow([...list, copy], "a", copy);
  assert.deepEqual(p, [
    { id: "a2", folderId: "F", position: 1 },
    { id: "b", folderId: "F", position: 2 },
    { id: "c", folderId: "F", position: 3 },
  ]);
});

test("folder siblings reorder only among themselves", () => {
  assert.deepEqual(moveId(["s", "h", "e"], "e", 0), ["e", "s", "h"]);
  assert.deepEqual(moveId(["s", "h", "e"], "s", 5), ["h", "e", "s"]);
});
