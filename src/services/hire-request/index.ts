import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";

// A client asking a professional to take them on.
//
// THE SECOND REAL ROUTE INTO professional_clients, and the one the client can
// start. The other is redeem_client_code, which requires the professional to
// hand over a code first; this one runs the other way round — the client asks,
// and the professional accepts from their inbox, which creates the roster row
// via accept_client_request.
//
// NOTHING HERE WRITES professional_clients. A request is only a request: the
// table grants clients SELECT on the roster and nothing else, so acceptance is
// the professional's to give and happens in a SECURITY DEFINER function this
// module never calls.
//
// A REQUEST CANNOT BE WITHDRAWN, and that is a property of the grants rather
// than an omission here. Clients hold INSERT on (customer_id, professional_id)
// and SELECT, with no UPDATE and no DELETE — verified by forced failure, both
// return "permission denied for table pending_client_requests". So this module
// deliberately offers no cancel, because there is no way to honour one.

/** One request row, as the client's own page needs it. */
export interface HireRequest {
  id: string;
  status: "pending" | "accepted" | "rejected";
  requestedAt: string;
  resolvedAt: string | null;
}

/**
 * What the client may do about this professional right now.
 *
 * DERIVED HERE RATHER THAN IN THE COMPONENT, so the 24-hour rule lives next to
 * the note explaining it rather than being re-implemented by every surface
 * that renders a request.
 *
 * "cooling_down" IS A DISPLAY STATE, NOT AN ENFORCEMENT. The real rule is the
 * `pending_client_requests_reject_cooldown` trigger, which measures against
 * the server's clock; this measures against the browser's. They can disagree
 * by whatever the clock skew is, and the disagreement is safe in one direction
 * only — if this says the cooldown has expired and the server disagrees, the
 * insert returns ATX07 and the UI lands back on the same state. The reverse
 * cannot happen destructively: showing a cooldown slightly too long only
 * delays a button.
 */
export type HireRequestState = "none" | "pending" | "cooling_down";

/** How long a rejection blocks a fresh request. Mirrors migration 20260912090000. */
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type MyHireRequestResult =
  | { status: "ok"; state: HireRequestState; request: HireRequest | null }
  | { status: "error"; message: string };

export type SendHireRequestResult =
  | { status: "ok"; request: HireRequest }
  /** A request for this pair is already open. 23505 on the one-open index. */
  | { status: "already_pending" }
  /** Rejected within the last 24 hours. ATX07 from the cooldown trigger. */
  | { status: "cooling_down" }
  | { status: "error"; message: string };

function describe(error: PostgrestError): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to send a request.";
  }
  if (code === "42501") return "You can't send a request to that professional.";
  return "Something went wrong. Try again.";
}

/**
 * The caller's own request for one professional, and what it means for the UI.
 *
 * READS EVERY ROW FOR THE PAIR, NOT JUST THE LATEST. A pair accumulates
 * history — a rejection, then a later request, then another — and the two
 * questions the card asks are answered by different rows: "is one open right
 * now" by any pending row, and "am I inside a cooldown" by the most recent
 * REJECTED one. Taking only the newest row would answer the second wrongly
 * whenever an older rejection was followed by anything else.
 *
 * RLS SCOPES THIS TO THE CALLER without a customer_id filter:
 * pending_client_requests_select_involved returns rows naming the caller as
 * either party. The professional_id filter below is the query's subject, not a
 * security boundary.
 *
 * NO PROFILE JOIN. The client already has the professional's name and avatar
 * from the page they are standing on, so there is nothing to resolve. Were one
 * ever needed it would have to be related_profile_summary rather than
 * public_profile_summary — the latter filters to professionals and businesses
 * and returns nothing for a customer, a mistake fetchRoster already made once.
 */
export async function fetchMyHireRequest(
  professionalId: string
): Promise<MyHireRequestResult> {
  try {
    const { data, error } = await supabase
      .from("pending_client_requests")
      .select("id, status, requested_at, resolved_at")
      .eq("professional_id", professionalId)
      .order("requested_at", { ascending: false });

    if (error) return { status: "error", message: describe(error) };

    const rows: HireRequest[] = (data ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      requestedAt: r.requested_at,
      resolvedAt: r.resolved_at,
    }));

    const pending = rows.find((r) => r.status === "pending");
    if (pending) return { status: "ok", state: "pending", request: pending };

    const lastRejected = rows.find((r) => r.status === "rejected" && r.resolvedAt);
    if (lastRejected?.resolvedAt) {
      const since = Date.now() - new Date(lastRejected.resolvedAt).getTime();
      if (since < COOLDOWN_MS) {
        return { status: "ok", state: "cooling_down", request: lastRejected };
      }
    }

    // An accepted request is not a state this card renders: the page is
    // showing the connected layout by then, decided by professional_clients
    // rather than by anything here.
    return { status: "ok", state: "none", request: rows[0] ?? null };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Could not check your request.",
    };
  }
}

/**
 * Asks a professional to take the caller on as a client.
 *
 * A PLAIN INSERT, NOT AN RPC, because the grant already allows exactly this
 * and nothing more: INSERT on (customer_id, professional_id) only, under
 * pending_client_requests_insert_by_customer, which requires customer_id to be
 * the caller and status to be 'pending'. `status`, `requested_at` and
 * `resolved_at` are not in the grant, so the defaults and the trigger own them
 * — a client cannot post a request that claims to be already accepted.
 *
 * TWO REFUSALS ARE NAMED RATHER THAN DESCRIBED, because they mean different
 * things to the person reading the card and neither is an error in the sense
 * of something having gone wrong:
 *
 *   23505  a request for this pair is already open. The one-open partial
 *          unique index. Reachable from a stale page or a double tap.
 *   ATX07  this professional rejected the caller within the last 24 hours.
 *          The cooldown trigger from migration 20260912090000.
 *
 * Anything else is a genuine failure and gets the generic message.
 */
export async function sendHireRequest(
  professionalId: string,
  clientId: string
): Promise<SendHireRequestResult> {
  try {
    const { data, error } = await supabase
      .from("pending_client_requests")
      .insert({ customer_id: clientId, professional_id: professionalId })
      .select("id, status, requested_at, resolved_at")
      .single();

    if (error) {
      if (error.code === "23505") return { status: "already_pending" };
      if (error.code === "ATX07") return { status: "cooling_down" };
      console.error("[hire-request] Could not send request:", error.message);
      return { status: "error", message: describe(error) };
    }

    return {
      status: "ok",
      request: {
        id: data.id,
        status: data.status,
        requestedAt: data.requested_at,
        resolvedAt: data.resolved_at,
      },
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Could not send your request.",
    };
  }
}
