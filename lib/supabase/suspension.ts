/**
 * Noticing that an account has been suspended, on the one path that cannot
 * report it any other way.
 *
 * WHY THIS FILE EXISTS AT ALL, and it is not where anyone would look first.
 * Signing in as a suspended user is easy: `signInWithPassword` rejects with an
 * AuthError carrying `code: "user_banned"`, and the caller reads it. A session
 * that is suspended *while it is running* is the hard case, and it was checked
 * rather than assumed:
 *
 *   - `AuthChangeEvent` is
 *     'INITIAL_SESSION' | 'PASSWORD_RECOVERY' | 'SIGNED_IN' | 'SIGNED_OUT' |
 *     'TOKEN_REFRESHED' | 'USER_UPDATED' | 'MFA_CHALLENGE_VERIFIED'.
 *     There is no refresh-failure event.
 *   - `_callRefreshToken` removes the session itself on failure, and
 *     `onAuthStateChange` subscribers are then handed `SIGNED_OUT` with
 *     `session: null` and NO error.
 *
 * So by the time the app hears anything, the reason is gone. A suspended user
 * would be dropped to the sign-in screen with no explanation — and signing in
 * again would fail with the same code, which is the confusing loop this is
 * meant to prevent. The only place the reason still exists is the HTTP
 * response itself, which is why detection lives in a fetch wrapper.
 *
 * THE WIRE FORMAT IS AUTH-JS'S, NOT INVENTED. Its own error parser reads
 * `data.code` and falls back to `data.error_code`, taking the sentence from
 * `data.msg`, before throwing `AuthApiError(msg, status, code)`. Both spellings
 * are accepted here for the same reason it accepts both.
 */

/** The one sentence a suspended user should ever see, wherever they hit it. */
export const SUSPENDED_MESSAGE =
  "Your account has been suspended. Contact support if you believe this is a mistake.";

/** Supabase's error code for a banned user, as shipped in auth-js's ErrorCode union. */
export const USER_BANNED_CODE = "user_banned";

/**
 * Survives the forced sign-out and the remount that follows it.
 *
 * sessionStorage rather than a module variable: the sign-out clears app state
 * and the router swaps to the auth screen, and a variable would be fine today
 * but is one reload away from being lost. Scoped to the tab and consumed on
 * read, so it explains exactly one sign-out and never resurfaces later.
 */
const FLAG = "centium-account-suspended";

/** True when a parsed auth error body carries the banned code, in either spelling. */
export function isUserBannedPayload(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const b = body as { code?: unknown; error_code?: unknown };
  return b.code === USER_BANNED_CODE || b.error_code === USER_BANNED_CODE;
}

export function markAccountSuspended(): void {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    /* Private mode or blocked storage: the sign-in attempt that follows still
       surfaces the same code through the normal error path. */
  }
}

/** Reads the flag and clears it, so it explains one sign-out and no more. */
export function consumeAccountSuspended(): boolean {
  try {
    if (sessionStorage.getItem(FLAG) === null) return false;
    sessionStorage.removeItem(FLAG);
    return true;
  } catch {
    return false;
  }
}

/**
 * A `fetch` that watches auth responses for the banned code and otherwise
 * behaves exactly like the one it wraps.
 *
 * READS A CLONE, NEVER THE RESPONSE. The body is a single-use stream and
 * auth-js is about to read it to build its own error; consuming it here would
 * break every auth failure rather than just this one.
 *
 * NARROW ON PURPOSE. Only non-OK responses from the auth endpoint are
 * inspected, so the ordinary request path does no extra work: no clone, no
 * parse, nothing. It also never throws — a failure to inspect must not turn a
 * recoverable request into a broken one.
 */
export function suspensionAwareFetch(inner?: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Resolved per call rather than captured at module load. The client is
    // constructed at import time, and binding `globalThis.fetch` then would
    // freeze whatever existed at that instant — which breaks any environment
    // that installs or replaces fetch afterwards, and makes this untestable.
    const response = await (inner ?? globalThis.fetch)(input, init);
    if (response.ok) return response;

    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!/\/auth\/v1\//.test(url)) return response;
      const body = await response.clone().json();
      if (isUserBannedPayload(body)) markAccountSuspended();
    } catch {
      /* Not JSON, or a body that cannot be cloned. Nothing to learn. */
    }
    return response;
  };
}
