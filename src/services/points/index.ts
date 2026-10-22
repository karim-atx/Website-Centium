// Market + Share 3.0 · W2 · points reads for the client Explore (C-MO.4.1,
// C-MO.4.7, C-MO.4.8). The balance and tier stay AppContext's
// (getPointsSummary in services/achievements, which also reads the summary's
// today and expiring columns into PointsSummary.extras); this adds the ledger
// (my_points_ledger) and the rules How to earn states (platform_settings).

import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { marketRpc, type MarketResult } from "../market/rpc";
import { parseLedgerRows, parsePointsRules, type LedgerCursor, type LedgerEntry, type PointsRules } from "./pointsModel";

export * from "./pointsModel";

export interface LedgerPage {
  entries: LedgerEntry[];
  /** More rows exist before the oldest one here. */
  more: boolean;
}

/** my_points_ledger clamps p_limit to 1..200 (Database 20261210300000). */
const SERVER_MAX = 200;

/**
 * The ledger, newest first, `limit` at a time: my_points_ledger(p_before,
 * p_limit) (Database 20261210300000: id, amount, source, reversed_source,
 * ref_label, description, day, expires_at, created_at). `cursor` is
 * ledgerCursor() of every row already shown (null for the first page); the
 * rows it names are asked for on top of the limit and dropped (see
 * ledgerCursor for why).
 */
export async function fetchLedger(cursor: LedgerCursor | null = null, limit = 50): Promise<MarketResult<LedgerPage>> {
  const seen = new Set(cursor?.seen ?? []);
  const ask = Math.min(SERVER_MAX, limit + 1 + seen.size);
  const r = await marketRpc("my_points_ledger", { p_before: cursor?.before ?? null, p_limit: ask }, "Couldn't load your points history.", parseLedgerRows);
  if (!r.ok) return r;
  const fresh = r.value.filter((e) => !seen.has(e.id));
  return { ok: true, value: { entries: fresh.slice(0, limit), more: fresh.length > limit } };
}

const RULES_COLUMNS = "points_value_food, points_value_workout, points_value_metric, points_value_water_goal, points_daily_cap, points_expiry_months";

// platform_settings' points columns (20261210100000) aren't in the generated
// types (database.types.ts isn't regenerated, per the brief): a narrow cast.
type SettingsRead = { data: Record<string, unknown> | null; error: { code?: string; message: string } | null };
const settings = supabase as unknown as {
  from: (t: "platform_settings") => { select: (cols: string) => { maybeSingle: () => PromiseLike<SettingsRead> } };
};

let rules: Promise<MarketResult<PointsRules>> | null = null;

/**
 * What each daily log is worth, the daily cap and the expiry months, from
 * platform_settings (one row; SELECT is granted to authenticated and anon with
 * a `using (true)` policy). Cached for the session; a failure is not cached.
 */
export function fetchPointsRules(): Promise<MarketResult<PointsRules>> {
  if (rules) return rules;
  const fallback = "Couldn't load the points rules.";
  const request = (async (): Promise<MarketResult<PointsRules>> => {
    try {
      const { data, error } = await settings.from("platform_settings").select(RULES_COLUMNS).maybeSingle();
      if (error) {
        if (isOffline(error)) return { ok: false, offline: true, message: fallback };
        console.error("[points] Could not read the points rules:", error.message);
        return { ok: false, code: error.code, message: fallback };
      }
      const parsed = parsePointsRules(data);
      return parsed ? { ok: true, value: parsed } : { ok: false, message: fallback };
    } catch (e) {
      return { ok: false, offline: isOffline(e), message: fallback };
    }
  })().then((res) => {
    if (!res.ok) rules = null;
    return res;
  });
  rules = request;
  return request;
}
