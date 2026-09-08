import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "../../../lib/supabase/database.types";
import type { FoodLogEntry, MealType, ServingUnit } from "../../types";
import { servingMultiplier, rescaleEntry } from "../nutrition";

// Reads and writes the real food catalog and diary.
//
// The one rule that shapes this whole file: food_log_entries is a RESOLVED
// SNAPSHOT. name and macros are copied onto the row at log time, already
// multiplied by quantity, and are the truth forever after. food_id and
// custom_food_id are provenance only — both are ON DELETE SET NULL, so a
// deleted catalog row must never be able to rewrite or erase history.
// Re-reading nutrition from foods/custom_foods to render a logged entry is a
// bug, not an optimisation.

export type FoodSource = "catalog" | "custom";

/** A food the user can log: a public catalog row, or one of their own. */
export interface FoodSearchResult {
  id: string;
  source: FoodSource;
  name: string;
  nameAr: string | null;
  category: Enums<"food_category">;
  /** Per SERVING, not per entry. Multiplied at log time, never at read time. */
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isLebanese: boolean;
  /** True only for sourced catalog rows. A user's own food is never verified. */
  isVerified: boolean;
  barcode: string | null;
  /** Set when this custom food is a personal correction of a catalog row. */
  overridesFoodId: string | null;
}

const CATALOG_COLUMNS =
  "id, name, name_ar, category, serving_label, calories, protein_g, carbs_g, fat_g, is_lebanese, is_verified, barcode";
const CUSTOM_COLUMNS =
  "id, name, name_ar, category, serving_label, calories, protein_g, carbs_g, fat_g, overrides_food_id";

interface CatalogRow {
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
  is_verified: boolean;
  barcode: string | null;
}

type CustomRow = Omit<CatalogRow, "is_lebanese" | "is_verified" | "barcode"> & {
  overrides_food_id: string | null;
};

const fromCatalog = (r: CatalogRow): FoodSearchResult => ({
  id: r.id,
  source: "catalog",
  name: r.name,
  nameAr: r.name_ar,
  category: r.category,
  servingLabel: r.serving_label,
  calories: r.calories,
  protein: r.protein_g,
  carbs: r.carbs_g,
  fat: r.fat_g,
  isLebanese: r.is_lebanese,
  isVerified: r.is_verified,
  barcode: r.barcode,
  overridesFoodId: null,
});

const fromCustom = (r: CustomRow): FoodSearchResult => ({
  id: r.id,
  source: "custom",
  name: r.name,
  nameAr: r.name_ar,
  category: r.category,
  servingLabel: r.serving_label,
  calories: r.calories,
  protein: r.protein_g,
  carbs: r.carbs_g,
  fat: r.fat_g,
  // A user-authored food carries neither flag: is_lebanese is a curation
  // judgement nobody has made about it, and is_verified is false by
  // definition — custom_foods has no such column precisely because the
  // answer is always the same.
  isLebanese: false,
  isVerified: false,
  barcode: null,
  overridesFoodId: r.overrides_food_id,
});

/** PostgREST ilike treats % and _ as wildcards; a searched name must not. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => "\\" + c);
}

function describe(error: PostgrestError): string {
  // 42501 is a column- or table-privilege violation. It is NOT an auth
  // failure — reporting it as "sign in again" is what sent the consent bug
  // chasing the wrong cause for an afternoon.
  if (error.code === "42501") return "You don't have permission to do that.";
  return error.message || "Something went wrong. Please try again.";
}

/**
 * Searches the public catalog and the signed-in user's own foods by name.
 *
 * Two queries rather than one: they are different tables with different RLS,
 * and PostgREST has no union. Custom foods are listed first — a user who
 * created their own version of something meant to use it.
 *
 * An override supersedes what it overrides. When a user has corrected a
 * catalog row, that catalog row is dropped from the results rather than shown
 * beside their correction, which is the point of overrides_food_id.
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const term = query.trim();
  if (!term) return [];
  const pattern = "%" + escapeLike(term) + "%";

  const [catalog, custom] = await Promise.all([
    supabase.from("foods").select(CATALOG_COLUMNS).ilike("name", pattern).order("name").limit(50),
    supabase
      .from("custom_foods")
      .select(CUSTOM_COLUMNS)
      .ilike("name", pattern)
      .order("name")
      .limit(50),
  ]);

  if (catalog.error) console.error("[food] catalog search failed:", catalog.error.message);
  if (custom.error) console.error("[food] custom search failed:", custom.error.message);

  const mine = (custom.data ?? []).map((r) => fromCustom(r as CustomRow));
  const overridden = new Set(
    mine.map((f) => f.overridesFoodId).filter((id): id is string => !!id)
  );
  const shared = (catalog.data ?? [])
    .map((r) => fromCatalog(r as CatalogRow))
    .filter((f) => !overridden.has(f.id));

  return [...mine, ...shared];
}

/**
 * The whole catalog, for the browse list an empty search box shows.
 *
 * A plain list is affordable because the catalog is deliberately small — 92
 * curated rows, not an open-ended product database. If it ever grows past a
 * few hundred this should become a paged or category-scoped query rather
 * than a bigger limit.
 */
