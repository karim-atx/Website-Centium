import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  averageReading,
  BP_CATEGORIES,
  categoryCounts,
  classifyBloodPressure as classify,
  isSevere,
  splitByTimeOfDay,
} from "./classify.ts";

// --- every boundary, band by band ---------------------------------------------
//
// 2025 AHA/ACC:
//   Normal   <120 and <80      Elevated 120–129 and <80
//   Stage 1  130–139 or 80–89  Stage 2  ≥140 or ≥90
//   Severe   >180 and/or >120

test("Normal is under 120 AND under 80, on both sides of the edge", () => {
  assert.equal(classify(90, 60), "normal");
  assert.equal(classify(119, 79), "normal", "the last normal reading");
  assert.equal(classify(120, 79), "elevated", "120 systolic leaves normal");
  assert.equal(classify(119, 80), "stage1", "80 diastolic leaves normal — and skips elevated");
});

test("Elevated needs BOTH: 120–129 systolic and a diastolic still under 80", () => {
  assert.equal(classify(120, 79), "elevated", "the first elevated reading");
  assert.equal(classify(129, 79), "elevated", "the last elevated reading");
  assert.equal(classify(130, 79), "stage1", "130 systolic leaves elevated");
  assert.equal(classify(125, 80), "stage1", "a diastolic of 80 overrides an elevated systolic");
});

test("Stage 1 is 130–139 OR 80–89 — either number alone is enough", () => {
  assert.equal(classify(130, 70), "stage1", "systolic alone");
  assert.equal(classify(110, 80), "stage1", "diastolic alone, systolic well inside normal");
  assert.equal(classify(139, 89), "stage1", "the last stage 1 reading");
  assert.equal(classify(140, 89), "stage2", "140 systolic leaves stage 1");
  assert.equal(classify(139, 90), "stage2", "90 diastolic leaves stage 1");
});

test("Stage 2 is 140 or above OR 90 or above", () => {
  assert.equal(classify(140, 70), "stage2", "systolic alone, diastolic normal");
  assert.equal(classify(110, 90), "stage2", "diastolic alone, systolic normal");
  assert.equal(classify(180, 120), "stage2", "180/120 EXACTLY is stage 2, not severe");
});

test("Severe is STRICTLY above 180 and/or above 120", () => {
  assert.equal(classify(181, 120), "severe", "one over on systolic");
  assert.equal(classify(180, 121), "severe", "one over on diastolic");
  assert.equal(classify(181, 121), "severe");
  assert.equal(classify(200, 70), "severe", "systolic alone, diastolic normal");
  assert.equal(classify(130, 130), "severe", "diastolic alone");
  // The line the guideline draws is ABOVE 180/120, not at it. Rounding that
  // down would put a crisis message in front of somebody it is not meant for.
  assert.equal(classify(180, 120), "stage2");
});

// --- the rule that gets implemented wrong -------------------------------------

test("THE HIGHER CATEGORY WINS when the two numbers disagree", () => {
  // Written out in reading order, each of these lands in the wrong band.
  assert.equal(classify(125, 85), "stage1", "elevated systolic, stage 1 diastolic");
  assert.equal(classify(115, 95), "stage2", "normal systolic, stage 2 diastolic");
  assert.equal(classify(145, 65), "stage2", "stage 2 systolic, normal diastolic");
  assert.equal(classify(190, 65), "severe", "severe systolic, normal diastolic");
  assert.equal(classify(105, 125), "severe", "normal systolic, severe diastolic");
});

test("every pair in the plausible range lands in exactly one category", () => {
  // The bands are written with gaps easy to fall into — 119/80 belongs to
  // nothing if Elevated is checked before Stage 1's diastolic arm.
  for (let s = 50; s <= 300; s += 1) {
    for (let d = 30; d < s && d <= 200; d += 7) {
      const got = classify(s, d);
      assert.ok(BP_CATEGORIES.includes(got), `${s}/${d} produced ${got}`);
    }
  }
});

test("isSevere agrees with the classifier, at the edge too", () => {
  assert.equal(isSevere(180, 120), false);
  assert.equal(isSevere(181, 120), true);
  assert.equal(isSevere(180, 121), true);
  assert.equal(isSevere(119, 79), false);
});

// --- counting -----------------------------------------------------------------

test("category counts cover all five, including the ones with nothing in them", () => {
  const counts = categoryCounts([
    { systolic: 118, diastolic: 74 },
    { systolic: 125, diastolic: 78 },
    { systolic: 135, diastolic: 85 },
    { systolic: 142, diastolic: 91 },
  ]);
  assert.deepEqual(counts, { normal: 1, elevated: 1, stage1: 1, stage2: 1, severe: 0 });
});

test("no readings is five zeroes, not an empty object", () => {
  assert.deepEqual(categoryCounts([]), {
    normal: 0,
    elevated: 0,
    stage1: 0,
    stage2: 0,
    severe: 0,
  });
});

// --- averaging ----------------------------------------------------------------

test("an average is over the readings that exist, rounded to whole mmHg", () => {
  const avg = averageReading([
    { systolic: 120, diastolic: 80, pulse: 70 },
    { systolic: 131, diastolic: 85, pulse: 75 },
  ]);
  assert.deepEqual(avg, { systolic: 126, diastolic: 83, pulse: 73 });
});

test("pulse averages only over the readings that carry one", () => {
  const avg = averageReading([
    { systolic: 120, diastolic: 80, pulse: 60 },
    { systolic: 120, diastolic: 80, pulse: null },
  ]);
  assert.equal(avg?.pulse, 60, "not 30 — a missing pulse is not a pulse of zero");
});

test("no pulse anywhere is a null pulse, not a zero", () => {
  const avg = averageReading([{ systolic: 120, diastolic: 80, pulse: null }]);
  assert.equal(avg?.pulse, null);
});

test("nothing to average has no average", () => {
  assert.equal(averageReading([]), null);
});

// --- morning and evening ------------------------------------------------------

test("noon splits the day, and noon itself is the evening", () => {
  const { morning, evening } = splitByTimeOfDay([
    { recordedAt: "2026-09-24T07:30:00", id: "a" },
    { recordedAt: "2026-09-24T11:59:00", id: "b" },
    { recordedAt: "2026-09-24T12:00:00", id: "c" },
    { recordedAt: "2026-09-24T21:15:00", id: "d" },
  ]);
  assert.deepEqual(morning.map((r) => r.id), ["a", "b"]);
  assert.deepEqual(evening.map((r) => r.id), ["c", "d"]);
});

test("a day with readings on only one side leaves the other empty", () => {
  const { morning, evening } = splitByTimeOfDay([{ recordedAt: "2026-09-24T08:00:00" }]);
  assert.equal(morning.length, 1);
  assert.deepEqual(evening, [], "and an empty side must average to null, not to zero");
  assert.equal(averageReading(evening.map(() => ({ systolic: 0, diastolic: 0 }))), null);
});
