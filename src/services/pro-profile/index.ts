// Market + Share 3.0 · W5 · professional public profile, Centium work history,
// class-context reviews, ranked directory (C-MO.4.9, P-MA.2 Work history).
//
// Database stage DB10 has NOT landed (checked 2026-10-22: no Release 2 branch
// in ../Database; none of these functions on the local stack). The calls
// follow PLAN §2.2 DB10 and api.md "Reviews and work history" / "Read
// endpoints"; `pending` is the screens' quiet designed state, never sample
// data. The live directory (public_professional_directory, services/directory)
// and the live client reviews (services/professional-reviews) keep working
// meanwhile; the screens fall back to them.

import { marketRpc, type MarketResult } from "../market/rpc";
import { parseDirectory, parsePublicProfile, type DirectoryHit, type PublicProfile } from "./model";

export * from "./model";

/** professional_public_profile(p_id): card, about, services, offers, work history, reviews, Teaches at. */
export function fetchPublicProfile(professionalId: string): Promise<MarketResult<PublicProfile | null>> {
  // awaiting DB stage DB10
  return marketRpc("professional_public_profile", { p_id: professionalId }, "Couldn't load this profile.", parsePublicProfile);
}

export interface DirectoryQuery {
  query: string | null;
  specialty: string | null;
  lat: number | null;
  lng: number | null;
  limit?: number;
  before?: number | null;
}

/** search_directory: ranked by Centium work history 40%, reviews 40%, distance 20% (D-44). No contact fields. */
export function searchDirectory(q: DirectoryQuery): Promise<MarketResult<DirectoryHit[]>> {
  // awaiting DB stage DB10
  return marketRpc(
    "search_directory",
    { p_query: q.query || null, p_specialty: q.specialty, p_lat: q.lat, p_lng: q.lng, p_limit: q.limit ?? 30, p_before: q.before ?? null },
    "Couldn't load professionals.",
    parseDirectory,
  );
}
