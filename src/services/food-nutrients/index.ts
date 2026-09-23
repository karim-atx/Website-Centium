import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";

// Reads food_nutrients — per-nutrient data for CATALOG foods only, imported
// from USDA FoodData Central by scripts/import-fdc-nutrients.ts. There is no
// per-nutrient data for custom_foods (the user typed calories/macros in by
// hand; there is nothing to match against FDC), and no per-nutrient data for
// a catalog food FDC hasn't matched yet. Both cases mean "no data" — callers
// pass a null/undefined map straight into sumNutrientMaps (src/services/
// nutrition), which is what turns that into the amber "partial" chip instead
// of a wrong or invented zero.

export interface FoodNutrientsResult {
  ok: boolean;
  /** Keyed by food_id. A food_id with no row here has no data at all. */
  byFoodId: Record<string, Record<string, number>>;
  message?: string;
}

interface FoodNutrientRow {
  food_id: string;
  nutrients: Record<string, number> | null;
}

/**
 * Fetches nutrient maps for a set of catalog food ids in one round trip —
 * used wherever several foods need to be summed at once (a day's diary for
 * Nutrient Summary's live-lookup fallback, a recipe's or custom meal's
 * ingredient list for their Advanced view). Ids that don't resolve to a row
 * are simply absent from `byFoodId`, not an error.
 */
export async function getFoodNutrients(foodIds: string[]): Promise<FoodNutrientsResult> {
  const ids = [...new Set(foodIds)].filter(Boolean);
  if (ids.length === 0) return { ok: true, byFoodId: {} };

  const { data, error } = await supabase.from("food_nutrients").select("food_id, nutrients").in("food_id", ids);

  if (error) {
    if (isOffline(error)) return { ok: false, byFoodId: {}, message: OFFLINE_MESSAGE };
    console.error("[food-nutrients] fetch failed:", error.message);
    return { ok: false, byFoodId: {}, message: "Could not load nutrient data. Please try again." };
  }

  const byFoodId: Record<string, Record<string, number>> = {};
  for (const row of (data ?? []) as FoodNutrientRow[]) {
    if (row.nutrients) byFoodId[row.food_id] = row.nutrients;
  }
  return { ok: true, byFoodId };
}

/** Convenience for the single-food case (Advanced view on a food being logged). */
export async function getFoodNutrientsById(foodId: string): Promise<Record<string, number> | null> {
  const result = await getFoodNutrients([foodId]);
  return result.byFoodId[foodId] ?? null;
}
