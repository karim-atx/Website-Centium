import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import {
  fetchFrontDeskMembers,
  fetchFrontDeskVenues,
  fetchTodayEntries,
  type EntriesResult,
  type FrontDeskVenue,
} from "../../../services/front-desk";
import type { FrontDeskMember } from "../../../services/front-desk/frontDeskLogic";

export interface FrontDeskData {
  loading: boolean;
  error: string | null;
  venues: FrontDeskVenue[];
  members: FrontDeskMember[];
  entries: EntriesResult | null;
  /** When the shown data was last read (the offline line). */
  loadedAt: Date | null;
  reload: () => void;
}

/**
 * What the Front desk reads: the business's venues (my_venues), every
 * membership at them (venue_members) and today's entries (B10, pending).
 * A failed reload keeps what is already on screen (OP1-013 O3).
 */
export function useFrontDesk(): FrontDeskData {
  const { authUserId, profileReady } = useApp();
  const [state, setState] = useState<Omit<FrontDeskData, "reload">>({
    loading: true,
    error: null,
    venues: [],
    members: [],
    entries: null,
    loadedAt: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const [v, e] = await Promise.all([fetchFrontDeskVenues(), fetchTodayEntries()]);
      if (cancelled) return;
      if (!v.ok) {
        setState((s) => ({ ...s, loading: false, error: v.message }));
        return;
      }
      const m = await fetchFrontDeskMembers(v.value);
      if (cancelled) return;
      if (!m.ok) {
        setState((s) => ({ ...s, loading: false, error: m.message, venues: v.value }));
        return;
      }
      setState({
        loading: false,
        error: null,
        venues: v.value,
        members: m.value,
        entries: e.ok ? e.value : null,
        loadedAt: new Date(),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: s.loadedAt === null, error: null }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}
