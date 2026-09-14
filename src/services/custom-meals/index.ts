import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { findCatalogFoodByName, isUuid } from "../food";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "../../../lib/supabase/database.types";
import type { CustomMeal, CustomMealItem, Food, MealType, ServingUnit } from "../../types";

// Custom meal DEFINITIONS — the saved groupings, not the diary rows logging
// one produces.
//
// THIS FILE IS THE OPPOSITE OF ../food's RULE, AND DELIBERATELY SO. That file
// opens by saying a logged entry is a resolved snapshot and that re-reading it
// from the catalog is a bug. A definition is the other thing: it is a list of
// POINTERS, and custom_meal_items stores nothing but foreign keys, quantity
// and position. So the read below joins foods/custom_foods for names and
// macros, which would be wrong for a diary row and is the only correct answer
// here — "my usual breakfast" means whatever those foods are today, and
// editing one is supposed to change the meal.
//
// The FKs are ON DELETE CASCADE, which is the same decision from the other
// side: delete a food and it leaves the meals that referenced it, rather than
// sitting there as a hole.

/**
 * Every item MUST point at exactly one real row —
 * `custom_meal_items_single_source_check` is `num_nonnulls(...) = 1`, with no
 * both-null escape.
 *
 * That is stricter than food_log_entries, which permits a fully manual row,
 * and it matters because the meal builder offers `mockFoods` alongside the
 * user's own: prototype foods with ids like "f7" that exist in no table. They
 * are resolved by NAME against the catalog, the same trick AI Voice uses, and
 * the names were seeded by 20260908121815_seed_food_catalog so every one of
 * them currently matches.
 *
 * `item.source` decides whenever it is present, which is whenever the meal came
 * back from getCustomMeals. Only a freshly picked item lacks it, and there a
 * uuid can only be one of the user's own foods -- the builder offers those and
 * prototypes, nothing else.
 */
async function resolveItemSource(
  item: CustomMealItem
): Promise<{ food_id: string; custom_food_id: null } | { food_id: null; custom_food_id: string } | null> {
  const { food, source } = item;
  if (source === "catalog") return { food_id: food.id, custom_food_id: null };
  if (source === "custom") return { food_id: null, custom_food_id: food.id };
  if (isUuid(food.id)) return { food_id: null, custom_food_id: food.id };
  const match = await findCatalogFoodByName(food.name);
  return match ? { food_id: match.id, custom_food_id: null } : null;
}

function describe(error: PostgrestError): string {
  if (error.code === "42501") return "You don't have permission to do that.";
  if (isOffline(error)) return OFFLINE_MESSAGE;
  return "Something went wrong. Please try again.";
}

export interface CustomMealsResult {
  /**
   * False means the read FAILED, which is not the same as none existing —
   * the same distinction getDiaryEntries draws, and for the same reason: the
   * caller replaces state with `meals`, so a dropped connection must not look
   * like an empty list and wipe what is on screen.
   */
  ok: boolean;
  meals: CustomMeal[];
  message?: string;
}

export interface CustomMealResult {
  ok: boolean;
  meal?: CustomMeal;
  message?: string;
}

export interface CustomMealWriteResult {
  ok: boolean;
  message?: string;
}

/** Shape of one joined item row, which PostgREST types too loosely to use raw. */
interface ItemRow {
  quantity: number;
  unit: ServingUnit;
  position: number;
  foods: {
    id: string;
    name: string;
    name_ar: string | null;
    category: Enums<"food_category">;
    serving_label: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    is_lebanese: boolean;
  } | null;
  custom_foods: {
    id: string;
    name: string;
    name_ar: string | null;
    category: Enums<"food_category">;
    serving_label: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
}

interface MealRow {
  id: string;
  title: string;
  meal_type: MealType | null;
  custom_meal_items: ItemRow[];
}

const ITEM_SELECT =
  "quantity, unit, position, " +
  "foods(id, name, name_ar, category, serving_label, calories, protein_g, carbs_g, fat_g, is_lebanese), " +
  "custom_foods(id, name, name_ar, category, serving_label, calories, protein_g, carbs_g, fat_g)";

/**
 * Names and macros come from whichever table the item points at, which is the
 * live-read this file's header defends.
 */
function toFood(row: ItemRow): Food | null {
  const src = row.foods ?? row.custom_foods;
  if (!src) return null;
  return {
    id: src.id,
    name: src.name,
    nameAr: src.name_ar ?? undefined,
    category: src.category,
    serving: src.serving_label,
    calories: src.calories,
    protein: src.protein_g,
    carbs: src.carbs_g,
    fat: src.fat_g,
    isLebanese: row.foods?.is_lebanese ?? false,
  };
}

function toMeal(row: MealRow): CustomMeal {
  const items = [...row.custom_meal_items]
    // position is what ordering means here; PostgREST does not promise the
    // order an embedded list comes back in.
    .sort((a, b) => a.position - b.position)
    .map((r): CustomMealItem | null => {
      const food = toFood(r);
      // WHICH TABLE IT CAME FROM HAS TO SURVIVE THE READ -- see
      // CustomMealItem.source. Once a meal is hydrated both kinds of food
      // carry a real uuid, and the id can no longer say which is which.
      return food
        ? { food, quantity: r.quantity, unit: r.unit, source: r.foods ? "catalog" : "custom" }
        : null;
    })
    .filter((i): i is CustomMealItem => i !== null);

  return { id: row.id, title: row.title, items, mealType: row.meal_type ?? undefined };
}

/**
 * Every meal the caller can see: their own, plus any a professional scoped to
 * them. Scoping is the view's, not this query's — custom_meals has a second
 * SELECT policy for `scoped_to_client_id`, so a client simply sees the extra
 * rows without asking for them.
 */
export async function getCustomMeals(userId: string): Promise<CustomMealsResult> {
  const { data, error } = await supabase
    .from("custom_meals")
    .select(`id, title, meal_type, custom_meal_items(${ITEM_SELECT})`)
    .or(`owner_id.eq.${userId},scoped_to_client_id.eq.${userId}`)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[custom-meals] Could not read meals:", error.message);
    return { ok: false, meals: [], message: describe(error) };
  }
  return { ok: true, meals: (data ?? []).map((r) => toMeal(r as unknown as MealRow)) };
}

