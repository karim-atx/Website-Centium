import { supabase } from "../../../lib/supabase/client";
import { lookupByBarcode, type FoodSearchResult } from "../food";
import { normalizeGtin } from "../../utils/gtin";

// What a scanned or typed barcode turns into, in the order the handover sets
// (FO3.2 / HO2.1):
//
//   1. OUR CATALOGUE: a shared barcode product (or the user's own version of
//      it), logged like any catalogue food.
//   2. OPEN FOOD FACTS, through the lookup-barcode Edge Function. Shown with
//      its notice and link and logged only once the user confirms, onto their
//      own diary row with its attribution. NEVER written to the shared
//      catalogue: Open Food Facts is ODbL, share-alike, and a shared copy
//      would inherit that licence.
//   3. Nothing: the manual form, which the user fills in themselves.

export interface OffProduct {
  barcode: string;
  name: string;
  brand: string | null;
  /** What the numbers are for: the packet's serving, or "100 g". */
  servingLabel: string;
  perServing: boolean;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  attribution: { source: "open_food_facts"; ref: string; fetchedAt: string; notice: string; url: string };
}

export type BarcodeLookup =
  | { kind: "catalog"; gtin: string; food: FoodSearchResult }
  | { kind: "off"; gtin: string; product: OffProduct }
  | { kind: "miss"; gtin: string }
  | { kind: "invalid" }
  | { kind: "error"; gtin: string; message: string };

interface FnProduct {
  barcode: string;
  name: string;
  brand: string | null;
  servingLabel: string;
  perServing: boolean;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  attribution: OffProduct["attribution"];
}

/** The Edge Function's error codes, said the way a person scanning needs to hear them. */
export function lookupErrorMessage(code: string | undefined): string {
  if (code === "rate_limited") return "You've scanned a lot in the last hour. Try again later, or enter it by hand.";
  if (code === "upstream_rate_limited" || code === "upstream_unavailable" || code === "upstream_error")
    return "Open Food Facts isn't answering right now. Try again, or enter it by hand.";
  if (code === "unauthenticated") return "Your session expired. Sign in again to look products up.";
  return "Couldn't look that barcode up. Try again, or enter it by hand.";
}

/** Maps the function's success body to the product the confirm card shows. */
export function toOffProduct(b: FnProduct): OffProduct {
  return {
    barcode: b.barcode,
    name: b.name,
    brand: b.brand,
    servingLabel: b.servingLabel,
    perServing: b.perServing,
    calories: b.calories,
    protein: b.protein_g,
    carbs: b.carbs_g,
    fat: b.fat_g,
    attribution: b.attribution,
  };
}

export async function resolveBarcode(raw: string): Promise<BarcodeLookup> {
  const gtin = normalizeGtin(raw);
  if (!gtin) return { kind: "invalid" };

  const food = await lookupByBarcode(gtin);
  if (food) return { kind: "catalog", gtin, food };

  const { data, error } = await supabase.functions.invoke<FnProduct>("lookup-barcode", { body: { barcode: gtin } });
  if (!error && data) return { kind: "off", gtin, product: toOffProduct(data) };

  let status = 0;
  let code: string | undefined;
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    status = context.status;
    try {
      code = ((await context.clone().json()) as { code?: string }).code;
    } catch {
      /* not JSON */
    }
  }
  // Not found, and found without usable numbers or a name, both go to the
  // manual form: the user can read the packet.
  if (status === 404 || status === 422) return { kind: "miss", gtin };
  return { kind: "error", gtin, message: lookupErrorMessage(code) };
}

/** An Open Food Facts product as a food the add step can log (per its own serving). */
export function offAsFood(p: OffProduct): FoodSearchResult {
  return {
    id: `off:${p.barcode}`,
    source: "manual",
    name: p.brand ? `${p.name} (${p.brand})` : p.name,
    nameAr: null,
    category: "snacks",
    servingLabel: p.servingLabel,
    calories: p.calories,
    protein: p.protein ?? 0,
    carbs: p.carbs ?? 0,
    fat: p.fat ?? 0,
    isLebanese: false,
    isVerified: false,
    barcode: p.barcode,
    overridesFoodId: null,
    logoTone: null,
    nutrients: null,
  };
}
