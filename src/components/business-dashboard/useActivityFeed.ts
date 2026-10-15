import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { usePoll } from "../../hooks/usePoll";
import { shiftDate, todayLocal } from "../../utils/date";
import { startOfWeekISO } from "../../utils/week";
import type { ActivityRow } from "./dashboardTypes";
import { fetchActivityTotals, fetchRecentActivity } from "./dashboardData";
import { freshIds, mergeActivity, toActivityRow } from "./activityFeed";

// B15 · Recent activity, live (DI-03; DA1-015 #29-#30, OURS-DA-states #4).
//
// One Realtime channel per business on business_activity, filtered by
// business_id. Realtime honours the table's RLS, so each kind reaches only a
// caller with its permission, and the rows carry a masked label, never a
// person id. Each INSERT is applied as it arrives (merged by id) and gets the
// New tag for the session. business_recent_activity is the first page and the
// 2-minute poll while the page is visible (usePoll), which also catches what
// a silent socket missed. The channel is removed on unmount or when the
// business changes.

const POLL_MS = 2 * 60 * 1000;
const TOTAL_KINDS = new Set<ActivityRow["kind"]>(["join", "end", "booking"]);

export interface ActivityFeed {
  /** Newest first; null until the first read (or when it failed). */
  rows: ActivityRow[] | null;
  /** Every join / end / booking since last week's Monday (the totals tiles); null until read. */
  totals: { kind: ActivityRow["kind"]; at: string }[] | null;
  newIds: Set<number>;
  updatedAt: number | null;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

interface State {
  bid: string;
  rows: ActivityRow[] | null;
  totals: { kind: ActivityRow["kind"]; at: string }[] | null;
  newIds: Set<number>;
  updatedAt: number | null;
  error: string | null;
}

export function useActivityFeed(businessId: string | null, online: boolean): ActivityFeed {
  const [state, setState] = useState<State | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const seen = useRef<{ bid: string; ids: Set<number> } | null>(null);

  const read = useCallback(async () => {
    if (!businessId) return;
    setRefreshing(true);
    const since = shiftDate(startOfWeekISO(todayLocal()), -7);
    const [page, totals] = await Promise.all([fetchRecentActivity(businessId), fetchActivityTotals(businessId, since)]);
    setRefreshing(false);
    const prevSeen = seen.current?.bid === businessId ? seen.current.ids : null;
    if (!page.ok) {
      // A failed poll keeps what is on screen; only a first read shows the error.
      setState((s) => (s && s.bid === businessId ? { ...s, error: page.message } : { bid: businessId, rows: null, totals, newIds: new Set(), updatedAt: null, error: page.message }));
      return;
    }
    const fresh = freshIds(prevSeen, page.rows);
    seen.current = { bid: businessId, ids: new Set([...(prevSeen ?? []), ...page.rows.map((r) => r.id)]) };
    setState((s) => {
      const same = s && s.bid === businessId;
      const rows = same && s.rows ? mergeActivity(s.rows, page.rows) : page.rows;
      const newIds = new Set([...(same ? s.newIds : []), ...fresh]);
      return { bid: businessId, rows, totals: totals ?? (same ? s.totals : null), newIds, updatedAt: Date.now(), error: null };
    });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    // Deferred past the effect body (react-hooks: no synchronous setState in an effect).
    const id = window.setTimeout(() => void read(), 0);
    return () => window.clearTimeout(id);
  }, [businessId, read]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const channel = supabase
      .channel(`business-activity:${businessId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "business_activity", filter: `business_id=eq.${businessId}` }, (payload) => {
        if (cancelled) return;
        const row = toActivityRow(payload.new as Parameters<typeof toActivityRow>[0]);
        if (!row) return;
        const ids = seen.current?.bid === businessId ? seen.current.ids : new Set<number>();
        ids.add(row.id);
        seen.current = { bid: businessId, ids };
        setState((s) => {
          if (!s || s.bid !== businessId) return s;
          const totals = s.totals && TOTAL_KINDS.has(row.kind) && !s.rows?.some((r) => r.id === row.id) ? [{ kind: row.kind, at: row.at }, ...s.totals] : s.totals;
          return { ...s, rows: mergeActivity(s.rows ?? [], [row]), totals, newIds: new Set([...s.newIds, row.id]), updatedAt: Date.now() };
        });
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [businessId]);

  usePoll(() => void read(), POLL_MS, !!businessId && online);

  const mine = state && state.bid === businessId ? state : null;
  return {
    rows: mine?.rows ?? null,
    totals: mine?.totals ?? null,
    newIds: mine?.newIds ?? new Set(),
    updatedAt: mine?.updatedAt ?? null,
    refreshing,
    error: mine?.error ?? null,
    refresh: () => void read(),
  };
}
