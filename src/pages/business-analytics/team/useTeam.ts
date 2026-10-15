import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { shiftDate, todayLocal } from "../../../utils/date";
import { previousRange, rangeDays, type AnalyticsRange } from "../shell/range";
import { coverageIssues, EARLY_DAYS, teamStats, type Issue, type TeamStats } from "./model";
import { fetchNames, firstTaughtDay, loadClasses, loadTeam, type ClassRow, type TeamData } from "./teamData";

export interface TeamState {
  loading: boolean;
  /** Load failed: offline or another error. Data on screen is kept (AN5-001 O2). */
  error: "offline" | "error" | null;
  updatedAt: number | null;
  businessId: string | null;
  businessName: string;
  businessCode: string | null;
  team: TeamData | null;
  classes: ClassRow[];
  stats: TeamStats | null;
  early: boolean;
  issues: Issue[];
  upcoming: ClassRow[];
  /** First names of people who left but still teach upcoming sessions. */
  leftNames: Map<string, string>;
  today: string;
  reload: () => void;
}

export function useTeam(range: AnalyticsRange): TeamState {
  const { authUserId } = useApp();
  const { business, loading: bizLoading } = useBusiness();
  const businessId = business?.id ?? null;
  const today = todayLocal();
  const until = shiftDate(today, 13);
  const prev = useMemo(() => previousRange(range), [range]);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{
    team: TeamData | null;
    classes: ClassRow[];
    first: string | null;
    leftNames: Map<string, string>;
    loading: boolean;
    error: "offline" | "error" | null;
    updatedAt: number | null;
  }>({ team: null, classes: [], first: null, leftNames: new Map(), loading: true, error: null, updatedAt: null });

  useEffect(() => {
    if (!businessId || !authUserId) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: s.team === null }));
    const from = prev.from < range.from ? prev.from : range.from;
    const to = range.to > until ? range.to : until;
    void Promise.all([loadTeam(businessId), loadClasses(businessId, from, to), firstTaughtDay(businessId, today)]).then(
      async ([t, c, f]) => {
        if (cancelled) return;
        if (!t.ok || !c.ok || !f.ok) {
          const offline = (!t.ok && t.offline) || (!c.ok && c.offline) || (!f.ok && f.offline);
          setState((s) => ({ ...s, loading: false, error: offline ? "offline" : "error" }));
          return;
        }
        const teamIds = new Set(t.value.people.map((p) => p.id));
        const leftIds = [...new Set(c.value.filter((x) => x.professionalId && !teamIds.has(x.professionalId)).map((x) => x.professionalId as string))];
        const leftNames = await fetchNames(leftIds);
        if (cancelled) return;
        setState({ team: t.value, classes: c.value, first: f.value, leftNames, loading: false, error: null, updatedAt: Date.now() });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [businessId, authUserId, range.from, range.to, prev.from, until, today, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const stats = useMemo(
    () => (state.team ? teamStats(state.team.people, state.classes, range, prev, today, rangeDays(range)) : null),
    [state.team, state.classes, range, prev, today]
  );
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cov = useMemo(
    () => coverageIssues(state.classes, new Set((state.team?.people ?? []).map((p) => p.id)), today, until, nowMin),
    // nowMin changes every minute; coverage is recomputed with the data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.classes, state.team, today, until]
  );
  // Early data (AN5-003): the first class was taught fewer than 4 weeks ago.
  const early = !state.first || shiftDate(state.first, EARLY_DAYS) > today;

  const loading = (bizLoading && !business) || state.loading;
  const businessName = business?.name ?? "";
  const businessCode = business?.code ?? null;
  // One object per change of its fields, so sections can depend on it.
  return useMemo(
    () => ({
      loading,
      error: state.error,
      updatedAt: state.updatedAt,
      businessId,
      businessName,
      businessCode,
      team: state.team,
      classes: state.classes,
      stats,
      early,
      issues: cov.issues,
      upcoming: cov.upcoming,
      leftNames: state.leftNames,
      today,
      reload,
    }),
    [loading, state, businessId, businessName, businessCode, stats, early, cov, today, reload]
  );
}
