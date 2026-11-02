// Market + Share 3.0 · W3 · B-MA.1 Listing Overview readers.
//
// - business_marketplace_overview(p_business_id): DB5 (Database PR #39) as
//   rebuilt by PR #40 (20261215020000), the `marketing` permission (42501
//   otherwise), through marketRpc. It now carries the measured reach
//   (clients_reached: profile_open + offer_view this month, in the business's
//   own days), its change against last month and a 30-day sparkline, which
//   the hero draws. business_profiles.members_reached (self-reported, owner
//   writable) is no longer read here.
// - reorder_showcase_items(p_ids) (Database 73ea87b, 20261211400000): `sort`
//   becomes each id's position in the array; every id is checked before
//   anything moves (ATX96 = one of them isn't the caller's to move: a
//   professional's own, or a business's with the `store` capability). Shared
//   by the business Showcase (B-MA.2) and the professional's shelf (P-MA.2).

import { marketRpc, num, type MarketResult } from "../market/rpc";
import { parseOverview, REORDER_NOT_YOURS, type MarketplaceOverview } from "./overviewModel";
import { t } from "../../i18n/core";

export function fetchMarketplaceOverview(businessId: string): Promise<MarketResult<MarketplaceOverview | null>> {
  return marketRpc("business_marketplace_overview", { p_business_id: businessId }, "Couldn't load your marketplace figures.", parseOverview);
}

/** Saves a shelf's order (ids top to bottom); the value is how many rows moved. */
export async function reorderShowcase(ids: string[]): Promise<MarketResult<number>> {
  const r = await marketRpc("reorder_showcase_items", { p_ids: ids }, "Couldn't save the order. Try again.", (data) => num(data) ?? 0);
  if (!r.ok && r.code === "ATX96") return { ...r, message: t(REORDER_NOT_YOURS) };
  return r;
}
