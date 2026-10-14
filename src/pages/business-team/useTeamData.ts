import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "../../components/business-more/useBusiness";
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
import { weekRange } from "./teamLogic";

// One load for the Team screens: the team (accepted and invited), seat
// capacity, pending join requests and the sessions from last Monday to two
// weeks ahead (counts, previews, upcoming lists, the week grid).
//
// A FAILED READ KEEPS WHAT IS ON SCREEN (the old Employees tab's rule): an
// empty list after a dropped connection is indistinguishable from "everybody
// left", which is the wrong thing to tell a business.

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
}

export function useTeamData(): TeamData {
  const biz = useBusiness();
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
    void Promise.all([fetchTeam(bizId), fetchSeatCapacity(), fetchJoinRequests(bizId), fetchSessions(bizId, from, to)]).then(
      ([team, cap, req, sess]) => {
        if (cancelled) return;
        setLoading(false);
        if (team.ok) setPeople(team.value);
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
  }, [bizId, biz.loading, tick, today]);

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
  };
}
