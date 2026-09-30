import { strict as assert } from "node:assert";
import { test } from "node:test";
import { changeSummary, changeText, goalTone } from "./trend.ts";

// The three example states from the WO16 frame, oldest first.
const DOWN = [97.8, 97.2, 97.2, 96];
const UP = [96, 96.6, 97.2, 97.8];
const FLAT = [97.2, 96.9, 97.3, 97.1];

test("toward the goal is green, against it red", () => {
  assert.equal(goalTone(DOWN, "decrease"), "toward");
  assert.equal(goalTone(UP, "decrease"), "against");
  assert.equal(goalTone(UP, "increase"), "toward");
  assert.equal(goalTone(DOWN, "increase"), "against");
});

test("a plateau, no goal, or a single reading is blue", () => {
  assert.equal(goalTone(FLAT, "decrease"), "neutral");
  assert.equal(goalTone(DOWN, null), "neutral");
  assert.equal(goalTone([96], "decrease"), "neutral");
  assert.equal(goalTone([], "decrease"), "neutral");
});

test("the plateau is ±0.5 over the last three readings, inclusive", () => {
  // Big fall long ago, flat since: plateau.
  assert.equal(goalTone([105, 97, 97.3, 97.5], "decrease"), "neutral");
  // 0.6 over the window is a change.
  assert.equal(goalTone([97, 97.3, 96.4], "decrease"), "toward");
  // Two readings use the two there are.
  assert.equal(goalTone([97, 96.5], "decrease"), "neutral");
  assert.equal(goalTone([97, 96.4], "decrease"), "toward");
});

test("maintain is green holding steady and red off it", () => {
  assert.equal(goalTone(FLAT, "maintain"), "toward");
  assert.equal(goalTone(DOWN, "maintain"), "against");
});

test("change text and the summary match the frame's wording", () => {
  assert.equal(changeText(-1.8, "cm"), "↓ 1.8 cm");
  assert.equal(changeText(0.6000000001, "cm"), "↑ 0.6 cm");
  assert.equal(changeText(0, "%"), "0 %");
  const labelled = DOWN.map((value, i) => ({ value, label: ["Aug 16", "Aug 30", "Sep 13", "Sep 27"][i] }));
  assert.equal(changeSummary(labelled, "cm"), "↓ 1.8 cm since Aug 16 · ↓ 1.2 cm since last");
  assert.equal(changeSummary(labelled.slice(0, 1), "cm"), null);
});
