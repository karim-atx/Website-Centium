// V6-30 (security call): the member pass's short-lived offline cache.
//
// OP1-017 says the member pass "works offline". The pass is the
// pass_token from my_gym_memberships(), a bearer credential, so the cache is
// kept as small as it can be and still be useful at a door with no signal:
// - per account (the key carries the user id) and on this device only;
// - short-lived: a copy older than PASS_CACHE_HOURS is never shown, and a
//   membership past its expires_on is dropped;
// - read ONLY when the server cannot be reached; any successful read
//   replaces it;
// - cleared on sign-out: the key starts with "centium-state", which
//   AppContext.signOut() removes with the rest of the account's local cache.
// Native keeps it in secure storage instead (NATIVE).

export const PASS_CACHE_HOURS = 24;
const PREFIX = "centium-state:pass-cache:";

interface Stored<T> {
  savedAt: string;
  rows: T[];
}

/** The few Storage methods used (no DOM types here, so node --test can load it). */
interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function store(): KV | null {
  try {
    return (globalThis as { window?: { localStorage?: KV } }).window?.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Round D O10: called whenever an active pass is cached, so the QR writer
 * (a lazy chunk plus its wasm) can download while there is a connection;
 * otherwise the cached pass has nothing to draw it with offline. PassQr
 * registers itself; kept as a listener so this module stays DOM-free.
 */
const cachedListeners = new Set<() => void>();
export function onPassCached(listener: () => void): () => void {
  cachedListeners.add(listener);
  return () => cachedListeners.delete(listener);
}

export function writePassCache<T>(userId: string, rows: T[], now: Date = new Date()): void {
  if (rows.length > 0) for (const l of cachedListeners) l();
  const s = store();
  if (!s) return;
  try {
    if (rows.length === 0) s.removeItem(PREFIX + userId);
    else s.setItem(PREFIX + userId, JSON.stringify({ savedAt: now.toISOString(), rows } satisfies Stored<T>));
  } catch {
    /* quota or private mode: the pass simply has no offline copy */
  }
}

/**
 * The cached rows when they are fresh enough, with when they were saved;
 * null otherwise (and a stale copy is deleted). `expiresOf` names each row's
 * last valid day (YYYY-MM-DD) so ended memberships are dropped.
 */
export function readPassCache<T>(userId: string, expiresOf: (row: T) => string | null, now: Date = new Date()): { savedAt: string; rows: T[] } | null {
  const s = store();
  if (!s) return null;
  let parsed: Stored<T> | null = null;
  try {
    parsed = JSON.parse(s.getItem(PREFIX + userId) ?? "null") as Stored<T> | null;
  } catch {
    parsed = null;
  }
  if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.savedAt !== "string") return null;
  const age = now.getTime() - new Date(parsed.savedAt).getTime();
  if (!(age >= 0 && age <= PASS_CACHE_HOURS * 3_600_000)) {
    try {
      s.removeItem(PREFIX + userId);
    } catch {
      /* ignore */
    }
    return null;
  }
  const p = (n: number) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const rows = parsed.rows.filter((r) => {
    const e = expiresOf(r);
    return !e || e >= today;
  });
  return rows.length ? { savedAt: parsed.savedAt, rows } : null;
}
