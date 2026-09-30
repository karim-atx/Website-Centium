// WHICH ACCOUNT THIS TAB BELONGS TO, and the guard that keeps it that way.
//
// THE BUG THIS EXISTS FOR. The session lives in cookies (@supabase/ssr), and
// cookies are shared by every tab on the site. Sign in as account 2 in tab B
// and tab A's next request carries account 2's token — auth-js reads the
// session from storage on every request, and its BroadcastChannel also hands
// tab A the SIGNED_IN event — while tab A's screen, state and local cache are
// still account 1's. Anything tab A saved then went out as account 2.
//
// THE RULE. A tab is bound to the user it loaded with (read synchronously from
// the session cookie, before any state is hydrated). Every data request is
// checked at the fetch layer: when the token it carries belongs to anyone else
// — another account, or nobody after a sign-out — the request is refused
// before it leaves the browser. When another tab changes the account, this tab
// locks and says so; the only way on is a full reload, which re-binds it.

/** Any Supabase data surface: tables and RPCs, storage, edge functions. Auth is not data. */
export function isDataRequest(url: string): boolean {
  return /\/(rest|storage|functions)\/v1\//.test(url);
}

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  // UTF-8 safe.
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** The `sub` of a bearer token ("Bearer eyJ…"), or null (anon key, malformed, missing). */
export function jwtSubject(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * The user id in the Supabase session cookie, or null when signed out.
 *
 * @supabase/ssr stores the session as `sb-<ref>-auth-token`, split into
 * `.0`, `.1`… chunks when long, each value URI-encoded and the whole prefixed
 * `base64-` (base64url JSON). Older sessions are plain JSON.
 */
export function sessionUserIdFromCookies(cookieHeader: string): string | null {
  const chunks = new Map<string, string>();
  for (const entry of cookieHeader.split(/;\s*/)) {
    const eq = entry.indexOf("=");
    if (eq < 1) continue;
    const name = entry.slice(0, eq);
    const m = /^(sb-.+-auth-token)(?:\.(\d+))?$/.exec(name);
    if (!m) continue;
    chunks.set(m[2] ?? "", entry.slice(eq + 1));
  }
  if (chunks.size === 0) return null;
  const raw = chunks.has("")
    ? chunks.get("")!
    : [...chunks.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([, v]) => v).join("");
  if (!raw) return null;
  try {
    let value = decodeURIComponent(raw);
    if (value.startsWith("base64-")) value = base64UrlDecode(value.slice("base64-".length));
    const session = JSON.parse(value) as { user?: { id?: unknown }; access_token?: unknown };
    if (typeof session.user?.id === "string" && session.user.id) return session.user.id;
    return typeof session.access_token === "string" ? jwtSubject(`Bearer ${session.access_token}`) : null;
  } catch {
    return null;
  }
}

/**
 * Whether a request must be refused: a data request from a tab bound to one
 * account, carrying anyone else's token (or no user at all), or any data
 * request once the tab is locked. A tab that loaded signed out has nothing to
 * protect and is never refused.
 */
export function shouldRefuse(tabUserId: string | null, url: string, authorization: string | null, locked: boolean): boolean {
  if (!isDataRequest(url)) return false;
  if (locked) return true;
  if (tabUserId === null) return false;
  return jwtSubject(authorization) !== tabUserId;
}

// --- the tab's own identity --------------------------------------------------

/** The user this tab loaded with. Fixed for the life of the tab; a reload re-binds it. */
// Read through globalThis so the module also loads outside a browser (tests).
const pageCookie = (globalThis as { document?: { cookie: string } }).document?.cookie;
export const TAB_USER_ID: string | null = pageCookie !== undefined ? sessionUserIdFromCookies(pageCookie) : null;

export type TabLock =
  | { kind: "switched"; label: string }
  | { kind: "signedOut" };

let lock: TabLock | null = null;
const listeners = new Set<(lock: TabLock | null) => void>();

export function currentTabLock(): TabLock | null {
  return lock;
}

/**
 * Locks this tab: every data request is refused from now on, and the notice
 * shows. A lock is never lifted in place; a later change only updates what the
 * notice says (signed out in another tab, then signed in there as someone).
 */
export function lockTab(next: TabLock): void {
  if (lock && lock.kind === next.kind && (next.kind === "signedOut" || (lock.kind === "switched" && lock.label === next.label))) return;
  lock = next;
  listeners.forEach((fn) => fn(lock));
}

export function onTabLock(fn: (lock: TabLock | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// A signed-out tab re-binds to a new session by reloading, so the page that
// wanted to see the session ARRIVE (onboarding's auth step) would otherwise
// mount with it already in place. This mark carries that one fact across the
// reload, and expires so it can never fire later.
const ARRIVED_MARK = "centium-session-arrived";
const tabSession = () => (globalThis as { sessionStorage?: Storage }).sessionStorage;

export function markSessionArrived(): void {
  try {
    tabSession()?.setItem(ARRIVED_MARK, String(Date.now()));
  } catch {
    /* storage refused: the auth step shows its "signed in as" screen instead */
  }
}

/** Whether this page load follows a re-bind for a session that just arrived. Does not consume it. */
export function sessionArrivedPending(): boolean {
  try {
    const at = Number(tabSession()?.getItem(ARRIVED_MARK) ?? 0);
    return at > 0 && Date.now() - at < 10_000;
  } catch {
    return false;
  }
}

export function clearSessionArrived(): void {
  try {
    tabSession()?.removeItem(ARRIVED_MARK);
  } catch {
    /* nothing to clear */
  }
}

/** The error PostgREST-shaped callers read; `code` lets a caller tell it apart. */
export const TAB_IDENTITY_REFUSAL = {
  code: "ATX_TAB",
  message: "This tab is signed in to a different account now. Reload to continue.",
};

/** Wraps the client's fetch with the identity check. */
export function identityGuardFetch(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (shouldRefuse(TAB_USER_ID, url, headers.get("Authorization"), lock !== null)) {
      return new Response(JSON.stringify({ ...TAB_IDENTITY_REFUSAL, details: null, hint: null }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    return inner(input, init);
  };
}

// --- account-scoped local storage ------------------------------------------

export const STORAGE_PREFIX = "centium-state";

/**
 * Preferences of the DEVICE, shared by whoever uses it. Everything else under
 * the prefix is account data and lives in that account's own namespace.
 */
export const DEVICE_KEYS: ReadonlySet<string> = new Set(["theme", "colorTheme", "language", "accessibility", "notificationPrefs"]);

export function storageNamespace(userId: string | null): string {
  return userId ? `u:${userId}` : "anon";
}

/** The localStorage key for one persisted value, for the given account. */
export function storageKeyFor(key: string, userId: string | null): string {
  return DEVICE_KEYS.has(key) ? `${STORAGE_PREFIX}:${key}` : `${STORAGE_PREFIX}:${storageNamespace(userId)}:${key}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The one-time move of the old, un-namespaced cache. Returns [from, to] pairs
 * for every legacy account key; they go to the account that wrote them (the
 * cached profile's id), or to the signed-out namespace when that is unknown —
 * never to whoever happens to sign in next.
 */
export function legacyMoves(keys: string[], legacyUserJson: string | null): [string, string][] {
  let owner: string | null = null;
  try {
    const cached = legacyUserJson ? (JSON.parse(legacyUserJson) as { id?: unknown }) : null;
    if (typeof cached?.id === "string" && UUID_RE.test(cached.id)) owner = cached.id;
  } catch {
    owner = null;
  }
  const moves: [string, string][] = [];
  for (const k of keys) {
    const m = new RegExp(`^${STORAGE_PREFIX}:([^:]+)$`).exec(k);
    // foodLog is a superseded key AppContext deletes; nothing to carry over.
    if (!m || DEVICE_KEYS.has(m[1]) || m[1] === "foodLog") continue;
    moves.push([k, storageKeyFor(m[1], owner)]);
  }
  return moves;
}
