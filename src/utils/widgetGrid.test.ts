import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EDIT_TAP_LOCK_MS, createEditTapGuard, dropSlot, storedMove, widgetColumns, widgetSpans } from "./widgetGrid.ts";

test("widgetColumns is 2 below 400 and 3 from 400", () => {
  assert.equal(widgetColumns(360), 2);
  assert.equal(widgetColumns(393), 2);
  assert.equal(widgetColumns(399), 2);
  assert.equal(widgetColumns(400), 3);
  assert.equal(widgetColumns(430), 3);
});

test("a small widget is always one column wide, even alone in its row", () => {
  assert.deepEqual(widgetSpans(["small", "small", "small"], 2), [3, 3, 3]);
  assert.deepEqual(widgetSpans(["small", "small", "small"], 3), [2, 2, 2]);
  assert.deepEqual(widgetSpans(["small", "small", "small", "small"], 3), [2, 2, 2, 2]);
});

test("a large widget takes the full row; the small next to it does not stretch", () => {
  assert.deepEqual(widgetSpans(["small", "large", "small", "small"], 3), [2, 6, 2, 2]);
  assert.deepEqual(widgetSpans(["large", "small", "large"], 2), [6, 3, 6]);
  assert.deepEqual(widgetSpans(["small", "small", "small", "large", "small"], 2), [3, 3, 3, 6, 3]);
  assert.deepEqual(widgetSpans(["large", "large"], 2), [6, 6]);
  assert.deepEqual(widgetSpans([], 3), []);
});

test("after a resize, every edit control ignores taps until the board has settled", () => {
  const guard = createEditTapGuard();
  assert.equal(guard.allowed(1000), true);
  guard.resized(1000);
  // rapid repeat taps land wherever the reflow put something: all ignored
  for (const t of [1050, 1200, 1499]) assert.equal(guard.allowed(t), false);
  assert.equal(guard.allowed(1000 + EDIT_TAP_LOCK_MS), true);
});

// ---- Dragging: where it lands, and where that is in the stored list --------

const box = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h });
// Two columns: A B / C (an empty cell beside C) / D large.
const A = box(0, 0, 100, 100);
const B = box(110, 0, 100, 100);
const C = box(0, 110, 100, 100);
const D = box(0, 220, 210, 100);

test("drop slot follows the nearest tile, not only one the pointer is inside", () => {
  assert.equal(dropSlot(20, 50, [A, B, C, D], null), 0); // left half of A: before A
  assert.equal(dropSlot(80, 50, [A, B, C, D], null), 1); // right half of A: after A
  assert.equal(dropSlot(105, 50, [A, B, C, D], null), 1); // the gap between A and B
  assert.equal(dropSlot(160, 160, [A, B, C, D], null), 3); // the empty cell beside C: after C
  assert.equal(dropSlot(100, 400, [A, B, C, D], null), 4); // below the last tile: the end
  assert.equal(dropSlot(150, 160, [A, B, C, D], box(110, 110, 100, 100)), null); // over the placeholder: stays
  assert.equal(dropSlot(10, 10, [], null), null);
});

test("a visible move maps onto the stored list around hidden widgets", () => {
  const stored = ["steps", "bodyFat", "water", "sleep"];
  const visible = ["steps", "water", "sleep"];
  // Drag steps to the end: after sleep.
  assert.deepEqual(storedMove(stored, visible, "steps", 2), { from: 0, to: 3 });
  // Drag sleep to the front: before steps.
  assert.deepEqual(storedMove(stored, visible, "sleep", 0), { from: 3, to: 0 });
  // Drag steps between water and sleep: before sleep, the hidden one stays put.
  assert.deepEqual(storedMove(stored, visible, "steps", 1), { from: 0, to: 2 });
  const apply = (ids: string[], m: { from: number; to: number }) => {
    const next = [...ids];
    const [x] = next.splice(m.from, 1);
    next.splice(m.to, 0, x);
    return next;
  };
  assert.deepEqual(apply(stored, storedMove(stored, visible, "steps", 1)!), ["bodyFat", "water", "steps", "sleep"]);
  assert.equal(storedMove(stored, visible, "nope", 0), null);
});
