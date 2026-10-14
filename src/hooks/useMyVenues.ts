import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { CONSOLE_ACCESS_CHANGED, loadConsoleAccess, seatCan, type ConsolePermission, type ConsoleSeat } from "../services/business-console";
import { fetchMyVenues } from "../services/venues/console";
import { pickVenue, type MyVenue } from "../services/venues/consoleLogic";

// The venue console's list and switcher (backend stage A4, my_venues()).
//
// OWNER OR STAFF. my_venues() is is_business_insider()-gated, which includes
// the professionals a business employs. Since B7 the writes ask
// business_can(): a venue's details (gyms UPDATE, the time zone) need
// 'venues', its opening hours (gym_hours) need 'schedule'; the logo and cover
// stay the owner's (business-logos is keyed by the owner's uid). Staff without
// the permission are shown read-only screens rather than buttons that would be
// refused.
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
  /** Whether this account may do `p` at the selected venue's business (B7 business_can). */
  can: (p: ConsolePermission) => boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useMyVenues(): UseMyVenues {
  const { authUserId, profileReady } = useApp();
  const [venues, setVenues] = useState<MyVenue[]>([]);
  const [seats, setSeats] = useState<ConsoleSeat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(readRemembered);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const [list, access] = await Promise.all([fetchMyVenues(), loadConsoleAccess(authUserId)]);
      if (cancelled) return;
      setLoading(false);
      if (access.ok) setSeats(access.value.seats);
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

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(CONSOLE_ACCESS_CHANGED, bump);
    return () => window.removeEventListener(CONSOLE_ACCESS_CHANGED, bump);
  }, []);

  const select = useCallback((gymId: string) => {
    setSelectedId(gymId);
    try {
      localStorage.setItem(KEY, gymId);
    } catch {
      /* the choice just isn't remembered */
    }
  }, []);

  const selected = pickVenue(venues, selectedId);
  const seat = selected ? (seats.find((x) => x.businessId === selected.businessId) ?? null) : null;
  return {
    venues,
    selected,
    select,
    isOwner: !!seat?.isOwner,
    can: (p: ConsolePermission) => seatCan(seat, p),
    loading,
    error,
    reload: () => setTick((t) => t + 1),
  };
}
