import type {
  Food,
  FoodLogEntry,
  MealType,
  MacroSplit,
  NutritionGoal,
  ServingUnit,
  UserProfile,
  WeightGoalType,
} from "../../types";

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// V6 (QA 6.0): calories/macros previously ignored the selected serving unit
// entirely — "3 tbsp" computed the same total as "3 servings". These are
// standard, food-independent kitchen-measurement ratios (not specific to
// any one food) anchoring 1 serving/cup to ~240g or ~240ml.
export const unitScale: Record<ServingUnit, number> = {
  serving: 1,
  cup: 1,
  g: 1 / 240,
  ml: 1 / 240,
  tbsp: 1 / 16,
  tsp: 1 / 48,
};

export function entryMultiplier(entry: { quantity: number; unit?: ServingUnit }): number {
  return entry.quantity * unitScale[entry.unit ?? "serving"];
}

// Volume units in millilitres. Only used as a last resort below, because
// converting a volume to a weight needs a density this app does not have.
const unitMl: Partial<Record<ServingUnit, number>> = { cup: 240, tbsp: 15, tsp: 5 };

/**
 * Pulls the gram weight out of a serving label — "1 medium (118 g)" -> 118,
 * "100 g" -> 100. Returns null when there isn't one, which is the case for
 * every label of the form "1 piece" / "1 bowl" / "1 wrap".
 */
export function gramsInServingLabel(label: string): number | null {
  const match = label.match(/([0-9]+(?:\.[0-9]+)?)\s*g\b/i);
  return match ? Number(match[1]) : null;
}

/**
 * Pulls the leading count and unit word out of a serving label —
 * "1 tbsp (13.5 g)" -> { count: 1, unit: "tbsp" }, "0.5 cup (126 g)" ->
 * { count: 0.5, unit: "cup" }. Returns null when the label leads with
 * something that isn't a unit this app offers ("1 medium", "1 piece").
 *
 * Vulgar fractions are parsed too. The catalog writes decimals almost
 * everywhere, but Hummus is labelled "1/2 cup", and without this it fell
 * through to the unitScale fallback and logged one cup as one serving
 * instead of two.
 */
function servingLabelUnit(label: string): { count: number; unit: ServingUnit } | null {
  const match = label
    .trim()
    .match(/^([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*([0-9]+))?\s*(g|ml|cups?|tbsp|tsp)\b/i);
  if (!match) return null;
  const denominator = match[2] ? Number(match[2]) : 1;
  if (!(denominator > 0)) return null;
  const word = match[3].toLowerCase();
  const unit = (word === "cups" ? "cup" : word) as ServingUnit;
  return { count: Number(match[1]) / denominator, unit };
}

/**
 * How many SERVINGS of a food a given quantity/unit represents — the number
 * its per-serving macros get multiplied by to produce an entry's totals.
 *
 * `unitScale` alone cannot do this. It assumes one global "1 serving ≈ 240 g"
 * for every food, which was tolerable when servings were vague ("1 bowl") but
 * is measurably wrong against the real catalog: 100 g of chicken breast,
 * whose serving IS 100 g, came out as 100/240 = 0.42 servings and logged 69
 * kcal instead of 165.
 *
 * Resolved in order, most reliable first:
 *
 *   1. Serving units are the identity — 2 servings is 2 servings.
 *   2. The label's own unit matches the chosen one, so compare like with
 *      like: olive oil at "1 tbsp (13.5 g)" logged as 1 tbsp is exactly one
 *      serving. This has to precede the gram rule, because going via grams
 *      would use a generic 15 g/tbsp and land 11% off.
 *   3. Weight against a known serving weight — the case that motivated this.
 *      ml is treated as g, which assumes density 1; true for water and close
 *      enough for milk and juice, the liquids anyone logs by volume.
 *   4. A volume against a known serving weight, via a generic ml-per-unit.
 *      Deliberately last: 1 cup of cooked rice weighs 186 g, not 240, so this
 *      overestimates dense-in-cup foods. Better than rule 5, worse than
 *      knowing the food.
 *   5. No gram weight in the label at all — the 24 Lebanese dishes, where
 *      "1 piece" simply has no weight. Falls back to the previous behaviour
 *      rather than inventing one.
 */
export function servingMultiplier(
  servingLabel: string,
  quantity: number,
  unit: ServingUnit = "serving"
): number {
  if (unit === "serving") return quantity;

  const own = servingLabelUnit(servingLabel);
  if (own && own.unit === unit && own.count > 0) return quantity / own.count;

  const grams = gramsInServingLabel(servingLabel);
  if (grams && grams > 0) {
    if (unit === "g" || unit === "ml") return quantity / grams;
    const ml = unitMl[unit];
    if (ml) return (quantity * ml) / grams;
  }

  return entryMultiplier({ quantity, unit });
}

/**
 * Resolves a catalog Food into the snapshot half of a diary entry.
 *
 * The bridge between a per-serving food and a totals-carrying entry, used by
 * every local logging path (search, AI, custom meals, copy-yesterday) so the
 * multiplication is written once. The service's logFoodEntry does the same
 * arithmetic on its way to Supabase.
 */
export function snapshotFromFood(
  food: Food,
  quantity: number,
  unit: ServingUnit
): Pick<FoodLogEntry, "name" | "calories" | "protein" | "carbs" | "fat" | "display"> {
  const m = servingMultiplier(food.serving, quantity, unit);
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    name: food.name,
    calories: r(food.calories * m),
    protein: r(food.protein * m),
    carbs: r(food.carbs * m),
    fat: r(food.fat * m),
    display: { category: food.category, serving: food.serving, isLebanese: !!food.isLebanese },
  };
}

