import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";

// The professional's side of a hire request: who has asked, and answering them.
//
// THE READ NEEDS NO RPC. pending_client_requests_select_involved returns rows
// naming the caller as either party, so a professional reads their own inbox
// straight from the table. Only the answers are functions, because resolving a
// request also writes professional_clients, which clients and professionals
// alike hold SELECT on and nothing more.
//
// PAIRS WITH services/hire-request, which is the client's half — sending one
// and seeing its state. The two never call each other; they touch the same
// table from opposite ends, each within what RLS already allows.

export interface HireRequestRow {
  id: string;
  customerId: string;
  name: string;
  avatarUrl: string | null;
  requestedAt: string;
}

export type HireInboxResult =
  | { status: "ok"; requests: HireRequestRow[] }
  | { status: "error"; message: string };

/**
 * Accepting can fail in a way that is not a bug, which is why this is a union
 * rather than a boolean.
 *
 * "tier_limit_reached" IS AN EXPECTED OUTCOME. accept_client_request catches
 * ATX01 from the professional_clients insert and re-raises it in plainer
 * words; a professional at their plan's client limit meets it by using the
 * product as intended, and the inbox owes them that sentence rather than
 * "something went wrong".
 */
export type AcceptResult =
  | { status: "ok" }
  | { status: "tier_limit_reached" }
  | { status: "already_resolved" }
  | { status: "error"; message: string };

export type RejectResult =
  | { status: "ok" }
  | { status: "already_resolved" }
  | { status: "error"; message: string };

/**
 * WHY THESE ARE MATCHED ON MESSAGE TEXT AND NOT ON A CODE.
 *
 * accept_client_request does not propagate ATX01. It CATCHES it and re-raises
 * with `raise exception`, which carries the default SQLSTATE P0001 — and every
 * one of the function's own guards does the same. Verified against the live
 * function: "only the professional named on this request may accept it" and
 * "request not found" both come back as P0001, so the code cannot tell any of
 * these apart and the wording is the only signal there is.
 *
 * That makes this fragile in a specific, bounded way: reword the message in
 * the migration and the match silently stops working, falling through to the
 * generic branch. The patterns below are deliberately loose (matching the
 * distinctive middle of each sentence rather than the whole string) so a small
 * edit does not break them, and the failure mode is a vaguer message rather
 * than a wrong action.
 *
 * Giving those two raises their own SQLSTATEs would remove the guesswork, and
 * would be the better fix — it belongs in the migration, not here.
 */
const TIER_LIMIT = /client limit has been reached/i;
const ALREADY_RESOLVED = /already been resolved/i;

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  const message = error.message ?? "";

  if (isOffline(error)) return OFFLINE_MESSAGE;
  if (
    code === "PGRST301" ||
    code === "42501" ||
    /jwt|not authenticated|authentication|permission denied/i.test(message)
  ) {
    return "Your session expired. Sign in again to answer this request.";
  }
  // The function's own guards are already written for a person to read, so
  // they pass through rather than being replaced with something vaguer.
  if (/only the professional named|request not found/i.test(message)) return message;
  return "Could not answer that request. Try again.";
}

/**
 * The requests waiting for this professional.
 *
 * PENDING ONLY. Resolved rows stay in the table as history — the cooldown the
 * client sees is measured from a rejected row's resolved_at — but an inbox is
 * a list of things still to do, and a resolved request is not one.
 *
 * TWO READS, BECAUSE THE TABLE CARRIES NO NAMES. pending_client_requests holds
 * customer_id and nothing else about the person, so display info comes from
 * `related_profile_summary`, which is scoped to profiles the caller has a
 * relationship with — and a pending request is one.
 *
 * NOT `public_profile_summary`. That view filters to
 * account_type in ('professional','business') so customers cannot be publicly
 * enumerated, which means it returns NOTHING for every requester here. The
 * same substitution silently emptied the roster once, and the fix was the same
 * view this uses; see the note in fetchRoster.
 *
 * A MISSING PROFILE STILL RENDERS. The name falls back rather than dropping
 * the row: a request that cannot be attributed is still a request the
 * professional has to answer, and hiding it would leave them with a badge
 * count they could not reconcile against the list.
 */
export async function fetchHireInbox(professionalId: string): Promise<HireInboxResult> {
  try {
    const { data: rows, error } = await supabase
      .from("pending_client_requests")
      .select("id, customer_id, requested_at")
      .eq("professional_id", professionalId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false });

    if (error) return { status: "error", message: describe(error) };
    if (!rows?.length) return { status: "ok", requests: [] };

    const customerIds = rows.map((r) => r.customer_id).filter((id): id is string => !!id);
    const { data: profiles } = await supabase
      .from("related_profile_summary")
      .select("id, first_name, avatar_url")
      .in("id", customerIds);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return {
      status: "ok",
      requests: rows.map((r) => {
        const profile = r.customer_id ? byId.get(r.customer_id) : undefined;
        return {
          id: r.id,
          customerId: r.customer_id,
          name: profile?.first_name?.trim() || "Name unavailable",
          avatarUrl: profile?.avatar_url ?? null,
          requestedAt: r.requested_at,
        };
      }),
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Could not load your requests.",
    };
  }
}

/**
 * Takes the client on. Creates the professional_clients row, server-side.
 *
 * SAFE AGAINST AN ALREADY-ACTIVE PAIR. The function's insert carries
 * `on conflict (professional_id, client_id) where disconnected_at is null
 * do update`, so accepting someone who is already on the roster — from a
 * client code redeemed in the meantime — returns the existing relationship
 * rather than failing. Confirmed by forced test: the returned id was the
 * existing one and the active row count stayed at one.
 */
export async function acceptHireRequest(requestId: string): Promise<AcceptResult> {
  try {
    const { error } = await supabase.rpc("accept_client_request", {
      p_request_id: requestId,
    });
    if (!error) return { status: "ok" };
    if (TIER_LIMIT.test(error.message ?? "")) return { status: "tier_limit_reached" };
    if (ALREADY_RESOLVED.test(error.message ?? "")) return { status: "already_resolved" };
    console.error("[hire-inbox] Could not accept request:", error.message);
    return { status: "error", message: describe(error) };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Could not accept that request.",
    };
  }
}

/**
 * Declines the request.
 *
 * MARKS STATUS AND NOTHING ELSE — no professional_clients row is touched. What
 * the client then sees is a 24-hour cooldown before they may ask again, which
 * the database enforces on THEIR insert rather than anything happening here;
 * this side simply says no.
 */
export async function rejectHireRequest(requestId: string): Promise<RejectResult> {
  try {
    const { error } = await supabase.rpc("reject_client_request", {
      p_request_id: requestId,
    });
    if (!error) return { status: "ok" };
    if (ALREADY_RESOLVED.test(error.message ?? "")) return { status: "already_resolved" };
    console.error("[hire-inbox] Could not reject request:", error.message);
    return { status: "error", message: describe(error) };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Could not decline that request.",
    };
  }
}
