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
  previousTotal,
  proRatePt,
  proStepFraction,
  RANGE_UNIT,
  rateOverTime,
  ratePct,
  ratePtChange,
  rateText,
  startsLater,
} from "./performanceModel.ts";

test("parsePerformance reads the DB5 row (the six columns) and sorts points by date", () => {
  const s = parsePerformance([
    { range: "7D", metric: "offer_views", total: "452", delta_pct: 6, points: [{ date: "2026-10-16", value: 9 }, { date: "2026-10-15", value: "4" }], previous: null },
  ]);
  assert.ok(s);
  assert.equal(s.range, "7D");
  assert.equal(s.total, 452);
  assert.equal(s.deltaPct, 6);
  assert.deepEqual(s.points.map((p) => p.date), ["2026-10-15", "2026-10-16"]);
  assert.deepEqual(s.points.map((p) => p.value), [4, 9]);
  assert.equal(s.previous, null);
  assert.deepEqual(Object.keys(s).sort(), ["deltaPct", "metric", "points", "previous", "range", "total"]);
});

test("the server's numeric strings (numeric columns) and its zeros-not-gaps 7D row", () => {
  const pts = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${String(18 + i).padStart(2, "0")}`, value: 0 }));
  const s = parsePerformance([{ range: "7D", metric: "redemptions", total: "0", delta_pct: null, points: pts, previous: null }]);
  assert.ok(s);
  assert.equal(s.points.length, 7);
  assert.equal(isEmptySeries(s), true);
  // p_compare: previous comes back as a series.
  const c = parsePerformance([{ range: "7D", metric: "offer_views", total: "3", delta_pct: "50.0", points: pts, previous: pts }]);
  assert.equal(c?.deltaPct, 50);
  assert.equal(c?.previous?.length, 7);
});

test("a rate's change in points from the server's relative delta_pct", () => {
  // 2.4% now, +4.3% relative: before ≈ 2.301%, so about +0.1 pt.
  assert.equal(deltaPt(ratePtChange(2.4, 4.3)), "+0.1 pt");
  // 2.0% now, −20% relative: before 2.5%, −0.5 pt.
  assert.equal(deltaPt(ratePtChange(2, -20)), "−0.5 pt");
  // Null delta = the previous window was empty: nothing to compare.
  assert.equal(ratePtChange(2.4, null), null);
  // −100%: now 0, before unknown.
  assert.equal(ratePtChange(0, -100), null);
  assert.equal(previousTotal(150, 50), 100);
  assert.equal(previousTotal(10, null), 0);
  assert.equal(previousTotal(0, -100), null);
});

test("P-MA.6 hire rate: per bucket, and its change in points", () => {
  const views = parsePerformance([{ range: "7D", metric: "profile_views", total: 200, delta_pct: 100, points: [{ date: "2026-10-23", value: 100 }, { date: "2026-10-24", value: 100 }, { date: "2026-10-22", value: 0 }], previous: null }]);
  const hires = parsePerformance([{ range: "7D", metric: "hire_requests", total: 6, delta_pct: 200, points: [{ date: "2026-10-23", value: 2 }, { date: "2026-10-24", value: 4 }], previous: null }]);
  const r = rateOverTime(hires, views);
  assert.ok(r);
  assert.deepEqual(r.points.map((p) => p.value), [0, 2, 4]);
  assert.equal(r.total, 3);
  // Before: 100 views, 2 requests = 2%; now 3%: +1.0 pt.
  assert.equal(deltaPt(proRatePt(views, hires)), "+1.0 pt");
  // No previous views: nothing to compare.
  assert.equal(proRatePt({ ...views!, deltaPct: null }, hires), null);
  assert.equal(rateOverTime(hires, null), null);
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

