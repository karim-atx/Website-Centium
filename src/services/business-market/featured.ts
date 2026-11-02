import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Result } from "./index";
import { toPlacement, type Placement, type PlacementRow } from "./promoLogic";

// B13 MK-06 Feature for a week (HANDOVER_API "Feature for a week (MK-06)"),
// read only:
//   my_featured_placements(p_business_id) gate marketing or revenue.
// G fixes 4: nothing paid to Centium is bought on the web. A featured week is
// bought in the Centium app, so request_featured_week and retry_featured_week
// (which opened or reopened a Centium charge) are no longer called.
// The price is always read from feature_price_for (index.ts fetchFeaturePrice).

const db = typed as unknown as SupabaseClient;

const LOAD_FAILED = "Couldn't load your featured weeks.";

export async function fetchPlacements(businessId: string): Promise<Result<Placement[]>> {
  try {
    const { data, error } = await db.rpc("my_featured_placements", { p_business_id: businessId });
    if (error) return { ok: false, code: error.code, message: isOffline(error) ? OFFLINE_MESSAGE : LOAD_FAILED };
    return { ok: true, value: ((data ?? []) as PlacementRow[]).map(toPlacement) };
  } catch (e) {
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : LOAD_FAILED };
  }
}
