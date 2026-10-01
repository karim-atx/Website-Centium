// Distances for the professionals map, worked out ON THE DEVICE. The server
// never receives the user's precise position (only a point rounded to one
// decimal place) and never returns a distance; it returns each professional's
// approximate area (two decimal places, about 1 km), and the distance shown is
// computed here from that. Pure, so it is tested in node.

export interface Coords {
  lat: number;
  lng: number;
}

/** Haversine distance in kilometres. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/**
 * How a distance reads. Approximate by construction (the professional's area
 * is a ~1 km cell), so it never claims more precision than that.
 */
export function describeDistance(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return "under 1 km away";
  return `about ${Math.round(km)} km away`;
}

/** The only precision of the user's position that leaves the device. */
export function coarsePoint(c: Coords): Coords {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { lat: r1(c.lat), lng: r1(c.lng) };
}

/**
 * Pins that share an approximate area, together. Professionals in the same
 * ~1 km cell would otherwise sit exactly on top of each other, so they become
 * one pin with a count that expands on tap.
 */
export function groupByPoint<T extends { lat: number; lng: number }>(items: T[]): { lat: number; lng: number; items: T[] }[] {
  const groups = new Map<string, { lat: number; lng: number; items: T[] }>();
  for (const it of items) {
    const key = `${it.lat.toFixed(2)},${it.lng.toFixed(2)}`;
    const g = groups.get(key);
    if (g) g.items.push(it);
    else groups.set(key, { lat: it.lat, lng: it.lng, items: [it] });
  }
  return [...groups.values()];
}
