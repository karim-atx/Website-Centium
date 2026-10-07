import { isOffline, OFFLINE_MESSAGE } from "../network-error";

// Live chat with Centium support (Database stage A5, 20261103000000_support_chat):
// the pure half, so it can be tested without a Supabase client. The calls are in
// ./index.ts.

/** The caller's one support conversation, as my_support_thread() describes it. */
export interface SupportThreadSummary {
  threadId: string;
  createdAt: string;
  messagesTotal: number;
  /** Messages from support the caller has not read. */
  unreadCount: number;
  /** Null while the thread is still empty. */
  lastMessageAt: string | null;
  /** Whether the newest message is support's. Null while the thread is still empty. */
  lastFromSupport: boolean | null;
}

/**
 * my_support_thread() returns ZERO ROWS for someone who has never contacted
 * support, and one row otherwise. Zero rows is null here: that is the signal for
 * "Start a chat", and it is never treated as an error. A row without a thread id
 * is not a thread either.
 */
export function parseSupportThread(data: unknown): SupportThreadSummary | null {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r || typeof r.thread_id !== "string" || !r.thread_id) return null;
  const count = (v: unknown) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  return {
    threadId: r.thread_id,
    createdAt: typeof r.created_at === "string" ? r.created_at : "",
    messagesTotal: count(r.messages_total),
    unreadCount: count(r.unread_count),
    lastMessageAt: typeof r.last_message_at === "string" ? r.last_message_at : null,
    lastFromSupport: typeof r.last_from_support === "boolean" ? r.last_from_support : null,
  };
}

/**
 * The value text on the Live chat row of MO1.8.9 (12 / 400 muted, where the
 * Email row shows the address). The board draws the row with no value, so these
 * words are the app's, not the handover's:
 *   no thread, or an empty one   "Start a chat"
 *   support spoke last           "Centium replied · <time>"
 *   the person spoke last        "Sent · <time>"
 * The time is formatted by the caller (the chat list's own listTime), so the row
 * and the Messages list say the same thing about the same message.
 */
export function supportEntryValue(
  summary: SupportThreadSummary | null,
  formatTime: (iso: string) => string
): string {
  if (!summary || summary.messagesTotal === 0 || !summary.lastMessageAt) return "Start a chat";
  const when = formatTime(summary.lastMessageAt);
  return summary.lastFromSupport ? `Centium replied · ${when}` : `Sent · ${when}`;
}

/** The unread badge's text: nothing at zero, capped like the chat list's. */
export function supportUnreadBadge(summary: SupportThreadSummary | null): string | null {
  const n = summary?.unreadCount ?? 0;
  if (n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

/**
 * start_support_thread() and my_support_thread() refusals, in words.
 *
 * ATX01: no session. 22023: the caller IS the support identity (only reachable
 * signed in as the desk itself). A refusal with no code that is not a dropped
 * connection is the "support identity is not provisioned" configuration error:
 * the person can do nothing about it, so it points them at email, which the
 * same popup offers.
 */
export function describeSupportError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Try again.";
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = error.code ?? "";
  if (code === "ATX01" || code === "PGRST301" || /jwt|not authenticated|authentication required/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to chat with support.";
  }
  if (code === "22023") return "This account is Centium support, so it can't open a support chat with itself.";
  if (/support identity is not provisioned/i.test(error.message ?? "")) {
    return "Live chat isn't available right now. Email us instead.";
  }
  return "Couldn't open the chat. Try again, or email us.";
}
