import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  describeNotificationError,
  NOTIFICATION_SELECT,
  notificationPatchToRow,
  rowToNotificationPrefs,
  type NotificationPrefs,
  type NotificationRow,
} from "./notifications";

export * from "./notifications";

// The caller's own cross-platform preferences.
//
// THE FIRST CLIENT USE OF app_preferences, which until now existed in the
// schema and was read by nothing. Its own migration comment calls it "the other
// side of the split": one row per user, no `platform` column, deliberately
// synced everywhere, as against device_presentation_settings which deliberately
// is not. Read receipts were the first column wired the way that table was
// designed for; since Stage A2 every MO1.8.3 notification switch is too (below).
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

// --- MO1.8.3 Notifications (Stage A2) ----------------------------------------
//
// Every switch on the screen, the master and quiet hours, as app_preferences
// columns (notifications.ts has the map). Read together, written one column
// (or one From / To) at a time.

type NotifRows = PromiseLike<{ data: Partial<NotificationRow>[] | null; error: PostgrestError | null }>;
type NotifRow = PromiseLike<{ data: Partial<NotificationRow> | null; error: PostgrestError | null }>;

// The generated types come from production, which does not have the twelve
// A2 columns yet (notification_allow, notification_water ... quiet_hours_to).
// This one handle is cast at the service boundary; everything above it is
// typed by NotificationRow.
const notifTable = () =>
  supabase.from("app_preferences") as unknown as {
    select: (columns: string) => { maybeSingle: () => NotifRow };
    update: (values: Partial<NotificationRow>) => {
      eq: (column: "owner_id", value: string) => { select: (columns: string) => NotifRows };
    };
    insert: (values: Partial<NotificationRow> & { owner_id: string }) => {
      select: (columns: string) => { single: () => NotifRow };
    };
  };

export type NotificationPrefsResult =
  | { status: "ok"; prefs: NotificationPrefs }
  | { status: "error"; message: string };

function mapped(row: Partial<NotificationRow> | null | undefined, reading: boolean): NotificationPrefsResult {
  const prefs = rowToNotificationPrefs(row);
  if (prefs) return { status: "ok", prefs };
  console.error("[preferences] Notification columns missing from the row");
  return { status: "error", message: describeNotificationError(null, reading) };
}

/**
 * The caller's MO1.8.3 values, as the database holds them.
 *
 * NO ROW YET IS NORMAL (nothing creates one at signup), and the defaults live
 * in the column definitions, not here. So a missing row is created with
 * owner_id alone and read back: the database fills in its own defaults (every
 * category and the master on, quiet hours off at 22:00 to 07:00) and the
 * screen shows exactly those. That changes nothing the senders see:
 * should_notify() already reads "no row" as those same defaults. A 23505 is a
 * second tab that created it first; read it again.
 */
export async function fetchNotificationPrefs(ownerId: string): Promise<NotificationPrefsResult> {
  try {
    const read = await notifTable().select(NOTIFICATION_SELECT).maybeSingle();
    if (read.error) {
      console.error("[preferences] Could not read notifications:", read.error.code, read.error.message);
      return { status: "error", message: describeNotificationError(read.error, true) };
    }
    if (read.data) return mapped(read.data, true);

    const inserted = await notifTable().insert({ owner_id: ownerId }).select(NOTIFICATION_SELECT).single();
    if (!inserted.error) return mapped(inserted.data, true);
    if (inserted.error.code === "23505") {
      const again = await notifTable().select(NOTIFICATION_SELECT).maybeSingle();
      if (!again.error && again.data) return mapped(again.data, true);
    }
    console.error("[preferences] Could not create the row:", inserted.error.code, inserted.error.message);
    return { status: "error", message: describeNotificationError(inserted.error, true) };
  } catch (e) {
    return { status: "error", message: describeNotificationError(e, true) };
  }
}

/**
 * Saves only the changed values' columns, and returns the row as it now is.
 *
 * UPDATE FIRST, INSERT ONLY IF NOTHING MATCHED, never upsert: the same
 * column-scoped UPDATE grant and the same 23505 race as setHideReadReceipts.
 * A 23514 is the quiet-hours CHECK (From = To); the screen refuses that before
 * sending, so it reaches here only from a stale copy.
 */
export async function saveNotificationPrefs(
  ownerId: string,
  patch: Partial<NotificationPrefs>
): Promise<NotificationPrefsResult> {
  const values = notificationPatchToRow(patch);
  try {
    const update = () => notifTable().update(values).eq("owner_id", ownerId).select(NOTIFICATION_SELECT);
    const updated = await update();
    if (updated.error) {
      console.error("[preferences] Could not update notifications:", updated.error.code, updated.error.message);
      return { status: "error", message: describeNotificationError(updated.error) };
    }
    if (updated.data && updated.data.length > 0) return mapped(updated.data[0], false);

    const inserted = await notifTable()
      .insert({ owner_id: ownerId, ...values })
      .select(NOTIFICATION_SELECT)
      .single();
    if (!inserted.error) return mapped(inserted.data, false);
    if (inserted.error.code === "23505") {
      const retry = await update();
      if (!retry.error && retry.data && retry.data.length > 0) return mapped(retry.data[0], false);
    }
    console.error("[preferences] Could not insert notifications:", inserted.error.code, inserted.error.message);
    return { status: "error", message: describeNotificationError(inserted.error) };
  } catch (e) {
    return { status: "error", message: describeNotificationError(e) };
  }
}
