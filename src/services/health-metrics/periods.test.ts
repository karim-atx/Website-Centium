import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildMetricReadings } from "./series.ts";
import {
  bucketReadings,
  periodReadingCount,
  periodValue,
  readingCountLabel,
  valueOn,
} from "./periods.ts";

const TODAY = "2026-09-24";

const weighIns = buildMetricReadings("weight", {
  "2026-09-24": 82.0,
  "2026-09-23": 82.4,
  "2026-09-22": 82.8,
});

// --- buckets hold real readings or do not exist -------------------------------

test("the weekly chart draws one bar per day that has a reading", () => {
  const bars = bucketReadings(weighIns, "weekly", TODAY);
  assert.equal(bars.length, 3, "three weigh-ins, three bars — not seven");
  assert.deepEqual(bars.map((b) => b.value), [82.8, 82.4, 82.0]);
});

test("a metric with nothing recorded draws no bars at all", () => {
  const empty = buildMetricReadings("steps", {});
  assert.deepEqual(bucketReadings(empty, "weekly", TODAY), []);
  assert.deepEqual(bucketReadings(empty, "monthly", TODAY), []);
  assert.deepEqual(bucketReadings(empty, "yearly", TODAY), []);
});

test("the monthly chart never invents the weeks nobody measured", () => {
  // The bug: `Array.from({length: 4}, (_, i) => weeklyAvg * wobble(i))` always
  // produced four bars, whatever had been recorded.
  const bars = bucketReadings(weighIns, "monthly", TODAY);
  assert.equal(bars.length, 1, "all three fall in the same week of the month");
  assert.equal(bars[0].label, "Week 4");
  assert.equal(bars[0].readings, 3);
});

test("the yearly chart never invents the months nobody measured", () => {
  const bars = bucketReadings(weighIns, "yearly", TODAY);
  assert.equal(bars.length, 1);
  assert.equal(bars[0].label, "Sep");
});

test("bars run oldest to newest across a month and a year boundary", () => {
  const r = buildMetricReadings("weight", {
    "2024-09-24": 99,
    "2025-12-30": 90,
    "2026-01-15": 88,
    "2026-09-24": 82,
  });
  assert.deepEqual(
    bucketReadings(r, "yearly", TODAY).map((b) => b.label),
    ["Dec", "Jan", "Sep"],
    "a 365-day window from 2026-09-24 reaches back to 2025-09-25, so December is in and 2024 is out"
  );
});

test("a bucket averages the readings inside it", () => {
  const r = buildMetricReadings("steps", { "2026-09-01": 6000, "2026-09-02": 8000 });
  const [bar] = bucketReadings(r, "yearly", TODAY);
  assert.equal(bar.value, 7000);
  assert.equal(bar.readings, 2);
});

// --- the headline figure ------------------------------------------------------

test("Day is the latest reading, not an average of one", () => {
  assert.equal(periodValue(weighIns, "daily", TODAY), 82.0);
});

test("Week, Month and Year are real means, not one week nudged by a sine", () => {
  // wobble() made Month = weeklyAvg × (1 + sin(i·1.7)·0.08). Here all three
  // periods contain the same three readings, so all three agree — which is
  // the honest answer, and something the synthesised version could never give.
  assert.equal(periodValue(weighIns, "weekly", TODAY), 82.4);
  assert.equal(periodValue(weighIns, "monthly", TODAY), 82.4);
  assert.equal(periodValue(weighIns, "yearly", TODAY), 82.4);
});

test("a period containing no readings has no figure", () => {
  const old = buildMetricReadings("weight", { "2026-01-02": 90 });
  assert.equal(periodValue(old, "weekly", TODAY), null);
  assert.equal(periodValue(old, "monthly", TODAY), null);
  assert.equal(periodValue(old, "yearly", TODAY), 90, "still inside a year");
});

test("the reading count is what makes a caption honest", () => {
  assert.equal(periodReadingCount(weighIns, "weekly", TODAY), 3);
  assert.equal(periodReadingCount(weighIns, "daily", TODAY), 1);
  assert.equal(readingCountLabel(3), "3 readings");
  assert.equal(readingCountLabel(1), "1 reading");
  assert.equal(readingCountLabel(0), null, "no caption over no readings");
});

// --- picking a date -----------------------------------------------------------

test("a day with a reading returns it", () => {
  assert.equal(valueOn(weighIns, "2026-09-23"), 82.4);
});

test("A DAY WITH NO READING RETURNS NULL, rather than a hash of its own date", () => {
  // `valueForDate` hashed the date string into a multiplier, so every day ever
  // — including days before the account existed — produced a stable, plausible
  // and entirely invented figure.
  assert.equal(valueOn(weighIns, "2026-09-21"), null);
  assert.equal(valueOn(weighIns, "1999-01-01"), null);
});
