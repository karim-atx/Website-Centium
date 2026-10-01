// Location for the professionals map, asked for only when the user acts.
//
// THERE IS NO DEFAULT POSITION. This used to resolve to a fixed point in
// Beirut whenever location was refused, unavailable or slow, so a screen could
// not tell "here you are" from "we guessed". Every failure now comes back as a
// failure with a reason, and the caller offers an area picker instead.

import { areaById, type Area } from "./areas";

export { distanceKm, describeDistance, coarsePoint, groupByPoint, type Coords } from "./distance";
import type { Coords } from "./distance";

export type LocationPermission = "granted" | "prompt" | "denied" | "unsupported";

/**
 * The current location permission, WITHOUT prompting. Browsers without the
 * Permissions API (or without "geolocation" in it) answer "prompt": asking is
 * the only way to find out there.
 */
export async function locationPermission(): Promise<LocationPermission> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (!status) return "prompt";
    return status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
  } catch {
    return "prompt";
  }
}

export type PositionResult =
  | { ok: true; coords: Coords }
  | { ok: false; reason: "denied" | "timeout" | "unavailable" | "unsupported"; message: string };

const MESSAGES: Record<Exclude<PositionResult, { ok: true }>["reason"], string> = {
  denied: "Location is turned off for Centium. Choose an area instead, or allow location in your browser settings.",
  timeout: "Finding your location took too long. Choose an area instead.",
  unavailable: "Your location isn't available right now. Choose an area instead.",
  unsupported: "This browser can't share a location. Choose an area instead.",
};

/**
 * Asks for the user's position. May show the browser's prompt, so call it
 * only from a user action. Coarse accuracy is enough and is faster.
 */
export function requestPosition(timeoutMs = 10000): Promise<PositionResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unsupported", message: MESSAGES.unsupported });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      (err) => {
        const reason = err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable";
        resolve({ ok: false, reason, message: MESSAGES[reason] });
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60_000 }
    );
  });
}

// The chosen area is remembered ON THIS DEVICE ONLY, by its id. A position
// from the device is never stored anywhere.
const AREA_KEY = "centium-map:area";

export function savedArea(): Area | undefined {
  try {
    return areaById(localStorage.getItem(AREA_KEY));
  } catch {
    return undefined;
  }
}

export function saveArea(id: string | null): void {
  try {
    if (id) localStorage.setItem(AREA_KEY, id);
    else localStorage.removeItem(AREA_KEY);
  } catch {
    /* a blocked storage only costs remembering the choice */
  }
}
