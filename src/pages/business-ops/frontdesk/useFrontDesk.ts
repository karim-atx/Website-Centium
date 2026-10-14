import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { fetchMyClasses } from "../../../services/business-classes";
import {
  fetchAllRenewalsDue,
  fetchFrontDeskMembers,
  fetchFrontDeskVenues,
  fetchTodayEntries,
  type EntriesResult,
  type FrontDeskVenue,
} from "../../../services/front-desk";
import type { FrontDeskMember, RenewalDue } from "../../../services/front-desk/frontDeskLogic";

export interface FrontDeskData {
  loading: boolean;
  error: string | null;
  venues: FrontDeskVenue[];
  members: FrontDeskMember[];
  /** venue_renewals_due(gym, 30) across the venues (B7 MB-05). */
  renewals: RenewalDue[];
  entries: EntriesResult | null;
  /** When the shown data was last read (the offline line). */
  loadedAt: Date | null;
  /**
   * The gym runs classes (it has business_classes rows): the header offers
   * its Schedule. The same rule the plan screens use (usePlans, V6-47).
   */
  runsClasses: boolean;
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
    renewals: [],
    entries: null,
    loadedAt: null,
    runsClasses: false,
  });
  const [tick, setTick] = useState(0);

  // Read once per account: a failed read leaves the Schedule link out.
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void fetchMyClasses(authUserId).then((r) => {
      if (!cancelled && r.ok) setState((s) => ({ ...s, runsClasses: r.classes.length > 0 }));
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

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
      const [m, ren] = await Promise.all([fetchFrontDeskMembers(v.value), fetchAllRenewalsDue(v.value, 30)]);
      if (cancelled) return;
      if (!m.ok || !ren.ok) {
        const message = !m.ok ? m.message : !ren.ok ? ren.message : "";
        setState((s) => ({ ...s, loading: false, error: message, venues: v.value }));
        return;
      }
      setState((s) => ({
        ...s,
        loading: false,
        error: null,
        venues: v.value,
        members: m.value,
        renewals: ren.value,
        entries: e.ok ? e.value : null,
        loadedAt: new Date(),
      }));
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
