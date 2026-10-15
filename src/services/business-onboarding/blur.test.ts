import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BLUR_THRESHOLD, laplacianVariance } from "./blur";

/** A 64×64 grey image of 1px black and white stripes (sharp) or a flat ramp (soft). */
function image(kind: "stripes" | "ramp"): Float32Array {
  const w = 64;
  const out = new Float32Array(w * w);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) out[y * w + x] = kind === "stripes" ? ((x >> 1) % 2 ? 255 : 0) : (x * 255) / (w - 1);
  return out;
}

test("sharp edges score far above the blurry threshold", () => {
  assert.ok(laplacianVariance(image("stripes"), 64, 64) > BLUR_THRESHOLD * 100);
});

test("a smooth image scores below it", () => {
  assert.ok(laplacianVariance(image("ramp"), 64, 64) < BLUR_THRESHOLD);
});

test("an image too small to measure is never called blurry", () => {
  assert.equal(laplacianVariance(new Float32Array(4), 2, 2), Infinity);
});
