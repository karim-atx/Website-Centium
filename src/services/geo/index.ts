// Mock "Google Maps"-style distance ranking — real geolocation when granted,
// a sensible Beirut-center fallback otherwise. No mapping SDK involved.

export interface Coords {
  lat: number;
  lng: number;
}

export const BEIRUT_CENTER: Coords = { lat: 33.8938, lng: 35.5018 };

/** Haversine distance in kilometers. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(BEIRUT_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(BEIRUT_CENTER),
      { timeout: 4000 }
    );
  });
}
