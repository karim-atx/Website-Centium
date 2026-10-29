import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { getFoodsByIds, type FoodSearchResult } from "./index";
import {
  onlineFailureKind,
  onlineFailureMessage,
  onlineQuery,
  parseOnlineResults,
  saveFoundFoodArgs,
  saveFoundFoodMessage,
  suggestFoodMessage,
  type OnlineFood,
  type OnlineSearchOutcome,
} from "./onlineSearchModel";

// Round D · DP: looking foods up online (Database 20261222040000 and the
// search-foods-online Edge Function). Only the search words leave our
// servers. Every search is started by the user (a button, never as they type)
// and counts toward 30 an hour. Nothing is saved until the user confirms a
// result; it is then their own custom food, logged the way any custom food is.

type PgError = { code?: string; message?: string } | null;
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PgError }> };
const rpc = (): Rpc => supabase as unknown as Rpc;

const browserOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/** Searches USDA FoodData Central and Open Food Facts for `query` (2-80 characters). */
export async function searchFoodsOnline(query: string): Promise<OnlineSearchOutcome> {
  const q = onlineQuery(query);
  if (!q) return { ok: false, kind: "invalid_query", message: onlineFailureMessage("invalid_query") };
  // No connection: the request would never arrive, and must not spend a search.
  if (browserOffline()) return { ok: false, kind: "offline", message: onlineFailureMessage("offline") };

  try {
    const { data, error } = await supabase.functions.invoke("search-foods-online", { body: { query: q } });
    if (!error) {
      const { results, sources } = parseOnlineResults(data);
      return { ok: true, results, sources };
    }
    let status = 0;
    let code: string | undefined;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      status = context.status;
      try {
        code = ((await context.clone().json()) as { code?: string }).code;
      } catch {
        /* not JSON */
      }
    }
    // No HTTP response at all: supabase-js reports that as FunctionsFetchError.
    const offline = status === 0 && ((error as { name?: string }).name === "FunctionsFetchError" || browserOffline());
    const kind = onlineFailureKind(status, code, offline);
    if (kind === "error") console.error("[food] online search failed:", status, code);
    return { ok: false, kind, message: onlineFailureMessage(kind) };
  } catch (e) {
    const kind = isOffline(e) || browserOffline() ? "offline" : "error";
    return { ok: false, kind, message: onlineFailureMessage(kind) };
  }
}

/** A saved food as the add step logs it, when it couldn't be read back. */
function savedLocally(id: string, f: OnlineFood): FoodSearchResult {
  return {
    id,
    source: "custom",
    name: f.name,
    nameAr: null,
    category: "ingredients",
    servingLabel: f.servingLabel,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    isLebanese: false,
    isVerified: false,
    barcode: null,
    overridesFoodId: null,
    logoTone: null,
    nutrients: Object.keys(f.nutrients).length > 0 ? f.nutrients : null,
    brand: f.brand,
    externalSource: f.source,
    externalRef: f.ref,
  };
}

/**
 * Saves a CONFIRMED result as the user's own custom food (save_found_food),
 * then reads it back. Saving the same result again returns the same food, so
 * the row read back is whatever the user already has, edits included.
 */
export async function saveFoundFood(f: OnlineFood): Promise<{ ok: true; food: FoodSearchResult } | { ok: false; message: string }> {
  try {
    const { data, error } = await rpc().rpc("save_found_food", saveFoundFoodArgs(f));
    if (error || typeof data !== "string") {
      const offline = !!error && isOffline(error);
      if (!offline) console.error("[food] save_found_food failed:", error?.code, error?.message);
      return { ok: false, message: saveFoundFoodMessage(error?.code, offline || browserOffline()) };
    }
    const [food] = await getFoodsByIds([data]);
    return { ok: true, food: food ?? savedLocally(data, f) };
  } catch (e) {
    return { ok: false, message: saveFoundFoodMessage(undefined, isOffline(e) || browserOffline()) };
  }
}

/**
 * Proposes one of the user's own foods for the shared catalogue
 * (submit_food_to_catalogue). USDA-found or typed foods only; Open Food Facts
 * foods are refused (ATXL0). One pending proposal per food: sending it again
 * while one waits returns that one. 10 an hour.
 */
export async function suggestFoodForCatalogue(customFoodId: string): Promise<{ ok: true } | { ok: false; code?: string; message: string }> {
  try {
    const { error } = await rpc().rpc("submit_food_to_catalogue", { p_custom_food_id: customFoodId });
    if (!error) return { ok: true };
    const offline = isOffline(error);
    if (!offline && error.code !== "ATX60" && error.code !== "ATX02") console.error("[food] submit_food_to_catalogue failed:", error.code, error.message);
    return { ok: false, code: error.code, message: suggestFoodMessage(error.code, offline || browserOffline()) };
  } catch (e) {
    return { ok: false, message: suggestFoodMessage(undefined, isOffline(e) || browserOffline()) };
  }
}
