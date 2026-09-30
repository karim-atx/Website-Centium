import type { MealType } from "../types";

/**
 * The meal that makes sense for the current time of day: the Food diary's
 * floating + opens on it, and FO9's meal choice defaults to it.
 */
export function mealForCurrentTime(now: Date = new Date()): MealType {
  const hour = now.getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  return "dinner";
}
