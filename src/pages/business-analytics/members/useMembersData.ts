import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { useMembershipPlans } from "../../../hooks/useBusinessCatalog";
import { useMyVenues } from "../../../hooks/useMyVenues";
import { fetchMyMemberCodes, fetchMyMembers, type MemberCode, type Membership } from "../../../services/business-members";

// What the Members section can read today (the owner, and since B7 staff
// holding 'members'): the business's memberships with first names
// (list_business_members, pending first, paged by total_count), its member
// codes, its plans and its venues
// (my_venues() carries each venue's active gym memberships). Nothing here is
// a de-duplicated member count (the B15 readers bring those: useMembersFigures.ts); it is used for the empty
// state (no member of either kind, ever), the codes card and the venue card.
//
// A failed refresh keeps what is on screen (the rule every hydration in this
// app follows): an empty list and an unreachable server look the same once
// drawn, and only one of them is true.

export interface MembersData {
  businessId: string | null;
  members: Membership[] | null;
  /** list_business_members total_count: every membership, however many are loaded. */
  memberTotal: number;
  /** Loads the next page of the roster (PAGE rows). */
  loadMoreMembers: () => void;
  loadingMore: boolean;
  codes: MemberCode[] | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  plans: ReturnType<typeof useMembershipPlans>["plans"];
  plansLoading: boolean;
  venues: ReturnType<typeof useMyVenues>["venues"];
  venuesLoading: boolean;
  setCodes: (f: (c: MemberCode[]) => MemberCode[]) => void;
}

export function useMembersData(): MembersData {
  const { business, loading: bizLoading } = useBusiness();
  const { plans, loading: plansLoading } = useMembershipPlans();
  const { venues, loading: venuesLoading } = useMyVenues();
  const businessId = business?.id ?? null;
  const [members, setMembers] = useState<Membership[] | null>(null);
  const [memberTotal, setMemberTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [codes, setCodesState] = useState<MemberCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    void (async () => {
      const [roster, issued] = await Promise.all([fetchMyMembers(businessId, { limit: PAGE }), fetchMyMemberCodes(businessId)]);
      if (cancelled) return;
      setLoading(false);
      if (!roster.ok) {
        setError(roster.message);
        return;
      }
      setMemberTotal(roster.total);
      if (!issued.ok) {
        setError(issued.message);
        setMembers(roster.members);
        return;
      }
      setError(null);
      setMembers(roster.members);
      setCodesState(issued.codes);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, bizLoading, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loaded = members?.length ?? 0;
  const loadMoreMembers = useCallback(() => {
    if (!businessId || loadingMore || loaded >= memberTotal) return;
    setLoadingMore(true);
    void fetchMyMembers(businessId, { limit: PAGE, offset: loaded }).then((r) => {
      setLoadingMore(false);
      if (!r.ok) return setError(r.message);
      setMemberTotal(r.total || memberTotal);
      setMembers((m) => [...(m ?? []), ...r.members.filter((x) => !(m ?? []).some((y) => y.id === x.id))]);
    });
  }, [businessId, loadingMore, loaded, memberTotal]);
  const setCodes = useCallback((f: (c: MemberCode[]) => MemberCode[]) => setCodesState((c) => f(c ?? [])), []);
  return { businessId, members, memberTotal, loadMoreMembers, loadingMore, codes, error, loading: businessId ? loading : bizLoading, reload, plans, plansLoading, venues, venuesLoading, setCodes };
}

/** Roster page size (list_business_members p_limit). */
const PAGE = 100;

export const liveCodes = (codes: MemberCode[], now = Date.now()) => codes.filter((c) => !c.redeemed && new Date(c.expiresAt).getTime() > now);
