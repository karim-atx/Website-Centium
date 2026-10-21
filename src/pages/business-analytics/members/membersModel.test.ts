import { test } from "node:test";
import assert from "node:assert/strict";
import { canHide, firstJoin, growthChart, joinsByWeek, NO_FIGURES, pageView, pagesOf, planBars, vocabOf, type MembersFigures, type SeriesKey } from "./membersModel.ts";

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
  // Hiding is the series group (it fades, AN4-021 row 3); the bar's own opacity is the scrub dimming.
  assert.equal(p.jG, 0);
  assert.equal(p.eG, 1);
  assert.equal(p.bars[3].jo, 0.9);
  assert.equal(p.bars[2].eo, 0.35);
  // AN4-017 O2: the slider's valuetext.
  assert.equal(p.valueText, "Week of Sep 7: Active 13, Joined 1, Ended 0, Net change +1");
  assert.equal(g.valueText, "Week of Oct 5: Active 17, Joined 1, Ended 0, Net change +1");
  assert.deepEqual(p.tip?.rows.map((r) => r.l), ["Active", "Ended", "Net change"]);
});

test("members early (AN4-024 / AN4-044, B8_B16_REVIEW #19): server flag, New, early leads only when true", () => {
  const zero = (d: string) => week(d, 0, 0, 0);
  const cur = [zero("2026-08-17"), zero("2026-08-24"), zero("2026-08-31"), zero("2026-09-07"), week("2026-09-14", 2, 0, 2), week("2026-09-21", 3, 0, 5), week("2026-09-28", 2, 0, 7), week("2026-10-05", 2, 0, 9)];
  const prev = cur.map((w) => zero(w.weekStart));
  const stats = { members_joined: { value: 9, previous: 0, early: true }, members_ended: { value: 0, previous: 0, early: true }, members_net: { value: 9, previous: 0, early: true } };
  const f: MembersFigures = { ...NO_FIGURES, growth: { cur, prev }, stats, first90: { joined: 9, stillActive: 9, averageVisits: 0, bookedAClass: 6 }, plans: [{ planId: "m", name: "Monthly", status: "active", activeNow: 6, sold: 6, soldPrevious: 0 }] };
  assert.deepEqual(firstJoin(f.growth), { n: 9, weeks: 4, index: 4 });
  const gym = vocabOf("gym");
  const g = pageView(page("gym", "growth"), gym, f, ctx);
  assert.deepEqual(g.boxes[0], { label: "Active members", value: "9", delta: { t: "New", tone: "good" } });
  assert.equal(g.boxes[1].value, null);
  assert.equal(g.lead, "Your first 9 members joined in the last 4 weeks. Trends compare periods once you have 8 weeks of history.");
  assert.equal(pageView(page("gym", "first90"), gym, f, ctx).lead, "Too early for 30, 60 and 90-day checks. 6 of your 9 new members have already booked a class.");
  const pl = pageView(page("gym", "plans"), gym, f, ctx);
  assert.equal(pl.lead, "6 of your 9 members are on Monthly.");
  assert.equal(pl.boxes[1].label, "On Monthly");
  // Early by the server's rule but the first member is older: plain lead, no delta, no "New".
  const old: MembersFigures = { ...f, growth: { cur: cur.map((w) => ({ ...w, active: w.active + 20 })), prev: prev.map((w) => ({ ...w, active: 20 })) } };
  const o = pageView(page("gym", "growth"), gym, old, ctx);
  assert.equal(o.boxes[0].delta, undefined);
  assert.ok(o.lead.startsWith("29 active members"));
  // Classes at risk while early with no one flagged.
  const cls = vocabOf("classes");
  const ar = pageView(page("classes", "atrisk"), cls, { ...NO_FIGURES, summary: { class_clients_at_risk_21d: 0 }, stats: { class_bookings: { value: 3, previous: null, early: true } } }, ctx);
  assert.deepEqual([ar.boxes[0].value, ar.lead], ["0", "We flag clients once they have 4 weeks of bookings to compare against."]);
  // The early chart: no previous line, y from 0, "No members yet" before the first member.
  const ch = growthChart(cur, cur.map((w) => ({ ...w })), new Set(), 1, true, true);
  assert.equal(ch.ghost, "");
  assert.deepEqual(ch.ticks.map((t) => t.t), ["0", "5", "9"]);
  assert.equal(ch.tip?.none, true);
  assert.equal(ch.valueText, "Week of Aug 24: No members yet");
  assert.equal(growthChart(cur, null, new Set(), 6, true, true).tip?.none, false);
});

test("members: legend keeps one series on, joins by week, classes Plans row hidden", () => {
  const h = (...k: SeriesKey[]) => new Set<SeriesKey>(k);
  assert.equal(canHide(h(), "active"), true);
  assert.equal(canHide(h("joined", "ended"), "active"), false);
  assert.equal(canHide(h("joined", "ended"), "prev"), true);
  assert.equal(canHide(h("active", "joined", "ended"), "ended"), true);
  const cur = [week("2026-09-07", 9, 9, 1), week("2026-09-14", 2, 1, 2), week("2026-09-21", 0, 0, 2), week("2026-09-28", 3, 0, 5), week("2026-10-05", 1, 2, 4)];
  const cols = joinsByWeek(cur, "2026-09-15", "2026-10-12");
  assert.deepEqual(cols.map((c) => [c.t, c.j, c.e, c.jh, c.eh]), [
    ["Sep 14", "+2", "−1", 20, 10],
    ["Sep 21", "", "", 0, 0],
    ["Sep 28", "+3", "", 30, 0],
    ["Oct 5", "+1", "−2", 10, 20],
  ]);
  assert.deepEqual(pagesOf("classes", { hidePlans: true }).map((p) => p.key), ["growth", "first90", "engagement", "atrisk"]);
  assert.equal(pagesOf("classes").length, 5);
});
