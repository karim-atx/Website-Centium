import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { findCatalogFoodByName, isUuid } from "../food";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "../../../lib/supabase/database.types";
import type { Recipe, RecipeItem, Food, ServingUnit } from "../../types";

// Recipe DEFINITIONS. Mirrors src/services/custom-meals/index.ts exactly —
// same "this file is the opposite of ../food's snapshot rule" doctrine
// (items are live pointers, joined at read time, so editing a referenced
// food changes a recipe's per-serving nutrition), same ON DELETE CASCADE
// item FKs, same resolveItemSource/writeItems/replace-not-diff shape. See
// that file's own header comment for the full reasoning; it isn't repeated
// here to avoid the two drifting into two different explanations of the
// same rule.
//
// Deltas from custom meals, both per the mobile handoff's own instruction:
//   - No meal_type. Meal is chosen at log time on the detail screen, never
//     stored on the definition (handoff item 10, "what does not carry over
//     cleanly", point 1).
//   - `servings` (required) and `steps` (optional) replace it; every
//     per-serving figure is `writeItems`'s caller dividing by `servings`,
//     computed, never stored as a second number (handoff: "Lentil Mujaddara
//     totals 2,120 kcal over 4 servings and reads exactly 530 per serving").
//   - `recipe_items.note` (handoff Q3, answered): free text alongside the
//     enum+quantity shape, so "400g dry" can be shown as written.

async function resolveItemSource(
  item: RecipeItem
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

export interface RecipesResult {
  /** False means the READ failed — distinct from none existing, same as CustomMealsResult. A failed read must show an error state, not "No recipes yet" (handoff acceptance criterion). */
  ok: boolean;
  recipes: Recipe[];
  message?: string;
}

export interface RecipeResult {
  ok: boolean;
  recipe?: Recipe;
  message?: string;
}

export interface RecipeWriteResult {
  ok: boolean;
  message?: string;
}

interface ItemRow {
  quantity: number;
  unit: ServingUnit;
  note: string | null;
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

interface RecipeRow {
  id: string;
  title: string;
  servings: number;
  steps: string | null;
  recipe_items: ItemRow[];
}

const ITEM_SELECT =
  "quantity, unit, note, position, " +
  "foods(id, name, name_ar, category, serving_label, calories, protein_g, carbs_g, fat_g, is_lebanese), " +
  "custom_foods(id, name, name_ar, category, serving_label, calories, protein_g, carbs_g, fat_g)";

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

function toRecipe(row: RecipeRow): Recipe {
  const items = [...row.recipe_items]
    .sort((a, b) => a.position - b.position)
    .map((r): RecipeItem | null => {
      const food = toFood(r);
      return food
        ? { food, quantity: r.quantity, unit: r.unit, note: r.note ?? undefined, source: r.foods ? "catalog" : "custom" }
        : null;
    })
    .filter((i): i is RecipeItem => i !== null);

  return { id: row.id, title: row.title, items, servings: row.servings, steps: row.steps ?? undefined };
}

/**
 * Every recipe the caller can see: their own, plus any a professional scoped
 * to them (handoff Q6). Newest first (master handover item 11: recipes read
 * newest first everywhere). Custom meals keep their own ascending query and
 * are reversed at display time instead (Part 4 Q2).
 */
export async function getRecipes(userId: string): Promise<RecipesResult> {
  const { data, error } = await supabase
    .from("recipes")
    .select(`id, title, servings, steps, recipe_items(${ITEM_SELECT})`)
    .or(`owner_id.eq.${userId},scoped_to_client_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[recipes] Could not read recipes:", error.message);
    return { ok: false, recipes: [], message: describe(error) };
  }
  return { ok: true, recipes: (data ?? []).map((r) => toRecipe(r as unknown as RecipeRow)) };
}

/** Not a transaction (PostgREST has none) — see custom-meals/index.ts's writeItems for the full reasoning this mirrors. */
async function writeItems(recipeId: string, items: RecipeItem[]): Promise<string | null> {
  const rows: {
    recipe_id: string;
    food_id: string | null;
    custom_food_id: string | null;
    quantity: number;
    unit: ServingUnit;
    note: string | null;
    position: number;
  }[] = [];

  for (const [index, item] of items.entries()) {
    const source = await resolveItemSource(item);
    if (!source) return `"${item.food.name}" isn't in the food database yet, so this recipe can't be saved.`;
    rows.push({
      recipe_id: recipeId,
      ...source,
      quantity: item.quantity,
      unit: item.unit ?? "serving",
      note: item.note?.trim() || null,
      position: index,
    });
  }

  if (rows.length === 0) return null;
  const { error } = await supabase.from("recipe_items").insert(rows);
  if (error) {
    console.error("[recipes] Could not write items:", error.message);
    return describe(error);
  }
  return null;
}

export async function createRecipe(
  userId: string,
  title: string,
  items: RecipeItem[],
  servings: number,
  steps?: string,
  scopedToClientId?: string
): Promise<RecipeResult> {
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      owner_id: userId,
      title: title.trim(),
      servings,
      steps: steps?.trim() || null,
      scoped_to_client_id: scopedToClientId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[recipes] Could not create recipe:", error?.message);
    return { ok: false, message: error ? describe(error) : "Something went wrong. Please try again." };
  }

  const itemError = await writeItems(data.id, items);
  if (itemError) {
    // Best-effort cleanup, same as createCustomMeal: leaves at worst a
    // titled-but-empty row the user can delete themselves.
    await supabase.from("recipes").delete().eq("id", data.id);
    return { ok: false, message: itemError };
  }

  return { ok: true, recipe: { id: data.id, title: title.trim(), items, servings, steps } };
}

/** Items are REPLACED, not diffed — same reasoning as updateCustomMeal. */
export async function updateRecipe(
  recipeId: string,
  title: string,
  items: RecipeItem[],
  servings: number,
  steps?: string
): Promise<RecipeResult> {
  const { error } = await supabase
    .from("recipes")
    .update({ title: title.trim(), servings, steps: steps?.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", recipeId);

  if (error) {
    console.error("[recipes] Could not update recipe:", error.message);
    return { ok: false, message: describe(error) };
  }

  const { error: clearError } = await supabase.from("recipe_items").delete().eq("recipe_id", recipeId);
  if (clearError) {
    console.error("[recipes] Could not clear items:", clearError.message);
    return { ok: false, message: describe(clearError) };
  }

  const itemError = await writeItems(recipeId, items);
  if (itemError) return { ok: false, message: itemError };

  return { ok: true, recipe: { id: recipeId, title: title.trim(), items, servings, steps } };
}

/** Items go with it: recipe_items.recipe_id is ON DELETE CASCADE. */
export async function deleteRecipe(recipeId: string): Promise<RecipeWriteResult> {
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) {
    console.error("[recipes] Could not delete recipe:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}
