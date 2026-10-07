import { supabase } from "../../../lib/supabase/client";
import { describeSupportError, parseSupportThread, type SupportThreadSummary } from "./chat";

export {
  describeSupportError,
  parseSupportThread,
  supportEntryValue,
  supportUnreadBadge,
  type SupportThreadSummary,
} from "./chat";

// The one support address the app shows (decision C32, 5 October 2026). The
// marketing site's Contact page and the upgrade request already use it; the
// in-app Contact us used to say support@centium.app, which was never set up.
export const SUPPORT_EMAIL = "support@atraxia.org";

// LIVE CHAT WITH CENTIUM SUPPORT (Database stage A5, 20261103000000_support_chat).
// The conversation itself is an ordinary `official_support` message thread: once
// it is open it is read and written through services/messaging like any other.
//
// Both functions are newer than the production schema the generated types come
// from, hence the narrow cast (the same one startVenueThread uses).
const rpc = (fn: string) =>
  (
    supabase.rpc.bind(supabase) as unknown as (
      fn: string
    ) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>
  )(fn);

export type SupportThreadResult =
  | { ok: true; thread: SupportThreadSummary | null }
  | { ok: false; message: string };

/**
 * The caller's support conversation, or null when they have never contacted
 * support (my_support_thread() returns zero rows). It creates nothing, so it is
 * safe to call every time Contact us opens.
 *
 * NEVER ASK start_support_thread() WHETHER A THREAD EXISTS: it is find-or-create,
 * so asking would create one. It belongs behind the button only.
 */
export async function fetchMySupportThread(): Promise<SupportThreadResult> {
  const { data, error } = await rpc("my_support_thread");
  if (error) {
    console.error("[support] Could not read the support thread:", error.message);
    return { ok: false, message: describeSupportError(error) };
  }
  return { ok: true, thread: parseSupportThread(data) };
}

/**
 * Finds or creates the caller's one support thread and returns its id
 * (start_support_thread(), idempotent and not rate limited). A minor may call
 * it: the database bypasses the minor messaging rule here by design, so nothing
 * in the client gates it on age either.
 */
export async function startSupportThread(): Promise<{ ok: true; threadId: string } | { ok: false; message: string }> {
  const { data, error } = await rpc("start_support_thread");
  if (error) {
    console.error("[support] Could not start the support thread:", error.message);
    return { ok: false, message: describeSupportError(error) };
  }
  const id = typeof data === "string" ? data : null;
  if (!id) return { ok: false, message: describeSupportError(null) };
  return { ok: true, threadId: id };
}
