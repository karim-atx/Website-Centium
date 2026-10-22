// Market + Share 3.0 · W2 · points reads for the client Explore (C-MO.4.1,
// C-MO.4.7, C-MO.4.8). The balance and tier stay AppContext's
// (getPointsSummary in services/achievements, which also reads the DB1
// summary columns into PointsSummary.extras); this adds the ledger.

import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { marketRpc, type MarketResult } from "../market/rpc";
import { parseLedgerRows, type LedgerEntry } from "./pointsModel";

export * from "./pointsModel";

export interface LedgerPage {
  entries: LedgerEntry[];
  /** More rows exist before the oldest one here. */
  more: boolean;
}

/**
 * The ledger, newest first, `limit` at a time before `before` (a created_at).
 *
 * awaiting DB stage DB1: my_points_ledger(p_before, p_limit) (PLAN §2.2 DB1:
 * id, source, amount, description, ref_label, day, created_at, expires_at).
 * Until it lands the same rows come from points_ledger itself through its
 * select-own RLS (points_ledger_select_own, migration 20260906012002), with
 * the R3 columns only (no ref_label / day).
 */
export async function fetchLedger(before: string | null = null, limit = 50): Promise<MarketResult<LedgerPage>> {
  const viaRpc = await marketRpc("my_points_ledger", { p_before: before, p_limit: limit + 1 }, "Couldn't load your points history.", parseLedgerRows);
  if (viaRpc.ok) return { ok: true, value: { entries: viaRpc.value.slice(0, limit), more: viaRpc.value.length > limit } };
  if (!viaRpc.pending) return viaRpc;
  // awaiting DB stage DB1: the table read until my_points_ledger lands.
  try {
    let q = supabase.from("points_ledger").select("id, source, amount, description, created_at").order("created_at", { ascending: false }).limit(limit + 1);
    if (before) q = q.lt("created_at", before);
    const { data, error } = await q;
    if (error) {
      if (isOffline(error)) return { ok: false, offline: true, message: "Couldn't load your points history." };
      console.error("[points] Could not read the ledger:", error.message);
      return { ok: false, code: error.code, message: "Couldn't load your points history." };
    }
    const entries = parseLedgerRows(data);
    return { ok: true, value: { entries: entries.slice(0, limit), more: entries.length > limit } };
  } catch (e) {
    return { ok: false, offline: isOffline(e), message: "Couldn't load your points history." };
  }
}
