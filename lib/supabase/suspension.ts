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
 * The PostgREST paths whose WRITES must outlive the page that started them.
 *
 * WHY THIS LIVES IN A FETCH WRAPPER, of all places. A consent PATCH is an
 * ordinary `fetch`, and an ordinary `fetch` is cancelled when the page
 * unloads. The toggle has already moved optimistically by then, the promise
 * never settles so no error can be raised, no confirmation appears, and the
 * row is left exactly as it was. That is not hypothetical: it is the
 * reproduced cause of three recorded consent-write failures, one of them a
 * revocation that left clinical data readable by a professional the client
 * had decided should no longer see it.
 *
 * `keepalive` is the one flag that fixes it. The browser finishes the request
 * after the document is gone; the response is discarded, which is fine —
 * nothing is left to render it to, and the write is the part that matters.
 *
 * MEASURED, NOT ASSUMED. The window is the round trip: ~5 ms against a local
 * Supabase, but 202-563 ms (median 213) against the staging project, which is
 * why this failed in real use and survived eighteen local reproduction runs.
 *
 * AN ALLOWLIST RATHER THAN EVERY MUTATION. `keepalive` caps a request at 64 KB
 * including headers, and that cap applies whether or not the page is
 * unloading. Applying it to every write would put a size limit on paths that
 * legitimately carry large bodies, to fix a problem they do not have. These
 * two carry a one-field PATCH and a one-uuid RPC argument — hundreds of bytes
 * with headers, three orders of magnitude inside the cap.
 *
 *   client_access_grants          the consent record itself: eighteen RLS
 *                                 policies and two Storage policies gate
 *                                 professional access on it
 *   disconnect_client_relationship  ends the engagement AND clears every
 *                                 grant between the pair; losing it leaves
 *                                 both standing
 */
const KEEPALIVE_WRITE_PATHS = ["/rest/v1/client_access_grants", "/rest/v1/rpc/disconnect_client_relationship"];

/** GET and HEAD are not writes; losing one costs nothing but a re-read. */
const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * Whether this particular request is a consent write that has to survive the
 * page going away.
 *
 * Reads the method from `init` first and the Request object second, because
 * postgrest-js calls fetch with a URL string and an init — but a caller
 * handing over a Request would otherwise read as a GET and silently lose the
 * protection.
 */
export function needsKeepalive(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
  if (!MUTATING_METHODS.has(method)) return false;
  const url = urlOf(input);
  return KEEPALIVE_WRITE_PATHS.some((path) => url.includes(path));
}

/**
 * A `fetch` that watches auth responses for the banned code, keeps consent
 * writes alive across a page unload, and otherwise behaves exactly like the
 * one it wraps.
 *
 * READS A CLONE, NEVER THE RESPONSE. The body is a single-use stream and
 * auth-js is about to read it to build its own error; consuming it here would
 * break every auth failure rather than just this one.
 *
 * NARROW ON PURPOSE. Only non-OK responses from the auth endpoint are
 * inspected, so the ordinary request path does no extra work: no clone, no
 * parse, nothing. It also never throws — a failure to inspect must not turn a
 * recoverable request into a broken one. The keepalive branch is the same
 * shape: one string test per request, and nothing changed for anything else.
 */
export function suspensionAwareFetch(inner?: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Left untouched unless this is one of the two consent writes, so the
    // common path is byte-for-byte the request postgrest-js built.
    const request = needsKeepalive(input, init) ? { ...init, keepalive: true } : init;

    // Resolved per call rather than captured at module load. The client is
    // constructed at import time, and binding `globalThis.fetch` then would
    // freeze whatever existed at that instant — which breaks any environment
    // that installs or replaces fetch afterwards, and makes this untestable.
    const response = await (inner ?? globalThis.fetch)(input, request);
    if (response.ok) return response;

    try {
      if (!/\/auth\/v1\//.test(urlOf(input))) return response;
      const body = await response.clone().json();
      if (isUserBannedPayload(body)) markAccountSuspended();
    } catch {
      /* Not JSON, or a body that cannot be cloned. Nothing to learn. */
    }
    return response;
  };
}
