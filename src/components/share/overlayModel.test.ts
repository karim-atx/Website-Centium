import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAFE_MARGIN,
  clampPosition,
  clampScale,
  defaultTransform,
  dragTo,
  editorHeight,
  halfExtents,
  panCrop,
  photoRect,
  pinchTo,
  snapRotation,
  toExport,
} from "./overlayModel.ts";

const STORY = { w: 220, h: editorHeight("story") };
const LAYER = { w: 100, h: 96 };

test("the frames are the screen files' (220 x 391 / 275 / 220)", () => {
  assert.equal(editorHeight("story"), 391);
  assert.equal(editorHeight("post"), 275);
  assert.equal(editorHeight("square"), 220);
});

test("default: bottom-left on the safe margin (ph1Default x 60 y 333; yp1Default y 323 for a 116-tall layer)", () => {
  assert.deepEqual(defaultTransform(STORY, LAYER, "corner"), { x: 60, y: 333, scale: 1, rotation: 0 });
  assert.equal(defaultTransform(STORY, { w: 100, h: 116 }, "corner").y, 323);
  assert.deepEqual(defaultTransform(STORY, { w: 220, h: 391 }, "fill"), { x: 110, y: 195.5, scale: 1, rotation: 0 });
});

test("scale clamps to 50% to 200%", () => {
  assert.equal(clampScale(0.2), 0.5);
  assert.equal(clampScale(3), 2);
  const start = { x: 110, y: 195.5, scale: 1, rotation: 0 };
  assert.equal(pinchTo(start, 10, 0, STORY, LAYER).t.scale, 2);
  assert.equal(pinchTo(start, 0.01, 0, STORY, LAYER).t.scale, 0.5);
});

test("never crosses the 10 px safe margin, at any scale or rotation", () => {
  for (const scale of [0.5, 1, 1.5, 2]) {
    for (const rotation of [0, 30, 90, -45]) {
      for (const [x, y] of [[-500, -500], [900, 900], [0, 391], [220, 0]]) {
        const t = clampPosition({ x, y, scale, rotation }, STORY, LAYER);
        const { hw, hh } = halfExtents(LAYER, scale, rotation);
        if (hw * 2 <= STORY.w - 2 * SAFE_MARGIN) {
          assert.ok(t.x - hw >= SAFE_MARGIN - 1e-9 && t.x + hw <= STORY.w - SAFE_MARGIN + 1e-9, `x ${scale} ${rotation}`);
        } else assert.equal(t.x, STORY.w / 2);
        if (hh * 2 <= STORY.h - 2 * SAFE_MARGIN) {
          assert.ok(t.y - hh >= SAFE_MARGIN - 1e-9 && t.y + hh <= STORY.h - SAFE_MARGIN + 1e-9, `y ${scale} ${rotation}`);
        } else assert.equal(t.y, STORY.h / 2);
      }
    }
  }
});

test("ed.move: clamp then snap to the centre lines within 5 px", () => {
  const start = { x: 60, y: 333, scale: 1, rotation: 0 };
  const near = dragTo(start, 47, -140, STORY, LAYER); // x 107 -> 110, y 193 -> 195.5
  assert.deepEqual([near.t.x, near.t.y, near.v, near.h], [110, 195.5, true, true]);
  const far = dragTo(start, 30, 0, STORY, LAYER);
  assert.deepEqual([far.t.x, far.v], [90, false]);
  // The ph2Corner preset (x 180, y 38.8 at 60%) sits exactly on the margin.
  const corner = dragTo({ x: 60, y: 333, scale: 0.6, rotation: 0 }, 500, -500, STORY, LAYER);
  assert.deepEqual([corner.t.x, Math.round(corner.t.y * 10) / 10], [180, 38.8]);
});

test("rotation snaps to 0 inside 5 degrees and keeps its angle outside", () => {
  assert.deepEqual(snapRotation(3), { rotation: 0, snapped: true });
  assert.deepEqual(snapRotation(-4.9), { rotation: 0, snapped: true });
  assert.deepEqual(snapRotation(12), { rotation: 12, snapped: false });
  assert.deepEqual(snapRotation(361), { rotation: 0, snapped: true });
});

test("the photo crop covers the frame at every zoom and focus", () => {
  const img = { w: 3000, h: 2000 };
  for (const zoom of [1, 1.6, 3]) {
    for (const [fx, fy] of [[0, 0], [50, 50], [100, 100], [38, 42]]) {
      const r = photoRect(img, STORY, { zoom, fx, fy });
      assert.ok(r.x <= 1e-6 && r.y <= 1e-6 && r.x + r.w >= STORY.w - 1e-6 && r.y + r.h >= STORY.h - 1e-6, `${zoom} ${fx} ${fy}`);
    }
  }
  // Dragging right shows more of the left: the focus moves left, and stops at 0.
  const panned = panCrop({ zoom: 1.6, fx: 50, fy: 50 }, 40, 0, STORY, img);
  assert.ok(panned.fx < 50);
  assert.equal(panCrop({ zoom: 1.6, fx: 50, fy: 50 }, 5000, 0, STORY, img).fx, 0);
  // The image follows the finger exactly.
  const a = photoRect(img, STORY, { zoom: 1.6, fx: 50, fy: 50 });
  const b = photoRect(img, STORY, panned);
  assert.ok(Math.abs(b.x - a.x - 40) < 1e-6);
});

test("the export scales every length by 1080 / 220", () => {
  const e = toExport({ x: 60, y: 333, scale: 1, rotation: 0 }, 220, 1080);
  assert.equal(Math.round(e.k * 1000) / 1000, 4.909);
  assert.equal(Math.round(e.x), 295);
  assert.equal(Math.round(e.y), 1635);
});
