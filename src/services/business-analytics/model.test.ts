import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeAtWeekOf,
  classAnalyticsOf,
  dayOf,
  first90Of,
  growthOf,
  growthSeries,
  growthWeeksFor,
  num,
  outcomesOf,
  pctChange,
  peopleSummaryOf,
  periodStatsOf,
  planFiguresOf,
  scorecardOf,
  signed,
} from "./model.ts";

test("num: numeric columns as numbers or strings; null stays null", () => {
  assert.equal(num("135.00"), 135);
  assert.equal(num(8), 8);
  assert.equal(num(null), null);
  assert.equal(num(""), null);
  assert.equal(num("x"), null);
});

test("business_period_stats: only the metrics returned are keys (absent = no tile)", () => {
  const s = periodStatsOf([
    { metric: "class_bookings", value: 2, previous: 0, early: true },
    { metric: "average_fill_pct", value: "8.0", previous: null, early: true },
  ]);
  assert.deepEqual(s.class_bookings, { value: 2, previous: 0, early: true });
  assert.deepEqual(s.average_fill_pct, { value: 8, previous: null, early: true });
  assert.equal("members_net" in s, false);
});

test("business_member_growth: sorted Monday weeks, the shown window and the one before", () => {
  const rows = ["2026-09-21", "2026-10-12", "2026-09-28", "2026-10-05"].map((w, i) => ({ week_start: w, joined: i, ended: 0, net: i, members_at_end: 10 + i }));
  const g = growthOf(rows);
  assert.deepEqual(g.map((w) => w.weekStart), ["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"]);
  const { cur, prev } = growthSeries(g, 2);
  assert.deepEqual(cur.map((w) => w.weekStart), ["2026-10-05", "2026-10-12"]);
  assert.deepEqual(prev?.map((w) => w.weekStart), ["2026-09-21", "2026-09-28"]);
  assert.equal(growthSeries(g, 3).prev, null);
  // Members at the end of the week holding a day.
  assert.equal(activeAtWeekOf(g, "2026-10-15"), 11);
  assert.equal(activeAtWeekOf(g, "2026-08-01"), null);
});

test("growth weeks: the range's weeks to this week, at least 8, twice for the previous line", () => {
  assert.deepEqual(growthWeeksFor("2026-09-18", "2026-10-15"), { shown: 8, ask: 16 });
  assert.deepEqual(growthWeeksFor("2026-07-24", "2026-10-15"), { shown: 13, ask: 26 });
  assert.deepEqual(growthWeeksFor("2025-11-01", "2026-10-15"), { shown: 26, ask: 52 });
});

test("people summary, first 90 days, plan figures", () => {
  assert.deepEqual(peopleSummaryOf([{ metric: "members", value: 2 }, { metric: "bookings_per_week_4w", value: "0.5" }]), { members: 2, bookings_per_week_4w: 0.5 });
  assert.deepEqual(first90Of({ joined: 3, still_active: 2, average_visits: "0.0", booked_a_class: 2 }), { joined: 3, stillActive: 2, averageVisits: 0, bookedAClass: 2 });
  assert.equal(first90Of(undefined), null);
  const plans = planFiguresOf([
    { plan_id: "b", plan_name: "Day pass", status: "active", active_now: 0, sold: 1, sold_previous: 0 },
    { plan_id: "a", plan_name: "Monthly", status: "active", active_now: 2, sold: 2, sold_previous: 0 },
  ]);
  assert.deepEqual(plans.map((p) => p.name), ["Monthly", "Day pass"]);
});

test("business_day, class_analytics and instructor_scorecard rows", () => {
  const d = dayOf([{ kind: "appointment", ref_id: "a", starts_at: "x", ends_at: null, title: null, booked: 1, capacity: 1, staff_first_name: " Rana ", client_label: "Member #0042", client_is_minor: null, cancelled: false }]);
  assert.deepEqual([d[0].title, d[0].endsAt, d[0].staffFirstName, d[0].clientLabel], ["Appointment", "x", "Rana", "Member #0042"]);
  const c = classAnalyticsOf([{ class_type: null, title: "Spin", sessions: 1, average_fill_pct: "12.5", bookings: 1, cancellations: 1, new_clients: 1, returning_clients: 0, return_rate_pct: null }]);
  assert.deepEqual([c[0].classType, c[0].averageFillPct, c[0].returnRatePct], ["", 12.5, null]);
  const s = scorecardOf([{ professional_id: "p", first_name: "John", classes: 4, average_fill_pct: null, rating: null, reviews: 0, pay: null, recorded_revenue: "0" }]);
  assert.deepEqual([s[0].pay, s[0].recordedRevenue], [null, 0]);
});

test("client outcomes: below 5 every figure is null, whatever arrives", () => {
  const under = outcomesOf({ sharing: 3, enough_to_show: false, average_workouts_per_week: 2, average_daily_steps: 9000, average_resting_bpm: 60, attendance_bookings_per_week: 1 });
  assert.deepEqual(under, { sharing: 3, enough: false, workoutsPerWeek: null, dailySteps: null, restingBpm: null, bookingsPerWeek: null });
  const ok = outcomesOf({ sharing: 6, enough_to_show: true, average_workouts_per_week: "2.5", average_daily_steps: "8123", average_resting_bpm: "61", attendance_bookings_per_week: "1.25" });
  assert.equal(ok?.dailySteps, 8123);
});

test("wording helpers", () => {
  assert.equal(signed(3), "+3");
  assert.equal(signed(-2), "−2");
  assert.equal(signed(0), "0");
  assert.equal(pctChange(642, 606), "+6%");
  assert.equal(pctChange(2, 0), null);
  assert.equal(pctChange(2, null), null);
});
