import { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { todayLocal } from "../../../utils/date";
import { fetchDiary, fetchMyFeedback, fetchMyTargets, type MyTargets } from "../../../services/pro/nutrition";
import type { ProLane } from "../subtypeLanes";
import { useNuRoster, type NuClient } from "./hooks";
import { buildQueue, shiftDate, type QueueRow } from "./nutritionModel";

/** NU5's window: the last 7 days, today included. */
export const JOURNAL_DAYS = 7;

export interface NutritionOverview {
  loading: boolean;
  error: boolean;
  offline: boolean;
  retry: () => void;
  clients: NuClient[];
  waiting: QueueRow[];
  reviewed: QueueRow[];
  /** Targets I set and still hold (my_client_nutrition_targets), per client. */
  targets: Record<string, MyTargets | null>;
}

/**
 * The numbers behind NU1's boxes and NU5's queue, for the clients meal plans
 * are for (useNuRoster): diary days of clients who share their food diary
 * (RLS hides the rest), my feedback on them, and the targets I set.
 */
export function useNutritionOverview(lane: ProLane | null): NutritionOverview {
  const { authUserId } = useApp();
  const roster = useNuRoster(lane);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ key: string; waiting: QueueRow[]; reviewed: QueueRow[]; targets: Record<string, MyTargets | null>; error: boolean; offline: boolean } | null>(null);
  const ids = (roster.clients ?? []).map((c) => c.clientId);
  const key = `${ids.join(",")}|${nonce}`;

  useEffect(() => {
    if (!lane || !authUserId || !roster.clients) return;
    let live = true;
    const today = todayLocal();
    const list = roster.clients.map((c) => c.clientId);
    void Promise.all([fetchDiary(list, shiftDate(today, -(JOURNAL_DAYS - 1)), today), fetchMyFeedback(authUserId, list), Promise.all(list.map(async (id) => [id, await fetchMyTargets(id)] as const))]).then(([d, f, t]) => {
      if (!live) return;
      const targets: Record<string, MyTargets | null> = Object.fromEntries(t.map(([id, r]) => [id, r.ok ? r.data : null]));
      if (!d.ok || !f.ok) {
        setState((prev) => ({ key: `${list.join(",")}|${nonce}`, waiting: prev?.waiting ?? [], reviewed: prev?.reviewed ?? [], targets, error: true, offline: (!d.ok && d.offline) || (!f.ok && f.offline) }));
        return;
      }
      const fb = new Set(f.data.map((x) => x.entryId));
      const q = buildQueue(
        d.data.map((e) => ({ id: e.id, clientId: e.clientId, date: e.date, kcal: e.kcal, protein: e.protein })),
        fb,
        (id) => {
          const tg = targets[id];
          return tg ? Math.round((tg.calories * tg.proteinPct) / 100 / 4) : null;
        }
      );
      setState({ key: `${list.join(",")}|${nonce}`, waiting: q.waiting, reviewed: q.reviewed, targets, error: false, offline: false });
    });
    return () => {
      live = false;
    };
    // ids is derived from roster.clients; key covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane, authUserId, key]);

  const retry = () => {
    roster.retry();
    setNonce((n) => n + 1);
  };
  if (roster.error) return { loading: false, error: true, offline: false, retry, clients: [], waiting: [], reviewed: [], targets: {} };
  const ready = !!state && state.key === key;
  return {
    loading: !ready && !state,
    error: !!state?.error,
    offline: !!state?.offline,
    retry,
    clients: roster.clients ?? [],
    waiting: state?.waiting ?? [],
    reviewed: state?.reviewed ?? [],
    targets: state?.targets ?? {},
  };
}
