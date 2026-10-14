import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAllMoneyOwed,
  owedFromRecords,
  owedItemFromRow,
  owedServerFilter,
  today as todayIso,
  type MoneyOwedRow,
  type OwedItem,
  type OwedItemFilter,
  type OwedSort,
} from "../../../services/business-revenue";
import { useRevenue } from "./revenueContext";

export interface MoneyOwedState {
  items: OwedItem[];
  /** money_owed answered (B8 RV-02): Undo and reminders are on. */
  live: boolean;
  /** No revenue permission: an empty list, not an error. */
  denied: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Money owed for the Revenue screens (list, detail, Payments card).
 * money_owed when the database has it, sorted and filtered there (method
 * too, Database 0587c8a, so paging stays exact); the
 * client-side list from the revenue read when it answers "missing" (the
 * pending rule). It waits for the revenue read (item names and "Member since"
 * come from it) and reads again whenever that read reloads.
 */
export function useMoneyOwed(
  sort: OwedSort,
  filter: OwedItemFilter,
  method: "all" | "cash" | "whish" = "all",
): MoneyOwedState {
  const rev = useRevenue();
  const { data, businessId } = rev;
  const [server, setServer] = useState<
    { rows: MoneyOwedRow[]; denied: boolean } | "pending" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!businessId || !data) return;
    let alive = true;
    void fetchAllMoneyOwed(businessId, sort, owedServerFilter(filter), method === "all" ? null : method).then(
      (r) => {
        if (!alive) return;
        if (r.ok) {
          setError(null);
          setServer({ rows: r.value.rows, denied: r.value.denied });
        } else if (r.pending) {
          setError(null);
          setServer("pending");
        } else setError(r.message);
      },
    );
    return () => {
      alive = false;
    };
  }, [businessId, data, sort, filter, method, tick]);

  const today = todayIso();
  const items = useMemo(() => {
    if (!data || !server) return [];
    if (server === "pending")
      // The old client-side path (money_owed missing): the method filter is applied here.
      return owedFromRecords(data.records, today, sort, filter).filter((o) => method === "all" || o.method === method);
    return server.rows.map((r) => owedItemFromRow(r, data.records));
  }, [data, server, today, sort, filter, method]);

  const { reload: reloadRevenue } = rev;
  const reload = useCallback(() => {
    setTick((t) => t + 1);
    reloadRevenue();
  }, [reloadRevenue]);

  return {
    items,
    live: !!server && server !== "pending",
    denied: !!server && server !== "pending" && server.denied,
    loading: !data ? rev.loading : !server && !error,
    error: error ?? (!data ? rev.error : null),
    reload,
  };
}
