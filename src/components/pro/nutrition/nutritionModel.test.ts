// Release 3 W5: the Meal plans pure parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildQueue,
  clientConflictLine,
  dayDate,
  dayLabels,
  dayRange,
  dayTotalView,
  daysAgo,
  gramsAllowed,
  journalBox,
  macroGrams,
  planDayFor,
  portionMultiplier,
  reachDate,
  splitTotalOk,
  targetFromTdee,
  templateLine,
  weekOfPlan,
  worstConflict,
  type ConflictRow,
} from "./nutritionModel";

const label = { allergen: (a: string) => (a === "tree_nuts" ? "Tree nuts" : a === "peanuts" ? "Peanuts" : a), restriction: (r: string) => (r === "dairy_free" ? "Dairy-Free" : r) };

test("portions: servings win, grams convert through the label's gram weight", () => {
  const facts = { servingLabel: "1 cup (200 g)", per: { kcal: 100, p: 5, c: 10, f: 2 } };
  assert.equal(portionMultiplier(facts, null, 2), 2);
  assert.equal(portionMultiplier(facts, 100, null), 0.5);
  assert.equal(portionMultiplier(facts, null, null), 1);
  assert.equal(gramsAllowed("1 cup (200 g)"), true);
  assert.equal(gramsAllowed("1 piece"), false);
});

test("macro grams: protein and carbs ÷ 4, fat ÷ 9 (HANDOVER i)", () => {
  assert.deepEqual(macroGrams(1800, { proteinPct: 30, carbsPct: 40, fatPct: 30 }), { p: 135, c: 180, f: 60 });
});

test("day total: ring against the plan target, a macro over above 103%", () => {
  const v = dayTotalView({ kcal: 1860, p: 92, c: 230, f: 58 }, { kcalTarget: 1900, proteinPct: 20, carbsPct: 50, fatPct: 25 });
  assert.equal(v.left, 40);
  assert.equal(Math.round((v.fraction ?? 0) * 100), 98);
  assert.deepEqual(
    v.macros.map((m) => [m.label, m.target, m.over]),
    [
      ["Protein", 95, false],
      ["Carbs", 238, false],
      ["Fat", 53, true],
    ]
  );
  const none = dayTotalView({ kcal: 500, p: 1, c: 1, f: 1 }, { kcalTarget: null, proteinPct: null, carbsPct: null, fatPct: null });
  assert.equal(none.target, null);
  assert.equal(none.fraction, null);
  assert.equal(none.macros[0].target, null);
});

test("template line: range of filled day totals, else the plan target", () => {
  assert.equal(templateLine(7, [1700, 2100, 0], null), "7 days · 1,700 to 2,100 kcal");
  assert.equal(templateLine(7, [2300, 2300], null), "7 days · 2,300 kcal");
  assert.equal(templateLine(7, [], 1800), "7 days · 1,800 kcal");
  assert.equal(templateLine(1, [], null), "1 day");
});

test("plan days: weekdays for a client's copy from its start, Day n for a template", () => {
  assert.deepEqual(dayLabels(4, "2026-10-05"), { tab: "Thu", total: "Thursday total", short: "Thu" });
  assert.deepEqual(dayLabels(3, null), { tab: "Day 3", total: "Day 3 total", short: "Day 3" });
  assert.equal(planDayFor("2026-10-05", 7, "2026-10-15"), 4);
  assert.equal(planDayFor("2026-10-05", 7, "2026-10-01"), null);
  assert.equal(weekOfPlan("2026-10-05", "2026-10-15"), 2);
  assert.equal(weekOfPlan("2026-10-20", "2026-10-15"), null);
});

test("dates: day_date, ranges and how long ago", () => {
  assert.equal(dayDate("2026-10-05"), "Mon, Oct 5");
  assert.equal(dayRange("2026-10-05", "2026-10-07"), "Oct 5 to 7");
  assert.equal(dayRange("2026-09-30", "2026-10-02"), "Sep 30 to Oct 2");
  assert.equal(dayRange("2026-10-07", "2026-10-07"), "Oct 7");
  assert.equal(daysAgo("2026-10-14", "2026-10-15"), "Yesterday");
  assert.equal(daysAgo("2026-10-12", "2026-10-15"), "3 days ago");
  assert.equal(daysAgo("2026-10-15", "2026-10-15"), "Today");
});

