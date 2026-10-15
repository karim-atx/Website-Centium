import { test } from "node:test";
import assert from "node:assert/strict";
import { growthChart, NO_FIGURES, pageView, pagesOf, planBars, vocabOf, type MembersFigures } from "./membersModel.ts";

const ctx = { planCount: 2, rangeKey: "4w", rangeWords: "the last 4 weeks", compare: true };
const week = (weekStart: string, joined: number, ended: number, active: number) => ({ weekStart, joined, ended, net: joined - ended, active });
const page = (kind: "gym" | "classes", key: string) => pagesOf(kind).find((p) => p.key === key)!;

test("members: before the readers answer, every value is '–' with the page's plain line", () => {
  const v = pageView(page("gym", "growth"), vocabOf("gym"), NO_FIGURES, ctx);
  assert.deepEqual(v.boxes.map((b) => b.value), [null, null]);
  assert.equal(v.lead, "How many members joined and left in this range.");
  // Plans keeps the live plan count.
  assert.equal(pageView(page("gym", "plans"), vocabOf("gym"), NO_FIGURES, ctx).boxes[0].value, "2");
});

test("members: Growth from business_member_growth + business_period_stats (AN4-005 16a)", () => {
  const f: MembersFigures = {
    ...NO_FIGURES,
    growth: { cur: [week("2026-10-05", 3, 1, 2), week("2026-10-12", 0, 0, 2)], prev: null },
    stats: { members_joined: { value: 3, previous: 0, early: false }, members_ended: { value: 1, previous: 0, early: false }, members_net: { value: 2, previous: 0, early: false } },
  };
  const v = pageView(page("gym", "growth"), vocabOf("gym"), f, ctx);
  assert.equal(v.boxes[0].value, "2");
  assert.deepEqual(v.boxes[0].delta, { t: "+2 vs prev", tone: "good" });
  assert.equal(v.boxes[1].value, null);
  assert.equal(v.lead, "2 active members: 3 joined and 1 left in the last 4 weeks, so you grew by 2.");
  // Early metric: no delta.
  const early = pageView(page("gym", "growth"), vocabOf("gym"), { ...f, stats: { ...f.stats, members_net: { value: 2, previous: 0, early: true } } }, ctx);
  assert.equal(early.boxes[0].delta, undefined);
  // The classes lane counts clients, which no growth reader covers.
  assert.equal(pageView(page("classes", "growth"), vocabOf("classes"), f, ctx).boxes[0].value, null);
});

test("members: summary pages, first 90 days and plans", () => {
  const f: MembersFigures = {
    ...NO_FIGURES,
    summary: { visits_per_week_4w: 0, members: 2, members_not_seen_14d: 2, bookings_per_week_4w: 0.5, class_clients_at_risk_21d: 1 },
    first90: { joined: 3, stillActive: 2, averageVisits: 0, bookedAClass: 2 },
    plans: [
      { planId: "a", name: "Monthly", status: "active", activeNow: 2, sold: 2, soldPrevious: 0 },
      { planId: "b", name: "Day pass", status: "active", activeNow: 0, sold: 1, soldPrevious: 0 },
    ],
  };
  const gym = vocabOf("gym");
  assert.equal(pageView(page("gym", "visits"), gym, f, ctx).boxes[0].value, "0.0");
  assert.equal(pageView(page("gym", "notseen"), gym, f, ctx).lead, "2 of your 2 members with a current membership have not checked in for 14 days.");
  const f90 = pageView(page("gym", "first90"), gym, f, ctx);
  assert.deepEqual(f90.boxes.map((b) => b.value), ["3", "2 of 3"]);
  assert.equal(f90.lead, "2 of the 3 members who joined in the last 90 days are still with you.");
  const plans = pageView(page("gym", "plans"), gym, f, ctx);
  assert.deepEqual(plans.boxes.map((b) => [b.label, b.value]), [["Membership plans", "2"], ["On Monthly, the most popular", "2"]]);
  assert.equal(plans.lead, "Monthly holds 100% of members on a plan.");
  assert.deepEqual(planBars(f.plans!).map((b) => [b.t, b.n, b.w]), [["Monthly", 2, "100%"]]);
  const cls = vocabOf("classes");
  assert.equal(pageView(page("classes", "engagement"), cls, f, ctx).boxes[0].value, "0.5");
  assert.equal(pageView(page("classes", "atrisk"), cls, f, ctx).lead, "1 client has booked in the last 4 months but not in the last 21 days.");
});

test("growth chart: n weeks, step 286 / n, previous line only with history", () => {
  const cur = ["2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"].map((d, i) => week(d, 1, 0, 10 + i));
  const g = growthChart(cur, null, new Set(), null, true);
  assert.equal(g.step, 35.75);
  assert.equal(g.dots.length, 8);
  assert.equal(g.dots[7].r, 3.6);
  assert.equal(g.ghost, "");
  assert.deepEqual(g.legend.map((l) => l.t), ["Active", "Joined", "Ended"]);
  assert.equal(g.xl[2].t, "This wk");
  const prev = cur.map((w) => ({ ...w, active: w.active - 5 }));
  const p = growthChart(cur, prev, new Set(["joined"]), 3, true);
  assert.ok(p.ghost.startsWith("M"));
  assert.equal(p.bars[3].jo, 0);
  assert.equal(p.bars[2].eo, 0.35);
  assert.deepEqual(p.tip?.rows.map((r) => r.l), ["Active", "Ended", "Net change"]);
});
