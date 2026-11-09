import test from "node:test";
import assert from "node:assert/strict";
import {
  isDataRequest,
  jwtSubject,
  sessionUserIdFromCookies,
  shouldRefuse,
  storageKeyFor,
  legacyMoves,
  identityGuardFetch,
  lockTab,
  currentTabLock,
  onTabLock,
  TAB_IDENTITY_REFUSAL,
  accountStorageKeys,
  endAccountStorage,
  isAccountStorageClosed,
  writeAccountValue,
  accountSessionEnded,
  storedAccountIds,
  endedAccountKeys,
  clearEndedAccounts,
} from "../../../lib/supabase/tabIdentity";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const REST = "http://127.0.0.1:54321/rest/v1/food_logs?select=*";

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (sub: string | null) =>
  `${b64url(JSON.stringify({ alg: "HS256" }))}.${b64url(JSON.stringify(sub ? { sub, role: "authenticated" } : { role: "anon" }))}.sig`;
const bearer = (sub: string | null) => `Bearer ${jwt(sub)}`;

test("data requests are rest, storage and functions; auth is not", () => {
  assert.equal(isDataRequest(REST), true);
  assert.equal(isDataRequest("http://x/rest/v1/rpc/log_set"), true);
  assert.equal(isDataRequest("http://x/storage/v1/object/avatars/a.png"), true);
  assert.equal(isDataRequest("http://x/functions/v1/ai-chat"), true);
  assert.equal(isDataRequest("http://x/auth/v1/token?grant_type=refresh_token"), false);
});

test("jwtSubject reads sub, and null for anon, malformed or missing", () => {
  assert.equal(jwtSubject(bearer(A)), A);
  assert.equal(jwtSubject(bearer(null)), null);
  assert.equal(jwtSubject("Bearer not.a"), null);
  assert.equal(jwtSubject("Bearer a.%%%.c"), null);
  assert.equal(jwtSubject(null), null);
});

test("session cookie: plain, base64-, chunked and absent", () => {
  const session = JSON.stringify({ access_token: jwt(A), user: { id: A, email: "a@x.test" } });
  assert.equal(sessionUserIdFromCookies(`other=1; sb-ref-auth-token=${encodeURIComponent(session)}`), A);
  const b64 = `base64-${b64url(session)}`;
  assert.equal(sessionUserIdFromCookies(`sb-ref-auth-token=${b64}`), A);
  // Chunks may arrive in any order.
  const cut = Math.floor(b64.length / 2);
  assert.equal(sessionUserIdFromCookies(`sb-ref-auth-token.1=${b64.slice(cut)}; x=y; sb-ref-auth-token.0=${b64.slice(0, cut)}`), A);
  // No user object: falls back to the token's sub.
  assert.equal(sessionUserIdFromCookies(`sb-ref-auth-token=base64-${b64url(JSON.stringify({ access_token: jwt(B) }))}`), B);
  assert.equal(sessionUserIdFromCookies("theme=dark"), null);
  assert.equal(sessionUserIdFromCookies("sb-ref-auth-token=base64-!!!"), null);
});

test("shouldRefuse: another account, or nobody, on a data request", () => {
  assert.equal(shouldRefuse(A, REST, bearer(A), false), false, "same user passes (incl. a refreshed token)");
  assert.equal(shouldRefuse(A, REST, bearer(B), false), true, "switched account refused");
  assert.equal(shouldRefuse(A, REST, bearer(null), false), true, "signed out (anon key) refused");
  assert.equal(shouldRefuse(A, REST, null, false), true, "no token refused");
  assert.equal(shouldRefuse(A, "http://x/auth/v1/token", bearer(B), false), false, "auth is never blocked");
  assert.equal(shouldRefuse(null, REST, bearer(null), false), false, "signed-out tab has nothing to protect");
  assert.equal(shouldRefuse(A, REST, bearer(A), true), true, "a locked tab refuses everything");
  assert.equal(shouldRefuse(null, REST, bearer(null), true), true);
});

