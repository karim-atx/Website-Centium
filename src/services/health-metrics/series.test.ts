import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  averageOf,
  buildMetricReadings,
  canDrawSparkline,
  emptyHint,
  formatMetric,
  trendLabel,
  withinDays,
} from "./series.ts";

// --- nothing logged is not a reading of zero ---------------------------------

test("a metric nobody has recorded has no current value and no trend", () => {
  const r = buildMetricReadings("weight", undefined);
  assert.deepEqual(r.history, []);
  assert.equal(r.current, null, "never 0 — a zero weight is a reading");
  assert.equal(r.trend, null);
});

test("an empty series is the same as no series at all", () => {
  assert.equal(buildMetricReadings("steps", {}).current, null);
});

// --- one reading is a value but not a trend ----------------------------------

test("one reading gives a number to show and nothing to draw", () => {
  const r = buildMetricReadings("weight", { "2026-09-24": 82.4 });
  assert.equal(r.current, 82.4);
  assert.equal(r.trend, null, "a single point cannot be compared with itself");
  assert.equal(canDrawSparkline(r), false);
});

test("two readings are the fewest a line may be drawn through", () => {
  const r = buildMetricReadings("weight", { "2026-09-23": 83, "2026-09-24": 82.4 });
  assert.equal(canDrawSparkline(r), true);
  assert.equal(r.trend, -0.6);
});

// --- the a8499e4 rule --------------------------------------------------------

test("NO ARROW OVER NOTHING: an absent trend produces no label", () => {
  // The bug this guards: `?? 0` on a trend, where 0 is not > 0, so the arrow
  // always pointed down — "↓ 0 kg" for somebody who had never weighed in.
  assert.equal(trendLabel(buildMetricReadings("weight", undefined)), null);
  assert.equal(trendLabel(buildMetricReadings("weight", { "2026-09-24": 82 })), null);
});

test("an unchanged reading says so, rather than pointing an arrow at zero", () => {
  const r = buildMetricReadings("weight", { "2026-09-18": 82, "2026-09-24": 82 });
  assert.equal(r.trend, 0);
  assert.equal(trendLabel(r), "No change this week");
});

test("a real trend names its direction, size and unit", () => {
  assert.equal(
    trendLabel(buildMetricReadings("weight", { "2026-09-18": 83, "2026-09-24": 82.4 })),
    "↓ 0.6 kg this week"
  );
  assert.equal(
    trendLabel(buildMetricReadings("steps", { "2026-09-18": 6000, "2026-09-24": 9100 })),
    "↑ 3100 steps this week"
  );
});

// --- only real days ----------------------------------------------------------

test("a week is NOT padded to seven points", () => {
  // Two weigh-ins six days apart are two points, not seven with five invented.
  const r = buildMetricReadings("weight", { "2026-09-18": 83, "2026-09-24": 82.4 });
  assert.equal(r.history.length, 2);
});

test("history comes back oldest first whatever order the map was built in", () => {
  const r = buildMetricReadings("steps", {
    "2026-09-24": 9100,
    "2026-09-22": 7200,
    "2026-09-23": 6400,
  });
  assert.deepEqual(
    r.history.map((p) => p.date),
    ["2026-09-22", "2026-09-23", "2026-09-24"]
  );
  assert.equal(r.current, 9100, "current is the newest, not the last inserted");
});

// --- averages ----------------------------------------------------------------

test("an average divides by days MEASURED, not by the length of the window", () => {
  // Three weigh-ins over a week is the mean of three, not of seven — dividing
  // by seven reports a number nobody weighed.
  const r = buildMetricReadings("weight", {
    "2026-09-22": 83,
    "2026-09-23": 82.6,
    "2026-09-24": 82.4,
  });
  assert.equal(averageOf(r), 82.7);
});

test("steps average as whole numbers and never counts an unmeasured day as zero", () => {
  const r = buildMetricReadings("steps", { "2026-09-23": 6000, "2026-09-24": 9100 });
  assert.equal(averageOf(r), 7550);
});

test("nothing logged has no average, not an average of zero", () => {
  assert.equal(averageOf(buildMetricReadings("steps", {})), null);
});

// --- windows -----------------------------------------------------------------

test("a window keeps only the readings inside it and recomputes the trend", () => {
  const r = buildMetricReadings("weight", {
    "2026-09-01": 90,
    "2026-09-22": 83,
    "2026-09-24": 82.4,
  });
  const week = withinDays(r, 7, "2026-09-24");
  assert.equal(week.history.length, 2, "the 1st is outside a 7-day window");
  assert.equal(week.trend, -0.6, "not -7.6, which would compare across the cutoff");
});

test("a window that catches one reading has a value but no trend", () => {
  const r = buildMetricReadings("weight", { "2026-09-01": 90, "2026-09-24": 82.4 });
  const week = withinDays(r, 7, "2026-09-24");
  assert.equal(week.current, 82.4);
  assert.equal(week.trend, null);
});

test("a window that catches nothing reports nothing", () => {
  const r = buildMetricReadings("weight", { "2026-09-01": 90 });
  const week = withinDays(r, 7, "2026-09-24");
  assert.equal(week.current, null);
  assert.equal(week.history.length, 0);
});

test("the window boundary is inclusive and crosses a month end", () => {
  const r = buildMetricReadings("steps", { "2026-08-29": 5000, "2026-09-04": 8000 });
  assert.equal(withinDays(r, 7, "2026-09-04").history.length, 2, "7 days back from the 4th is the 29th");
  assert.equal(withinDays(r, 6, "2026-09-04").history.length, 1);
});

// --- how a value is written --------------------------------------------------

test("each metric is written the way that metric is written", () => {
  assert.equal(formatMetric("weight", 82.43), "82.4");
  assert.equal(formatMetric("steps", 9100), "9,100");
  assert.equal(formatMetric("heartRate", 68.4), "68");
  assert.equal(formatMetric("caloriesBurned", 2340), "2,340");
});

test("sleep reads as hours and minutes, never as a decimal", () => {
  assert.equal(formatMetric("sleep", 7.7), "7h42");
  assert.equal(formatMetric("sleep", 8), "8h00");
});

// --- what an empty card offers -----------------------------------------------

test("a metric with manual entry tells the user how to fill it", () => {
  assert.equal(emptyHint("weight"), "Log your weight to start tracking");
  assert.equal(emptyHint("water"), "Log what you drink to start tracking");
});

test("a metric with NO entry path offers nothing, because there is nothing to do", () => {
  // Steps, sleep, heart rate and calories burned have no manual entry and no
  // device sync behind them. "Connect a device" would be the next lie.
  assert.equal(emptyHint("steps"), null);
  assert.equal(emptyHint("sleep"), null);
  assert.equal(emptyHint("heartRate"), null);
  assert.equal(emptyHint("caloriesBurned"), null);
});

// --- a duration is rounded once, at the end ----------------------------------

test("a sleep average converts to h/m from the TRUE mean, not a rounded one", () => {
  // 7.25 h is 7h15. Rounding to one decimal first gives 7.3, which formats as
  // 7h18 — three minutes of sleep nobody had.
  const r = buildMetricReadings("sleep", {
    "2026-09-22": 7.25,
    "2026-09-23": 6.5,
    "2026-09-24": 8.0,
  });
  assert.equal(averageOf(r), 7.25);
  assert.equal(formatMetric("sleep", averageOf(r) as number), "7h15");
});

test("the other metrics still round to their own precision", () => {
  const w = buildMetricReadings("weight", { "2026-09-23": 82.34, "2026-09-24": 82.37 });
  assert.equal(averageOf(w), 82.4);
});
