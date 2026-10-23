// Market + Share 3.0 · W3 · B-MA.1 Listing Overview readers.
//
// - business_marketplace_overview(p_business_id): DB5 (PLAN §2.2), through
//   marketRpc so a stage that hasn't landed answers `pending` (the ledger's
//   quiet "–"), never an error.
// - members_reached: the live business_profiles column (self-reported, owner
//   writable). No live reader has a daily series or a month-on-month change
//   for it (listing_performance is weekly impressions, a different figure),
//   so the hero shows the figure alone: no sparkline series, no delta.
// - reorder_business_offerings(p_ids): DB3. `business_offerings.sort` exists
//   (20261210900000) but no reorder function does, and authenticated has no
//   UPDATE grant on `sort` (an owner can't write it), so the Showcase never
//   selects it and shows the live order.

import { supabase } from "../../../lib/supabase/client";
import { marketRpc, type MarketResult } from "../market/rpc";
import { parseOverview, type MarketplaceOverview } from "./overviewModel";

export async function fetchMarketplaceOverview(businessId: string): Promise<MarketResult<MarketplaceOverview | null>> {
  // awaiting DB stage DB5
  return marketRpc("business_marketplace_overview", { p_business_id: businessId }, "Couldn't load your marketplace figures.", parseOverview);
}

/** business_profiles.members_reached, or null when it can't be read. */
export async function fetchMembersReached(businessId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.from("business_profiles").select("members_reached").eq("id", businessId).maybeSingle();
    if (error || !data) return null;
    const n = Number((data as { members_reached: number | null }).members_reached);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Saves the Showcase order (ids top to bottom). */
export async function reorderShowcase(ids: string[]): Promise<MarketResult<null>> {
  // awaiting DB stage DB3
  return marketRpc("reorder_business_offerings", { p_ids: ids }, "Couldn't save the order. Try again.", () => null);
}
