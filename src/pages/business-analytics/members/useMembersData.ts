import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { useMembershipPlans } from "../../../hooks/useBusinessCatalog";
import { useMyVenues } from "../../../hooks/useMyVenues";
import { fetchMyMemberCodes, fetchMyMembers, type MemberCode, type Membership } from "../../../services/business-members";

// What the Members section can read today (owner only): the business's
// code-redeemed memberships, its member codes, its plans and its venues
// (my_venues() carries each venue's active gym memberships). Nothing here is
// a de-duplicated member count (that is B7, V6-51); it is used for the empty
// state (no member of either kind, ever), the codes card and the venue card.
//
// A failed refresh keeps what is on screen (the rule every hydration in this
// app follows): an empty list and an unreachable server look the same once
// drawn, and only one of them is true.

export interface MembersData {
  businessId: string | null;
  members: Membership[] | null;
  codes: MemberCode[] | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  plans: ReturnType<typeof useMembershipPlans>["plans"];
  venues: ReturnType<typeof useMyVenues>["venues"];
  venuesLoading: boolean;
  setCodes: (f: (c: MemberCode[]) => MemberCode[]) => void;
}

export function useMembersData(): MembersData {
  const { business, loading: bizLoading } = useBusiness();
  const { plans } = useMembershipPlans();
  const { venues, loading: venuesLoading } = useMyVenues();
  const businessId = business?.id ?? null;
  const [members, setMembers] = useState<Membership[] | null>(null);
  const [codes, setCodesState] = useState<MemberCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    void (async () => {
      const [roster, issued] = await Promise.all([fetchMyMembers(businessId), fetchMyMemberCodes(businessId)]);
      if (cancelled) return;
      setLoading(false);
      if (!roster.ok) {
        setError(roster.message);
        return;
      }
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
  const setCodes = useCallback((f: (c: MemberCode[]) => MemberCode[]) => setCodesState((c) => f(c ?? [])), []);
  return { businessId, members, codes, error, loading: businessId ? loading : bizLoading, reload, plans, venues, venuesLoading, setCodes };
}

export const liveCodes = (codes: MemberCode[], now = Date.now()) => codes.filter((c) => !c.redeemed && new Date(c.expiresAt).getTime() > now);
