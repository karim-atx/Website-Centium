import { test } from "node:test";
import assert from "node:assert/strict";
import { tioDebugText } from "./tioDebug.ts";

test("the ?tioDebug=1 readout names the height, eligibility, safe area, the pose and why", () => {
  const text = tioDebugText({ viewport: "mobile", height: 579.9, measured: "panel", eligible: true, safeTop: 0, sheetTop: 79, fitting: ["peek", "none"], pose: "peek", storage: "memory", reason: "shown" });
  assert.equal(
    text,
    ["Tio mobile: peek", "height 579.9 (panel) eligible yes (<= 668)", "sheet top 79 safe-area top 0", "fits: peek, none | storage memory", "why: shown"].join("\n")
  );
  assert.match(tioDebugText({ viewport: "mobile", height: 820, measured: "panel", eligible: false, safeTop: 47, sheetTop: 60, fitting: [], pose: null, storage: "localStorage", reason: "taller than 668 on the phone (RULE B3)" }), /not shown[\s\S]*why: taller than 668/);
});
