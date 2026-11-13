import { test } from "node:test";
import assert from "node:assert/strict";
import { mobilePose, tioEligible, tioGlyphLayout, tioSrc, TIO_MAX_SHEET_H, webPose } from "./tioPoseModel.ts";

// The handover's tables, computed from the PNG anchors (B spec §1, A spec §2).

test("mobile poses: the B spec table at 430 (anchor x 323, rest line on the sheet's top edge)", () => {
  const lie = mobilePose("lie")!;
  assert.deepEqual([lie.left430, lie.top, lie.width, lie.height], [261.01, -79.88, 121.36, 80.91]);
  const wave = mobilePose("wave")!;
  assert.deepEqual([wave.left430, wave.top, wave.width, wave.height], [269.21, -108.71, 106.38, 109.74]);
  const peek = mobilePose("peek")!;
  assert.deepEqual([peek.left430, peek.top, peek.width, peek.height], [280.1, -70.72, 83.14, 75.98]);
  assert.equal(mobilePose("none"), null);
});

test("mobile anchor: 107 from the sheet's end, mirrored in Arabic", () => {
  for (const s of ["lie", "wave", "peek"] as const) {
    const p = mobilePose(s)!;
    // LTR: right offset + width − anchor = 107 from the right edge.
    assert.ok(Math.abs(430 - p.right - p.width - p.left430) < 0.02);
    // RTL: the anchor is 107 from the left edge, so left = 107 − (430 − 107 − left430).
    assert.ok(Math.abs(p.left - (107 - (323 - p.left430))) < 0.02);
  }
});

test("web poses: E − 105.84 / H − 202.94 (LEAN) and E − 69.71 / H − 208.56 rotated about 69.71 114.91 (SIDEPEEK)", () => {
  const lean = webPose("lean")!;
  assert.deepEqual([lean.fromEdge, lean.topFromBottom, lean.width, lean.height, lean.bottom, lean.under], [-105.84, 202.94, 105.84, 202.94, 0, true]);
  const side = webPose("sidepeek")!;
  assert.deepEqual([side.fromEdge, side.topFromBottom, side.width, side.height, side.under], [-69.71, 208.56, 135.1, 123.46, false]);
  assert.deepEqual(side.rotate, { deg: -90, originX: 69.71, originY: 114.91 });
  assert.equal(side.asset, "tio-peek");
  assert.equal(webPose("none"), null);
  // 1440 × 900: E 1000 → LEAN 894.16 / 697.06, SIDEPEEK 930.29 / 691.44.
  assert.deepEqual([1000 + lean.fromEdge, Math.round((900 - lean.topFromBottom) * 100) / 100], [894.16, 697.06]);
  assert.deepEqual([1000 + side.fromEdge, Math.round((900 - side.topFromBottom) * 100) / 100], [930.29, 691.44]);
  // 1024: E 584 → 478.16 and 514.29.
  assert.equal(Math.round((584 + lean.fromEdge) * 100) / 100, 478.16);
  assert.equal(Math.round((584 + side.fromEdge) * 100) / 100, 514.29);
});

test("RULE B3: eligible at 668 or less; a fill-height sheet never is", () => {
  assert.equal(TIO_MAX_SHEET_H, 668);
  assert.equal(tioEligible(667.5), true);
  assert.equal(tioEligible(668), true);
  assert.equal(tioEligible(668.5), false);
  assert.equal(tioEligible(820), false);
  assert.equal(tioEligible(400, true), false);
});

test("TioStateIcon composition: the A spec's worked values for 44 / 56 / 72", () => {
  assert.deepEqual(tioGlyphLayout(44), { head: { left: -1.14, top: 4.03, size: 35.83 }, glyph: { left: 25.61, top: 16.37, size: 18.48 } });
  assert.deepEqual(tioGlyphLayout(56), { head: { left: -1.44, top: 5.13, size: 45.61 }, glyph: { left: 32.59, top: 20.83, size: 23.52 } });
  assert.deepEqual(tioGlyphLayout(72), { head: { left: -1.86, top: 6.6, size: 58.64 }, glyph: { left: 41.9, top: 26.78, size: 30.24 } });
});

test("assets: 1x / 2x / 3x per density", () => {
  assert.deepEqual(tioSrc("tio-lie"), { src: "/tio/tio-lie.png", srcSet: "/tio/tio-lie.png 1x, /tio/tio-lie@2x.png 2x, /tio/tio-lie@3x.png 3x" });
});
