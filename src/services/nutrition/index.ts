import type { FoodLogEntry, MealType, MacroSplit, NutritionGoal, UserProfile, WeightGoalType } from "../../types";

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

// Fallback targets, used only before a TDEE-derived goal exists.
export const dailyTargets = {
  calories: 2100,
  protein: 170,
  carbs: 240,
  fat: 70,
};

const activityMultiplier: Record<UserProfile["activityLevel"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

/**
 * Mifflin-St Jeor BMR -> TDEE. A standard, transparent estimate — clearly
 * prototype-level, not a clinical calculation.
 */
export function calculateTDEE(user: UserProfile): number {
  const { weightKg, heightCm, age, sex, activityLevel } = user;
  let bmr: number;
  if (sex === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (sex === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78; // midpoint estimate
  }
  return Math.round(bmr * activityMultiplier[activityLevel]);
}

const KCAL_PER_KG_BODYFAT = 7700;

export function calculateTargetCalories(
  tdee: number,
  weightGoal: WeightGoalType,
  weeklyRateKg: number
): number {
  const dailyDelta = (weeklyRateKg * KCAL_PER_KG_BODYFAT) / 7;
  if (weightGoal === "lose") return Math.round(tdee - dailyDelta);
  if (weightGoal === "gain") return Math.round(tdee + dailyDelta);
  return Math.round(tdee);
}

export function macroGramsFromSplit(calories: number, split: MacroSplit) {
  return {
    protein: Math.round((calories * (split.proteinPct / 100)) / 4),
    carbs: Math.round((calories * (split.carbsPct / 100)) / 4),
    fat: Math.round((calories * (split.fatPct / 100)) / 9),
  };
}

export function suggestNutritionGoal(
  user: UserProfile,
  weightGoal: WeightGoalType = "maintain",
  weeklyRateKg = 0
): NutritionGoal {
  const tdee = calculateTDEE(user);
  const targetCalories = calculateTargetCalories(tdee, weightGoal, weeklyRateKg);
  // A balanced default split; skew protein up slightly for lose/gain goals.
  const macroSplit: MacroSplit =
    weightGoal === "maintain"
      ? { proteinPct: 30, carbsPct: 45, fatPct: 25 }
      : { proteinPct: 35, carbsPct: 40, fatPct: 25 };
  return { weightGoal, weeklyRateKg, planType: "custom", macroSplit, targetCalories };
}

export function targetsFromGoal(goal: NutritionGoal) {
  const macros = macroGramsFromSplit(goal.targetCalories, goal.macroSplit);
  return { calories: goal.targetCalories, ...macros };
}

export function normalizeMacroSplit(split: MacroSplit): MacroSplit {
  const total = split.proteinPct + split.carbsPct + split.fatPct;
  if (total === 0) return { proteinPct: 33, carbsPct: 34, fatPct: 33 };
  const scale = 100 / total;
  return {
    proteinPct: Math.round(split.proteinPct * scale),
    carbsPct: Math.round(split.carbsPct * scale),
    fatPct: Math.round(100 - Math.round(split.proteinPct * scale) - Math.round(split.carbsPct * scale)),
  };
}