test("storage keys: account data per user, device preferences shared", () => {
  assert.equal(storageKeyFor("foodLog_v2", A), `centium-state:u:${A}:foodLog_v2`);
  assert.equal(storageKeyFor("foodLog_v2", null), "centium-state:anon:foodLog_v2");
  assert.notEqual(storageKeyFor("user", A), storageKeyFor("user", B));
  for (const k of ["theme", "colorTheme", "language", "accessibility"]) {
    assert.equal(storageKeyFor(k, A), `centium-state:${k}`);
    assert.equal(storageKeyFor(k, A), storageKeyFor(k, B));
  }
});

test("legacy cache moves to the account that wrote it, never to the next sign-in", () => {
  const keys = [
    "centium-state:user",
    "centium-state:workoutLog",
    "centium-state:theme",
    "centium-state:foodLog",
    "centium-state:notificationPrefs",
    `centium-state:u:${B}:user`,
    "centium-onboarding:draft",
  ];
  assert.deepEqual(legacyMoves(keys, JSON.stringify({ id: A, name: "Ana" })), [
    ["centium-state:user", `centium-state:u:${A}:user`],
    ["centium-state:workoutLog", `centium-state:u:${A}:workoutLog`],
  ]);
  // Owner unknown (no cached profile, or a non-uuid local id): the signed-out namespace.
  assert.deepEqual(legacyMoves(["centium-state:workoutLog"], JSON.stringify({ id: "local-1" })), [
    ["centium-state:workoutLog", "centium-state:anon:workoutLog"],
  ]);
  assert.deepEqual(legacyMoves(["centium-state:workoutLog"], "{broken"), [["centium-state:workoutLog", "centium-state:anon:workoutLog"]]);
});

test("sign-out: the account's keys go, the device's stay", () => {
  const entries: [string, string | null][] = [
    // The persisted cache, whole, as sign-out has always cleared it.
    [`centium-state:u:${A}:user`, "{}"],
    ["centium-state:anon:user", "{}"],
    ["centium-state:theme", '"dark"'],
    // The onboarding draft, and a business's applicants seen.
    ["centium-onboarding:state", '{"owner":null}'],
    ["hiring-hired-seen:abc", "1"],
    // The account id in the name, or in the value.
    [`centium-business-nav-kind:${A}`, "gym"],
    [`centium:health-log-queue:${A}`, "[]"],
    ["centium.recoveryPending", A],
    ["centium-admin-consumer", A],
    // Account data with no id, by name.
    ["centium.pushToken", "tok"],
    ["centium.venueConsole.selected", "gym-1"],
    // Another account's key is not this sign-out's business (it went at that account's).
    [`centium-business-nav-kind:${B}`, "store"],
    // The device's own.
    ["centium-cookie-consent", "declined"],
    ["centium.weightUnit", "kg"],
    ["centium-map:area", "beirut"],
    ["centium.pushAsk", "{}"],
    ["centium-pass-device-tag", "x1"],
    ["centium-account-suspended", "1"],
    ["centium-landing:returning", "1"],
  ];
  assert.deepEqual(accountStorageKeys(entries, A), [
    `centium-state:u:${A}:user`,
    "centium-state:anon:user",
    "centium-state:theme",
    "centium-onboarding:state",
    "hiring-hired-seen:abc",
    `centium-business-nav-kind:${A}`,
    `centium:health-log-queue:${A}`,
    "centium.recoveryPending",
    "centium-admin-consumer",
    "centium.pushToken",
    "centium.venueConsole.selected",
  ]);
  // No account known: the prefixes and the named keys still go.
  assert.deepEqual(accountStorageKeys([[`centium-business-nav-kind:${A}`, "gym"], ["centium.pushToken", "t"]], null), ["centium.pushToken"]);
});

test("a session gone by the next load: clear or keep", () => {
  // No session at all: the cookie died with the browser ("Remember me" off).
  // A refused refresh (refresh_token_not_found, invalid_grant, revoked) is the
  // same to this: auth-js removes the cookie, so nothing names the account.
  assert.equal(accountSessionEnded(A, null, null), true);
  // Offline: the refresh failed on the network, and the cookie still holds it.
  assert.equal(accountSessionEnded(A, A, null), false);
  // A valid (remembered) session for the account.
  assert.equal(accountSessionEnded(A, A, A), false);
  assert.equal(accountSessionEnded(A, null, A), false);
  // Another account's session: this one's is over on this device.
  assert.equal(accountSessionEnded(A, B, B), true);
  assert.equal(accountSessionEnded(A, B, null), true);
  // A sibling tab signed in as the account is the shared cookie naming it,
  // even while this tab has no verified session of its own.
  assert.equal(accountSessionEnded(A, A, B), false);
});