/**
 * Rescales an entry's totals when its quantity or unit is edited.
 *
 * No per-serving base is stored on an entry and none needs to be: the ratio
 * of the new multiplier to the old one is enough, and dividing is safe
 * because quantity > 0 is a database check constraint and every unit scale
 * is non-zero.
 */
export function rescaleEntry(
  entry: FoodLogEntry,
  quantity: number,
  unit: ServingUnit
): Pick<FoodLogEntry, "calories" | "protein" | "carbs" | "fat"> {
  const before = servingMultiplier(entry.display.serving, entry.quantity, entry.unit);
  const after = servingMultiplier(entry.display.serving, quantity, unit);
  const k = before > 0 ? after / before : 1;
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    calories: r(entry.calories * k),
    protein: r(entry.protein * k),
    carbs: r(entry.carbs * k),
    fat: r(entry.fat * k),
  };
}

/**
 * Sums a day. A plain addition, because every entry already carries its own
 * totals — multiplying by quantity here would double-count what logFoodEntry
 * already applied.
 */
export function sumNutrition(entries: FoodLogEntry[]): NutritionTotals {
  return entries.reduce<NutritionTotals>(
    (acc, e) => {
      acc.calories += e.calories;
      acc.protein += e.protein;
      acc.carbs += e.carbs;
      acc.fat += e.fat;
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

export const activityMultiplier: Record<UserProfile["activityLevel"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

// V9 (QA 9.0): "Move the TDEE estimate... to the professional UI. It
// should be applicable to the specific client" — the professional only has
// a ProfessionalClient (partial, optional demographics), not a full
// UserProfile, so the Mifflin-St Jeor math is factored out to take the raw
// parts instead of requiring the client-only shape.
export function calculateTDEEFromParts(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: UserProfile["sex"],
  activityLevel: UserProfile["activityLevel"]
): number {
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

/**
 * Mifflin-St Jeor BMR -> TDEE. A standard, transparent estimate — clearly
 * prototype-level, not a clinical calculation.
 */
export function calculateTDEE(user: UserProfile): number {
  return calculateTDEEFromParts(user.weightKg, user.heightCm, user.age, user.sex, user.activityLevel);
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
