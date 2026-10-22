import { useEffect, useState } from "react";
import { fetchMyTeam, type TeamMember } from "../../../services/hiring";

// Market + Share 3.0 · W4 · B-MA.6: the Team the class sheets name from
// (ClassSheet's InstructorPicker, SubstituteSheet's list). my_team (DB8) when
// it answers; `pending` until then, and the callers keep the live source
// (lead decision D-35: DB8 backfills those people as existing_team).

/** The Team source: my_team once DB8 answers; `pending` until then (the live source stands in). */
export type ClassTeam = { s: "loading" } | { s: "pending" } | { s: "team"; team: TeamMember[] } | { s: "error"; offline: boolean };

/** my_team for the class sheets, read again each time `active` turns on (the last answer shows meanwhile). */
export function useClassTeam(businessId: string | null | undefined, active: boolean): [ClassTeam, () => void] {
  const [result, setResult] = useState<{ businessId: string; v: ClassTeam } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active || !businessId) return;
    let alive = true;
    // awaiting DB stage DB8 (my_team)
    void fetchMyTeam(businessId).then((r) => {
      if (!alive) return;
      setResult({ businessId, v: r.ok ? { s: "team", team: r.value } : r.pending ? { s: "pending" } : { s: "error", offline: !!r.offline } });
    });
    return () => {
      alive = false;
    };
  }, [businessId, active, tick]);
  // No business id (a host that doesn't pass one): the live source.
  const state: ClassTeam = !businessId ? { s: "pending" } : result && result.businessId === businessId ? result.v : { s: "loading" };
  return [state, () => setTick((t) => t + 1)];
}