test("conflicts: only a confirmed allergy blocks; a keyword match is Check this; unknown allergies are said", () => {
  const confirmed: ConflictRow = { kind: "allergy_confirmed", allergen: "tree_nuts", severity: "severe", restriction: null, detail: null };
  const check: ConflictRow = { kind: "allergy_check", allergen: "peanuts", severity: null, restriction: null, detail: null };
  const restr: ConflictRow = { kind: "restriction", allergen: null, severity: null, restriction: "dairy_free", detail: null };
  const unknown: ConflictRow = { kind: "allergies_unknown", allergen: null, severity: null, restriction: null, detail: null };
  assert.equal(worstConflict([restr, confirmed])?.kind, "allergy_confirmed");
  assert.equal(worstConflict([check, restr])?.kind, "restriction");

  const blocked = clientConflictLine(
    [
      { name: "Almonds", rows: [confirmed] },
      { name: "Greek yoghurt", rows: [restr] },
    ],
    label
  );
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.tone, "att");
  assert.equal(blocked.text, "2 conflicts: Almonds (tree nuts allergy, blocked), Greek yoghurt (Dairy-Free).");

  const amber = clientConflictLine([{ name: "Satay", rows: [check] }], label);
  assert.equal(amber.blocked, false);
  assert.equal(amber.tone, "req");
  assert.ok(!amber.text.includes("severe"));

  assert.equal(clientConflictLine([{ name: "Apple", rows: [] }], label).text, "No conflicts");
  const off = clientConflictLine([{ name: "Apple", rows: [unknown] }], label);
  assert.equal(off.tone, "unknown");
  assert.equal(off.blocked, false);
  assert.equal(off.text, "Allergies aren't shared, so they can't be checked.");
});

test("journal queue: a day with your feedback is reviewed; protein under target counted per day", () => {
  const entries = [
    { id: "a", clientId: "c1", date: "2026-10-13", kcal: 500, protein: 20 },
    { id: "b", clientId: "c1", date: "2026-10-14", kcal: 600, protein: 120 },
    { id: "c", clientId: "c1", date: "2026-10-15", kcal: 400, protein: 30 },
    { id: "d", clientId: "c2", date: "2026-10-12", kcal: 400, protein: 30 },
  ];
  const q = buildQueue(entries, new Set(["b"]), (id) => (id === "c1" ? 100 : null));
  assert.deepEqual(q.waiting.map((r) => [r.clientId, r.days, r.proteinUnder]), [
    ["c1", ["2026-10-13", "2026-10-15"], 2],
    ["c2", ["2026-10-12"], null],
  ]);
  assert.deepEqual(q.reviewed.map((r) => [r.clientId, r.days]), [["c1", ["2026-10-14"]]]);
});

test("journal box: fill toward the target with what is left or over", () => {
  assert.deepEqual(journalBox(2010, 1900), { pct: 100, over: true, left: "110 over" });
  assert.deepEqual(journalBox(71, 95), { pct: (71 / 95) * 100, over: false, left: "24 to go" });
  assert.deepEqual(journalBox(71, null), { pct: 0, over: false, left: null });
});

test("targets: TDEE ∓ rate × 7700 ÷ 7, reach date, split totals", () => {
  assert.equal(targetFromTdee(2453, "lose", 0.5), 1903);
  assert.equal(targetFromTdee(2453, "maintain", 0.5), 2453);
  assert.equal(reachDate("2026-10-15", 82.4, 80, 0.5), "2026-11-18");
  assert.equal(reachDate("2026-10-15", 82.4, 80, 0), null);
  assert.equal(reachDate("2026-10-15", null, 80, 0.5), null);
  assert.equal(splitTotalOk(30, 40, 30), true);
  assert.equal(splitTotalOk(30, 40, 20), false);
});
