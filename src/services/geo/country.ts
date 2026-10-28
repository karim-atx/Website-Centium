// Release B (Karim; Database 20261217010000 / 020000): the device sends an
// ISO 3166-1 alpha-2 country code with the area label, and with each map and
// list search; the database has nothing to derive one from. Worked out ON
// THE DEVICE from the areas list, never from a third-party geocoder (the
// position would leave the device).
//
// UNKNOWN IS ALWAYS SAFE, so the rule is narrow: a professional who saves
// no country stays findable from anywhere, and a searcher who sends none gets
// what they got before. A wrong country is the only harm (it hides people),
// so a point counts as an area's country only close to a known area.

import { AREAS, type Area } from "./areas";
import { distanceKm, type Coords } from "./distance";

/** Every area in AREAS is in Lebanon. */
export const AREAS_COUNTRY = "LB";

/**
 * How near the nearest known area a point must be to take its country.
 * Lebanon is about 50 km wide and the 32 areas cover it; 20 km keeps a point
 * across a border (Damascus is about 45 km from Chtaura) unknown.
 */
export const COUNTRY_REACH_KM = 20;

/** A chosen area's country. */
export const countryOfArea = (a: Pick<Area, "id"> | null | undefined): string | null => (a ? AREAS_COUNTRY : null);

/** A point's country: that of the nearest known area within reach, else unknown (null). */
export function countryNear(p: Coords | null | undefined): string | null {
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  let best = Infinity;
  for (const a of AREAS) best = Math.min(best, distanceKm(p, a));
  return best <= COUNTRY_REACH_KM ? AREAS_COUNTRY : null;
}