/**
 * Writes the items for a meal that already exists.
 *
 * NOT A TRANSACTION, because PostgREST has none. The parent row is written
 * first and its items second, so a failure here leaves a titled meal with no
 * items rather than items belonging to nothing — recoverable by saving again,
 * which is why both callers below delete the row on failure instead of
 * leaving it.
 */
async function writeItems(mealId: string, items: CustomMealItem[]): Promise<string | null> {
  const rows: {
    custom_meal_id: string;
    food_id: string | null;
    custom_food_id: string | null;
    quantity: number;
    unit: ServingUnit;
    position: number;
  }[] = [];

  for (const [index, item] of items.entries()) {
    const source = await resolveItemSource(item);
    // Refuse the whole save rather than dropping the item. A meal that
    // silently comes back with three of its four foods is worse than one that
    // did not save, because nothing tells the user which is missing.
    if (!source) return `"${item.food.name}" isn't in the food database yet, so this meal can't be saved.`;
    rows.push({
      custom_meal_id: mealId,
      ...source,
      quantity: item.quantity,
      unit: item.unit ?? "serving",
      position: index,
    });
  }

  if (rows.length === 0) return null;
  const { error } = await supabase.from("custom_meal_items").insert(rows);
  if (error) {
    console.error("[custom-meals] Could not write items:", error.message);
    return describe(error);
  }
  return null;
}

export async function createCustomMeal(
  userId: string,
  title: string,
  items: CustomMealItem[],
  mealType?: MealType
): Promise<CustomMealResult> {
  const { data, error } = await supabase
    .from("custom_meals")
    .insert({ owner_id: userId, title: title.trim(), meal_type: mealType ?? null })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[custom-meals] Could not create meal:", error?.message);
    return { ok: false, message: error ? describe(error) : "Something went wrong. Please try again." };
  }

  const itemError = await writeItems(data.id, items);
  if (itemError) {
    // Clean up rather than leaving an empty meal in the list. Best-effort: if
    // this delete also fails the user sees a titleless-but-harmless row, which
    // they can delete themselves.
    await supabase.from("custom_meals").delete().eq("id", data.id);
    return { ok: false, message: itemError };
  }

  return { ok: true, meal: { id: data.id, title: title.trim(), items, mealType } };
}

/**
 * Items are REPLACED, not diffed.
 *
 * custom_meal_items has no stable client-side identity to diff against — the
 * client holds foods and quantities, not row ids — and position changes on
 * reorder anyway. Deleting and re-inserting is what the grants allow and is
 * one round trip either way.
 */
export async function updateCustomMeal(
  mealId: string,
  title: string,
  items: CustomMealItem[],
  mealType?: MealType
): Promise<CustomMealResult> {
  const { error } = await supabase
    .from("custom_meals")
    .update({ title: title.trim(), meal_type: mealType ?? null })
    .eq("id", mealId);

  if (error) {
    console.error("[custom-meals] Could not update meal:", error.message);
    return { ok: false, message: describe(error) };
  }

  const { error: clearError } = await supabase
    .from("custom_meal_items")
    .delete()
    .eq("custom_meal_id", mealId);
  if (clearError) {
    console.error("[custom-meals] Could not clear items:", clearError.message);
    return { ok: false, message: describe(clearError) };
  }

  const itemError = await writeItems(mealId, items);
  if (itemError) return { ok: false, message: itemError };

  return { ok: true, meal: { id: mealId, title: title.trim(), items, mealType } };
}

/** Items go with it: custom_meal_items.custom_meal_id is ON DELETE CASCADE. */
export async function deleteCustomMeal(mealId: string): Promise<CustomMealWriteResult> {
  const { error } = await supabase.from("custom_meals").delete().eq("id", mealId);
  if (error) {
    console.error("[custom-meals] Could not delete meal:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
