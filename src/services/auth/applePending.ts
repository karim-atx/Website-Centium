// What a Sign in with Apple must not lose to the reload that follows it
// (App-Centium IPHONE_ROUND_1.md §2).
//
// THE RACE. signInWithIdToken fires SIGNED_IN, and a tab that loaded signed
// out reloads at once to bind itself to the account (tabIdentity,
// reloadToRebind). Anything the sign-in did after that call could run on a
// page already gone: the Website session measured Apple's first name reaching
// the onboarding draft in 5 runs of 10. Apple gives that name only once, and
// its authorization code is one-time and lasts 5 minutes.
//
// SO BOTH ARE WRITTEN FIRST, to sessionStorage (same tab, survives the
// reload, gone when the app or tab closes), before signInWithIdToken:
// - the name: onboarding takes it when its draft has no first name;
// - the code: sent to apple-sign-in-link right after the sign-in with
//   keepalive (a request that outlives the page), or, if the page went
//   first, as soon as the reloaded page has the session (AppContext). It is
//   claimed (removed) before it is sent, so it is never sent twice.

export const APPLE_NAME_KEY = "centium.apple.givenName";
export const APPLE_LINK_KEY = "centium.apple.linkCode";
/** Apple's authorization code lasts 5 minutes. */
export const APPLE_CODE_LIFETIME_MS = 5 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function session(): Store | null {
  try {
    return (globalThis as { sessionStorage?: Store }).sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Before signInWithIdToken: the code, and the name when Apple gave one. */
export function rememberAppleSignIn(code: string, givenName: string | undefined, now = Date.now(), store: Store | null = session()): void {
  if (!store) return;
  try {
    store.setItem(APPLE_LINK_KEY, JSON.stringify({ code, at: now }));
    const name = givenName?.trim();
    if (name) store.setItem(APPLE_NAME_KEY, name);
  } catch {
    // Storage refused (private mode): the immediate path still runs.
  }
}

/** The name Apple gave, if one is waiting (read without removing; see clearAppleGivenName). */
export function peekAppleGivenName(store: Store | null = session()): string | null {
  try {
    return store?.getItem(APPLE_NAME_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function clearAppleGivenName(store: Store | null = session()): void {
  try {
    store?.removeItem(APPLE_NAME_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * The waiting code, claimed: removed before it's returned, so a second caller
 * (the reloaded page) never sends it again. Null when none, or older than
 * Apple's 5 minutes (then dropped).
 */
export function claimAppleLinkCode(now = Date.now(), store: Store | null = session()): string | null {
  if (!store) return null;
  try {
    const raw = store.getItem(APPLE_LINK_KEY);
    if (!raw) return null;
    store.removeItem(APPLE_LINK_KEY);
    const { code, at } = JSON.parse(raw) as { code?: unknown; at?: unknown };
    if (typeof code !== "string" || !code || typeof at !== "number" || now - at > APPLE_CODE_LIFETIME_MS) return null;
    return code;
  } catch {
    return null;
  }
}

/**
 * Sends the waiting code to apple-sign-in-link (DB-Z2) with the account's
 * token, so Apple's refresh token is kept for revocation at deletion. keepalive
 * lets it finish after the page reloads. Best effort: a failure is logged and
 * never touches the sign-in.
 */
export function sendPendingAppleLink(
  accessToken: string | null | undefined,
  config: { url: string; anonKey: string },
  send: typeof fetch = fetch,
): void {
  if (!accessToken) return;
  const code = claimAppleLinkCode();
  if (!code) return;
  void send(`${config.url}/functions/v1/apple-sign-in-link`, {
    method: "POST",
    keepalive: true,
    headers: { Authorization: `Bearer ${accessToken}`, apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ authorization_code: code }),
  }).then(
    async (r) => {
      if (!r.ok) console.error("[auth] apple-sign-in-link:", r.status, await r.text().catch(() => ""));
    },
    (e: unknown) => console.error("[auth] apple-sign-in-link:", e instanceof Error ? e.message : e),
  );
}
