import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  APPLE_CODE_LIFETIME_MS,
  APPLE_LINK_KEY,
  APPLE_NAME_KEY,
  appleSubject,
  claimAppleLinkCode,
  clearAppleGivenName,
  forgetAppleSignIn,
  hasAppleIdentity,
  peekAppleGivenName,
  rememberAppleSignIn,
  sendPendingAppleLink,
} from "./applePending.ts";

function memory() {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
}
const T = Date.UTC(2026, 10, 10, 12, 0, 0);
const SUB = "001234.abcd.0001";
const appleUser = { identities: [{ provider: "apple", id: SUB }] };
const linkedUser = { identities: [{ provider: "email", id: "x" }, { provider: "apple", id: "ignored", identity_data: { sub: SUB } }] };
const otherUser = { identities: [{ provider: "email", id: "someone-else" }] };
const otherAppleUser = { identities: [{ provider: "apple", id: "009999.other.0001" }] };

test("Apple sign-in: the ID token's sub, and matching it to the signed-in account's Apple identity", () => {
  const token = ["h", Buffer.from(JSON.stringify({ sub: SUB, aud: "org.atraxia.centium" })).toString("base64url"), "sig"].join(".");
  assert.equal(appleSubject(token), SUB);
  assert.equal(appleSubject("not-a-jwt"), null);
  assert.equal(hasAppleIdentity(appleUser, SUB), true);
  assert.equal(hasAppleIdentity(linkedUser, SUB), true, "an Apple identity linked to an email account");
  assert.equal(hasAppleIdentity(otherUser, SUB), false);
  assert.equal(hasAppleIdentity(otherAppleUser, SUB), false);
  assert.equal(hasAppleIdentity(null, SUB), false);
});

test("Apple sign-in: the name, for its own account only, while fresh; the name only when Apple gave one", () => {
  const s = memory();
  rememberAppleSignIn("code-1", "  Layla ", SUB, T, s);
  assert.equal(peekAppleGivenName(appleUser, T, s), "Layla");
  assert.equal(peekAppleGivenName(appleUser, T, s), "Layla", "peeking doesn't remove it (React may run an initialiser twice)");
  assert.equal(peekAppleGivenName(otherUser, T, s), null, "another account never gets it");
  assert.equal(peekAppleGivenName(appleUser, T + APPLE_CODE_LIFETIME_MS + 1, s), null);
  clearAppleGivenName(s);
  assert.equal(peekAppleGivenName(appleUser, T, s), null);

  const later = memory();
  rememberAppleSignIn("code-2", undefined, SUB, T, later);
  assert.equal(later.map.has(APPLE_NAME_KEY), false, "later sign-ins: Apple gives no name");
  assert.ok(later.map.has(APPLE_LINK_KEY));
});

test("Apple sign-in: the code is claimed once, for its own account, and dropped when stale or someone else's", () => {
  const s = memory();
  rememberAppleSignIn("code-1", undefined, SUB, T, s);
  assert.equal(claimAppleLinkCode(appleUser, T + 1000, s), "code-1");
  assert.equal(claimAppleLinkCode(appleUser, T + 2000, s), null, "the reloaded page finds nothing left to send");

  rememberAppleSignIn("code-2", undefined, SUB, T, s);
  assert.equal(claimAppleLinkCode(otherUser, T, s), null, "another account's sign-in drops it, unsent");
  assert.equal(s.map.has(APPLE_LINK_KEY), false);

  rememberAppleSignIn("code-3", undefined, SUB, T, s);
  assert.equal(claimAppleLinkCode(appleUser, T + APPLE_CODE_LIFETIME_MS + 1, s), null);
  assert.equal(s.map.has(APPLE_LINK_KEY), false);

  s.setItem(APPLE_LINK_KEY, "{not json");
  assert.equal(claimAppleLinkCode(appleUser, T, s), null);
});

test("Apple sign-in: a failed sign-in keeps nothing for whoever signs in next", () => {
  const s = memory();
  rememberAppleSignIn("code-1", "Layla", SUB, T, s);
  forgetAppleSignIn(s);
  assert.equal(s.map.size, 0);
  assert.equal(peekAppleGivenName(otherUser, T, s), null);
  assert.equal(claimAppleLinkCode(otherUser, T, s), null);
});

test("Apple sign-in: the link goes once, with keepalive and the account's token; never for another account, nor without a token", async () => {
  const s = memory();
  (globalThis as { sessionStorage?: unknown }).sessionStorage = s;
  try {
    const sent: { url: string; init: RequestInit }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return new Response("{\"ok\":true}", { status: 200 });
    }) as unknown as typeof fetch;
    const config = { url: "https://project.supabase.co", anonKey: "anon" };

    rememberAppleSignIn("code-1", "Layla", SUB, Date.now(), s);
    sendPendingAppleLink(null, appleUser, config, fakeFetch);
    assert.equal(sent.length, 0, "no token yet: the code waits");

    sendPendingAppleLink("token-1", appleUser, config, fakeFetch);
    sendPendingAppleLink("token-1", appleUser, config, fakeFetch); // the reloaded page: nothing left
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, "https://project.supabase.co/functions/v1/apple-sign-in-link");
    assert.equal(sent[0].init.keepalive, true);
    assert.equal((sent[0].init.headers as Record<string, string>).Authorization, "Bearer token-1");
    assert.deepEqual(JSON.parse(String(sent[0].init.body)), { authorization_code: "code-1" });

    // The Website session's case: a stray code, then another account signs in.
    rememberAppleSignIn("code-2", "Layla", SUB, Date.now(), s);
    sendPendingAppleLink("token-other", otherUser, config, fakeFetch);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(sent.length, 1, "nothing sent with another account's token");
    assert.equal(s.map.has(APPLE_LINK_KEY), false, "and the stray code is gone");
  } finally {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  }
});
