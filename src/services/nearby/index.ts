import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { coarsePoint, type Coords } from "../geo/distance";
import { parseNearby, type NearbyCursor, type NearbyProfessional, type ReachedProfessional } from "./model";
import { tk } from "../../i18n/core";

export type { NearbyCursor, NearbyProfessional, ReachedProfessional } from "./model";

// Professionals near a point, for the map (Database dd274ee,
// professionals_in_area). Signed-in only, and limited to 240 searches an hour
// per account (Release B meters the map on its own key, nearby_map), so the
// map searches only when its view changes meaningfully.
//
// WHAT LEAVES THE DEVICE: a point rounded to one decimal place (about 11 km),
// sent as a bound parameter through supabase.rpc, and (Release B,
// 20261217020000) the searcher's ISO country when known and "Include other
// countries" when chosen. The user's precise position is never sent or
// stored. WHAT COMES BACK: each professional's approximate area (two decimal
// places, about 1 km), or no point for an online result. Distances shown are
// computed on the device from that; the server's distance_band is used only
// for paging.

/** The generated types predate Release B's arguments (not regenerated, per the brief). */
const client = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PostgrestError | null }> };

export type NearbyResult =
  | { ok: true; professionals: NearbyProfessional[]; online: ReachedProfessional[]; next: NearbyCursor | null }
  | { ok: false; message: string; rateLimited?: boolean };

export interface NearbyOptions {
  /** The searcher's ISO country (countryOfArea / countryNear); omitted when unknown. */
  countryCode?: string | null;
  /** p_any_country: "Include other countries". */
  anyCountry?: boolean;
}

const PAGE = 50;

export async function fetchNearby(center: Coords, radiusKm: number, after?: NearbyCursor, opts: NearbyOptions = {}): Promise<NearbyResult> {
  const point = coarsePoint(center);
  const { data, error } = await client.rpc("professionals_in_area", {
    p_lat: point.lat,
    p_lng: point.lng,
    p_radius_km: Math.min(100, Math.max(1, Math.round(radiusKm))),
    p_before_band: after?.band,
    p_before_id: after?.id,
    p_limit: PAGE,
    ...(opts.countryCode ? { p_country_code: opts.countryCode } : {}),
    ...(opts.anyCountry ? { p_any_country: true } : {}),
  });
  if (error) {
    console.error("[nearby] Search failed:", error.code, error.message);
    if (error.code === "ATX02") {
      return {
        ok: false,
        rateLimited: true,
        message: tk("You've searched the map a lot in the last hour. The list below still works; try the map again later."),
      };
    }
    if (error.code === "42501") return { ok: false, message: tk("Sign in to see professionals near you.") };
    return { ok: false, message: tk("Couldn't load the map right now. Try again.") };
  }
  const page = parseNearby(data);
  return {
    ok: true,
    professionals: page.professionals,
    online: page.online,
    next: page.count === PAGE ? page.last : null,
  };
}
