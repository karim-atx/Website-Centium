// What a Sign in with Apple must not lose to the reload that follows it, and
// must never hand to anyone else (App-Centium IPHONE_ROUND_1.md §2).
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
//
// AND ONLY TO THE ACCOUNT THEY CAME WITH. Both carry the Apple account (the ID
// token's `sub`). They are used only when the signed-in account has that Apple
// identity, and dropped otherwise; a failed sign-in drops them at once
// (forgetAppleSignIn). Without that, a failed Apple sign-in followed by
// another account's sign-in in the same tab sent Apple's code with that
// account's token and put Apple's name in its onboarding (the Website
// session's finding on #127).

export const APPLE_NAME_KEY = "centium.apple.givenName";
export const APPLE_LINK_KEY = "centium.apple.linkCode";
/** Apple's authorization code lasts 5 minutes; the name is kept no longer. */
export const APPLE_CODE_LIFETIME_MS = 5 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Kept = { value: string; sub: string; at: number };
/** The signed-in account, as much of it as is needed: its Apple identity. */
export type AppleAccount = { identities?: { provider: string; id?: string; identity_data?: { sub?: unknown } }[] } | null | undefined;

function session(): Store | null {
  try {
    return (globalThis as { sessionStorage?: Store }).sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** The Apple account an ID token is for (its `sub`), read without verifying: only to match, never to trust. */
export function appleSubject(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((payload.length + 3) % 4));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch {
    return null;
  }
}

/** Whether the signed-in account has this Apple identity. */
export function hasAppleIdentity(account: AppleAccount, sub: string): boolean {
  return !!account?.identities?.some((i) => i.provider === "apple" && (i.id === sub || i.identity_data?.sub === sub));
}

function read(store: Store, key: string): Kept | null {
  try {
    const kept = JSON.parse(store.getItem(key) ?? "null") as Partial<Kept> | null;
    return kept && typeof kept.value === "string" && typeof kept.sub === "string" && typeof kept.at === "number" ? (kept as Kept) : null;
  } catch {
    return null;
  }
}

/** Before signInWithIdToken: the code, and the name when Apple gave one, both bound to the Apple account. */
export function rememberAppleSignIn(code: string, givenName: string | undefined, sub: string, now = Date.now(), store: Store | null = session()): void {
  if (!store) return;
  try {
    store.setItem(APPLE_LINK_KEY, JSON.stringify({ value: code, sub, at: now }));
    const name = givenName?.trim();
    if (name) store.setItem(APPLE_NAME_KEY, JSON.stringify({ value: name, sub, at: now }));
    else store.removeItem(APPLE_NAME_KEY);
  } catch {
    // Storage refused (private mode): the immediate path still runs.
  }
}

/** A failed or abandoned Apple sign-in: nothing of it is kept. */
export function forgetAppleSignIn(store: Store | null = session()): void {
  try {
    store?.removeItem(APPLE_LINK_KEY);
    store?.removeItem(APPLE_NAME_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * The name Apple gave, for this account only, while fresh. Read without
 * removing (React may run an initialiser twice); see clearAppleGivenName.
 */
export function peekAppleGivenName(account: AppleAccount, now = Date.now(), store: Store | null = session()): string | null {
  const kept = store ? read(store, APPLE_NAME_KEY) : null;
  if (!kept || now - kept.at > APPLE_CODE_LIFETIME_MS || !hasAppleIdentity(account, kept.sub)) return null;
  return kept.value.trim() || null;
}

export function clearAppleGivenName(store: Store | null = session()): void {
  try {
    store?.removeItem(APPLE_NAME_KEY);
  } catch {
    /* nothing to clear */
  }
}

/**
 * The waiting code for this account, claimed: removed before it's returned,
 * so it is never sent twice. Removed and not returned when it's older than
 * Apple's 5 minutes, or belongs to another Apple account.
 */
export function claimAppleLinkCode(account: AppleAccount, now = Date.now(), store: Store | null = session()): string | null {
  if (!store) return null;
  const kept = read(store, APPLE_LINK_KEY);
  try {
    store.removeItem(APPLE_LINK_KEY);
  } catch {
    /* already gone */
  }
  if (!kept || now - kept.at > APPLE_CODE_LIFETIME_MS || !hasAppleIdentity(account, kept.sub)) return null;
  return kept.value;
}

/**
 * Sends the waiting code to apple-sign-in-link (DB-Z2) with the account's
 * token, so Apple's refresh token is kept for revocation at deletion; only
 * when the account has the code's Apple identity. keepalive lets it finish
 * after the page reloads. Best effort: a failure is logged and never touches
 * the sign-in.
 */
export function sendPendingAppleLink(
  accessToken: string | null | undefined,
  account: AppleAccount,
  config: { url: string; anonKey: string },
  send: typeof fetch = fetch,
): void {
  if (!accessToken || !account) return;
  const code = claimAppleLinkCode(account);
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
