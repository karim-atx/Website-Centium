// Market + Share 3.0 · professional public profile, Centium work history and
// the ranked directory (C-MO.4.9, P-MA.2 Work history, the Apply sheet's
// Work history chip).
//
// Database Release 2 (ff093b7 + 5a907d6; the migration comments and function
// definitions are the contract):
// - professional_public_profile(p_professional_id): the card and its numbers
//   (professional_rating(): client and class reviews in one figure); EMPTY
//   for an unlisted professional;
// - work_history(p_professional_id): every hire, any professional;
// - professionals_ranked(p_lat, p_lng, p_radius_km, p_subtype,
//   p_before_score, p_before_id, p_limit): the directory ranked on
//   platform_settings' weights (work history 0.4, reviews 0.4, distance 0.2,
//   distance by BAND), keyset (rank_score desc, id). It needs a point: the
//   area the member chose on this device, or their position when location is
//   already allowed (never prompted here).
// - public_offers(p_owner_kind, p_owner_id) (Database PR #39,
//   20261214010000): the profile's live point offers (nothing for an
//   unlisted professional, signed in only).
// No reader in the contract for reviews with their class and gym on a
// profile, a profile's Book / Hire services or Teaches at (Database gap):
// those stay empty and the screens keep their live sources.

import { marketRpc, type MarketResult } from "../market/rpc";
import { coarsePoint, type Coords } from "../geo/distance";
import { parseDirectory, parsePublicProfile, parseWork, type DirectoryHit, type PublicProfile, type WorkEntry } from "./model";
import { rows } from "../market/parse";

export * from "./model";

/** work_history(p_professional_id). */
export function fetchWorkHistory(professionalId: string): Promise<MarketResult<WorkEntry[]>> {
  return marketRpc("work_history", { p_professional_id: professionalId }, "Couldn't load the work history.", parseWork);
}

/** professional_public_profile + work_history + public_offers; null for an unlisted professional (no public profile). */
export async function fetchPublicProfile(professionalId: string): Promise<MarketResult<PublicProfile | null>> {
  const fallback = "Couldn't load this profile.";
  const [p, w, o] = await Promise.all([
    marketRpc("professional_public_profile", { p_professional_id: professionalId }, fallback, rows),
    marketRpc("work_history", { p_professional_id: professionalId }, fallback, rows),
    marketRpc("public_offers", { p_owner_kind: "professional", p_owner_id: professionalId }, fallback, rows),
  ]);
  if (!p.ok) return p;
  if (!w.ok) return w;
  // The offers are one block on About: a failed read leaves it out rather than failing the profile.
  return { ok: true, value: parsePublicProfile(p.value, w.value, o.ok ? o.value : []) };
}

/** professional_rating(p_professional_id): the one rating (client + class reviews); null average when there are none. */
export function fetchProfessionalRating(professionalId: string): Promise<MarketResult<{ average: number | null; count: number }>> {
  return marketRpc("professional_rating", { p_professional_id: professionalId }, "Couldn't load the rating.", (d) => {
    const r = rows(d)[0] ?? {};
    const avg = typeof r.average_rating === "number" ? r.average_rating : r.average_rating != null ? Number(r.average_rating) : null;
    const n = Number(r.review_count ?? 0);
    return { average: avg != null && Number.isFinite(avg) ? avg : null, count: Number.isFinite(n) ? n : 0 };
  });
}

export interface RankedQuery {
  point: Coords;
  radiusKm?: number;
  subtype: string | null;
}

/** professionals_ranked's limits: 50 a page; pages read here before stopping (each page is one of the 240 nearby searches an hour). */
const PAGE = 50;
const MAX_PAGES = 4;

/**
 * The ranked directory, every page up to MAX_PAGES, each asked with the
 * exact cursor of the last row of the page before (p_before_score =
 * rank_score, p_before_id = professional_id). The point is coarsened to
 * one decimal place before it leaves the device, as the map does.
 */
export async function fetchRankedDirectory(q: RankedQuery): Promise<MarketResult<DirectoryHit[]>> {
  const point = coarsePoint(q.point);
  const out: DirectoryHit[] = [];
  let before = null as { score: number; id: string } | null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const r: MarketResult<DirectoryHit[]> = await marketRpc(
      "professionals_ranked",
      {
        p_lat: point.lat,
        p_lng: point.lng,
        p_radius_km: q.radiusKm ?? 50,
        p_subtype: q.subtype,
        p_before_score: before?.score ?? null,
        p_before_id: before?.id ?? null,
        p_limit: PAGE,
      },
      "Couldn't load professionals.",
      parseDirectory,
    );
    if (!r.ok) return page === 0 ? r : { ok: true, value: out };
    const offset = out.length;
    out.push(...r.value.map((h, i) => ({ ...h, rank: offset + i + 1 })));
    const last: DirectoryHit | undefined = r.value[r.value.length - 1];
    if (r.value.length < PAGE || !last || last.score == null) break;
    before = { score: last.score, id: last.id };
  }
  return { ok: true, value: out };
}
