import { mockFoods } from "../../data/mockFoods";
import type { Food } from "../../types";

export interface ParsedFoodItem {
  food: Food;
  quantityLabel: string;
  quantity: number;
}

export interface ParsedFoodResult {
  transcript: string;
  items: ParsedFoodItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

/**
 * Mock AI food parser.
 *
 * The real architecture this stands in for:
 *   Voice -> speech-to-text -> AI food parser -> food database lookup
 *   -> nutrition calculation -> user confirmation -> FoodLog
 *
 * For the prototype we simulate the "AI parser + food database lookup +
 * nutrition calculation" steps with a canned response so the interaction
 * feels real without a live model or API key.
 */
export function parseFoodInput(_input: string): Promise<ParsedFoodResult> {
  const byName = (name: string) => mockFoods.find((f) => f.name === name)!;

  const items: ParsedFoodItem[] = [
    { food: byName("Chicken Shawarma"), quantityLabel: "1 serving", quantity: 1 },
    { food: byName("Toum"), quantityLabel: "2 tbsp", quantity: 2 },
    { food: byName("French Fries"), quantityLabel: "1 small serving", quantity: 1 },
    { food: byName("Diet Pepsi"), quantityLabel: "1 can", quantity: 1 },
  ];

  const totals = items.reduce(
    (acc, item) => {
      const mult = item.food.name === "Toum" ? item.quantity : 1;
      acc.calories += item.food.calories * mult;
      acc.protein += item.food.protein * mult;
      acc.carbs += item.food.carbs * mult;
      acc.fat += item.food.fat * mult;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Round to a clean "estimated" figure, since this is presented as an
  // AI estimate, not a lab-precise value.
  const rounded = {
    calories: Math.round(totals.calories / 10) * 10,
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };

  const result: ParsedFoodResult = {
    transcript:
      "I had a chicken shawarma with extra toum, some fries and a Diet Pepsi.",
    items,
    totals: rounded,
  };

  // Simulate network/model latency.
  return new Promise((resolve) => setTimeout(() => resolve(result), 1400));
}
