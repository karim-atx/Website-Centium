// professionals_in_area rows, parsed (pure, so node:test runs it).
//
// Release B (Database 20261217020000): the map also returns online
// professionals, from anywhere, in band 7 ("online") with NO point; every row
// carries work_mode, service_radius_km, session_places, is_online_only,
// has_area and country_code. A row with a point is a pin; one without is an
// online result, shown after the pins in the swipe strip, labelled "Online".

import type { DirectoryListing } from "../directory/model";
import { num, rows, str } from "../market/parse";
import { parseReach, type Reach } from "../pro-profile/model";

/** A professional the map can reach: the live listing plus how they work. */
export interface ReachedProfessional extends DirectoryListing, Reach {
  /** Their own words for the area, e.g. "Hamra". */
  areaLabel: string | null;
}

export interface NearbyProfessional extends ReachedProfessional {
  /** The professional's approximate area, about 1 km. */
  lat: number;
  lng: number;
}

export interface NearbyCursor {
  band: number;
  id: string;
}

export interface NearbyPage {
  /** In person, with a point: the pins. */
  professionals: NearbyProfessional[];
  /** Online (no point): never a pin. */
  online: ReachedProfessional[];
  /** The last row's (band_rank, professional_id), whichever kind it was. */
  last: NearbyCursor | null;
  count: number;
}

export function parseNearby(data: unknown): NearbyPage {
  const list = rows(data);
  const professionals: NearbyProfessional[] = [];
  const online: ReachedProfessional[] = [];
  for (const r of list) {
    const id = str(r.professional_id);
    if (!id) continue;
    const p: ReachedProfessional = {
      profileId: id,
      name: str(r.first_name)?.trim() || "Professional",
      avatarUrl: str(r.avatar_url),
      subtype: (str(r.professional_subtype) as DirectoryListing["subtype"]) ?? null,
      specialty: str(r.specialty),
      location: str(r.location),
      bio: str(r.bio),
      monthlyRate: num(r.monthly_rate),
      consultationRate: num(r.consultation_rate),
      paymentModalities: (Array.isArray(r.payment_modalities) ? r.payment_modalities : []) as DirectoryListing["paymentModalities"],
      averageRating: num(r.average_rating),
      reviewCount: num(r.review_count) ?? 0,
      headline: str(r.headline),
      skills: Array.isArray(r.skills) ? (r.skills as unknown[]).map(str).filter((s): s is string => !!s) : [],
      hasVerifiedLicence: r.has_verified_licence === true,
      areaLabel: str(r.area_label),
      ...parseReach(r),
    };
    const lat = num(r.approx_lat);
    const lng = num(r.approx_lng);
    if (lat != null && lng != null) professionals.push({ ...p, lat, lng });
    else online.push(p);
  }
  const lastRow = list[list.length - 1];
  const band = lastRow ? num(lastRow.band_rank) : null;
  const lastId = lastRow ? str(lastRow.professional_id) : null;
  return { professionals, online, last: band != null && lastId ? { band, id: lastId } : null, count: list.length };
}
