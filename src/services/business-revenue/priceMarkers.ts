// CQ (Batch 2, HANDOVER_API "Price markers on the Revenue chart",
// migration 20261202000000): the plan price changes the Revenue chart marks.
// Untyped rpc at the boundary (services/pro/rpc.ts), narrow cast to the
// documented row; database.types.ts is not regenerated.

import { rpc } from "../pro/rpc";
import { isOffline } from "../network-error";
import { toPriceChange, type PriceChange, type PriceMarkerRow } from "./priceMarkerLogic";

/**
 * The first day plan price changes were recorded. History starts when
 * migration 20261202000000 shipped, with NO backfill (the old prices were
 * overwritten), and no reader returns that day, so it lives here.
 *
 * MUST EQUAL THE DAY THE MIGRATION WAS APPLIED IN PRODUCTION. 2026-10-21 is
 * the day it reached the shared local stack; change this when production
 * gets it, or the chart will claim history it doesn't have.
 */
export const PRICE_HISTORY_STARTS = "2026-10-21";

export type PriceMarkersResult =
  | { ok: true; value: PriceChange[] }
  | { ok: false; offline: boolean };

/** plan_price_markers(p_business_id, p_from, p_to): the window's changes, oldest first. */
export async function fetchPriceMarkers(
  businessId: string,
  from: string,
  to: string,
): Promise<PriceMarkersResult> {
  try {
    const { data, error } = await rpc("plan_price_markers", {
      p_business_id: businessId,
      p_from: from,
      p_to: to,
    });
    if (error) return { ok: false, offline: isOffline(error) };
    return { ok: true, value: ((data as PriceMarkerRow[] | null) ?? []).map(toPriceChange) };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}