export async function listFoods(): Promise<FoodSearchResult[]> {
  const [catalog, custom] = await Promise.all([
    supabase.from("foods").select(CATALOG_COLUMNS).order("name").limit(300),
    supabase.from("custom_foods").select(CUSTOM_COLUMNS).order("name").limit(300),
  ]);

  if (catalog.error) console.error("[food] catalog list failed:", catalog.error.message);
  if (custom.error) console.error("[food] custom list failed:", custom.error.message);

  const mine = (custom.data ?? []).map((r) => fromCustom(r as CustomRow));
  const overridden = new Set(
    mine.map((f) => f.overridesFoodId).filter((id): id is string => !!id)
  );
  const shared = (catalog.data ?? [])
    .map((r) => fromCatalog(r as CatalogRow))
    .filter((f) => !overridden.has(f.id));

  return [...mine, ...shared];
}

/**
 * Re-reads catalog foods by id, for the "Recent" strip.
 *
 * A diary entry snapshots totals, so a food cannot be reconstructed from one
 * — logging it again needs the per-serving values, which only the catalog
 * has. Ids that no longer resolve are simply absent from the result, which is
 * what should happen when a food has been deleted.
 */
export async function getFoodsByIds(ids: string[]): Promise<FoodSearchResult[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const [catalog, custom] = await Promise.all([
    supabase.from("foods").select(CATALOG_COLUMNS).in("id", unique),
    supabase.from("custom_foods").select(CUSTOM_COLUMNS).in("id", unique),
  ]);

  if (catalog.error) console.error("[food] recent catalog read failed:", catalog.error.message);
  if (custom.error) console.error("[food] recent custom read failed:", custom.error.message);

  const byId = new Map<string, FoodSearchResult>();
  for (const r of catalog.data ?? []) {
    const f = fromCatalog(r as CatalogRow);
    byId.set(f.id, f);
  }
  for (const r of custom.data ?? []) {
    const f = fromCustom(r as CustomRow);
    byId.set(f.id, f);
  }
  // Returned in the caller's order, which is most-recent-first.
  return unique.map((id) => byId.get(id)).filter((f): f is FoodSearchResult => !!f);
}

export interface NewBarcodeFood {
  barcode: string;
  name: string;
  category: Enums<"food_category">;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nameAr?: string | null;
  isLebanese?: boolean;
}

/**
 * Creates a shared catalog row for a barcode, or returns the existing one.
 *
 * Called ONLY when the user has confirmed they want to add a scanned product
 * that the catalog does not have, with the nutrition values in front of them.
 * Separate from lookupByBarcode() on purpose: this one writes a row every
 * other user of the app will see, and it spends the 30/hour rate limit.
 *
 * FIRST SCAN WINS. If someone else registered this barcode between the
 * lookup and the confirmation, the RPC returns their row and ignores
 * everything passed here — so the caller must use what comes back rather
 * than assuming its own values were stored.
 */
export async function createFoodByBarcode(
  food: NewBarcodeFood
): Promise<{ ok: boolean; message?: string; food?: FoodSearchResult }> {
  const { data, error } = await supabase.rpc("find_or_create_food_by_barcode", {
    p_barcode: food.barcode,
    p_name: food.name,
    p_category: food.category,
    p_serving_label: food.servingLabel,
    p_calories: food.calories,
    p_protein_g: food.protein,
    p_carbs_g: food.carbs,
    p_fat_g: food.fat,
    p_name_ar: food.nameAr ?? undefined,
    p_is_lebanese: food.isLebanese ?? false,
  });

  if (error || !data) {
    console.error("[food] Could not create food by barcode:", error?.message);
    // The function raises for an unauthenticated caller and for a throttled
    // one; neither is worth a raw Postgres string in the UI.
    const message = error?.message ?? "";
    if (/rate limit|too many/i.test(message)) {
      return { ok: false, message: "Too many new products scanned this hour. Try again later." };
    }
    return { ok: false, message: error ? describe(error) : "Could not add that product." };
  }

  return { ok: true, food: fromCatalog(data as unknown as CatalogRow) };
}

