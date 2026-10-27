import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ecoSets } from "./sections/eco/data";

// Centium landing v29, batch 2: section 06's slide data, which carries Karim's
// decisions (exercises in the plan builder on desktop and mobile), checked
// against the prototype's data (Centium Site v29.dc.html). The test project
// has no DOM types, so the DOM-side modules are verified in the browser.

describe("section 06 slides", () => {
  it("shows exercises in the plan builder on desktop (Karim: exercises on desktop and mobile)", () => {
    const [pro] = ecoSets(true, false);
    const plan = pro[1];
    assert.equal(plan.k, "02 · PLAN BUILDER");
    assert.equal(plan.isPlan, true);
    assert.equal(plan.cols?.length, 4);
    assert.deepEqual(
      plan.cols?.[0].items.map((i) => i.t + " " + i.m),
      ["Bench press 4 x 8", "Seated row 3 x 10", "Shoulder press 3 x 10"],
    );
    assert.equal(plan.cols?.[0].kc, "10 sets");
    const all = JSON.stringify(plan);
    for (const meal of ["Labneh", "Fattoush", "Mujaddara", "kcal"]) assert.ok(!all.includes(meal), meal + " left in the plan builder");
    // The third column's first item is the one dropped in (prototype: highlighted border).
    assert.equal(plan.cols?.[2].items[0].bd, "#775FD7");
  });

  it("keeps the mobile plan builder's exercises", () => {
    const [pro] = ecoSets(false, false);
    assert.equal(pro[1].mPlan, true);
    assert.deepEqual(
      pro[1].mb?.map((m) => m.n),
      ["Bench press", "Seated row", "Shoulder press"],
    );
    assert.equal(pro[1].mx, "+ Pull-ups");
  });

  it("orders the business set as the prototype's [1, 3, 2, 4, 0] reshuffle, renumbered", () => {
    const [, biz] = ecoSets(true, false);
    assert.deepEqual(
      biz.map((s) => s.k),
      ["01 · CLASSES", "02 · FRONT DESK", "03 · MEMBERSHIPS", "04 · TEAM", "05 · GYM PAGE"],
    );
  });

  it("drops Pro 04's third chat bubble when asked", () => {
    assert.equal(ecoSets(false, true)[0][3].mb?.length, 2);
    assert.equal(ecoSets(false, false)[0][3].mb?.length, 3);
  });
});
