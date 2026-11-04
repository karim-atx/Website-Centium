import { useEffect, useState } from "react";
import { fetchVenueEntrySystem, type VenueEntrySystem } from "../../services/front-desk/entrySystem";

// Round H (EU): gyms.entry_system for one venue, read once per venue. A
// database before Round H reads as no own system (fetchVenueEntrySystem).

/** The gym's own entry system, or null while unknown or when it has none. */
export function useVenueEntrySystem(gymId: string | null | undefined): VenueEntrySystem | null {
  const [state, setState] = useState<{ gymId: string; value: VenueEntrySystem } | null>(null);
  useEffect(() => {
    if (!gymId) return;
    let alive = true;
    void fetchVenueEntrySystem(gymId).then((r) => {
      if (alive && r.ok) setState({ gymId, value: r.value });
    });
    return () => {
      alive = false;
    };
  }, [gymId]);
  const value = state && state.gymId === gymId ? state.value : null;
  return value && value.system !== "none" ? value : null;
}
