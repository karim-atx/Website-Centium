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
 * rather than a boolean. Each named variant is one SQLSTATE the function
 * raises; see the code table below.
 *
 * "tier_limit_reached" IS AN EXPECTED OUTCOME. accept_client_request catches
 * ATX01 from the professional_clients insert and re-raises it in plainer
 * words — keeping the code — and a professional at their plan's client limit
 * meets it by using the product as intended, so the inbox owes them that
 * sentence rather than "something went wrong".
 *
 * "not_found" AND "already_resolved" ARE SEPARATE CODES BUT ONE OUTCOME to the
 * person reading the inbox: the request in front of them is not answerable and
 * the list needs to catch up. They stay apart here anyway, because the database
 * can now tell them apart and collapsing them at this boundary would throw that
 * away — the caller decides whether it cares.
 *
 * "permission_denied" SHOULD BE UNREACHABLE. The inbox only ever shows a
 * professional rows already filtered to their own id, so answering one they are
 * not named on means the list is showing something it should not. It gets a
 * real message rather than a silent refresh precisely so that is visible.
 */
export type AcceptResult =
  | { status: "ok" }
  | { status: "tier_limit_reached" }
  | { status: "already_resolved" }
  | { status: "not_found" }
  | { status: "permission_denied" }
  | { status: "error"; message: string };

export type RejectResult =
  | { status: "ok" }
  | { status: "already_resolved" }
  | { status: "not_found" }
  | { status: "permission_denied" }
  | { status: "error"; message: string };

/**
 * THE SQLSTATES BOTH RPCs RAISE. Migration 20260912100000 gave every guard in
 * accept_client_request and reject_client_request a code of its own; until it
 * landed they all arrived as the default P0001, and this module matched on the
 * message text instead.
 *
 * THE REGEXES ARE GONE RATHER THAN KEPT AS A FALLBACK. That migration changed
 * no message text — deliberately, so the two mechanisms could overlap for as
 * long as anyone wanted — which is precisely why keeping them buys nothing:
 * they would match the same errors the codes already match, raised by the same
 * function bodies. They could only ever fire if the codes stopped arriving, and
 * a silent fallback there is worse than a visible failure, because it would
 * mask a rolled-back migration instead of surfacing one. Every code below was
 * forced live through a signed-in user before this was written, and staging is
 * the only configured environment (the PROD entries in .env.local are empty),
 * so there is no deployment where the wording is still the only signal.
 *
 * The codes name conditions rather than functions, which is why the same three
 * serve both calls: the caller always knows which RPC it invoked.
 */
const CODE = {
  /** Tier cap. Raised by professional_clients_enforce_tier_cap, caught by
   *  accept_client_request and re-raised without the raw usage counts. */
  TIER_LIMIT: "ATX01",
  /** No row with that id. */
  NOT_FOUND: "ATX08",
  /** The caller is not the professional named on the request. */
  NOT_ENTITLED: "ATX09",
  /** The row is no longer pending. */
  ALREADY_RESOLVED: "ATX10",
} as const;

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
  // Every guard these two functions raise is a named outcome above, so nothing
  // reaching here is a sentence written for this professional to read.
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
    if (error.code === CODE.TIER_LIMIT) return { status: "tier_limit_reached" };
    if (error.code === CODE.ALREADY_RESOLVED) return { status: "already_resolved" };
    if (error.code === CODE.NOT_FOUND) return { status: "not_found" };
    if (error.code === CODE.NOT_ENTITLED) return { status: "permission_denied" };
    console.error("[hire-inbox] Could not accept request:", error.code, error.message);
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
    if (error.code === CODE.ALREADY_RESOLVED) return { status: "already_resolved" };
    if (error.code === CODE.NOT_FOUND) return { status: "not_found" };
    if (error.code === CODE.NOT_ENTITLED) return { status: "permission_denied" };
    console.error("[hire-inbox] Could not reject request:", error.code, error.message);
    return { status: "error", message: describe(error) };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Could not decline that request.",
    };
  }
}
