import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums, Tables } from "../../../lib/supabase/database.types";
import { NOT_ACCEPTING_CLIENTS } from "../subscription-tiers/freePeriodCopy";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import {
  interpretPreviewReferral,
  interpretRedeemReferral,
  toReferralSummary,
  type PreviewReferralOutcome,
  type PreviewReferralRow,
  type RedeemReferralOutcome,
  type RedeemReferralRow,
  type ReferralSummary,
  type ReferralSummaryRow,
} from "./referralLogic";

export type { PreviewReferralOutcome, RedeemReferralOutcome, ReferralSummary } from "./referralLogic";

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

  /* ATX02 = the 5-attempts-per-15-minutes limiter. Its message includes the
   * retry-time hint, so surface it verbatim.
   *
   * THE CODE ALONE, because a message match beside it was only ever redundant
   * here — not a bridge from before the code existed, which is what the
   * regexes removed in 48a6d8b and 0d6ca50 were. check_rate_limit has raised
   * `using errcode = 'ATX02'` since migration 20260907193614, and neither
   * caller swallows it: redeem_client_code calls it with `perform` and catches
   * only `sqlstate 'ATX01'`, preview_client_code calls it with `select` and
   * catches nothing. So the code reaches PostgrestError.code intact. */
  if (code === "ATX02") return message;

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
    // Task G: ATX49 is the professional's free month being over. The client
    // is told only that they are not taking new clients, never why: their
    // plan is their own business. A "failed" outcome rather than an "error",
    // like the full-roster refusal, because the code is valid and stays
    // unredeemed for when the professional's plan changes.
    if (error?.code === "ATX49") return { status: "failed", message: NOT_ACCEPTING_CLIENTS };
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

// --- referrals (A6) -------------------------------------------------------
//
// Contract: "Stage A6 · Referrals" in ../Database/docs/HANDOVER_API.md. A
// code is an account (referral_codes, permanent, no expiry); a referrals row
// is the redemption record. The old create_referral() / per-row-code flow,
// preview_referral() and redeem_referral() are no longer called, and nothing
// here reads referrals.code or referrals.expires_at (phase two drops them).
// The generated types come from production, where these functions are not
// yet, hence the narrow cast.

type LooseRpc = (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
const referralRpc = (): LooseRpc => supabase.rpc.bind(supabase) as unknown as LooseRpc;

function describeReferralError(error: { code?: string; message: string }, fallback: string): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  // ATX08: my_referral_code() found no profile to take the prefix from.
  if (error.code === "ATX08") return "Your profile isn't set up yet, so a code can't be made. Try again later.";
  // ATX01 (no session), ATX02 (5 tries per 15 minutes, its message carries the
  // retry hint) and a signed-out 42501 go through the shared mapper; anything
  // else gets the plain fallback rather than a raw database string.
  if (error.code === "ATX01" || error.code === "ATX02" || error.code === "42501" || error.code === "PGRST301") {
    return describeRedemptionError(error as PostgrestError);
  }
  return fallback;
}

/** referral_summary(): the Referrals screen in one row. Free, creates nothing. */
export async function getReferralSummary(): Promise<
  { status: "ok"; summary: ReferralSummary } | { status: "error"; message: string }
> {
  const fallback = "Couldn't load your referrals. Try again.";
  try {
    const { data, error } = await referralRpc()("referral_summary", {});
    if (error) return { status: "error", message: describeReferralError(error, fallback) };
    const row = (Array.isArray(data) ? data[0] : data) as ReferralSummaryRow | null | undefined;
    return { status: "ok", summary: toReferralSummary(row) };
  } catch (e) {
    return { status: "error", message: isOffline(e) ? OFFLINE_MESSAGE : fallback };
  }
}

/** my_referral_code(): mints the caller's permanent code on first call and
 *  returns the same one forever after. Called from "Get my code" only, never
 *  just to look. */
export async function mintMyReferralCode(): Promise<{ status: "ok"; code: string } | { status: "error"; message: string }> {
  const fallback = "Couldn't make your code. Try again.";
  try {
    const { data, error } = await referralRpc()("my_referral_code", {});
    if (error) return { status: "error", message: describeReferralError(error, fallback) };
    if (typeof data !== "string" || !data) return { status: "error", message: fallback };
    return { status: "ok", code: data };
  } catch (e) {
    return { status: "error", message: isOffline(e) ? OFFLINE_MESSAGE : fallback };
  }
}

/** redeem_referral_code(): a permanent code or a legacy single-use one. A
 *  refusal comes back as a row with a `reason`, not as an error; only a
 *  raised error (no session, the rate limit, offline) is "error". */
export async function redeemReferralCode(
  code: string
): Promise<RedeemReferralOutcome | { status: "error"; message: string }> {
  const fallback = "Couldn't apply that code. Try again.";
  try {
    const { data, error } = await referralRpc()("redeem_referral_code", { p_code: code.trim() });
    if (error) return { status: "error", message: describeReferralError(error, fallback) };
    const row = (Array.isArray(data) ? data[0] : data) as RedeemReferralRow | null | undefined;
    return interpretRedeemReferral(row);
  } catch (e) {
    return { status: "error", message: isOffline(e) ? OFFLINE_MESSAGE : fallback };
  }
}

/** preview_referral_code(): who invited you and the offer, before redeeming.
 *  Rate limited (it raises past five tries in 15 minutes, which comes back as
 *  "error" with the retry hint); never retried on not_valid. */
export async function previewReferralCode(
  code: string
): Promise<PreviewReferralOutcome | { status: "error"; message: string }> {
  const fallback = "Couldn't check that code. Try again.";
  try {
    const { data, error } = await referralRpc()("preview_referral_code", { p_code: code.trim() });
    if (error) return { status: "error", message: describeReferralError(error, fallback) };
    const row = (Array.isArray(data) ? data[0] : data) as PreviewReferralRow | null | undefined;
    return interpretPreviewReferral(row);
  } catch (e) {
    return { status: "error", message: isOffline(e) ? OFFLINE_MESSAGE : fallback };
  }
}