/**
 * Resolves a barcode against the catalog. Returns null when nothing matches.
 *
 * Deliberately does NOT call find_or_create_food_by_barcode(). That RPC
 * creates a shared catalog row visible to every user, and creating one is a
 * decision the person scanning has to make explicitly with nutrition values
 * in front of them — not a side effect of pointing a camera at a package.
 * The lookup here is a plain read of a world-readable table, so it is free
 * and unthrottled; only creation spends the 30/hour quota.
 *
 * A personal override wins, so a user who has corrected this product sees
 * their own numbers rather than whatever the first scanner entered.
 */
export async function lookupByBarcode(barcode: string): Promise<FoodSearchResult | null> {
  const code = barcode.trim();
  if (!code) return null;

  const { data, error } = await supabase
    .from("foods")
    .select(CATALOG_COLUMNS)
    .eq("barcode", code)
    .maybeSingle();

  if (error) {
    console.error("[food] barcode lookup failed:", error.message);
    return null;
  }
  if (!data) return null;

  const shared = fromCatalog(data as CatalogRow);

  const { data: override } = await supabase
    .from("custom_foods")
    .select(CUSTOM_COLUMNS)
    .eq("overrides_food_id", shared.id)
    .maybeSingle();

  return override ? fromCustom(override as CustomRow) : shared;
}

export interface LogFoodEntryParams {
  userId: string;
  food: FoodSearchResult;
  quantity: number;
  unit: ServingUnit;
  meal: MealType;
  /** yyyy-mm-dd. The diary's selected date, not necessarily today. */
  date: string;
  loggedVia: Enums<"food_log_source">;
}

export interface LogFoodEntryResult {
  ok: boolean;
  message?: string;
  entry?: FoodLogEntry;
}

/**
 * Writes one diary entry, resolving the snapshot as it goes.
 *
 * The multiplication happens HERE and only here. What lands in the row is the
 * total for the whole entry, so summing a day is sum(calories) with no
 * per-row arithmetic — which is what the schema's own comment demands.
 *
 * Reports failure rather than no-opping, like updateBodyMetric: the user
 * pressed a button expecting a diary row, and a silent failure would leave
 * them believing they had logged something they had not.
 */
