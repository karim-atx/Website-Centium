// DJ (Karim, 2026-10-27): the Professionals list's Distance filter and sort,
// worked out ON THE DEVICE (services/geo/distance.ts). The server gets only a
// radius bucket and a point rounded to one decimal place (about 11 km), so a
// 5 km choice is meaningful only when it is also applied here, to the
// distance from each professional's approximate area (two decimals, ~1 km).
// Not drawn for professionals: the groups and options follow the Explore
// classes filter (classFilterModel) and pro Openings ("Within 5 km").

import { distanceKm, type Coords } from "../../services/geo/distance";

export const DISTANCE_OPTIONS = ["Within 5 km", "Within 10 km", "Within 25 km", "Within 50 km"] as const;

export const SORTS = ["Best match", "Nearest"] as const;
export type DirectorySort = (typeof SORTS)[number];

/** The server's default radius for the ranked list when no distance is chosen. */
export const DEFAULT_RADIUS_KM = 50;

const kmOf = (option: string): number | null => {
  const m = /^Within (\d+) km$/.exec(option);
  return m ? Number(m[1]) : null;
};

/**
 * The radius the chosen Distance options allow: the widest one checked (the
 * rows are checkboxes, as in every FilterPopup group), or null for none.
 */
export function chosenRadiusKm(selected: readonly string[]): number | null {
  const kms = selected.map(kmOf).filter((k): k is number => k != null);
  return kms.length ? Math.max(...kms) : null;
}

export interface Placed {
  approxLat: number | null;
  approxLng: number | null;
}

/** The distance from the point to a professional's approximate area, or null when either is unknown. */
export function deviceDistance(point: Coords | null, p: Placed): number | null {
  if (!point || p.approxLat == null || p.approxLng == null) return null;
  const d = distanceKm(point, { lat: p.approxLat, lng: p.approxLng });
  return Number.isFinite(d) ? d : null;
}

/**
 * The list as shown: within the chosen radius (professionals with no area,
 * who can't be measured, stay and go last: they can still be reached
 * online), in the server's best-match order or nearest first. Stable, so
 * ties keep the server's order.
 */
export function arrangeDirectory<T extends { distanceKm?: number | null }>(hits: readonly T[], maxKm: number | null, sort: DirectorySort): T[] {
  const measured = hits.filter((h) => h.distanceKm != null);
  const unmeasured = hits.filter((h) => h.distanceKm == null);
  const inRange = maxKm == null ? measured : measured.filter((h) => (h.distanceKm as number) <= maxKm);
  const ordered = sort === "Nearest" ? [...inRange].sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number)) : inRange;
  if (sort === "Nearest" || maxKm != null) return [...ordered, ...unmeasured];
  // Best match with no distance chosen: exactly the server's order.
  return hits.slice();
}
