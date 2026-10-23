// Market + Share 3.0 · W2 · one untyped rpc entry point for the client
// marketplace services (points, offers, vouchers, notifications), as
// services/pro/rpc.ts and services/share-links do: the generated client
// doesn't know the Release 1 functions yet (database.types.ts isn't
// regenerated, per the brief), so each caller casts its own row shape here.
//
// A function that hasn't landed answers PostgREST PGRST202 ("Could not find
// the function ... in the schema cache"); that is `pending`, which the screens
// show as their quiet designed state, never as an error. When the Database
// stage lands, the same call starts returning rows with no client change.

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";

type RpcResult = { data: unknown; error: PostgrestError | null };

const client = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };

/** A market read or write: the value, or why not. */
export type MarketResult<T> =
  | { ok: true; value: T }
  | { ok: false; pending?: boolean; offline?: boolean; code?: string; message: string };

/** PGRST202 (no such function) and 42883 (undefined function): the stage hasn't landed. */
export function isPendingError(e: { code?: string | null } | null | undefined): boolean {
  return !!e && (e.code === "PGRST202" || e.code === "42883");
}

/**
 * Calls `fn`; maps a missing function to `pending`, a dropped connection to
 * `offline`, anything else to `message` (the screen's own words).
 */
export async function marketRpc<T>(fn: string, args: Record<string, unknown> | undefined, fallback: string, parse: (data: unknown) => T): Promise<MarketResult<T>> {
  let res: RpcResult;
  try {
    res = await client.rpc(fn, args);
  } catch (e) {
    return { ok: false, offline: isOffline(e), message: fallback };
  }
  if (res.error) {
    if (isPendingError(res.error)) return { ok: false, pending: true, message: fallback };
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    console.error(`[market] ${fn}:`, res.error.message);
    return { ok: false, code: res.error.code, message: fallback };
  }
  return { ok: true, value: parse(res.data) };
}

/** The raw error for callers that map documented error names (redeem_offer). */
export async function marketRpcRaw(fn: string, args?: Record<string, unknown>): Promise<RpcResult | { data: null; error: null; thrown: unknown }> {
  try {
    return await client.rpc(fn, args);
  } catch (e) {
    return { data: null, error: null, thrown: e };
  }
}

/**
 * Untyped table reads for the Release 1 tables the generated types don't know
 * yet (offers, vouchers, redemptions: DB2 grants SELECT under RLS and nothing
 * else). Reads only: every write goes through a documented function.
 */
export const marketDb = supabase as unknown as SupabaseClient;

/** The signed-in user's id (from the stored session; no network). */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export { rows, str, num, bool } from "./parse";
