import { supabase } from "../../../lib/supabase/client";
import { resolveMyBusinessId } from "../business-profile";

// A business's discounts: the real business_discounts rows.
//
// WHAT THIS REPLACES. `businessListing.discounts` was a `{ id, label }[]`
// inside the same usePersistentState object the listing used — added and
// removed in BusinessMarketplaceTab, counted on the dashboard, and never
// written anywhere a client could see it. The copy on that screen says "add
// one to feature it on Explore", which was not true of a value living in one
// browser's localStorage.
//
// THE SIMPLEST OF THE FOUR, and worth saying so rather than assuming it
// matches its neighbours: business_discounts has four columns and only one of
// them is content. No price, no enum, no updated_at, no second entity to
// resolve. The screen offers add and remove and nothing else, so neither does
// this — the UPDATE grant on `label` exists, but nothing in the app edits a
// discount in place and building for it would be building a caller that does
// not exist.

export interface Discount {
  id: string;
  label: string;
}

export type DiscountsResult =
  | { ok: true; businessId: string | null; discounts: Discount[] }
  | { ok: false; message: string };

export async function fetchMyDiscounts(userId: string): Promise<DiscountsResult> {
  const business = await resolveMyBusinessId(userId);
  if (!business.ok) {
    return { ok: false, message: "Couldn't load your discounts. Check your connection and try again." };
  }
  if (!business.id) return { ok: true, businessId: null, discounts: [] };

  const { data, error } = await supabase
    .from("business_discounts")
    .select("id, label")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[business-discounts] Could not read discounts:", error.message);
    return { ok: false, message: "Couldn't load your discounts. Check your connection and try again." };
  }
  return { ok: true, businessId: business.id, discounts: (data ?? []) as Discount[] };
}

export async function createDiscount(
  businessId: string,
  label: string
): Promise<{ ok: true; discount: Discount } | { ok: false; message: string }> {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, message: "Describe the discount first." };

  const { data, error } = await supabase
    .from("business_discounts")
    .insert({ business_id: businessId, label: trimmed })
    .select("id, label")
    .single();

  if (error || !data) {
    console.error("[business-discounts] Could not create the discount:", error?.message);
    return { ok: false, message: "Couldn't add the discount. Try again." };
  }
  return { ok: true, discount: data as Discount };
}

export async function deleteDiscount(discountId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from("business_discounts").delete().eq("id", discountId);
  if (error) {
    console.error("[business-discounts] Could not delete the discount:", error.message);
    return { ok: false, message: "Couldn't remove the discount. Try again." };
  }
  return { ok: true };
}
