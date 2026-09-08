// "Remember me" — whether this browser should keep the session after it closes.
//
// Read by the cookie adapter in client.ts every time Supabase writes a session
// cookie, which is why it lives next to the client rather than in app state:
// the adapter runs during token refreshes long before React has rendered
// anything, and it needs the answer synchronously.
//
// WHAT THIS DOES AND DOES NOT DO. Unticking it stops *this browser* from
// persisting the session past close. It does not shorten the refresh token's
// own lifetime, which only the server can do — so this is a convenience and a
// shared-computer courtesy, not a security control, and no UI copy should
// claim otherwise.

const KEY = "centium.rememberMe";

/**
 * sessionStorage, not localStorage, and deliberately.
 *
 * The preference has to outlive a page reload — a token refresh on the next
 * load must keep writing session cookies rather than silently upgrading them
 * to persistent — but it must not outlive the browser itself. sessionStorage
 * has exactly that lifetime, so the flag dies alongside the cookie it governs
 * and a fresh browser starts from the default again.
 */
export function setRememberMe(remember: boolean): void {
  try {
    sessionStorage.setItem(KEY, remember ? "1" : "0");
  } catch {
    // Private windows and blocked site data throw on access. Failing to
    // record the preference falls back to the persistent default, which is
    // the existing behaviour rather than a new failure mode.
  }
}

/**
 * Defaults to true when unset, so every path that never touches the checkbox
 * — OAuth, an email-confirmation return, a refresh on a later visit — behaves
 * exactly as it did before this existed.
 */
export function getRememberMe(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}