test("stored accounts: each namespace, and the presentation owner", () => {
  const ids = storedAccountIds([
    [`centium-state:u:${A}:user`, "{}"],
    [`centium-state:u:${A}:streaks`, "[]"],
    ["centium-state:anon:user", "{}"],
    ["centium-state:presentationOwner", JSON.stringify(B)],
    ["centium-state:theme", '"dark"'],
  ]);
  assert.deepEqual(ids, [A, B]);
  assert.deepEqual(storedAccountIds([["centium-state:presentationOwner", "null"]]), []);
  assert.deepEqual(storedAccountIds([["centium-state:presentationOwner", "{broken"]]), []);
});

test("an ended account's keys: its own, never the device's or the page's", () => {
  const entries: [string, string | null][] = [
    [`centium-state:u:${A}:user`, "{}"],
    ["centium-state:presentationOwner", JSON.stringify(A)],
    [`centium-business-nav-kind:${A}`, "gym"],
    ["centium-onboarding:state", `{"owner":"${A}"}`],
    ["centium.pushToken", "tok"],
    ["hiring-hired-seen:abc", "1"],
    // The device's, the signed-out page's own, and another account's.
    ["centium-state:theme", '"dark"'],
    ["centium-state:language", '"ar"'],
    ["centium-state:anon:user", "{}"],
    ["centium-onboarding:draft", '{"owner":null}'],
    [`centium-state:u:${B}:user`, "{}"],
    ["centium-cookie-consent", "declined"],
  ];
  const own = [`centium-state:u:${A}:user`, "centium-state:presentationOwner", `centium-business-nav-kind:${A}`, "centium-onboarding:state"];
  assert.deepEqual(endedAccountKeys(entries, A, false), [...own, "centium.pushToken", "hiring-hired-seen:abc"]);
  // Someone else signed in: the keys with no id may be theirs.
  assert.deepEqual(endedAccountKeys(entries, A, true), own);
});

