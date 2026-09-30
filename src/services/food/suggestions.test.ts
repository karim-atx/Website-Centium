import { strict as assert } from "node:assert";
import { test } from "node:test";
import { amountLabel, foodSuggestions, historyIds, lastUsed } from "./suggestions";
import type { FoodLogEntry } from "../../types";

let n = 0;
const entry = (foodId: string | null, meal: FoodLogEntry["meal"], date: string, extra: Partial<FoodLogEntry> = {}) =>
  ({
    id: `e${n++}`,
    foodId,
    customFoodId: null,
    name: foodId ?? "typed",
    calories: 100,
    protein: 0,
    carbs: 0,
    fat: 0,
    quantity: 1,
    unit: "serving",
    meal,
    date,
    display: { category: "breakfast", serving: "1 piece", isLebanese: false },
    ...extra,
  }) as FoodLogEntry;

const today = "2026-09-30";

test("meal-specific: the foods logged most at that meal come first", () => {
  const log = [
    entry("eggs", "breakfast", "2026-09-29"),
    entry("eggs", "breakfast", "2026-09-28"),
    entry("eggs", "breakfast", "2026-09-27"),
    entry("steak", "lunch", "2026-09-29"),
    entry("steak", "lunch", "2026-09-28"),
    entry("steak", "lunch", "2026-09-27"),
    entry("labneh", "breakfast", "2026-09-29"),
  ];
  assert.deepEqual(foodSuggestions(log, "breakfast", today).map((s) => s.id), ["eggs", "labneh"]);
  assert.deepEqual(foodSuggestions(log, "lunch", today).map((s) => s.id), ["steak"]);
  assert.deepEqual(foodSuggestions(log, null, today).map((s) => s.id), ["eggs", "steak", "labneh"]);
});

test("recent use outweighs old use; no duplicates; at most eight", () => {
  const old = ["2026-07-01", "2026-07-02"].map((d) => entry("oats", "breakfast", d));
  const recent = [entry("yogurt", "breakfast", "2026-09-29")];
  assert.equal(foodSuggestions([...old, ...recent], "breakfast", today)[0].id, "yogurt");
  const many = Array.from({ length: 12 }, (_, i) => entry(`f${i}`, "snack", today));
  assert.equal(foodSuggestions([...many, ...many], null, today).length, 8);
});

test("the last-used quantity and its kcal come with each suggestion; hand-typed foods are left out", () => {
  const log = [
    entry("eggs", "breakfast", "2026-09-20", { quantity: 2, calories: 144 }),
    entry("eggs", "breakfast", "2026-09-29", { quantity: 3, calories: 216.4, display: { category: "breakfast", serving: "1 large egg", isLebanese: false } }),
    entry(null, "breakfast", "2026-09-29"),
  ];
  const [eggs, ...rest] = foodSuggestions(log, "breakfast", today);
  assert.equal(rest.length, 0);
  assert.deepEqual([eggs.quantity, eggs.kcal, eggs.amount], [3, 216, "3 × 1 large egg"]);
  assert.equal(amountLabel({ quantity: 170, unit: "g", display: eggs as never }), "170 g");
  assert.deepEqual([...historyIds(log)], ["eggs"]);
});

test("a new user has no suggestions", () => {
  assert.deepEqual(foodSuggestions([], "breakfast", today), []);
});

test("lastUsed finds a food's latest quantity anywhere in the log, same meal first", () => {
  const e = (date: string, meal: string, quantity: number) =>
    ({ id: date + meal, foodId: "oats", date, meal, quantity, unit: "g", name: "Oats", calories: 100, display: { serving: "1 cup" } }) as unknown as FoodLogEntry;
  const log = [e("2026-09-01", "breakfast", 60), e("2026-09-20", "lunch", 90), e("2026-09-10", "breakfast", 70)];
  assert.deepEqual(lastUsed(log, "oats", "breakfast", "2026-09-30"), { quantity: 70, unit: "g" });
  assert.deepEqual(lastUsed(log, "oats", "dinner", "2026-09-30"), { quantity: 90, unit: "g" });
  assert.deepEqual(lastUsed(log, "oats", null, "2026-09-30"), { quantity: 90, unit: "g" });
  assert.equal(lastUsed(log, "rice", null, "2026-09-30"), null);
});
