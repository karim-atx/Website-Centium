import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canGoToPlanWeek,
  dayKcal,
  dayOffsetIn,
  draftColumns,
  draftError,
  draftOf,
  g4Missing,
  g4On,
  itemDetail,
  itemKcal,
  itemKind,
  itemTitle,
  itemsByMeal,
  moveItem,
  nextPosition,
  parseItems,
  parsePlan,
  planWeekOf,
  shiftWeek,
  weekDays,
  amountText,
  groceryView,
  parseGrocery,
  withChecked,
  type PlanItem,
} from "./g4.ts";

// ---- hidden while off ----

test("G4 shows only with the switch known on; a missing function or table reads as no G4", () => {
  assert.equal(g4On(null), false);
  assert.equal(g4On(undefined), false);
  assert.equal(g4On({ premiumOn: false }), false);
  assert.equal(g4On({ premiumOn: true }), true);
  for (const code of ["PGRST202", "42883", "PGRST205", "42P01"]) assert.equal(g4Missing({ code }), true, code);
  assert.equal(g4Missing({ status: 404 }), true);
  for (const code of ["ATXQ1", "ATX08", "23505", undefined]) assert.equal(g4Missing({ code }), false, String(code));
  assert.equal(g4Missing(null), false);
});

// ---- the week ----

