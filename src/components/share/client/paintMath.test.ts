import { test } from "node:test";
import assert from "node:assert/strict";
import { baselineY, clampRadius, cssGradientLine, hexAlpha, lineHeightPx, parseShadows, wrapWords } from "./paintMath.ts";

test("shadows: authored and computed lists", () => {
  assert.deepEqual(parseShadows("0 1px 2px rgba(0,0,0,0.55), 0 0 10px rgba(0,0,0,0.35), 0 2px 18px rgba(0,0,0,0.3)"), [
    { x: 0, y: 1, blur: 2, color: "rgba(0,0,0,0.55)" },
    { x: 0, y: 0, blur: 10, color: "rgba(0,0,0,0.35)" },
    { x: 0, y: 2, blur: 18, color: "rgba(0,0,0,0.3)" },
  ]);
  assert.deepEqual(parseShadows("rgba(0, 0, 0, 0.42) 0px 1px 8px"), [{ x: 0, y: 1, blur: 8, color: "rgba(0, 0, 0, 0.42)" }]);
  assert.deepEqual(parseShadows("none"), []);
  assert.deepEqual(parseShadows(""), []);
});

test("line boxes: half-leading over ascent and descent", () => {
  assert.equal(baselineY(0, null, 10, 3), 10);
  assert.equal(baselineY(5, 20, 10, 4), 5 + 3 + 10);
  assert.equal(lineHeightPx("normal"), null);
  assert.equal(lineHeightPx("13.11px"), 13.11);
});

test("wrap: greedy, as the browser wraps", () => {
  const m = (s: string) => s.length * 10;
  assert.deepEqual(wrapWords("Incline dumbbell press", 120, m), ["Incline", "dumbbell", "press"]);
  assert.deepEqual(wrapWords("Push day", 120, m), ["Push day"]);
});

test("radius clamp, gradient line, alpha bytes", () => {
  assert.equal(clampRadius(999, 64, 64), 32);
  assert.equal(clampRadius(4, 20, 44), 4);
  const [x0, y0, x1, y1] = cssGradientLine(180, 100, 200);
  assert.ok(Math.abs(x0 - 50) < 1e-9 && Math.abs(y0 - 0) < 1e-9 && Math.abs(x1 - 50) < 1e-9 && Math.abs(y1 - 200) < 1e-9);
  assert.equal(hexAlpha("#5F6878", "2E"), "rgba(95,104,120,0.18)");
  assert.equal(hexAlpha("#5F6878", "00"), "rgba(95,104,120,0)");
});
