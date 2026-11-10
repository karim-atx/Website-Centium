// A SESSION THE SIGN-IN SERVER CAN'T BE ASKED ABOUT: stored, its access token
// expired, and the refresh that would renew it failed on the network.
//
// THE GAP (measured on main d6ef914a, a harness build). A member whose stored
// session had an expired access token and a good refresh token opened the app
// with the sign-in server unreachable. auth-js retried the refresh for about
// 25 s, getSession() then answered null, and the route guard sent them to the
// signed-out welcome screen (`/app/onboarding`). #123 had already kept their
// data and dropped the false "signed out in another tab" notice, but when the
// connection came back they stayed on the welcome screen until a reload, and
// after the reload they were signed straight back in. A NON-expired session
// offline gets into the app with the offline bar (#120's offline exception):
// the difference was only whether the access token happened to have expired.
//
// KARIM'S RULE (2026-11-10). A stored session the server can't be reached to
// renew keeps the member in the app with the offline bar, as a non-expired
// offline session does, and signs in again by itself when the connection
// returns. "Can't be reached" is a NETWORK failure of the refresh only: a
// fetch that never reached the server (auth-js's AuthRetryableFetchError,
// status 0, or the browser saying it is offline). The server REFUSING the
// refresh (400 refresh_token_not_found / invalid_grant, a revoked token, 401)
// is a real sign-out and keeps #123's behaviour: auth-js removes the stored
// session and emits SIGNED_OUT, and the page clears the account and reloads
// signed out.
//
// WHAT auth-js (2.115.0) DOES ON A NETWORK FAILURE, read from its source.
// _refreshAccessToken retries with backoff (200 ms, doubling) for as long as
// the next try still starts inside one auto-refresh tick (30 s). A retryable
// failure does NOT remove the stored session and emits no event; only a
// non-retryable one with the access token really expired calls _removeSession
// (SIGNED_OUT, null). The failure is then cached for 60 s
// (REFRESH_FAILURE_COOLDOWN_MS) against that refresh token: every getSession()
// in that window answers {session: null, error: AuthRetryableFetchError}
// without trying, and so does INITIAL_SESSION (null). Its own ticker retries
// every 30 s once the cooldown is over, so on its own it would come back
// within 60-90 s of the server returning, but only into a page that had
// already decided the member was signed out.
//
// WHILE UNREACHABLE (AppContext): the tab shows the stored session's account
// (authUserId, the cached profile through #120's gate), the offline bar shows
// (useOnline), and every data request fails at once as a dropped connection
// would (unverifiedSessionFetch, below), so the outbox queues writes and reads
// fall back to the cache exactly as they do offline with a valid session.
// Nothing goes out as anon, and nothing is sent with the expired token.

/** How a refresh of the stored session failed, if it did. */
export type RefreshFailure = "network" | "refused" | null;

/** Where the tab's account stands after reading (or retrying) its session. */
export type SessionStanding =
  /** A session came back: the account is signed in and verified. */
  | "signedIn"
  /** Stored, but its refresh failed on the network: stay, offline, and retry. */
  | "unreachable"
  /** The server refused the stored session: #123's clear and signed-out reload. */
  | "ended"
  /** No session is stored, or none this tab can name: signed out. */
  | "signedOut";

/**
 * Classifies a getSession()/refresh error. A network failure is one that
 * never got an answer from the sign-in server: auth-js's
 * AuthRetryableFetchError (thrown for a failed fetch, status 0, and for the
 * gateway statuses it treats as infrastructure, 5xx), any status 0, or the
 * browser reporting itself offline. Any other error is the server's answer,
 * which here means it refused the session.
 */
export function refreshFailure(
  error: { name?: string; status?: number } | null | undefined,
  online: boolean
): RefreshFailure {
  if (!error) return null;
  if (!online) return "network";
  if (error.name === "AuthRetryableFetchError" || error.status === 0) return "network";
  return "refused";
}

/**
 * THE DECISION, pure. `sessionUserId` is the session the read came back with
 * (null when none); `stored` is whether this tab's account still has a stored
 * session token (hasStoredSessionToken, for a tab bound to an account).
 *
 *   a session came back                     → signedIn (also a retry that worked)
 *   refused by the server                   → ended    (also a retry refused)
 *   a network failure, a session stored     → unreachable
 *   a network failure, nothing stored       → signedOut (nothing to come back to)
 *   no session, no error                    → signedOut
 */
export function sessionStanding(input: { sessionUserId: string | null; stored: boolean; failure: RefreshFailure }): SessionStanding {
  if (input.sessionUserId) return "signedIn";
  if (input.failure === "refused") return "ended";
  if (input.failure === "network" && input.stored) return "unreachable";
  return "signedOut";
}

/**
 * The backstop timer between retries: 5 s, 10 s, 20 s, then every 30 s. The
 * `online` event and the tab becoming visible retry at once; this is for a
 * connection that comes back without either (a captive portal signed in to,
 * a server that was down).
 */
export function retryDelayMs(attempt: number): number {
  return Math.min(5_000 * 2 ** Math.max(0, attempt), 30_000);
}

// --- the tab's state ---------------------------------------------------------

let unreachable = false;
const listeners = new Set<() => void>();

/** Whether this tab is showing an account whose session couldn't be renewed. */
export function sessionUnreachable(): boolean {
  return unreachable;
}

export function setSessionUnreachable(next: boolean): void {
  if (unreachable === next) return;
  unreachable = next;
  listeners.forEach((fn) => fn());
}

/** Subscribes to changes of sessionUnreachable() (useSyncExternalStore's shape). */
export function onSessionReach(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Any Supabase data surface: tables and RPCs, storage, edge functions. Auth is not data. */
const DATA_REQUEST = /\/(rest|storage|functions)\/v1\//;

/**
 * Wraps the client's fetch: while the session is unreachable, every data
 * request fails at once as a dropped connection does ("Failed to fetch", an
 * AbortError so postgrest-js doesn't retry it, as in ./offlineFast).
 *
 * Without this, supabase-js finds no session (getSession answers null) and
 * sends the request with the anon key, which the identity guard refuses as
 * not this tab's account (ATX_TAB), and every screen would report that
 * instead of "offline". Auth requests pass: the refresh is how it ends.
 */
export function unverifiedSessionFetch(inner: typeof fetch, locked: () => boolean): typeof fetch {
  return (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    // A locked tab answers with its own refusal (./tabIdentity).
    if (unreachable && !locked() && DATA_REQUEST.test(url)) {
      const err = new Error("Failed to fetch (sign-in server unreachable)");
      err.name = "AbortError";
      return Promise.reject(err);
    }
    return inner(input, init);
  };
}
