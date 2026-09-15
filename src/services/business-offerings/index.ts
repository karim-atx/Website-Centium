import { supabase } from "../../../lib/supabase/client";
import type { Database } from "../../../lib/supabase/database.types";
import { resolveMyBusinessId } from "../business-profile";
import { formatPrice, parsePrice } from "../../utils/price";

// A business's marketplace listings: the real business_offerings rows.
//
// WHAT THIS REPLACES. `businessOfferings` was a plain localStorage array. The
// business side (BusinessMarketplaceTab) created and deleted them, and the
// CLIENT side (MarketplaceCategoryPage's "From Centium businesses" block) read
// the very same array — which meant it could only ever show a business its own
// listings back to itself. On a client's device that array is empty and always
// was, so the block every listing exists to appear in has never rendered for a
// single client. That is the bug this table fixes, not just the persistence.
//
// THE CATEGORY ENUM ALREADY MATCHES. offering_category is gyms, classes,
// stores, clothing, equipment, supplements, wellness, meal_prep — the same
// eight values as MarketplaceCategoryId in src/types, in the same order.
// Checked rather than assumed, because a mismatch would be a 22P02 at save
// time on exactly one category.

export type OfferingCategory = Database["public"]["Enums"]["offering_category"];

export interface Offering {
  id: string;
  title: string;
  category: OfferingCategory;
  /** Formatted for display ("$25"), empty when the column is null. */
  price: string;
  description: string;
}

/** An offering plus who is selling it — the client-facing shape. */
export interface PublicOffering extends Offering {
  businessName: string;
  businessLocation: string | null;
}

export type OfferingsResult =
  | { ok: true; businessId: string | null; offerings: Offering[] }
  | { ok: false; message: string };

const COLUMNS = "id, title, category, price, description";

type Row = {
  id: string;
  title: string;
  category: OfferingCategory;
  price: number | string | null;
  description: string | null;
};

const toOffering = (r: Row): Offering => ({
  id: r.id,
  title: r.title,
  category: r.category,
  price: formatPrice(r.price),
  description: r.description ?? "",
});

/** This account's own listings, for the screen that manages them. */
export async function fetchMyOfferings(userId: string): Promise<OfferingsResult> {
  const business = await resolveMyBusinessId(userId);
  if (!business.ok) {
    return { ok: false, message: "Couldn't load your listings. Check your connection and try again." };
  }
  if (!business.id) return { ok: true, businessId: null, offerings: [] };

  const { data, error } = await supabase
    .from("business_offerings")
    .select(COLUMNS)
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[business-offerings] Could not read listings:", error.message);
    return { ok: false, message: "Couldn't load your listings. Check your connection and try again." };
  }
  return { ok: true, businessId: business.id, offerings: (data ?? []).map((r) => toOffering(r as Row)) };
}

/**
 * Every business's listings in one category, for a client browsing Explore.
 *
 * THIS IS A CROSS-BUSINESS READ and it is allowed to be: both
 * business_offerings and business_profiles carry a `SELECT ... USING (true)`
 * policy, because a marketplace listing is public by definition. The embed is
 * an inner join on the business_id foreign key, so a listing whose business
 * cannot be resolved is dropped rather than rendered with no seller — an
 * anonymous price on Explore is not something to show anybody.
 */
export async function fetchOfferingsByCategory(
  category: OfferingCategory
): Promise<{ ok: true; offerings: PublicOffering[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("business_offerings")
    .select(COLUMNS + ", business_profiles!inner(business_name, location)")
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[business-offerings] Could not read the category:", error.message);
    return { ok: false };
  }

  const rows = (data ?? []) as unknown as (Row & {
    business_profiles: { business_name: string; location: string | null } | null;
  })[];

  return {
    ok: true,
    offerings: rows
      .filter((r) => r.business_profiles)
      .map((r) => ({
        ...toOffering(r),
        businessName: r.business_profiles?.business_name ?? "",
        businessLocation: r.business_profiles?.location ?? null,
      })),
  };
}

export async function createOffering(
  businessId: string,
  draft: { title: string; category: OfferingCategory; price: string; description: string }
): Promise<{ ok: true; offering: Offering } | { ok: false; message: string }> {
  const title = draft.title.trim();
  const description = draft.description.trim();
  if (!title || !description) return { ok: false, message: "A listing needs a title and a description." };

  const price = parsePrice(draft.price);
  if (!price.ok) return { ok: false, message: "Enter the price as a number, for example 25 or $25." };

  const { data, error } = await supabase
    .from("business_offerings")
    .insert({
      business_id: businessId,
      title,
      category: draft.category,
      price: price.value,
      description,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    console.error("[business-offerings] Could not create the listing:", error?.message);
    return { ok: false, message: "Couldn't publish the listing. Try again." };
  }
  return { ok: true, offering: toOffering(data as Row) };
}

export async function deleteOffering(offeringId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from("business_offerings").delete().eq("id", offeringId);
  if (error) {
    console.error("[business-offerings] Could not delete the listing:", error.message);
    return { ok: false, message: "Couldn't remove the listing. Try again." };
  }
  return { ok: true };
}
