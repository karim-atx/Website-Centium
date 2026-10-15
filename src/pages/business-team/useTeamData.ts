import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "../../components/business-more/useBusiness";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import {
  fetchJoinRequests,
  fetchSeatCapacity,
  fetchSessions,
  fetchTeam,
  type ClassSession,
  type JoinRequest,
  type SeatCapacity,
  type TeamPerson,
} from "../../services/business-team/team";
import { shiftDate, todayLocal } from "../../utils/date";
import { isAccepted, seatHolders, weekRange } from "./teamLogic";
import { fetchPlanSummary, type PlanSummary } from "../../services/centium-billing";

// One load for the Team screens: the team (accepted and invited), seat
// capacity, pending join requests and the sessions from last Monday to two
// weeks ahead (counts, previews, upcoming lists, the week grid).
//
// A FAILED READ KEEPS WHAT IS ON SCREEN (the old Employees tab's rule): an
// empty list after a dropped connection is indistinguishable from "everybody
// left", which is the wrong thing to tell a business.
//
// B7 · STAFF READ, THE OWNER WRITES. An employee holding 'members' may read
// the team (business_employees SELECT widened to business_can(members)), but
// business_employees writes stay the owner's, so the screens are read-only for
// them (`readOnly`). my_business_seat_capacity() answers for the caller's OWN
// business only, so staff read the capacity from business_plan_summary (B8
// RV-06, gate members or revenue) and count the seats in use from the team
// they can read. Without RV-06 on the database: the seats in use and no free
// ones, as before.

export interface TeamData {
  businessId: string | null;
  businessName: string;
  code: string | null;
  kind: ReturnType<typeof useBusiness>["kind"];
  kindKnown: boolean;
  people: TeamPerson[] | null;
  capacity: SeatCapacity | null;
  requests: JoinRequest[] | null;
  requestsError: string | null;
  sessions: ClassSession[];
  error: string | null;
  loading: boolean;
  noBusiness: boolean;
  today: string;
  reload: () => void;
  setPeople: (p: TeamPerson[]) => void;
  setRequests: (r: JoinRequest[]) => void;
  /** B7: an employee (not the owner) is looking; every team write is hidden. */
  readOnly: boolean;
}

export function useTeamData(): TeamData {
  const biz = useBusiness();
  const access = useConsoleAccess();
  const readOnly = access.isStaff;
  const [people, setPeople] = useState<TeamPerson[] | null>(null);
  const [capacity, setCapacity] = useState<SeatCapacity | null>(null);
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const today = todayLocal();
  const bizId = biz.business?.id ?? null;

  useEffect(() => {
    if (!bizId) {
      if (!biz.loading) setLoading(false);
      return;
    }
    let cancelled = false;
    const from = weekRange(today, -1).from;
    const to = shiftDate(today, 21);
    const seats = readOnly ? Promise.resolve(null) : fetchSeatCapacity();
    const plan = readOnly ? fetchPlanSummary(bizId) : Promise.resolve(null);
    void Promise.all([fetchTeam(bizId), seats, fetchJoinRequests(bizId), fetchSessions(bizId, from, to), plan]).then(
      ([team, capRes, req, sess, planRes]) => {
        if (cancelled) return;
        setLoading(false);
        if (team.ok) setPeople(team.value);
        const summary = planRes && planRes.ok ? planRes.value : null;
        const cap = capRes ?? (team.ok ? { ok: true as const, value: staffSeats(team.value, summary) } : { ok: false as const, message: team.message });
        if (cap.ok) setCapacity(cap.value);
        if (req.ok) {
          setRequests(req.value);
          setRequestsError(null);
        } else setRequestsError(req.message);
        if (sess.ok) setSessions(sess.value);
        const firstError = !team.ok ? team.message : !cap.ok ? cap.message : null;
        setError(firstError);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [bizId, biz.loading, tick, today, readOnly]);

  const hasBusiness = !!biz.business;
  const bizReload = biz.reload;
  const reload = useCallback(() => {
    if (hasBusiness) setTick((t) => t + 1);
    else bizReload();
  }, [hasBusiness, bizReload]);

  return {
    businessId: bizId,
    businessName: biz.business?.name ?? "",
    code: biz.business?.code ?? null,
    kind: biz.kind,
    kindKnown: biz.kindKnown,
    people,
    capacity,
    requests,
    requestsError,
    sessions,
    error: error ?? (biz.error && !biz.business ? "Couldn't load your team. Check your connection and try again." : null),
    loading: loading || biz.loading,
    noBusiness: !biz.loading && !biz.business && !biz.error,
    today,
    reload,
    setPeople,
    setRequests,
    readOnly,
  };
}

/**
 * Staff can't read my_business_seat_capacity: the capacity from the plan
 * summary (RV-06), else the seats in use and no free ones.
 */
function staffSeats(people: TeamPerson[], summary: PlanSummary | null): SeatCapacity {
  const holders = seatHolders(people);
  const used = holders.filter(isAccepted).length;
  const invited = holders.length - used;
  if (summary) return { capacity: summary.capacity, seatBlocks: summary.seatBlocks, seatsPerUnit: summary.seatsPerBlock, used, invited };
  return { capacity: used + invited, seatBlocks: 0, seatsPerUnit: null, used, invited };
}
