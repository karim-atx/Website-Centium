import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chartData,
  chartDate,
  countOf,
  cumulative,
  deltaPt,
  deltaText,
  isEmptySeries,
  isPerfRange,
  longDate,
  offerRateFraction,
  parsePerformance,
  proStepFraction,
  RANGE_UNIT,
  ratePct,
  rateText,
  startsLater,
} from "./performanceModel.ts";

test("parsePerformance reads the DB5 row and sorts points by date", () => {
  const s = parsePerformance([
    { range: "7D", metric: "offer_views", total: "452", delta_pct: 6, points: [{ date: "2026-10-16", value: 9 }, { date: "2026-10-15", value: "4" }], previous: null, hired: 3 },
  ]);
  assert.ok(s);
  assert.equal(s.range, "7D");
  assert.equal(s.total, 452);
  assert.equal(s.deltaPct, 6);
  assert.deepEqual(s.points.map((p) => p.date), ["2026-10-15", "2026-10-16"]);
  assert.deepEqual(s.points.map((p) => p.value), [4, 9]);
  assert.equal(s.previous, null);
  assert.deepEqual(s.counts, { hired: 3 });
});

test("parsePerformance: empty answers and a missing range", () => {
  assert.equal(parsePerformance([]), null);
  assert.equal(parsePerformance(null), null);
  const s = parsePerformance({ total: 0, delta_pct: null, points: [], previous: [] }, "90D");
  assert.ok(s);
  assert.equal(s.range, "90D");
  assert.equal(s.deltaPct, null);
  assert.deepEqual(s.previous, []);
  assert.equal(isEmptySeries(s), true);
  assert.equal(isEmptySeries(null), true);
  assert.equal(isEmptySeries({ ...s, total: 0, points: [{ date: "2026-10-01", value: 2 }] }), false);
});

test("dates are month first (D-02)", () => {
  assert.equal(chartDate("2026-10-16"), "Oct 16");
  assert.equal(chartDate("2026-09-01T00:00:00Z"), "Sep 1");
  assert.equal(longDate("2026-11-01"), "Nov 1, 2026");
});

test("deltas follow the board's pct(): whole percent, U+2212 for a drop", () => {
  assert.equal(deltaText(12), "+12%");
  assert.equal(deltaText(-3.4), "−3%");
  assert.equal(deltaText(0), "+0%");
  assert.equal(deltaText(-0.2), "+0%");
  assert.equal(deltaText(null), null);
  assert.equal(deltaPt(0.1), "+0.1 pt");
  assert.equal(deltaPt(-0.25), "−0.3 pt");
  assert.equal(deltaPt(undefined), null);
});

test("rates, counts and funnel shares", () => {
  assert.equal(rateText(ratePct(46, 1930)), "2.4%");
  assert.equal(rateText(ratePct(1, 0)), "0.0%");
  assert.equal(countOf(1, "voucher", "vouchers"), "1 voucher");
  assert.equal(countOf(1930, "view", "views"), "1,930 views");
  assert.equal(offerRateFraction(2.4), 0.024);
  assert.equal(offerRateFraction(0.1), 0.005);
  // P-MA.6: 15 of 1,260 × 8 = 9.52%; 9 of 1,260 × 8 = 5.71%; at least 1%; at most the track.
  assert.ok(Math.abs(proStepFraction(15, 1260) - 0.0952) < 0.0001);
  assert.equal(proStepFraction(0, 1260), 0.01);
  assert.equal(proStepFraction(500, 1000), 1);
});

test("the points chart is cumulative, the previous period too", () => {
  assert.deepEqual(cumulative([1, 2, 3]), [1, 3, 6]);
  const s = parsePerformance([{ total: 6, points: [{ date: "2026-10-01", value: 1 }, { date: "2026-10-02", value: 5 }], previous: [{ date: "2026-09-01", value: 9 }, { date: "2026-09-02", value: 2 }, { date: "2026-09-03", value: 3 }] }]);
  const d = chartData(s, { cumulative: true });
  assert.deepEqual(d.labels, ["Oct 1", "Oct 2"]);
  assert.deepEqual(d.values, [1, 6]);
  assert.deepEqual(d.prev, [2, 5]);
  assert.deepEqual(chartData(null), { labels: [], values: [], prev: [] });
});

test("ranges and the scheduled-offer state", () => {
  assert.equal(RANGE_UNIT["7D"], "week");
  assert.equal(RANGE_UNIT["12M"], "12 months");
  assert.equal(isPerfRange("90D"), true);
  assert.equal(isPerfRange("1Y"), false);
  assert.equal(startsLater("2026-11-01", "2026-10-22"), true);
  assert.equal(startsLater("2026-10-22", "2026-10-22"), false);
  assert.equal(startsLater(null, "2026-10-22"), false);
});

