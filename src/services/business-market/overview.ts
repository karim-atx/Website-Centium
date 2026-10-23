// Market + Share 3.0 · W3 · B-MA.1 Listing Overview readers.
//
// - business_marketplace_overview(p_business_id): DB5 (PLAN §2.2), through
//   marketRpc so a stage that hasn't landed answers `pending` (the ledger's
//   quiet "–"), never an error.
// - members_reached: the live business_profiles column (self-reported, owner
//   writable). No live reader has a daily series or a month-on-month change
//   for it (listing_performance is weekly impressions, a different figure),
//   so the hero shows the figure alone: no sparkline series, no delta.
// - reorder_showcase_items(p_ids) (Database 73ea87b, 20261211400000): `sort`
//   becomes each id's position in the array; every id is checked before
//   anything moves (ATX96 = one of them isn't the caller's to move: a
//   professional's own, or a business's with the `store` capability). Shared
//   by the business Showcase (B-MA.2) and the professional's shelf (P-MA.2).

import { supabase } from "../../../lib/supabase/client";
import { marketRpc, num, type MarketResult } from "../market/rpc";
import { parseOverview, REORDER_NOT_YOURS, type MarketplaceOverview } from "./overviewModel";

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

/** Saves a shelf's order (ids top to bottom); the value is how many rows moved. */
export async function reorderShowcase(ids: string[]): Promise<MarketResult<number>> {
  const r = await marketRpc("reorder_showcase_items", { p_ids: ids }, "Couldn't save the order. Try again.", (data) => num(data) ?? 0);
  if (!r.ok && r.code === "ATX96") return { ...r, message: REORDER_NOT_YOURS };
  return r;
}
