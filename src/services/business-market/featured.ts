import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { FeatureArea, Result } from "./index";
import { featureErrorMessage, toPlacement, type Placement, type PlacementRow, type PlacementTarget } from "./promoLogic";

// B13 MK-06 Feature for a week (HANDOVER_API "Feature for a week (MK-06)").
//   request_featured_week(p_business_id, p_target_kind, p_target_id, p_area, p_starts_on) → placement id
//     OWNER ONLY (ATX03); start within 90 days (22023); 3 per area per week or not on sale (ATXF7).
//     Opens a pending Centium charge (centium_charges product featured_week): the
//     business pays Centium; it shows in Subscriptions and billing.
//   retry_featured_week(p_placement_id, p_starts_on): only payment_not_received; reopens the same charge.
//   my_featured_placements(p_business_id) gate marketing or revenue.
// The price is always read from feature_price_for (index.ts fetchFeaturePrice).

const db = typed as unknown as SupabaseClient;

type Err = { code?: string; message?: string };

const fail = <T>(e: Err, fallback: string): Result<T> => ({
  ok: false,
  code: e.code,
  message: isOffline(e) ? OFFLINE_MESSAGE : featureErrorMessage(e, fallback),
});

export async function fetchPlacements(businessId: string): Promise<Result<Placement[]>> {
  try {
    const { data, error } = await db.rpc("my_featured_placements", { p_business_id: businessId });
    if (error) return fail(error, "Couldn't load your featured weeks.");
    return { ok: true, value: ((data ?? []) as PlacementRow[]).map(toPlacement) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't load your featured weeks." };
  }
}

export async function requestFeaturedWeek(businessId: string, target: { kind: PlacementTarget; id: string }, area: FeatureArea, startsOn: string): Promise<Result<string>> {
  try {
    const { data, error } = await db.rpc("request_featured_week", { p_business_id: businessId, p_target_kind: target.kind, p_target_id: target.id, p_area: area, p_starts_on: startsOn });
    if (error) {
      console.error("[featured]", error.code, error.message);
      return fail(error, "Couldn't send your request. Try again.");
    }
    return { ok: true, value: String(data) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't send your request. Try again." };
  }
}

export async function retryFeaturedWeek(placementId: string, startsOn: string): Promise<Result<null>> {
  try {
    const { error } = await db.rpc("retry_featured_week", { p_placement_id: placementId, p_starts_on: startsOn });
    if (error) {
      console.error("[featured]", error.code, error.message);
      return fail(error, "Couldn't send your request. Try again.");
    }
    return { ok: true, value: null };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't send your request. Try again." };
  }
}
