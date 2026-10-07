import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { resolveMyBusinessId } from "../services/business-profile";
import { fetchMyVenues } from "../services/venues/console";
import { pickVenue, type MyVenue } from "../services/venues/consoleLogic";

// The venue console's list and switcher (backend stage A4, my_venues()).
//
// OWNER OR STAFF. my_venues() is is_business_insider()-gated, which includes
// the professionals a business employs; the writes (hours, time zone, logo,
// cover) are the owner's only. "Owner" is the business whose
// business_profiles.profile_id is this account — the same test the write
// policies make — so staff are shown read-only screens rather than buttons
// that would be refused.
//
// The chosen venue is remembered per device (a view preference, not data).

const KEY = "centium.venueConsole.selected";

const readRemembered = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export interface UseMyVenues {
  venues: MyVenue[];
  selected: MyVenue | null;
  select: (gymId: string) => void;
  /** True when this account owns the selected venue's business. */
  isOwner: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useMyVenues(): UseMyVenues {
  const { authUserId, profileReady } = useApp();
  const [venues, setVenues] = useState<MyVenue[]>([]);
  const [myBusinessId, setMyBusinessId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(readRemembered);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const [list, mine] = await Promise.all([fetchMyVenues(), resolveMyBusinessId(authUserId)]);
      if (cancelled) return;
      setLoading(false);
      if (mine.ok) setMyBusinessId(mine.id);
      if (!list.ok) {
        // Keep whatever is on screen: an empty list and a failed read look the same.
        setError(list.message);
        return;
      }
      setError(null);
      setVenues(list.value);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, tick]);

  const select = useCallback((gymId: string) => {
    setSelectedId(gymId);
    try {
      localStorage.setItem(KEY, gymId);
    } catch {
      /* the choice just isn't remembered */
    }
  }, []);

  const selected = pickVenue(venues, selectedId);
  return {
    venues,
    selected,
    select,
    isOwner: !!selected && !!myBusinessId && selected.businessId === myBusinessId,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
  };
}
