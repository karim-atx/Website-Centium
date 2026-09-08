// Password-recovery session scoping.
//
// A recovery link produces a REAL Supabase session. auth.uid() is set, the
// profile hydrates, and every route guard would otherwise wave it through —
// which means an inbox, or a forwarded link, would hand someone full access
// to the account without them knowing the password. The session cannot be
// prevented (GoTrue calls _saveSession() before it notifies any subscriber),
// so instead it is refused: nothing under /app is honoured until the password
// has actually been changed.
//
// Two independent layers, because one enforcement point is one bug away from
// none:
//
//   1. A pending flag, below, that every /app guard checks. It lives in
//      localStorage so it survives reloads AND browser restarts — a flag in
//      sessionStorage would vanish on restart while the auth cookie lived on,
//      leaving exactly the access this is meant to deny.
//
//      The key is namespaced under "centium-state:" deliberately. AppContext's
//      signOut() clears localStorage with k.startsWith("centium-state"), so
//      anything outside that prefix survives a sign-out. An earlier version of
//      this used "centium.recoveryPending" and therefore did NOT get cleared —
//      a flag that outlived sign-out, sign-in and a browser restart would have
//      locked an account out of the app permanently, with no way for the user
//      to clear it, had the password update ever failed.
//   2. The recovery session is written as a session cookie regardless of the
//      "Remember me" preference (see client.ts), so an abandoned recovery
//      dies when the browser closes rather than lingering for 400 days.
//
// WHAT THIS DOES NOT DO. Neither layer is server-side. The refresh token
// stays valid for its natural lifetime, so someone who lifts it out of
// devtools still holds a usable token; layer 2 bounds that window rather than
// closing it. Properly revoking it needs a backend this app does not have.

const FLAG_KEY = "centium-state:recoveryPending";

/**
 * Records that this account arrived via a recovery link and has not yet set
 * a new password. Stores the user id, not a boolean, so a different account
 * signing in on the same browser is not caught by a stale flag.
 */
export function markRecoveryPending(userId: string): void {
  try {
    localStorage.setItem(FLAG_KEY, userId);
  } catch {
    // Private windows and blocked site data throw. The in-flight detection
    // below still covers the arrival, and layer 2 still bounds the session.
  }
}

export function getRecoveryPendingUserId(): string | null {
  try {
    return localStorage.getItem(FLAG_KEY);
  } catch {
    return null;
  }
}

/**
 * Called only after updateUser({ password }) actually succeeds.
 *
 * Callers inside React should go through AppContext's clearRecovery() rather
 * than calling this directly: this clears storage, but the guards read a
 * React state copy, and clearing one without the other leaves the app
 * redirecting to the reset screen for the rest of the page session.
 */
export function clearRecoveryPending(): void {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch {
    // Nothing to do; a flag that cannot be cleared fails closed, which is the
    // safe direction — the user is asked to set a password again.
  }
}

/**
 * Whether a recovery code exchange is happening RIGHT NOW.
 *
 * This closes a real gap. GoTrue saves the session before it emits
 * PASSWORD_RECOVERY, so between those two moments a session exists and the
 * flag does not — and a fast manual navigation to /app in that window would
 * be honoured.
 *
 * It is detectable synchronously because PKCE stores the flow type inside the
 * verifier itself: resetPasswordForEmail() calls _getCodeChallengeAndMethod()
 * with isPasswordRecovery = true, and the verifier is then stored as
 * "<verifier>/recovery". GoTrue reads it back with
 * `const [codeVerifier, redirectType] = storageItem.split("/")`. Since
 * createBrowserClient keeps that storage in cookies, the same marker is
 * readable here — no waiting on an event.
 *
 * Both conditions are required: a verifier marked recovery AND a code in the
 * URL. The verifier alone just means a reset was requested from this browser
 * and the link has not been opened yet, which must not block anything.
 */
export function isRecoveryExchangeInFlight(): boolean {
  try {
    if (!new URLSearchParams(window.location.search).has("code")) return false;

    return document.cookie
      .split(";")
      .filter((c) => c.trim().split("=")[0].endsWith("-code-verifier"))
      .some((c) => {
        const raw = decodeURIComponent(c.slice(c.indexOf("=") + 1));
        const decoded = raw.startsWith("base64-")
          ? atob(raw.slice(7).replace(/-/g, "+").replace(/_/g, "/"))
          : raw;
        return decoded.includes("/recovery");
      });
  } catch {
    return false;
  }
}

/**
 * Whether a cookie is a PKCE verifier rather than a session credential.
 *
 * Verifiers must outlive the browser session even when "Remember me" is
 * unticked: the whole point is that they are still there when the emailed
 * link is opened later. Treating them like session credentials silently broke
 * reset links for anyone who had unticked the box.
 *
 * Covers all three names GoTrue writes:
 *   sb-<ref>-auth-token-code-verifier
 *   sb-<ref>-auth-token-flows-code-verifier
 *   sb-<ref>-auth-token-flow-<id>-code-verifier
 */
export function isPkceVerifierCookie(name: string): boolean {
  return name.endsWith("-code-verifier");
}
