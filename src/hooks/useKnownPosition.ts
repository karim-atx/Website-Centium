import { useEffect, useState } from "react";
import { locationPermission, requestPosition, type Coords } from "../services/geo";

// The device's position for Explore's distances (PB-O-50, B9), ONLY when the
// browser has already been allowed to share it: this never shows the
// permission prompt (Explore has no "use my location" step), so with location
// off or not yet asked the distance simply isn't shown (MO1.4 #43: "Location
// off: no distance"). The position stays on the device; distances are worked
// out here, as on the professionals map. One read per session, shared by
// every card.

let pending: Promise<Coords | null> | null = null;

function knownPosition(): Promise<Coords | null> {
  if (!pending) {
    pending = (async () => {
      if ((await locationPermission()) !== "granted") return null;
      const r = await requestPosition();
      return r.ok ? r.coords : null;
    })();
    // A failure is not remembered, so a later screen can try again.
    void pending.then((c) => {
      if (!c) pending = null;
    });
  }
  return pending;
}

export function useKnownPosition(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(null);
  useEffect(() => {
    let live = true;
    void knownPosition().then((c) => live && setCoords(c));
    return () => {
      live = false;
    };
  }, []);
  return coords;
}
