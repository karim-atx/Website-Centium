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

import { readCookieHeader } from "./cookieJar";

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
  const session = storedSessionFromCookies(cookieHeader);
  if (!session) return null;
  if (typeof session.user?.id === "string" && session.user.id) return session.user.id;
  return typeof session.access_token === "string" ? jwtSubject(`Bearer ${session.access_token}`) : null;
}

/**
 * The stored session itself, as auth-js saved it (unverified: its tokens may
 * have expired), or null when there is none or it can't be read. The same
 * cookie the tab's identity is read from; see sessionUserIdFromCookies.
 */
export function storedSessionFromCookies(cookieHeader: string): { user?: { id?: unknown }; access_token?: unknown } | null {
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
    const session = JSON.parse(value) as unknown;
    return typeof session === "object" && session !== null ? (session as { user?: { id?: unknown }; access_token?: unknown }) : null;
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
// Through ./cookieJar (the iPhone app keeps its own); undefined outside a
// browser, so the module also loads in tests.
const pageCookie = (globalThis as { document?: unknown }).document === undefined ? undefined : readCookieHeader();
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
// presentationOwner: which account the device's theme / accessibility copy was
// last chosen by or loaded for (Stage A1), so it is never saved to another's row.
export const DEVICE_KEYS: ReadonlySet<string> = new Set([
  "theme",
  "colorTheme",
  "language",
  "accessibility",
  "presentationOwner",
]);

export function storageNamespace(userId: string | null): string {
  return userId ? `u:${userId}` : "anon";
}

/** The localStorage key for one persisted value, for the given account. */
export function storageKeyFor(key: string, userId: string | null): string {
  return DEVICE_KEYS.has(key) ? `${STORAGE_PREFIX}:${key}` : `${STORAGE_PREFIX}:${storageNamespace(userId)}:${key}`;
}

// --- the end of an account on this device: sign-out ------------------------
//
// THE RULE: sign-out leaves no account data on the device. Clearing the cache
// once, first, was not enough, and it was measured rather than assumed: every
// way out of an account (Sign out, Sign out of all devices, deleting the
// account, "Couldn't load your account", the outbox's warning) left
// `centium-state:u:<id>:user` behind. endSession cleared the cache and THEN
// reset the profile in React state; usePersistentState's effect saw the new
// value and wrote it straight back under the account's namespace while the
// sign-out was still awaiting the network. Keys outside the `centium-state`
// prefix that carry the account id (a business's
// `centium-business-nav-kind:<id>`) were never cleared at all.
//
// So: from sign-out's first line the account's storage is CLOSED, and every
// persisted write is refused; what is already there is removed then, again
// right before the reload, and once more as the page goes (anything still in
// flight when the reload was asked for, a fetch completing or a timer, runs
// until the new page arrives, and pagehide is the last moment this page has).

let accountStorageClosed = false;

/** Whether sign-out has begun in this page. Never reopens: the page reloads. */
export function isAccountStorageClosed(): boolean {
  return accountStorageClosed;
}

/**
 * Writes one persisted value under the account's namespace (storageKeyFor),
 * unless sign-out has begun. Returns whether it wrote. What the storage throws
 * (QuotaExceededError, a refused private window) is the caller's, as before.
 */
export function writeAccountValue(storage: Pick<Storage, "setItem">, key: string, userId: string | null, json: string): boolean {
  if (accountStorageClosed) return false;
  storage.setItem(storageKeyFor(key, userId), json);
  return true;
}

/**
 * Prefixes whose every key is account data. `centium-state` is the app's whole
 * persisted cache, the device's own preferences included, exactly as sign-out
 * has always cleared it; `centium-onboarding:` is the onboarding draft, which
 * belongs to the account that wrote it (pages/onboarding/draftOwner);
 * `hiring-hired-seen:` is keyed by a business's application ids.
 */
const ACCOUNT_PREFIXES = [STORAGE_PREFIX, "centium-onboarding:", "hiring-hired-seen:"];

/**
 * Account data with NEITHER a prefix above NOR the account id in it, by name.
 * A new key is better given the account id (or the `centium-state` namespace)
 * than added here; this list is what predates that.
 */
export const ACCOUNT_KEYS_WITHOUT_ID: ReadonlySet<string> = new Set([
  // The phone's push token, registered to this account (platform/push.ts).
  "centium.pushToken",
  // The ended session's id (platform/installReport.ts).
  "centium.installReportedSession",
  // Which of this account's venues the console shows (hooks/useMyVenues.ts).
  "centium.venueConsole.selected",
  // This account's coach updates closed, and its reminders acknowledged.
  "centium.coachUpdateSeen",
  "centium:pro-reminders:ack",
  // The playlists this account's screens looked up (services/music/lookup.ts).
  "centium.playlistMeta.v1",
  // Session storage: the reviews this business messaged, the listing cards counted.
  "centium.reputation.messaged",
  "centium.listingEvents",
]);

/**
 * Which of these stored entries are account data, to go at sign-out: the
 * prefixes above, the named keys, and anything whose name or value carries the
 * account id (the outbox, a cart, a dismissed prompt, the administrator's
 * escape hatch, the recovery flag, a draft's owner).
 *
 * KEPT, because they belong to the device and not to anyone on it: the cookie
 * choice, units, the map area, view toggles, the update notice, the push-ask
 * state ("this phone's permission, not the account"), the phone's Vibration
 * switch (platform/haptics.ts), the pass device tag
 * (services/venues/passDevice: "not account data, so it outlives sign-out"),
 * the landing page's own keys, and the tab's sign-in and suspension marks.
 */
export function accountStorageKeys(entries: Iterable<[string, string | null]>, userId: string | null): string[] {
  const out: string[] = [];
  for (const [key, value] of entries) {
    if (
      ACCOUNT_PREFIXES.some((p) => key.startsWith(p)) ||
      ACCOUNT_KEYS_WITHOUT_ID.has(key) ||
      (userId !== null && (key.includes(userId) || (value ?? "").includes(userId)))
    ) {
      out.push(key);
    }
  }
  return out;
}

function clearAccountKeys(storage: Storage | undefined, userId: string | null): void {
  if (!storage) return;
  try {
    const entries: [string, string | null][] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) entries.push([key, storage.getItem(key)]);
    }
    for (const key of accountStorageKeys(entries, userId)) storage.removeItem(key);
  } catch {
    // Storage refused outright (private mode): nothing could have been kept.
  }
}

