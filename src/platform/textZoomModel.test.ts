import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LARGER_TEXT_SCALE, appliedTextZoom, textZoomStyle } from "./textZoomModel";

describe("appliedTextZoom (iPhone Dynamic Type)", () => {
  it("is the phone's percent at the default and larger sizes", () => {
    assert.equal(appliedTextZoom(100, 200, false), 100);
    assert.equal(appliedTextZoom(130, 200, false), 130);
    assert.equal(appliedTextZoom(200, 200, false), 200);
  });
  it("never goes above max (the largest accessibility sizes report more)", () => {
    assert.equal(appliedTextZoom(310, 200, false), 200);
  });
  it("with Larger text on, keeps the total within max (D-ET1)", () => {
    assert.equal(appliedTextZoom(200, 200, true), 166);
    assert.ok(appliedTextZoom(200, 200, true) * LARGER_TEXT_SCALE <= 200);
    assert.equal(appliedTextZoom(130, 200, true), 130);
  });
  it("follows smaller sizes", () => {
    assert.equal(appliedTextZoom(82, 200, false), 82);
  });
  it("is 100 when the phone can't say", () => {
    assert.equal(appliedTextZoom(Number.NaN, 200, false), 100);
    assert.equal(appliedTextZoom(0, 200, false), 100);
    assert.equal(appliedTextZoom(150, Number.NaN, false), 150);
  });
});

describe("textZoomStyle", () => {
  it("sets nothing at 100%", () => {
    assert.deepEqual(textZoomStyle(100), { on: false, zoom: null, fieldMin: null });
  });
  it("sets the percent above 100%, with fields left at their 16px floor", () => {
    assert.deepEqual(textZoomStyle(200), { on: true, zoom: "200%", fieldMin: null });
  });
  it("below 100%, raises a field's floor so its scaled text is still 16px", () => {
    const s = textZoomStyle(82);
    assert.equal(s.zoom, "82%");
    assert.ok(parseFloat(s.fieldMin!) * 0.82 >= 16);
    assert.ok(parseFloat(s.fieldMin!) * 0.82 < 16.01);
  });
});
