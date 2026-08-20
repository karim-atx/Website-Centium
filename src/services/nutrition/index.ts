import type { FoodLogEntry, MealType } from "../../types";

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function sumNutrition(entries: FoodLogEntry[]): NutritionTotals {
  return entries.reduce<NutritionTotals>(
    (acc, e) => {
      acc.calories += e.food.calories * e.quantity;
      acc.protein += e.food.protein * e.quantity;
      acc.carbs += e.food.carbs * e.quantity;
      acc.fat += e.food.fat * e.quantity;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export const mealOrder: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export const mealLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

// Default daily targets used across the prototype dashboard/food page.
export const dailyTargets = {
  calories: 2100,
  protein: 170,
  carbs: 240,
  fat: 70,
};
