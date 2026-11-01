import { strict as assert } from "node:assert";
import { test } from "node:test";
import { hasNutritionCheckIns, parseTrend, scaleTracks, submittedTotal } from "./nutritionTrendModel.ts";

// nutrition_check_in_trend's rows, as the migration's probe shapes them.
const ans = (position: number, value: number, prompt = position === 0 ? "How well did you eat?" : "Your energy") => ({ position, prompt, value, scale_min: 1, scale_max: 10 });
const rows = [
  { week_starts_on: "2026-10-26", due: 1, submitted: 0, missed: 0, responses: [] },
  { week_starts_on: "2026-10-12", due: 0, submitted: 1, missed: 0, responses: [{ submitted_at: "2026-10-18T09:00:00Z", answers: [ans(0, 7), ans(5, 4)] }] },
  {
    week_starts_on: "2026-10-19",
    due: 0,
    submitted: 2,
    missed: 1,
    responses: [
      { submitted_at: "2026-10-20T09:00:00Z", answers: [ans(0, 6)] },
      { submitted_at: "2026-10-24T09:00:00Z", answers: [ans(0, 8), ans(5, 5)] },
    ],
  },
];

test("parseTrend: oldest week first, counts and answers as sent, junk dropped", () => {
  const w = parseTrend([...rows, { week_starts_on: "nope" }, null]);
  assert.deepEqual(
    w.map((x) => [x.weekStartsOn, x.due, x.submitted, x.missed, x.responses.length]),
    [
      ["2026-10-12", 0, 1, 0, 1],
      ["2026-10-19", 0, 2, 1, 2],
      ["2026-10-26", 1, 0, 0, 0],
    ]
  );
  assert.deepEqual(parseTrend(null), []);
});

test("hasNutritionCheckIns: weeks of zeroes (no keyed form, or none sent) show nothing", () => {
  assert.equal(hasNutritionCheckIns(parseTrend(rows)), true);
  assert.equal(hasNutritionCheckIns(parseTrend([{ week_starts_on: "2026-10-26", due: 0, submitted: 0, missed: 0, responses: [] }])), false);
  assert.equal(submittedTotal(parseTrend(rows)), 3);
});

test("scaleTracks: one track per question, every answer its own dot, never averaged", () => {
  const tracks = scaleTracks(parseTrend(rows));
  assert.deepEqual(
    tracks.map((t) => [t.position, t.prompt, t.min, t.max]),
    [
      [0, "How well did you eat?", 1, 10],
      [5, "Your energy", 1, 10],
    ]
  );
  // Two check-ins in the week of Oct 19: two layers, 6 and 8, not 7.
  assert.deepEqual(tracks[0].layers, [
    [7, 6, null],
    [null, 8, null],
  ]);
  assert.deepEqual(tracks[1].layers, [[4, 5, null]]);
});
