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
