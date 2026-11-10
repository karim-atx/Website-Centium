import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  APPLE_CODE_LIFETIME_MS,
  APPLE_LINK_KEY,
  APPLE_NAME_KEY,
  claimAppleLinkCode,
  clearAppleGivenName,
  peekAppleGivenName,
  rememberAppleSignIn,
  sendPendingAppleLink,
} from "./applePending.ts";

function memory() {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
}
const T = Date.UTC(2026, 10, 10, 12, 0, 0);

test("Apple sign-in: the name and the code are kept for the reload; the name only when Apple gave one", () => {
  const s = memory();
  rememberAppleSignIn("code-1", "  Karim ", T, s);
  assert.equal(peekAppleGivenName(s), "Karim");
  assert.equal(peekAppleGivenName(s), "Karim", "peeking doesn't remove it (React may run an initialiser twice)");
  clearAppleGivenName(s);
  assert.equal(peekAppleGivenName(s), null);

  const later = memory();
  rememberAppleSignIn("code-2", undefined, T, later);
  assert.equal(later.map.has(APPLE_NAME_KEY), false, "later sign-ins: Apple gives no name");
  assert.ok(later.map.has(APPLE_LINK_KEY));
});

test("Apple sign-in: the code is claimed once, and a code older than Apple's 5 minutes is dropped", () => {
  const s = memory();
  rememberAppleSignIn("code-1", undefined, T, s);
  assert.equal(claimAppleLinkCode(T + 1000, s), "code-1");
  assert.equal(claimAppleLinkCode(T + 2000, s), null, "the reloaded page finds nothing left to send");

  rememberAppleSignIn("code-2", undefined, T, s);
  assert.equal(claimAppleLinkCode(T + APPLE_CODE_LIFETIME_MS + 1, s), null);
  assert.equal(s.map.has(APPLE_LINK_KEY), false);

  s.setItem(APPLE_LINK_KEY, "{not json");
  assert.equal(claimAppleLinkCode(T, s), null);
});

test("Apple sign-in: the link goes once, with keepalive and the account's token, and not at all without a token", async () => {
  const s = memory();
  (globalThis as { sessionStorage?: unknown }).sessionStorage = s;
  try {
    const sent: { url: string; init: RequestInit }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return new Response("{\"ok\":true}", { status: 200 });
    }) as unknown as typeof fetch;
    const config = { url: "https://project.supabase.co", anonKey: "anon" };

    rememberAppleSignIn("code-1", "Karim", Date.now(), s);
    sendPendingAppleLink(null, config, fakeFetch);
    assert.equal(sent.length, 0, "no token yet: the code waits");

    sendPendingAppleLink("token-1", config, fakeFetch);
    sendPendingAppleLink("token-1", config, fakeFetch); // the reloaded page: nothing left
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, "https://project.supabase.co/functions/v1/apple-sign-in-link");
    assert.equal(sent[0].init.keepalive, true);
    assert.equal((sent[0].init.headers as Record<string, string>).Authorization, "Bearer token-1");
    assert.deepEqual(JSON.parse(String(sent[0].init.body)), { authorization_code: "code-1" });
  } finally {
    delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
  }
});
