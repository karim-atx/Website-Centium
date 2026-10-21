// CQ (Batch 2, HANDOVER_API "Price markers on the Revenue chart",
// migration 20261202000000): the plan price changes the Revenue chart marks.
// Untyped rpc at the boundary (services/pro/rpc.ts), narrow cast to the
// documented row; database.types.ts is not regenerated.

import { rpc } from "../pro/rpc";
import { isOffline } from "../network-error";
import { sinceDay, toPriceChange, type PriceChange, type PriceMarkerRow } from "./priceMarkerLogic";

export type PriceSinceResult = { ok: true; value: string | null } | { ok: false };

/**
 * plan_price_tracking_since() → timestamptz: when this database began
 * recording plan price changes (no backfill: the old prices were
 * overwritten). NULL means nothing is recorded yet, so no "since" date is
 * shown at all. Answered as the device's day, the clock the chart's `today`
 * uses.
 */
export async function fetchPriceTrackingSince(): Promise<PriceSinceResult> {
  try {
    const { data, error } = await rpc("plan_price_tracking_since");
    if (error) return { ok: false };
    return { ok: true, value: sinceDay(data as string | null) };
  } catch {
    return { ok: false };
  }
}

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