export async function logFoodEntry(params: LogFoodEntryParams): Promise<LogFoodEntryResult> {
  const { userId, food, quantity, unit, meal, date, loggedVia } = params;

  if (!(quantity > 0)) return { ok: false, message: "Quantity must be greater than zero." };

  const multiplier = servingMultiplier(food.servingLabel, quantity, unit);
  const round = (n: number) => Math.round(n * 100) / 100;

  const snapshot = {
    name: food.name,
    calories: round(food.calories * multiplier),
    protein: round(food.protein * multiplier),
    carbs: round(food.carbs * multiplier),
    fat: round(food.fat * multiplier),
  };

  const { data, error } = await supabase
    .from("food_log_entries")
    .insert({
      user_id: userId,
      // At most one may be set — food_log_entries_single_source_check. Both
      // null is legal and means a food the user typed in by hand.
      food_id: food.source === "catalog" ? food.id : null,
      custom_food_id: food.source === "custom" ? food.id : null,
      name: snapshot.name,
      calories: snapshot.calories,
      protein_g: snapshot.protein,
      carbs_g: snapshot.carbs,
      fat_g: snapshot.fat,
      quantity,
      unit,
      meal,
      logged_date: date,
      logged_via: loggedVia,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[food] Could not log entry:", error?.message);
    return { ok: false, message: error ? describe(error) : "Could not save that entry." };
  }

  return {
    ok: true,
    entry: {
      id: data.id,
      foodId: food.source === "catalog" ? food.id : null,
      customFoodId: food.source === "custom" ? food.id : null,
      ...snapshot,
      quantity,
      unit,
      meal,
      date,
      loggedVia,
      display: {
        category: food.category,
        serving: food.servingLabel,
        isLebanese: food.isLebanese,
      },
    },
  };
}

// The joined shape. Only ever read for DISPLAY — icon, star, serving text.
// Never for nutrition; that comes off the row itself.
interface DiaryRow {
  id: string;
  food_id: string | null;
  custom_food_id: string | null;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  quantity: number;
  unit: ServingUnit;
  meal: MealType;
  logged_date: string;
  logged_via: Enums<"food_log_source"> | null;
  foods: { category: Enums<"food_category">; serving_label: string; is_lebanese: boolean } | null;
  custom_foods: { category: Enums<"food_category">; serving_label: string } | null;
}

/**
 * Reads the diary for a date range — the 90-day rolling window the app
 * hydrates on sign-in.
 *
 * The join is display metadata ONLY: category for the row icon, is_lebanese
 * for the star, serving_label for the text under the name. food_log_entries
 * carries none of the three. Macros are never taken from it.
 *
 * It can legitimately come back null — a manual entry has no source row, and
 * ON DELETE SET NULL means a deleted catalog row leaves the pointer empty.
 * Both cases fall back to a neutral presentation rather than failing, because
 * the entry itself is still perfectly valid.
 *
 * NOTE: joining serving_label rather than snapshotting it means a future edit
 * to a catalog row's label would change how an old entry reads. See the
 * README follow-up — the honest fix is a column on food_log_entries.
 */
export async function getDiaryEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<FoodLogEntry[]> {
  const { data, error } = await supabase
    .from("food_log_entries")
    .select(
      "id, food_id, custom_food_id, name, calories, protein_g, carbs_g, fat_g, quantity, unit, meal, logged_date, logged_via, " +
        "foods(category, serving_label, is_lebanese), custom_foods(category, serving_label)"
    )
    .eq("user_id", userId)
    .gte("logged_date", startDate)
    .lte("logged_date", endDate)
    .order("logged_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[food] Could not read diary:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as unknown as DiaryRow;
    const meta = r.foods ?? r.custom_foods ?? null;
    return {
      id: r.id,
      foodId: r.food_id,
      customFoodId: r.custom_food_id,
      name: r.name,
      calories: r.calories,
      protein: r.protein_g,
      carbs: r.carbs_g,
      fat: r.fat_g,
      quantity: r.quantity,
      unit: r.unit,
      meal: r.meal,
      date: r.logged_date,
      loggedVia: r.logged_via ?? undefined,
      display: {
        category: meta?.category ?? "homemade",
        serving: meta?.serving_label ?? "",
        isLebanese: r.foods?.is_lebanese ?? false,
      },
    };
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a diary entry exists in food_log_entries, or only in local state.
 *
 * Transitional. Entries logged through AddFoodSheet are real rows with real
 * uuids; AI Voice, custom meals and copy-yesterday still write local-only
 * entries with ids like "f1757352…". Sending one of those to the database
 * would match nothing, and the row-count checks below would then correctly —
 * but uselessly — report a failure for an entry that was never there.
 *
 * This goes away once every logging path writes remotely.
 */
export function isRemoteEntryId(entryId: string): boolean {
  return UUID_RE.test(entryId);
}

/**
 * Deletes one of the user's own entries.
 *
 * Checks the returned rows, not just `error`. A DELETE refused by a row
 * policy comes back as zero rows with error === null — RLS rejects silently,
 * and `if (error)` alone is not a check. Reporting success there would remove
 * the entry from the diary while the row lived on in the database.
 */
export async function deleteDiaryEntry(entryId: string): Promise<{ ok: boolean; message?: string }> {
  const { data, error } = await supabase
    .from("food_log_entries")
    .delete()
    .eq("id", entryId)
    .select("id");

  if (error) {
    console.error("[food] Could not delete entry:", error.message);
    return { ok: false, message: describe(error) };
  }
  if (!data || data.length === 0) {
    console.error("[food] Delete affected no rows:", entryId);
    return { ok: false, message: "That entry could not be deleted." };
  }
  return { ok: true };
}

/**
 * Changes an entry's quantity, unit or meal, rescaling the snapshot to match.
 *
 * The macros on a row are totals, so changing the quantity has to change them
 * too. rescaleEntry does that arithmetic — the same function the local
 * updateFoodEntry uses, so the two cannot drift apart.
 *
 * Same silent-rejection guard as the delete above: a row-policy UPDATE
 * refusal returns zero rows and no error. Every column written here is in the
 * column-scoped UPDATE grant nutrition defines.
 */
export async function updateDiaryEntry(
  entry: FoodLogEntry,
  quantity: number,
  unit: ServingUnit,
  meal: MealType = entry.meal
): Promise<{ ok: boolean; message?: string }> {
  if (!(quantity > 0)) return { ok: false, message: "Quantity must be greater than zero." };

  const totals = rescaleEntry(entry, quantity, unit);

  const { data, error } = await supabase
    .from("food_log_entries")
    .update({
      quantity,
      unit,
      meal,
      calories: totals.calories,
      protein_g: totals.protein,
      carbs_g: totals.carbs,
      fat_g: totals.fat,
    })
    .eq("id", entry.id)
    .select("id");

  if (error) {
    console.error("[food] Could not update entry:", error.message);
    return { ok: false, message: describe(error) };
  }
  if (!data || data.length === 0) {
    console.error("[food] Update affected no rows:", entry.id);
    return { ok: false, message: "That change could not be saved." };
  }
  return { ok: true };
}
