import { supabase } from "../../../lib/supabase/client";
import type { DirectoryListing } from "../directory";
import { coarsePoint, type Coords } from "../geo/distance";

// Professionals near a point, for the map (Database dd274ee,
// professionals_in_area). Signed-in only, and limited to 60 searches an hour
// per account, so the map searches only when its view changes meaningfully.
//
// WHAT LEAVES THE DEVICE: a point rounded to one decimal place (about 11 km),
// sent as a bound parameter through supabase.rpc. The user's precise position
// is never sent or stored. WHAT COMES BACK: each professional's approximate
// area (two decimal places, about 1 km). Distances shown are computed on the
// device from that; the server's distance_band is used only for paging.

export interface NearbyProfessional extends DirectoryListing {
  /** The professional's approximate area, about 1 km. */
  lat: number;
  lng: number;
  /** Their own words for the area, e.g. "Hamra". */
  areaLabel: string | null;
}

export interface NearbyCursor {
  band: number;
  id: string;
}

export type NearbyResult =
  | { ok: true; professionals: NearbyProfessional[]; next: NearbyCursor | null }
  | { ok: false; message: string; rateLimited?: boolean };

const PAGE = 50;

export async function fetchNearby(center: Coords, radiusKm: number, after?: NearbyCursor): Promise<NearbyResult> {
  const point = coarsePoint(center);
  const { data, error } = await supabase.rpc("professionals_in_area", {
    p_lat: point.lat,
    p_lng: point.lng,
    p_radius_km: Math.min(100, Math.max(1, Math.round(radiusKm))),
    p_before_band: after?.band,
    p_before_id: after?.id,
    p_limit: PAGE,
  });
  if (error) {
    console.error("[nearby] Search failed:", error.code, error.message);
    if (error.code === "ATX02") {
      return {
        ok: false,
        rateLimited: true,
        message: "You've searched the map a lot in the last hour. The list below still works; try the map again later.",
      };
    }
    if (error.code === "42501") return { ok: false, message: "Sign in to see professionals near you." };
    return { ok: false, message: "Couldn't load the map right now. Try again." };
  }
  const rows = data ?? [];
  const professionals: NearbyProfessional[] = rows
    .filter((r) => r.professional_id && r.approx_lat !== null && r.approx_lng !== null)
    .map((r) => ({
      profileId: r.professional_id,
      name: r.first_name?.trim() || "Professional",
      avatarUrl: r.avatar_url,
      subtype: r.professional_subtype,
      specialty: r.specialty,
      location: r.location,
      bio: r.bio,
      monthlyRate: r.monthly_rate,
      consultationRate: r.consultation_rate,
      paymentModalities: (r.payment_modalities ?? []) as DirectoryListing["paymentModalities"],
      averageRating: r.average_rating,
      reviewCount: Number(r.review_count ?? 0),
      headline: r.headline,
      skills: r.skills ?? [],
      hasVerifiedLicence: !!r.has_verified_licence,
      lat: Number(r.approx_lat),
      lng: Number(r.approx_lng),
      areaLabel: r.area_label,
    }));
  const last = rows[rows.length - 1];
  return {
    ok: true,
    professionals,
    next: rows.length === PAGE && last ? { band: last.band_rank, id: last.professional_id } : null,
  };
}