test("the planner's week starts on Monday, whatever day it is asked for", () => {
  // 2026-11-02 is a Monday.
  assert.equal(planWeekOf("2026-11-02"), "2026-11-02");
  assert.equal(planWeekOf("2026-11-04"), "2026-11-02");
  assert.equal(planWeekOf("2026-11-08"), "2026-11-02"); // Sunday belongs to the week before it
  assert.equal(planWeekOf("2026-11-09"), "2026-11-09");
  // Across a month and a year.
  assert.equal(planWeekOf("2027-01-01"), "2026-12-28");
  assert.deepEqual(weekDays("2026-12-28"), ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  assert.equal(dayOffsetIn("2026-11-02", "2026-11-02"), 0);
  assert.equal(dayOffsetIn("2026-11-02", "2026-11-08"), 6);
  assert.equal(dayOffsetIn("2026-11-02", "2026-11-09"), null);
  assert.equal(shiftWeek("2026-11-02", 1), "2026-11-09");
  assert.equal(shiftWeek("2026-11-02", -1), "2026-10-26");
  // A year either way.
  assert.equal(canGoToPlanWeek("2026-11-02", "2026-11-04"), true);
  assert.equal(canGoToPlanWeek(shiftWeek("2026-11-02", 52), "2026-11-04"), true);
  assert.equal(canGoToPlanWeek(shiftWeek("2026-11-02", 53), "2026-11-04"), false);
  assert.equal(canGoToPlanWeek(shiftWeek("2026-11-02", -53), "2026-11-04"), false);
});

// ---- items ----

const row = (o: Record<string, unknown>) => ({ id: "i1", plan_id: "p1", day_offset: 0, meal: "breakfast", position: 0, ...o });

test("an item is a recipe, a food, one of my own foods, or a note, by the reference it holds", () => {
  assert.equal(itemKind({ recipe_id: "r" }), "recipe");
  assert.equal(itemKind({ food_id: "f" }), "food");
  assert.equal(itemKind({ custom_food_id: "c" }), "custom_food");
  assert.equal(itemKind({ note: "Lemons" }), "note");
  assert.equal(itemKind({ recipe_id: null, food_id: null, custom_food_id: null }), "note");

  const items = parseItems([
    row({ id: "a", recipe_id: "r1", servings: 2, recipes: { title: "Porridge", servings: 2 } }),
    row({ id: "b", food_id: "f1", quantity: "200", unit: "ml", foods: { name: "Milk", serving_label: "100 ml", calories: 60 } }),
    row({ id: "c", custom_food_id: "c1", quantity: 1, unit: "serving", custom_foods: { name: "My bar", serving_label: "1 bar", calories: 210 } }),
    row({ id: "d", note: "Eat out" }),
    row({ id: "e", recipe_id: "r2", servings: 1, recipes: null }),
    // Not an item: a bad day or meal.
    row({ id: "x", day_offset: 7 }),
    row({ id: "y", meal: "brunch" }),
    null,
  ]);
  assert.deepEqual(items.map((i) => [i.id, i.kind]), [["a", "recipe"], ["b", "food"], ["c", "custom_food"], ["d", "note"], ["e", "recipe"]]);
  assert.deepEqual(items.map(itemTitle), ["Porridge", "Milk", "My bar", "Eat out", "A deleted recipe"]);
  assert.deepEqual(items.map((i) => itemDetail(i, "en-US")), ["2 servings", "200 ml", "1 serving", "Note", "1 serving"]);
  assert.equal(parsePlan({ id: "p1", week_start: "2026-11-02", name: "My meal plan" })?.weekStart, "2026-11-02");
  assert.equal(parsePlan(null), null);
});

const item = (o: Partial<PlanItem>): PlanItem => ({
  id: "x", planId: "p", dayOffset: 0, meal: "breakfast", kind: "note", refId: null, servings: null, quantity: null, unit: null, note: "n",
  position: 0, name: null, servingLabel: null, kcalPerServing: null, ...o,
});

test("a day's items come by meal (breakfast, lunch, dinner, snacks) in position order, and new ones go last", () => {
  const list = [
    item({ id: "s", meal: "snack", position: 0 }),
    item({ id: "b2", meal: "breakfast", position: 2 }),
    item({ id: "b1", meal: "breakfast", position: 1 }),
    item({ id: "d", meal: "dinner", position: 0 }),
    item({ id: "tue", dayOffset: 1, meal: "lunch" }),
  ];
  assert.deepEqual(itemsByMeal(list, 0).map((g) => [g.meal, g.items.map((i) => i.id)]), [["breakfast", ["b1", "b2"]], ["dinner", ["d"]], ["snack", ["s"]]]);
  assert.deepEqual(itemsByMeal(list, 2), []);
  assert.equal(nextPosition(list, 0, "breakfast"), 3);
  assert.equal(nextPosition(list, 0, "lunch"), 0);
});

test("moving an item swaps it with its neighbour in the same meal and renumbers only what changed", () => {
  const list = [item({ id: "a", position: 0 }), item({ id: "b", position: 1 }), item({ id: "c", position: 2 }), item({ id: "other", meal: "lunch", position: 0 })];
  assert.deepEqual(moveItem(list, "b", -1), [{ id: "b", position: 0 }, { id: "a", position: 1 }]);
  assert.deepEqual(moveItem(list, "b", 1), [{ id: "c", position: 1 }, { id: "b", position: 2 }]);
  assert.deepEqual(moveItem(list, "a", -1), []);
  assert.deepEqual(moveItem(list, "c", 1), []);
  assert.deepEqual(moveItem(list, "other", 1), []);
  assert.deepEqual(moveItem(list, "nope", 1), []);
  // Gaps and ties are tidied into 0..n-1.
  const gappy = [item({ id: "a", position: 5 }), item({ id: "b", position: 9 })];
  assert.deepEqual(moveItem(gappy, "b", -1), [{ id: "b", position: 0 }, { id: "a", position: 1 }]);
});

test("a draft writes exactly one thing, inside the Database's checks", () => {
  assert.equal(draftError({ kind: "note", note: "  " }), "Write a note.");
  assert.equal(draftError({ kind: "note", note: "x".repeat(201) }), "Keep the note to 200 characters.");
  assert.equal(draftError({ kind: "recipe", refId: null, servings: "1" }), "Choose a recipe.");
  assert.equal(draftError({ kind: "food", refId: null, quantity: "1", unit: "g" }), "Choose a food.");
  for (const s of ["0", "21", "", "x"]) assert.ok(draftError({ kind: "recipe", refId: "r", servings: s }), s);
  for (const q of ["0", "10001", "-1", ""]) assert.ok(draftError({ kind: "food", refId: "f", quantity: q, unit: "g" }), q);
  assert.equal(draftError({ kind: "recipe", refId: "r", servings: "1,5" }), null);

  const none = { recipe_id: null, food_id: null, custom_food_id: null, servings: null, quantity: null, unit: null, note: null };
  assert.deepEqual(draftColumns({ kind: "note", note: " Lemons " }), { ...none, note: "Lemons" });
  assert.deepEqual(draftColumns({ kind: "recipe", refId: "r", servings: "1.5" }), { ...none, recipe_id: "r", servings: 1.5 });
  assert.deepEqual(draftColumns({ kind: "food", refId: "f", quantity: "200", unit: "ml" }), { ...none, food_id: "f", quantity: 200, unit: "ml" });
  assert.deepEqual(draftColumns({ kind: "custom_food", refId: "c", quantity: "2", unit: "serving" }), { ...none, custom_food_id: "c", quantity: 2, unit: "serving" });
  assert.equal(draftColumns({ kind: "recipe", refId: "r", servings: "0" }), null);

  // Editing round-trips.
  assert.deepEqual(draftOf(item({ kind: "recipe", refId: "r", servings: 2 })), { kind: "recipe", refId: "r", servings: "2" });
  assert.deepEqual(draftOf(item({ kind: "custom_food", refId: "c", quantity: 3, unit: "g" })), { kind: "custom_food", refId: "c", quantity: "3", unit: "g" });
});

test("calories show only where they can be worked out, and never while numbers are hidden (recovery-sensitive mode)", () => {
  const opts = { hideNumbers: false, recipeKcalPerServing: (id: string) => (id === "r" ? 250 : null), multiplier: (_l: string, q: number, u: string) => (u === "serving" ? q : q / 100) };
  const recipe = item({ kind: "recipe", refId: "r", servings: 2 });
  const milk = item({ kind: "food", refId: "f", quantity: 200, unit: "ml", kcalPerServing: 60, servingLabel: "100 ml" });
  const note = item({ kind: "note" });
  assert.equal(itemKcal(recipe, opts), 500);
  assert.equal(itemKcal(milk, opts), 120);
  assert.equal(itemKcal(note, opts), null);
  assert.equal(itemKcal(item({ kind: "recipe", refId: "gone", servings: 1 }), opts), null);
  assert.equal(dayKcal([500, 120, null], false), 620);
  assert.equal(dayKcal([null], false), null);
  const hidden = { ...opts, hideNumbers: true };
  assert.equal(itemKcal(recipe, hidden), null);
  assert.equal(itemKcal(milk, hidden), null);
  assert.equal(dayKcal([500, 120], true), null);
});

// ---- the grocery list ----

test("the grocery list shows what's left to buy first, amounts in words, the recipes each line is for, and notes without an amount", () => {
  const lines = parseGrocery([
    { item_key: "c:milk:ml", name: "Milk", quantity: "600", unit: "ml", from_recipes: ["Porridge"], checked: false },
    { item_key: "n:1", name: "Lemons", quantity: null, unit: null, from_recipes: [], checked: false },
    { item_key: "c:oats:g", name: "Oats", quantity: 80, unit: "g", from_recipes: ["Porridge", "Flapjack"], checked: true },
    { item_key: "f:egg:serving", name: "Eggs", quantity: 1, unit: "serving", from_recipes: [], checked: false },
    { item_key: "f:x:cup", name: "Rice", quantity: 2.5, unit: "cup", from_recipes: null, checked: false },
    { item_key: "", name: "No key" },
    { item_key: "k", name: "" },
  ]);
  assert.equal(lines.length, 5);
  const v = groceryView(lines, "en-US");
  assert.deepEqual(v.toBuy.map((l) => [l.name, l.amount, l.from]), [
    ["Milk", "600 ml", "For Porridge"],
    ["Lemons", null, null],
    ["Eggs", "1 serving", null],
    ["Rice", "2.5 cups", null],
  ]);
  assert.deepEqual(v.done.map((l) => [l.name, l.amount, l.from, l.checked]), [["Oats", "80 g", "For Porridge, Flapjack", true]]);
  // A tick moves a line at once (and back if the save fails).
  const ticked = withChecked(lines, "n:1", true);
  assert.deepEqual(groceryView(ticked).done.map((l) => l.name), ["Lemons", "Oats"]);
  assert.deepEqual(groceryView(withChecked(ticked, "n:1", false)).done.map((l) => l.name), ["Oats"]);
  assert.equal(amountText(1, "cup"), "1 cup");
  assert.equal(amountText(2, "tbsp"), "2 tbsp");
});
