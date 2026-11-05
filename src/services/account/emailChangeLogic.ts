import { tk } from "../../i18n/core";

/**
 * Round J · FI: the decisions behind Settings › Account's email change, kept
 * pure so they are tested without an auth server.
 *
 * THE FLOW IS SUPABASE'S OWN, WITH DOUBLE CONFIRMATION ON (Karim, Round J):
 * updateUser({ email }) stores the address as the user's `new_email` and sends
 * a link to the new address AND to the current one. Each link is verified by
 * GoTrue itself, then redirects to the page with `?email=confirmed`. The first
 * one adds `message=` ("…proceed to confirm link sent to the other email");
 * the second applies the change (and, under PKCE, adds `code=`, which
 * supabase-js exchanges when this browser holds the verifier). A refused link
 * comes back with error, error_code and error_description instead.
 *
 * Nothing here trusts the URL for the outcome: the page reads the user again
 * and `new_email` still being set is what says "not finished yet".
 */

/** The marker the page's redirect URL carries, so an arrival is told apart from a visit. */
export const RETURN_MARKER = "email";
export const RETURN_VALUE = "confirmed";

export type EmailReturn =
  | { kind: "none" }
  /** A link was opened; the page reads the user to see how far it got. */
  | { kind: "link"; firstOfTwo: boolean }
  | { kind: "error"; message: string };

/** What a return URL says, from its query and fragment (PKCE uses the first, implicit the second). */
export function readEmailReturn(search: string, hash: string): EmailReturn {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const get = (k: string) => query.get(k) ?? fragment.get(k);
  if (query.get(RETURN_MARKER) !== RETURN_VALUE) return { kind: "none" };
  if (get("error") || get("error_code") || get("error_description")) {
    return { kind: "error", message: returnErrorMessage(get("error_code")) };
  }
  return { kind: "link", firstOfTwo: !!get("message") };
}

/** The return URL's own keys, removed from the address bar once read. `code` is supabase-js's to remove. */
export const RETURN_KEYS = [RETURN_MARKER, "message", "error", "error_code", "error_description"];

export const LINK_EXPIRED = tk("That link has expired or was already used. Send a new one below.");

function returnErrorMessage(code: string | null): string {
  switch (code) {
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
      return LINK_EXPIRED;
    default:
      return tk("That link didn't work. Send a new one below.");
  }
}

export type EmailStage =
  /** Nothing waiting. */
  | { stage: "idle" }
  /** Sent; waiting for the links. `afterFirst`: one of the two has been opened. */
  | { stage: "pending"; newEmail: string; afterFirst: boolean }
  /** Just finished, on this arrival. */
  | { stage: "done"; email: string };

/**
 * Where the change stands, from the user as the server has it now, and this
 * page load's return (readEmailReturn). A link was opened and nothing is
 * waiting any more: the change is done.
 */
export function emailStage(user: { email?: string | null; new_email?: string | null }, arrived: EmailReturn): EmailStage {
  const pending = (user.new_email ?? "").trim();
  if (pending) return { stage: "pending", newEmail: pending, afterFirst: arrived.kind === "link" && arrived.firstOfTwo };
  if (arrived.kind === "link" && user.email) return { stage: "done", email: user.email };
  return { stage: "idle" };
}

/** A plain shape check; GoTrue has the final word (email_address_invalid). */
export function looksLikeEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export const NOT_AN_EMAIL = tk("Enter a full email address, like name@example.com.");
export const SAME_EMAIL = tk("That's already your email.");
export const EMAIL_TAKEN = tk("That email belongs to another account. Use a different one.");
export const SESSION_EXPIRED = tk("Your session has expired. Sign in again, then change your email.");
export const CHANGE_FAILED = tk("Couldn't change your email. Try again.");

/**
 * Checked before anything is sent. Returns the address as it will be sent
 * (trimmed), or the sentence to show.
 */
export function checkNewEmail(raw: string, current: string | null): { ok: true; email: string } | { ok: false; message: string } {
  const email = raw.trim();
  if (!looksLikeEmail(email)) return { ok: false, message: NOT_AN_EMAIL };
  if (current && email.toLowerCase() === current.trim().toLowerCase()) return { ok: false, message: SAME_EMAIL };
  return { ok: true, email };
}

/**
 * GoTrue's codes for an email update that the page words itself. Anything not
 * named here returns null and goes to the shared describeAuthError (rate
 * limits, the email quota, the burner-email hook, the two-factor ones).
 */
export function emailChangeMessage(code: string | undefined): string | null {
  switch (code) {
    case "email_exists":
    case "user_already_exists":
    case "email_conflict_identity_not_deletable":
      return EMAIL_TAKEN;
    case "email_address_invalid":
    case "validation_failed":
      return NOT_AN_EMAIL;
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
    case "bad_jwt":
    case "no_authorization":
    case "user_not_found":
      return SESSION_EXPIRED;
    default:
      return null;
  }
}
