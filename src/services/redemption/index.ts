import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums, Tables } from "../../../lib/supabase/database.types";

// Client-code and referral-code redemption, against the real RPCs.
//
// Every redeem_* function has the same three-layer failure surface, and all
// three must be handled — checking only one of them is the classic way to
// report a failed redemption as a success:
//
//   1. A thrown/transport error (network down, client blew up)   -> catch
//   2. A raised Postgres exception surfaced as `error`:
//      not authenticated, or the ATX02 rate limit (5 per 15 min)  -> error
//   3. A *returned* business-logic failure: wrong code, expired,
//      already redeemed, professional at capacity. These do NOT
//      raise — they come back 200 with success:false               -> data.success
//
// And per the Database repo's README follow-up 15, the returned row must be
// probed by a specific field (`.relationship?.id`), never by truthiness of
// the composite itself: a Postgres composite whose fields are all NULL still
// deserializes to a non-null object, so `if (result.relationship)` is true
// even when there is no row.

export interface ClientCodePreview {
  code: string;
  expiresAt: string;
  redeemed: boolean;
  professionalId: string;
  professionalFirstName: string;
  professionalAvatarUrl: string | null;
  professionalSubtype: Enums<"professional_subtype">;
}

export type PreviewResult<T> =
  | { status: "found"; data: T }
  | { status: "not_found" }
  | { status: "error"; message: string };

export type RedeemResult =
  | { status: "success"; id: string; message: string | null }
  | { status: "failed"; message: string }
  | { status: "error"; message: string };

/**
 * Maps a raised Postgres error to something worth showing. The database
 * functions author their own messages (the rate-limit one carries a retry
 * hint), so the default is to pass the message straight through rather than
 * replace it with something vaguer.
 */
function describeRedemptionError(error: PostgrestError): string {
  const code = error.code ?? "";
  const message = error.message ?? "";

  // ATX02 = the 5-attempts-per-15-minutes limiter. Its message includes the
  // retry-time hint, so surface it verbatim.
  if (code === "ATX02" || /ATX02/.test(message)) return message;

  // Verified against staging: an unauthenticated redeem_* raises P0001
  // "authentication required", while the preview_* functions are not granted
  // to anon at all and fail with 42501 "permission denied for function ...".
  // Both mean the same thing to a user, and neither raw string belongs on
  // screen.
  if (
    code === "PGRST301" ||
    code === "42501" ||
    /jwt|not authenticated|authentication|permission denied/i.test(message)
  ) {
    return "You need to be signed in to use a code. Sign in and try again.";
  }
  return message || "Something went wrong redeeming that code. Try again.";
}

/** Shared shape-check for a redeem_* composite response. */
function interpretRedeem(
  data: { success: boolean | null; message: string | null } | null,
  rowId: string | null | undefined
): RedeemResult {
  // success is `boolean | null` in the generated types, so an explicit
  // !== true keeps a null from ever reading as success.
  if (!data || data.success !== true) {
    return { status: "failed", message: data?.message ?? "That code could not be redeemed." };
  }
  // Follow-up 15: probe a specific field, not the composite object.
  if (!rowId) {
    return {
      status: "failed",
      message: data.message ?? "That code was accepted but no record came back. Try again.",
    };
  }
  return { status: "success", id: rowId, message: data.message };
}

// --- client codes ---------------------------------------------------------

export async function previewClientCode(code: string): Promise<PreviewResult<ClientCodePreview>> {
  try {
    const { data, error } = await supabase.rpc("preview_client_code", { p_code: code.trim() });
    if (error) return { status: "error", message: describeRedemptionError(error) };
    // Returns a table: no match is an empty array, not an error.
    const row = data?.[0];
    if (!row) return { status: "not_found" };
    return {
      status: "found",
      data: {
        code: row.code,
        expiresAt: row.expires_at,
        redeemed: row.redeemed,
        professionalId: row.professional_id,
        professionalFirstName: row.professional_first_name,
        professionalAvatarUrl: row.professional_avatar_url ?? null,
        professionalSubtype: row.professional_subtype,
      },
    };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not check that code." };
  }
}

export async function redeemClientCode(code: string): Promise<RedeemResult> {
  try {
    const { data, error } = await supabase.rpc("redeem_client_code", { p_code: code.trim() });
    if (error) return { status: "error", message: describeRedemptionError(error) };
    const result = data as unknown as {
      success: boolean | null;
      message: string | null;
      relationship: Tables<"professional_clients"> | null;
    } | null;
    return interpretRedeem(result, result?.relationship?.id);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not redeem that code." };
  }
}

