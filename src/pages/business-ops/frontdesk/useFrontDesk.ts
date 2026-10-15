import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { fetchMyClasses } from "../../../services/business-classes";
import {
  fetchAllRenewalsDue,
  fetchDayPassPlans,
  fetchDeskEntries,
  fetchDeskSummary,
  fetchEverCheckedIn,
  fetchFrontDeskMembers,
  fetchPlanTerms,
  fetchFrontDeskVenues,
  fetchTodayHours,
  fetchWeekDeskSales,
  isMissingDesk,
  type FrontDeskVenue,
} from "../../../services/front-desk";
import type { DayPassPlan, DeskSale, DeskSummary, Entry, FrontDeskMember, RenewalDue } from "../../../services/front-desk/frontDeskLogic";

/** The desk venue's B10 reads (desk_summary, desk_entries, desk_sales). */
export interface DeskState {
  /**
   * B10 is on this database: true once desk_summary answered, false when the
   * function is missing (the pending rule: the pre-B10 screens), null while
   * unknown (loading, or a read that failed for another reason).
   */
  live: boolean | null;
  summary: DeskSummary | null;
  /** Today's entries at the desk venue, newest first. */
  entries: Entry[] | null;
  /** Any check-in ever at this venue (OP1-016's empty rule); null unknown. */
  everAny: boolean | null;
  todayHours: { closed: boolean; open_24h: boolean; opens_at: string | null; closes_at: string | null } | null;
  /** This week's day pass sales at the venue (OP1-017 row 13); null when unreadable. */
  weekSales: DeskSale[] | null;
  /** When the desk reads last succeeded ("Updated {n} min ago"). */
  readAt: Date | null;
  error: string | null;
  loading: boolean;
}

export interface FrontDeskData {
  loading: boolean;
  error: string | null;
  venues: FrontDeskVenue[];
  /** The venue this desk checks people in at (one venue: that one). */
  deskGymId: string | null;
  setDeskGymId: (id: string) => void;
  members: FrontDeskMember[];
  /** venue_renewals_due(gym, 30) across the venues (B7 MB-05). */
  renewals: RenewalDue[];
  /** Plan commitment lines by plan name (information only). */
  planTerms: Map<string, string[]>;
  /** The business's day-pass plans on sale (sell_day_pass's test). */
  dayPasses: DayPassPlan[];
  desk: DeskState;
  /** When the shown data was last read (the offline line). */
  loadedAt: Date | null;
  /**
   * The gym runs classes (it has business_classes rows): the header offers
   * its Schedule. The same rule the plan screens use (usePlans, V6-47).
   */
  runsClasses: boolean;
  reload: () => void;
  /** Re-reads only the desk venue's entries, summary and sales (after a check-in or a sale). */
  refreshDesk: () => void;
}

const EMPTY_DESK: DeskState = { live: null, summary: null, entries: null, everAny: null, todayHours: null, weekSales: null, readAt: null, error: null, loading: true };

const venueKey = (uid: string) => `centium-state:front-desk-venue:${uid}`;
function readVenue(uid: string): string | null {
  try {
    return window.localStorage.getItem(venueKey(uid));
  } catch {
    return null;
  }
}
function writeVenue(uid: string, id: string) {
  try {
    window.localStorage.setItem(venueKey(uid), id);
  } catch {
    /* private mode: the choice lasts this visit */
  }
}

/**
 * What the Front desk reads: the business's venues (my_venues), every
 * membership at them (venue_members), the renewals, and for the desk venue
 * the B10 readers (desk_summary, desk_entries, desk_sales, today's hours).
 * A failed reload keeps what is already on screen (OP1-013 O3).
 */
export function useFrontDesk(): FrontDeskData {
  const { authUserId, profileReady } = useApp();
  const [state, setState] = useState<Omit<FrontDeskData, "reload" | "refreshDesk" | "setDeskGymId" | "deskGymId" | "desk">>({
    loading: true,
    error: null,
    venues: [],
    members: [],
    renewals: [],
    planTerms: new Map(),
    dayPasses: [],
    loadedAt: null,
    runsClasses: false,
  });
  const [desk, setDesk] = useState<DeskState>(EMPTY_DESK);
  const [chosen, setChosen] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [deskTick, setDeskTick] = useState(0);

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
      const v = await fetchFrontDeskVenues();
      if (cancelled) return;
      if (!v.ok) {
        setState((s) => ({ ...s, loading: false, error: v.message }));
        return;
      }
      const businessId = v.value.find((x) => x.businessId)?.businessId ?? null;
      const [m, ren, planTerms, dayPasses] = await Promise.all([
        fetchFrontDeskMembers(v.value),
        fetchAllRenewalsDue(v.value, 30),
        fetchPlanTerms(v.value),
        businessId ? fetchDayPassPlans(businessId) : Promise.resolve([] as DayPassPlan[]),
      ]);
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
        planTerms,
        dayPasses,
        loadedAt: new Date(),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, tick]);

  // The desk venue: the stored choice when it is still one of the venues, else the first.
  const stored = chosen ?? (authUserId ? readVenue(authUserId) : null);
  const deskGymId = state.venues.some((v) => v.gymId === stored) ? stored : state.venues[0]?.gymId ?? null;

  useEffect(() => {
    if (!deskGymId) return;
    let cancelled = false;
    void (async () => {
      const now = new Date();
      const [sum, ent, ever, hours, sales] = await Promise.all([
        fetchDeskSummary(deskGymId),
        fetchDeskEntries(deskGymId),
        fetchEverCheckedIn(deskGymId),
        fetchTodayHours(deskGymId, now),
        fetchWeekDeskSales(deskGymId, now),
      ]);
      if (cancelled) return;
      if (isMissingDesk(sum)) {
        setDesk({ ...EMPTY_DESK, live: false, loading: false });
        return;
      }
      if (!sum.ok || !ent.ok) {
        const message = !sum.ok ? sum.message : !ent.ok ? ent.message : "";
        // Keep what is on screen; say the read failed.
        setDesk((d) => ({ ...d, loading: false, error: message }));
        return;
      }
      setDesk({
        live: true,
        summary: sum.value,
        entries: ent.value,
        everAny: ever ?? ent.value.length > 0,
        todayHours: hours,
        weekSales: sales.ok ? sales.value : null,
        readAt: new Date(),
        error: null,
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [deskGymId, tick, deskTick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: s.loadedAt === null, error: null }));
    setTick((t) => t + 1);
  }, []);
  const refreshDesk = useCallback(() => setDeskTick((t) => t + 1), []);
  const setDeskGymId = useCallback(
    (id: string) => {
      setChosen(id);
      setDesk(EMPTY_DESK);
      if (authUserId) writeVenue(authUserId, id);
    },
    [authUserId]
  );

  return { ...state, deskGymId, setDeskGymId, desk, reload, refreshDesk };
}
