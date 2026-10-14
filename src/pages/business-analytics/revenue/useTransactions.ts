import { useCallback, useEffect, useMemo, useState } from "react";
import {
  byLedgerOrder,
  fetchAllTransactions,
  fetchPaymentSources,
  fetchTransactions,
  ISSUE_STATUSES,
  recordKeyOf,
  transactions as txOfRecords,
  txItemFromRecord,
  txItemFromRow,
  type PaymentRecord,
  type Period,
  type ReaderPage,
  type Result,
  type TxFilter,
  type TxItem,
  type TxQuery,
  type TxReaderRow,
} from "../../../services/business-revenue";
import { useRevenue } from "./revenueContext";

export interface TxCounts {
  all: number;
  whish: number;
  cash: number;
  issues: number;
}

export interface TxState {
  /** The rows to show (five, or every one after "See all"). */
  items: TxItem[];
  /** How many match (the list label and "See all N"). */
  total: number;
  /** The filter menu's counts (the range, no search). */
  counts: TxCounts;
  /** transactions_page answered (B8 RV-01). */
  live: boolean;
  /** No revenue permission: an empty list, not an error. */
  denied: boolean;
  /** Nothing to show yet (the first read). */
  loading: boolean;
  error: string | null;
  /** Every matching row, for Export CSV. */
  everything: () => Promise<TxItem[] | null>;
  reload: () => void;
}

const queryOf = (range: Period, filter: TxFilter, search: string): TxQuery[] => {
  const base = { from: range.from, to: range.to, search: search || null };
  if (filter === "issues") return ISSUE_STATUSES.map((status) => ({ ...base, status }));
  if (filter === "cash" || filter === "whish") return [{ ...base, method: filter }];
  return [base];
};

/** One query per issue status (transactions_page takes one), merged in the reader's own order. */
async function readMerged(
  businessId: string,
  queries: TxQuery[],
  limit: number | "all",
): Promise<Result<ReaderPage<TxReaderRow>>> {
  const pages = await Promise.all(
    queries.map((q) =>
      limit === "all" ? fetchAllTransactions(businessId, q) : fetchTransactions(businessId, q, limit, 0),
    ),
  );
  const rows: TxReaderRow[] = [];
  let total = 0;
  for (const p of pages) {
    if (!p.ok || p.value.denied) return p;
    rows.push(...p.value.rows);
    total += p.value.total;
  }
  rows.sort(byLedgerOrder);
  return {
    ok: true,
    value: { rows: limit === "all" ? rows : rows.slice(0, limit), total, denied: false },
  };
}

/** Each row with the plan name or class title the Revenue read holds for its source (else the price type's word). */
async function itemsOf(rows: TxReaderRow[], records: PaymentRecord[]): Promise<TxItem[]> {
  if (!rows.length) return [];
  const src = await fetchPaymentSources(rows.map((r) => r.payment_id));
  const byKey = new Map(records.map((r) => [r.key, r]));
  return rows.map((r) => {
    const s = src.ok ? src.value.get(r.payment_id) : undefined;
    const key = s ? recordKeyOf(s.sourceKind, s.sourceId) : null;
    return txItemFromRow(r, key ? byKey.get(key)?.item : undefined);
  });
}

/** Before B8: the records' list, filtered and searched here (who and item). */
function fromRecords(records: PaymentRecord[], range: Period, filter: TxFilter, search: string): TxItem[] {
  const needle = search.toLowerCase();
  return txOfRecords(records, range)
    .map(txItemFromRecord)
    .filter(
      (t) =>
        (filter === "all" ||
          (filter === "whish" && t.method === "whish") ||
          (filter === "cash" && t.method === "cash") ||
          (filter === "issues" && t.status !== "paid")) &&
        (!needle || (t.label + " " + t.item).toLowerCase().includes(needle)),
    );
}

type View = { key: string; list: TxItem[]; total: number; denied: boolean };

/**
 * Revenue › Transactions (B8 RV-01): transactions_page for the range, with
 * the search, status and method on the server; "Owed, failed or refunded"
 * asks for each of those statuses. Five rows until "See all". While the
 * reader is missing (PGRST202 / 42883) the list is the records' one, as
 * before B8. A new query keeps the last list on screen until it answers.
 */
export function useTransactions(range: Period, filter: TxFilter, search: string, all: boolean): TxState {
  const { businessId, data } = useRevenue();
  const records = data?.records ?? null;
  const [view, setView] = useState<View | null>(null);
  const [pending, setPending] = useState(false);
  const [counts, setCounts] = useState<TxCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const { from, to } = range;

  useEffect(() => {
    if (!businessId || !records) return;
    let alive = true;
    const key = `${from}|${to}|${filter}|${search}|${all}|${tick}`;
    void readMerged(businessId, queryOf({ from, to }, filter, search), all ? "all" : 5).then(async (r) => {
      if (!alive) return;
      if (!r.ok) {
        if (r.pending) {
          setError(null);
          setPending(true);
        } else setError(r.message);
        return;
      }
      const list = await itemsOf(r.value.rows, records);
      if (!alive) return;
      setError(null);
      setPending(false);
      setView({ key, list, total: r.value.total, denied: r.value.denied });
    });
    return () => {
      alive = false;
    };
  }, [businessId, records, from, to, filter, search, all, tick]);

  useEffect(() => {
    if (!businessId || pending) return;
    let alive = true;
    const one = (q: Partial<TxQuery>) =>
      fetchTransactions(businessId, { from, to, ...q }, 1, 0).then((r) => (r.ok ? r.value.total : 0));
    void Promise.all([
      one({}),
      one({ method: "whish" }),
      one({ method: "cash" }),
      ...ISSUE_STATUSES.map((status) => one({ status })),
    ]).then(([a, w, c, ...issues]) => {
      if (alive) setCounts({ all: a, whish: w, cash: c, issues: issues.reduce((s, x) => s + x, 0) });
    });
    return () => {
      alive = false;
    };
  }, [businessId, from, to, pending, tick]);

  const fallback = useMemo(
    () => (pending && records ? fromRecords(records, { from, to }, filter, search) : null),
    [pending, records, from, to, filter, search],
  );
  const fallbackCounts = useMemo(() => {
    if (!pending || !records) return null;
    const rows = fromRecords(records, { from, to }, "all", "");
    return {
      all: rows.length,
      whish: rows.filter((t) => t.method === "whish").length,
      cash: rows.filter((t) => t.method === "cash").length,
      issues: rows.filter((t) => t.status !== "paid").length,
    };
  }, [pending, records, from, to]);

  const everything = useCallback(async (): Promise<TxItem[] | null> => {
    if (fallback) return fallback;
    if (!businessId || !records) return null;
    const r = await readMerged(businessId, queryOf({ from, to }, filter, search), "all");
    if (!r.ok) return null;
    return itemsOf(r.value.rows, records);
  }, [fallback, businessId, records, from, to, filter, search]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  if (fallback)
    return {
      items: all ? fallback : fallback.slice(0, 5),
      total: fallback.length,
      counts: fallbackCounts ?? { all: 0, whish: 0, cash: 0, issues: 0 },
      live: false,
      denied: false,
      loading: false,
      error: null,
      everything,
      reload,
    };
  return {
    items: view?.list ?? [],
    total: view?.total ?? 0,
    counts: counts ?? { all: 0, whish: 0, cash: 0, issues: 0 },
    live: !!view,
    denied: !!view?.denied,
    loading: !view && !error,
    error,
    everything,
    reload,
  };
}
