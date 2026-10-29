import type { FoodLogEntry } from "../../types";
import { servingMultiplier } from "../nutrition";
import type { LogFoodEntryParams } from "./index";

/**
 * The diary row shown for a food entry kept on this device to save later
 * (Round D outbox). The same snapshot arithmetic logFoodEntry does (macros
 * multiplied once), with no per-nutrient snapshot: catalog nutrients need a
 * read, and the saved row replaces this one as soon as it lands. The id
 * starts "queued:" so the diary can say "Waiting to save".
 */
export function provisionalFoodEntry(params: Omit<LogFoodEntryParams, "userId">, queueId: string): FoodLogEntry {
  const { food, quantity, unit, meal, date, loggedVia } = params;
  const multiplier = servingMultiplier(food.servingLabel, quantity, unit);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    id: `queued:${queueId}`,
    foodId: food.source === "catalog" ? food.id : null,
    customFoodId: food.source === "custom" ? food.id : null,
    name: food.name,
    calories: round(food.calories * multiplier),
    protein: round(food.protein * multiplier),
    carbs: round(food.carbs * multiplier),
    fat: round(food.fat * multiplier),
    quantity,
    unit,
    meal,
    date,
    loggedVia,
    display: { category: food.category, serving: food.servingLabel, isLebanese: food.isLebanese },
  };
}

/** Whether a diary row is one waiting on this device. */
export const isQueuedEntry = (id: string): boolean => id.startsWith("queued:");