test("on load: every stored account but the cookie's is cleared", () => {
  const fakeStorage = (store: Map<string, string>) =>
    ({
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    }) as Storage;
  const seed = () =>
    new Map<string, string>([
      [`centium-state:u:${A}:user`, "{}"],
      [`centium-state:u:${A}:routines`, "[]"],
      ["centium-state:presentationOwner", JSON.stringify(A)],
      [`centium-business-nav-kind:${A}`, "gym"],
      ["centium-state:language", '"ar"'],
      ["centium-cookie-consent", "declined"],
    ]);
  const g = globalThis as Record<string, unknown>;
  const saved = { localStorage: g.localStorage, sessionStorage: g.sessionStorage };
  const use = (local: Map<string, string>, session: Map<string, string>) => {
    Object.defineProperty(globalThis, "localStorage", { value: fakeStorage(local), configurable: true, writable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: fakeStorage(session), configurable: true, writable: true });
  };
  try {
    // The browser restarted without A's cookie: A's data goes, the device's stays.
    let local = seed();
    const session = new Map([["centium.reputation.messaged", "[]"]]);
    use(local, session);
    clearEndedAccounts(null);
    assert.deepEqual([...local.keys()], ["centium-state:language", "centium-cookie-consent"]);
    assert.deepEqual([...session.keys()], []);

    // A's session is still stored (valid, offline, or a sibling tab's): nothing goes.
    local = seed();
    use(local, new Map());
    clearEndedAccounts(A);
    assert.deepEqual([...local.keys()], [...seed().keys()]);

    // B signs in fresh in this browser: A's data goes, B's never does.
    local = seed();
    local.set(`centium-state:u:${B}:user`, "{}");
    use(local, new Map());
    clearEndedAccounts(B);
    assert.deepEqual([...local.keys()], ["centium-state:language", "centium-cookie-consent", `centium-state:u:${B}:user`]);
  } finally {
    for (const [k, v] of Object.entries(saved)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  }
});

// After the identity tests that write nothing: closing is module state and
// never reopens within a page (the page reloads).
test("sign-out: no persisted write lands once it has begun, and the storage is cleared", () => {
  const store = new Map<string, string>();
  const fake = {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as Storage;
  const session = new Map<string, string>([["centium-mfa-recovery-pass", A], ["centium-account-suspended", "1"]]);
  const fakeSession = {
    get length() {
      return session.size;
    },
    key: (i: number) => [...session.keys()][i] ?? null,
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => void session.set(k, v),
    removeItem: (k: string) => void session.delete(k),
    clear: () => session.clear(),
  } as Storage;
  const heard: Record<string, () => void> = {};
  const g = globalThis as Record<string, unknown>;
  const saved = { localStorage: g.localStorage, sessionStorage: g.sessionStorage, addEventListener: g.addEventListener };
  for (const [k, v] of Object.entries({ localStorage: fake, sessionStorage: fakeSession, addEventListener: (type: string, fn: () => void) => void (heard[type] = fn) })) {
    Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  }
  try {
    // Signed in: the persisted cache writes as it always has.
    assert.equal(isAccountStorageClosed(), false);
    assert.equal(writeAccountValue(fake, "user", A, '{"firstName":"Maya"}'), true);
    assert.equal(writeAccountValue(fake, "theme", A, '"dark"'), true);
    store.set(`centium-business-nav-kind:${A}`, "gym");
    store.set("centium-cookie-consent", "declined");

    endAccountStorage(A);
    assert.equal(isAccountStorageClosed(), true);
    assert.deepEqual([...store.keys()], ["centium-cookie-consent"], "cleared at once");
    assert.deepEqual([...session.keys()], ["centium-account-suspended"], "session storage too, the suspension flag kept");

    // The bug: the reset profile written back during the sign-out's awaits.
    assert.equal(writeAccountValue(fake, "user", A, '{"firstName":"Abdallah"}'), false);
    assert.equal(store.has(`centium-state:u:${A}:user`), false, "no write while signing out");

    // A writer outside the persisted cache, still in flight: gone as the page goes.
    store.set(`centium-business-nav-kind:${A}`, "gym");
    heard.pagehide();
    assert.deepEqual([...store.keys()], ["centium-cookie-consent"]);
  } finally {
    for (const [k, v] of Object.entries(saved)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  }
});

// Last: the lock is module state and cannot be undone within a tab.
test("the guarded fetch passes until the tab locks, then refuses every data request", async () => {
  const sent: string[] = [];
  const inner = (async (input: Parameters<typeof fetch>[0]) => {
    sent.push(String(input));
    return new Response("[]", { status: 200 });
  }) as typeof fetch;
  const guarded = identityGuardFetch(inner);

  const ok = await guarded(REST, { headers: { Authorization: bearer(null) } });
  assert.equal(ok.status, 200);

  let heard: unknown = null;
  onTabLock((l) => (heard = l));
  // Signed out in the other tab, then signed in there as someone else: the
  // notice follows, the tab stays locked.
  lockTab({ kind: "signedOut" });
  assert.deepEqual(heard, { kind: "signedOut" });
  lockTab({ kind: "switched", label: "Bea" });
  assert.deepEqual(currentTabLock(), { kind: "switched", label: "Bea" });
  assert.deepEqual(heard, { kind: "switched", label: "Bea" });

  const write = await guarded("http://x/rest/v1/workout_sets", { method: "POST", headers: { Authorization: bearer(B) }, body: "{}" });
  assert.equal(write.status, 409);
  assert.equal(((await write.json()) as { code: string }).code, TAB_IDENTITY_REFUSAL.code);
  const auth = await guarded("http://x/auth/v1/user", { headers: { Authorization: bearer(B) } });
  assert.equal(auth.status, 200, "auth still works so the reload can re-bind");
  assert.deepEqual(sent, [REST, "http://x/auth/v1/user"], "the refused write never reached the network");
});
