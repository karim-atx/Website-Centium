import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { tk } from "../../i18n/core";

// Marketplace (MA1) reads and the few writes MA1 owns today.
//
// LIVE NOW: business_profiles.active (listing switch), .perk (the listing
// perk, V6-88 moved here from the Dashboard), .categories (Activities /
// Item categories, B5 OB-09 = BU3-04). Everything else MA1 draws is stage
// B13 (HANDOVER_API.md "B13", MK-02 to MK-07: listing.ts, promotions and
// featuring) or B7 (MB-03 day-pass flags). Each of those is PROBED: the
// screen keeps its pending state only when the server itself answers that the
// table, column or function does not exist (42P01, 42703, PGRST200/202/204/205).
// Any other failure is an error, never a pending state. Nothing here is
// invented: a B13 number is shown only when a B13 reader returns it.
//
// The new columns are not in the generated types, so reads go through an
// untyped view of the client at this boundary.

const db = typed as unknown as SupabaseClient;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

const ABSENT = new Set(["42P01", "42703", "42883", "PGRST200", "PGRST202", "PGRST204", "PGRST205"]);

/** True when the server answered that the object does not exist (not deployed yet). */
export const isAbsent = (e: Pick<PostgrestError, "code"> | null | undefined): boolean => !!e && ABSENT.has(e.code ?? "");

const fail = <T>(e: PostgrestError, fallback: string): Result<T> => ({
  ok: false,
  code: e.code,
  message: isOffline(e) ? OFFLINE_MESSAGE : fallback,
});

export type Probe = "live" | "pending" | "error";

async function probe(table: string, columns: string, filter?: [string, string]): Promise<Probe> {
  let q = db.from(table).select(columns).limit(1);
  if (filter) q = q.eq(filter[0], filter[1]);
  const { error } = await q;
  if (!error) return "live";
  return isAbsent(error) ? "pending" : "error";
}

/** Which B13 / B7 pieces the server has (MK-02 … MK-07, MB-03). */
export interface MarketBackend {
  /** MK-03 business_photos (gallery, moderation status). */
  photos: Probe;
  /** MK-02 amenities and first-visit text on the venue. */
  details: Probe;
  /** MK-04 business_classes.centium_spots / listed_on_explore. */
  spots: Probe;
  /** MK-05 promotions. */
  promotions: Probe;
  /** MK-06 feature_prices and featured_placements. */
  featurePrices: Probe;
  placements: Probe;
  /** MK-07 listing_events readers. */
  events: Probe;
  /** MB-03 membership_plans.plan_type / visible_on_explore (B7). */
  planFlags: Probe;
}

export async function probeMarketBackend(businessId: string): Promise<MarketBackend> {
  const [photos, details, spots, promotions, featurePrices, placements, events, planFlags] = await Promise.all([
    probe("business_photos", "id", ["business_id", businessId]),
    probe("gyms", "amenities, first_visit", ["business_id", businessId]),
    probe("business_classes", "centium_spots, listed_on_explore", ["business_id", businessId]),
    probe("promotions", "id", ["business_id", businessId]),
    probe("feature_prices", "area"),
    probe("featured_placements", "id", ["business_id", businessId]),
    (async (): Promise<Probe> => {
      const { error } = await db.rpc("listing_performance", { p_business_id: businessId });
      if (!error) return "live";
      return isAbsent(error) ? "pending" : "error";
    })(),
    probe("membership_plans", "plan_type, visible_on_explore", ["business_id", businessId]),
  ]);
  return { photos, details, spots, promotions, featurePrices, placements, events, planFlags };
}

/** All B13 / B7 pieces absent: what the local stack answers today. */
export const ALL_PENDING: MarketBackend = {
  photos: "pending",
  details: "pending",
  spots: "pending",
  promotions: "pending",
  featurePrices: "pending",
  placements: "pending",
  events: "pending",
  planFlags: "pending",
};

// ---------------------------------------------------------------------------
// Feature for a week: the price comes from the database only (V6-45). No
// price row (or no table) = the drawn copy without a price.

/** B13 feature_area: "Classes near you", "Gyms near you", "Shops near you". */
export type FeatureArea = "classes" | "gyms" | "shops";

export interface FeaturePrice {
  amount: number;
  currency: string;
}

/**
 * B13 feature_price_for(area, on): the price in force on that day (USD only,
 * the feature_prices check). Null = not on sale (or the function is absent).
 */
export async function fetchFeaturePrice(area: FeatureArea, on?: string): Promise<FeaturePrice | null> {
  const { data, error } = await db.rpc("feature_price_for", on ? { p_area: area, p_on: on } : { p_area: area });
  if (error || data === null || data === undefined) return null;
  const amount = Number(data);
  return Number.isFinite(amount) && amount > 0 ? { amount, currency: "USD" } : null;
}

export function priceLabel(p: FeaturePrice, cents = false): string {
  const sym = p.currency === "USD" ? "$" : `${p.currency} `;
  return `${sym}${cents ? p.amount.toFixed(2) : Number.isInteger(p.amount) ? String(p.amount) : p.amount.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Live writes on business_profiles (every column below is in the UPDATE grant).

/** business_profiles.active: the Explore listing switch. */
export async function saveListingActive(businessId: string, active: boolean): Promise<Result<null>> {
  const { error } = await db.from("business_profiles").update({ active }).eq("id", businessId);
  if (error) {
    console.error("[marketplace] Could not change the listing:", error.message);
    return fail(error, tk("Couldn't change your listing. Try again."));
  }
  return { ok: true, value: null };
}

/** business_profiles.perk: the listing perk, the first "Offers on your listing" row (V6-88). */
export async function saveListingPerk(businessId: string, perk: string | null): Promise<Result<string | null>> {
  const value = perk?.trim() ? perk.trim().slice(0, 120) : null;
  const { error } = await db.from("business_profiles").update({ perk: value }).eq("id", businessId);
  if (error) {
    console.error("[marketplace] Could not save the perk:", error.message);
    return fail(error, "Couldn't save. Try again.");
  }
  return { ok: true, value };
}

/** business_profiles.categories (B5, at most 5 closed keys): Activities / Item categories. */
export async function saveCategories(businessId: string, categories: string[]): Promise<Result<string[]>> {
  const value = [...new Set(categories)].slice(0, 5);
  const { error } = await db.from("business_profiles").update({ categories: value }).eq("id", businessId);
  if (error) {
    console.error("[marketplace] Could not save the categories:", error.message);
    return fail(error, "Couldn't save. Try again.");
  }
  return { ok: true, value };
}

/** The perk (BusinessFull leaves it out). */
export async function fetchPerk(businessId: string): Promise<Result<string | null>> {
  const { data, error } = await db.from("business_profiles").select("perk").eq("id", businessId).maybeSingle();
  if (error) return fail(error, "Couldn't load your marketplace.");
  return { ok: true, value: ((data as { perk: string | null } | null)?.perk ?? null) || null };
}
