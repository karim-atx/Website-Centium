import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  addNotice,
  ALLERGENS,
  allergyDiff,
  allergyLine,
  assignmentIsCurrent,
  badgeFor,
  feedbackText,
  mealPlanLines,
  planDay,
  showsTargets,
  withProfessionalTargets,
  worstBadge,
  type ConflictRow,
  type ProfessionalTargets,
} from "./clientNutritionModel";
import type { NutritionGoal } from "../../types";

const row = (kind: string, extra: Partial<ConflictRow> = {}): ConflictRow => ({ kind, allergen: null, severity: null, restriction: null, detail: null, ...extra });

test("the 14 regulated allergens, each once", () => {
  assert.equal(ALLERGENS.length, 14);
  assert.equal(new Set(ALLERGENS.map((a) => a.value)).size, 14);
});

test("a confirmed allergy is red, blocks, and carries the client's severity", () => {
  const b = badgeFor(row("allergy_confirmed", { allergen: "peanuts", severity: "severe" }))!;
  assert.equal(b.tone, "red");
  assert.equal(b.blocks, true);
  assert.equal(b.severity, "severe");
  assert.equal(b.text, "Allergy: peanuts");
});

test("a keyword-only match never shows a severity or a block, whatever the row carries", () => {
  // Even a malformed row with a severity on it stays "Check this".
  for (const severity of [null, "mild", "moderate", "severe"]) {
    const b = badgeFor(row("allergy_check", { allergen: "peanuts", severity }))!;
    assert.equal(b.text, "Check this");
    assert.equal(b.tone, "amber");
    assert.equal(b.blocks, false);
    assert.equal(b.severity, null);
    assert.equal(b.allergen, null);
    const n = addNotice("Peanut cookies", [row("allergy_check", { allergen: "peanuts", severity })])!;
    assert.equal(n.blocks, false);
    assert.equal(n.addAnyway, false);
    assert.ok(!/mild|moderate|severe/i.test(n.title + n.body));
  }
});

test("a restriction is amber with Add anyway; a preference is shown only; allergies unknown shows nothing", () => {
  const r = badgeFor(row("restriction", { restriction: "dairy_free" }), () => "Dairy-Free")!;
  assert.deepEqual([r.tone, r.blocks, r.text], ["amber", false, "Not dairy-free"]);
  const n = addNotice("Labneh", [row("restriction", { restriction: "dairy_free" })], () => "Dairy-Free")!;
  assert.deepEqual([n.blocks, n.addAnyway], [false, true]);
  const p = badgeFor(row("preference", { restriction: "vegetarian" }), () => "Vegetarian")!;
  assert.deepEqual([p.tone, p.blocks, p.text], ["soft", false, "Vegetarian"]);
  assert.equal(badgeFor(row("allergies_unknown")), null);
  assert.equal(addNotice("x", [row("allergies_unknown")]), null);
  assert.equal(addNotice("x", []), null);
});

test("the worst badge wins: confirmed, then check this, restriction, preference", () => {
  const rows = [row("preference", { restriction: "vegan" }), row("allergy_check", { allergen: "milk" }), row("restriction", { restriction: "nut_free" }), row("allergy_confirmed", { allergen: "peanuts", severity: "mild" })];
  assert.equal(worstBadge(rows)!.kind, "allergy_confirmed");
  assert.equal(worstBadge(rows.slice(0, 3))!.kind, "allergy_check");
  const n = addNotice("Peanut Butter", rows)!;
  assert.equal(n.blocks, true);
  assert.match(n.body, /\(mild\)/);
});

test("allergy line and diff", () => {
  assert.equal(allergyLine([], ["Dana"]), null);
  assert.equal(allergyLine([{ allergen: "tree_nuts", severity: "severe" }], ["Alex"]), "Allergy: Tree nuts (severe). Shared with Alex.");
  assert.equal(allergyLine([{ allergen: "milk", severity: "mild" }, { allergen: "peanuts", severity: "severe" }], []), "Allergies: Peanuts (severe), Milk (mild).");
  const d = allergyDiff(
    [{ allergen: "milk", severity: "mild" }, { allergen: "eggs", severity: "severe" }],
    [{ allergen: "milk", severity: "severe" }, { allergen: "peanuts", severity: "severe" }]
  );
  assert.deepEqual(d, { insert: [{ allergen: "peanuts", severity: "severe" }], update: [{ allergen: "milk", severity: "severe" }], remove: ["eggs"] });
});

