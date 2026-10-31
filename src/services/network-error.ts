import { t, tk, tn } from "../i18n/core";

/**
 * Telling a dropped connection apart from a database refusal.
 *
 * WHY THIS IS NEEDED AT ALL. supabase-js hands both back through the same
 * channel, so a caller that maps errors to sentences has to distinguish them
 * or it will show the wrong one. Two services used to end their mapper with
 * `error.message`, which meant a user who lost wifi mid-action was shown
 * "TypeError: Failed to fetch" — accurate, useless, and alarming for something
 * as ordinary as a tunnel.
 *
 * THE ABSENT CODE IS THE SIGNAL, not the message text. PostgREST populates
 * `code` for anything the database actually rejected — a constraint, a policy,
 * a privilege — so an error carrying no code never reached the database at
 * all. The message is checked too, because a thrown TypeError has no code
 * either and neither does an aborted request, but the wording varies by engine
 * ("Failed to fetch" in Chrome, "NetworkError when attempting to fetch
 * resource" in Firefox, "Load failed" in Safari) and is not a contract.
 */
export function isOffline(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error !== "object" || error === null) return false;

  const e = error as { code?: unknown; message?: unknown; name?: unknown };
  const message = typeof e.message === "string" ? e.message : "";
  const hasCode = typeof e.code === "string" && e.code.length > 0;

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return true;
  }
  // No code and no message worth reading: nothing from the database looks like
  // this, so treat it as a transport failure rather than inventing a cause.
  return !hasCode && (e.name === "TypeError" || message === "");
}

/**
 * The one sentence for a connection failure.
 *
 * Shared so the app does not develop several ways of saying the same thing —
 * the audit found identical failures worded four different ways, plus two that
 * showed a raw TypeError.
 */
// Marked, not translated: services return it and screens compare against it
// (=== OFFLINE_MESSAGE), so it stays English; a screen shows it through t().
export const OFFLINE_MESSAGE = tk("Couldn't reach the server. Check your connection and try again.");

/**
 * check_rate_limit's refusal (ATX02) as a sentence. The server's text is
 * "Too many <action> attempts. Please try again in N minute(s).", which names
 * an internal action ("Too many review_gym attempts"), so it is never shown;
 * only its N is read. No N: the wait is said without a number.
 */
export function rateLimitMessage(serverMessage: string | null | undefined): string {
  const m = /in (\d+) minute/i.exec(serverMessage ?? "");
  const n = m ? Number(m[1]) : NaN;
  if (!Number.isInteger(n) || n < 1) return t("Too many tries. Wait a few minutes and try again.");
  return tn(n, "Too many tries. Try again in {n} minute.", "Too many tries. Try again in {n} minutes.");
}
