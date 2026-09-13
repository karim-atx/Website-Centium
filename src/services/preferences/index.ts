import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";

// The caller's own cross-platform preferences.
//
// THE FIRST CLIENT USE OF app_preferences, which until now existed in the
// schema and was read by nothing. Its own migration comment calls it "the other
// side of the split": one row per user, no `platform` column, deliberately
// synced everywhere, as against device_presentation_settings which deliberately
// is not. Everything else the app calls a preference — notifications, language,
// theme — still lives in localStorage via usePersistentState. This is the first
// column wired the way that table was designed for, so the shape below is the
// precedent the rest will follow when they move.
//
// MOST USERS HAVE NO ROW. Nothing creates one at signup, so "no row" is the
// normal state rather than an error, and every read has to mean the default
// rather than fail. thread_shows_read_receipts() makes the same assumption
// server-side, coalescing a missing row to false.

export type ReadReceiptPref =
  | { status: "ok"; hideReadReceipts: boolean }
  | { status: "error"; message: string };

function describe(error: PostgrestError): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = error.code ?? "";
  if (code === "PGRST301" || code === "42501") {
    return "Your session expired. Sign in again to change this.";
  }
  return "Couldn't save that. Try again.";
}

/**
 * Whether the caller has turned read receipts off.
 *
 * NO owner_id FILTER, AND THAT IS NOT AN OMISSION. app_preferences_select_own
 * is own-row-only, so the caller cannot see anyone else's row and a filter
 * would restate the policy rather than narrow anything — the same reasoning
 * fetchMyHireRequest records for pending_client_requests.
 *
 * maybeSingle() RATHER THAN single(): no row is the common case, not a fault.
 * single() treats zero rows as PGRST116 and would turn the default state of
 * every account that has never opened this setting into an error.
 */
export async function fetchHideReadReceipts(): Promise<ReadReceiptPref> {
  try {
    const { data, error } = await supabase
      .from("app_preferences")
      .select("hide_read_receipts")
      .maybeSingle();

    if (error) {
      console.error("[preferences] Could not read preferences:", error.code, error.message);
      return { status: "error", message: describe(error) };
    }
    return { status: "ok", hideReadReceipts: data?.hide_read_receipts ?? false };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Couldn't read your preferences.",
    };
  }
}

/**
 * Turns read receipts off or back on.
 *
 * UPDATE FIRST, INSERT ONLY IF NOTHING MATCHED — NOT `.upsert()`, and that is
 * measured rather than assumed. app_preferences has a column-scoped UPDATE
 * grant that does not include owner_id, and PostgREST's upsert compiles to
 * `ON CONFLICT DO UPDATE SET` over every column in the payload, owner_id
 * included. Privileges are checked at PLAN time, so it is refused with 42501
 * even on the insert path where that branch never runs — verified through
 * PostgREST as a real signed-in user: the upsert returned
 * "permission denied for table app_preferences" and wrote nothing, while a
 * plain INSERT returned 201 and a plain UPDATE of this column alone returned
 * 200. The same column-grant-versus-plan-time trap cost pinned_messages a
 * follow-up migration; here the client bends instead of the grant.
 *
 * ROW COUNT DECIDES, NOT AN ERROR. A matched-nothing UPDATE comes back
 * `error: null` with an empty array, which is the established signal in this
 * codebase for "the write was refused or there was nothing to write" — see
 * markThreadRead. Here it means only "no row yet", because RLS cannot be the
 * cause: the filter is the caller's own id.
 *
 * THE 23505 BRANCH IS A RACE, NOT A FALLBACK. Two surfaces toggling at once —
 * or a second tab — can both find no row and both insert. The loser retries
 * the update rather than reporting a failure for a row that now exists.
 */
export async function setHideReadReceipts(
  ownerId: string,
  hide: boolean
): Promise<ReadReceiptPref> {
  try {
    const updated = await supabase
      .from("app_preferences")
      .update({ hide_read_receipts: hide })
      .eq("owner_id", ownerId)
      .select("hide_read_receipts");

    if (updated.error) {
      console.error("[preferences] Could not update:", updated.error.code, updated.error.message);
      return { status: "error", message: describe(updated.error) };
    }
    if (updated.data && updated.data.length > 0) {
      return { status: "ok", hideReadReceipts: updated.data[0].hide_read_receipts };
    }

    const inserted = await supabase
      .from("app_preferences")
      .insert({ owner_id: ownerId, hide_read_receipts: hide })
      .select("hide_read_receipts")
      .single();

    if (!inserted.error) {
      return { status: "ok", hideReadReceipts: inserted.data.hide_read_receipts };
    }

    if (inserted.error.code === "23505") {
      const retry = await supabase
        .from("app_preferences")
        .update({ hide_read_receipts: hide })
        .eq("owner_id", ownerId)
        .select("hide_read_receipts");
      if (!retry.error && retry.data && retry.data.length > 0) {
        return { status: "ok", hideReadReceipts: retry.data[0].hide_read_receipts };
      }
    }

    console.error("[preferences] Could not insert:", inserted.error.code, inserted.error.message);
    return { status: "error", message: describe(inserted.error) };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Couldn't save that preference.",
    };
  }
}