const goal: NutritionGoal = { weightGoal: "maintain", weeklyRateKg: 0, planType: "custom", macroSplit: { proteinPct: 20, carbsPct: 50, fatPct: 30 }, targetCalories: 2000, desiredWeightKg: 70, desiredWeightConfirmed: true };
const targets = (locked: boolean): ProfessionalTargets => ({ goalId: "g", professionalId: "p", professionalName: "Dana", weightGoal: "lose", weeklyRateKg: 0.25, targetCalories: 1800, macroSplit: { proteinPct: 30, carbsPct: 40, fatPct: 30 }, desiredWeightKg: null, locked });

test("professional targets: locked reads as an existing plan, unlocked keeps the client's plan type; the desired weight stays theirs", () => {
  const l = withProfessionalTargets(goal, targets(true));
  assert.equal(l.planType, "existing");
  assert.equal(l.targetCalories, 1800);
  assert.equal(l.desiredWeightKg, 70);
  assert.ok(showsTargets(l, targets(true)));
  assert.ok(!showsTargets(goal, targets(true)));
  const u = withProfessionalTargets(goal, targets(false));
  assert.equal(u.planType, "custom");
  assert.ok(showsTargets(u, targets(false)));
  // A locked goal edited away from the targets no longer shows them (it is re-applied).
  assert.ok(!showsTargets({ ...l, targetCalories: 2100 }, targets(true)));
});

test("meal plan card lines", () => {
  const rows = [
    { dayIndex: 4, dayLabel: "Day 4", slot: "breakfast", position: 0, name: "Oats", calories: 600 },
    { dayIndex: 4, dayLabel: "Day 4", slot: "lunch", position: 0, name: "Almonds", calories: 160 },
    { dayIndex: 4, dayLabel: "Day 4", slot: "lunch", position: 1, name: "Apple", calories: 95 },
    { dayIndex: 5, dayLabel: "Day 5", slot: "dinner", position: 0, name: "Fish", calories: 400 },
  ];
  // Starts Monday Oct 12 2026, today Thursday Oct 15: day 4, week 1.
  assert.deepEqual(planDay("2026-10-12", "2026-10-15", 7), { started: true, dayIndex: 4, week: 1 });
  assert.deepEqual(mealPlanLines({ name: "Balanced week", startsOn: "2026-10-12", endsOn: "2026-10-30", daysCount: 7 }, rows, "2026-10-15"), {
    title: "Balanced week, week 1",
    sub: "Ends Oct 30 · 2 meals on Thursday",
  });
  assert.equal(planDay("2026-10-05", "2026-10-15", 7).week, 2);
  assert.equal(planDay("2026-10-05", "2026-10-15", 7).dayIndex, 4);
  assert.deepEqual(mealPlanLines({ name: "Plan", startsOn: "2026-10-20", endsOn: null, daysCount: 7 }, rows, "2026-10-15"), { title: "Plan", sub: "Starts Oct 20" });
  assert.equal(mealPlanLines({ name: "Plan", startsOn: "2026-10-12", endsOn: null, daysCount: 7 }, rows, "2026-10-16").sub, "1 meal on Friday");
  assert.ok(assignmentIsCurrent({ endedAt: null, endsOn: "2026-10-15" }, "2026-10-15"));
  assert.ok(!assignmentIsCurrent({ endedAt: null, endsOn: "2026-10-14" }, "2026-10-15"));
  assert.ok(!assignmentIsCurrent({ endedAt: "2026-10-10T00:00:00Z", endsOn: null }, "2026-10-15"));
});

test("feedback text: the note, else the reaction's words", () => {
  assert.equal(feedbackText({ body: " Try eggs. ", reaction: "like" }), "Try eggs.");
  assert.equal(feedbackText({ body: null, reaction: "like" }), "Great choice.");
  assert.equal(feedbackText({ body: null, reaction: null }), "");
});