/** Removes this account's data from local and session storage, now. */
export function clearAccountStorage(userId: string | null): void {
  const g = globalThis as { localStorage?: Storage; sessionStorage?: Storage };
  clearAccountKeys(g.localStorage, userId);
  clearAccountKeys(g.sessionStorage, userId);
}

/**
 * The account is leaving this page: no persisted write from here on, and its
 * data removed now and again as the page goes. Every way a session ends calls
 * it (AppContext: endSession, a session ended elsewhere, a suspension).
 */
export function endAccountStorage(userId: string | null): void {
  accountStorageClosed = true;
  clearAccountStorage(userId);
  const w = globalThis as { addEventListener?: (type: string, fn: () => void, opts?: { once?: boolean }) => void };
  w.addEventListener?.("pagehide", () => clearAccountStorage(userId), { once: true });
}

// --- the end of an account on this device: a session gone by the next load --
//
// THE RULE (2026-11-10): an expired, non-remembered session clears its saved
// account data on the next load. Sign-out is not the only way a session ends:
// with "Remember me" off the cookie dies with the browser, and a refresh token
// can expire or be revoked while the browser is closed. Neither runs any code,
// so the next page load is the first moment anything can clear. Measured on
// main: after a browser restart the page loaded signed out, the cache guard
// looked only at the `anon` namespace, and all 45 `centium-state:u:<id>:*`
// keys and presentationOwner stayed until the next sign-out.
//
// NOT CLEARED: a session this account still holds — verified, or stored and
// not yet verifiable (offline: auth-js keeps the cookie on a network failure
// and removes it only when the server refuses the refresh). A sibling TAB
// signed in as the account is the same test, because every tab shares the
// one session cookie (see the top of this file): a tab is signed in as
// exactly the account the cookie names, and a tab locked out of it is not.

/** Whether an account's saved data has outlived every session it had here. */
export function accountSessionEnded(owner: string, cookieUserId: string | null, sessionUserId: string | null): boolean {
  return owner !== sessionUserId && owner !== cookieUserId;
}

/** The accounts with data on this device: each `centium-state:u:<id>:` namespace, and presentationOwner's. */
export function storedAccountIds(entries: Iterable<[string, string | null]>): string[] {
  const ids = new Set<string>();
  for (const [key, value] of entries) {
    const m = new RegExp(`^${STORAGE_PREFIX}:u:([^:]+):`).exec(key);
    if (m) ids.add(m[1]);
    if (key === `${STORAGE_PREFIX}:presentationOwner`) {
      try {
        const owner = JSON.parse(value ?? "null") as unknown;
        if (typeof owner === "string" && owner) ids.add(owner);
      } catch {
        /* unreadable: names no one */
      }
    }
  }
  return [...ids];
}

/**
 * An ended account's keys (accountStorageKeys), less what is not its own on a
 * page that carries on: the device's preferences, the signed-out namespace and
 * draft, and another signed-in account's namespace. The account keys with no
 * id go only when no one is signed in; otherwise they may be that account's.
 */
export function endedAccountKeys(entries: Iterable<[string, string | null]>, userId: string, anotherSignedIn: boolean): string[] {
  const list = [...entries];
  const values = new Map(list);
  return accountStorageKeys(list, userId).filter((key) => {
    if (key.includes(userId) || (values.get(key) ?? "").includes(userId)) return true;
    if (key.startsWith(STORAGE_PREFIX) || key.startsWith("centium-onboarding:")) return false;
    return !anotherSignedIn;
  });
}

/**
 * On load, before any state is read: clears every stored account but the one
 * the session cookie names (`signedInUserId`, this tab's TAB_USER_ID).
 */
export function clearEndedAccounts(signedInUserId: string | null): void {
  const g = globalThis as { localStorage?: Storage; sessionStorage?: Storage };
  const entriesOf = (storage: Storage): [string, string | null][] => {
    const out: [string, string | null][] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) out.push([key, storage.getItem(key)]);
    }
    return out;
  };
  try {
    if (!g.localStorage) return;
    const ended = storedAccountIds(entriesOf(g.localStorage)).filter((id) => accountSessionEnded(id, signedInUserId, null));
    for (const storage of [g.localStorage, g.sessionStorage]) {
      if (!storage) continue;
      for (const id of ended) for (const key of endedAccountKeys(entriesOf(storage), id, signedInUserId !== null)) storage.removeItem(key);
    }
  } catch {
    // Storage refused outright (private mode): nothing could have been kept.
  }
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
    // foodLog and notificationPrefs (the device copy of the notification
    // switches, superseded by app_preferences in Stage A2) are superseded keys
    // AppContext deletes; nothing to carry over.
    if (!m || DEVICE_KEYS.has(m[1]) || m[1] === "foodLog" || m[1] === "notificationPrefs") continue;
    moves.push([k, storageKeyFor(m[1], owner)]);
  }
  return moves;
}
