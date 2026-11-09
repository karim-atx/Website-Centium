import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { JAR_KEY, jarRead, jarWrite, type JarStore, type JarStores } from "../../../lib/supabase/cookieJarModel.ts";

function memory(): JarStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
const fresh = (): JarStores & { persistent: ReturnType<typeof memory>; session: ReturnType<typeof memory> } => ({
  persistent: memory(),
  session: memory(),
});
const T = Date.UTC(2026, 10, 10, 12, 0, 0);

test("iPhone cookie jar: what @supabase/ssr writes reads back as document.cookie would give it", () => {
  const s = fresh();
  const value = "base64-eyJhY2Nlc3NfdG9rZW4iOiJ4In0";
  jarWrite(s, serializeCookieHeader("sb-10-auth-token", value, { path: "/", sameSite: "lax", maxAge: 400 * 24 * 3600 }), T);
  assert.deepEqual(parseCookieHeader(jarRead(s, T)), [{ name: "sb-10-auth-token", value }]);
  assert.ok(s.persistent.map.has(JAR_KEY));
  assert.equal(s.session.map.has(JAR_KEY), false);
});

test("iPhone cookie jar: chunks, a replaced chunk and Max-Age=0 deletions, as on sign-in, refresh and sign-out", () => {
  const s = fresh();
  const year = { path: "/", maxAge: 31536000 };
  jarWrite(s, serializeCookieHeader("sb-10-auth-token.0", "A".repeat(3180), year), T);
  jarWrite(s, serializeCookieHeader("sb-10-auth-token.1", "B".repeat(400), year), T);
  assert.equal(parseCookieHeader(jarRead(s, T)).length, 2);
  // A refresh rewrites chunk 0 and drops chunk 1.
  jarWrite(s, serializeCookieHeader("sb-10-auth-token.0", "C".repeat(10), year), T);
  jarWrite(s, serializeCookieHeader("sb-10-auth-token.1", "", { path: "/", maxAge: 0 }), T);
  assert.deepEqual(parseCookieHeader(jarRead(s, T)), [{ name: "sb-10-auth-token.0", value: "C".repeat(10) }]);
  // Sign-out.
  jarWrite(s, serializeCookieHeader("sb-10-auth-token.0", "", { path: "/", maxAge: 0 }), T);
  assert.equal(jarRead(s, T), "");
  assert.equal(s.persistent.map.has(JAR_KEY), false, "an empty jar leaves nothing in storage");
});

test("iPhone cookie jar: no Max-Age or Expires is a session cookie (Remember me off), kept apart and read first", () => {
  const s = fresh();
  jarWrite(s, "sb-10-auth-token=session-only; Path=/; SameSite=Lax", T);
  assert.equal(jarRead(s, T), "sb-10-auth-token=session-only");
  assert.ok(s.session.map.has(JAR_KEY));
  assert.equal(s.persistent.map.has(JAR_KEY), false);
  // The app is closed: sessionStorage is gone, and so is the session.
  assert.equal(jarRead({ persistent: s.persistent, session: memory() }, T), "");
  // Turning Remember me back on moves it to the persistent store.
  jarWrite(s, "sb-10-auth-token=kept; Path=/; Max-Age=3600", T);
  assert.equal(jarRead(s, T), "sb-10-auth-token=kept");
  assert.equal(s.session.map.has(JAR_KEY), false);
});

test("iPhone cookie jar: expiry, a past Expires, and Max-Age winning over Expires", () => {
  const s = fresh();
  jarWrite(s, "a=1; Max-Age=60", T);
  jarWrite(s, "b=2; Expires=" + new Date(T - 1000).toUTCString(), T);
  jarWrite(s, "c=3; Expires=" + new Date(T - 1000).toUTCString() + "; Max-Age=60", T);
  assert.equal(jarRead(s, T), "a=1; c=3");
  assert.equal(jarRead(s, T + 61_000), "", "expired after a minute");
  jarWrite(s, "d=4; Max-Age=60", T + 61_000);
  assert.deepEqual(Object.keys(JSON.parse(s.persistent.map.get(JAR_KEY)!)), ["d"], "expired entries go on the next write");
});

test("iPhone cookie jar: unreadable storage reads as no cookies, and a header without a name is ignored", () => {
  const s = fresh();
  s.persistent.setItem(JAR_KEY, "{not json");
  assert.equal(jarRead(s, T), "");
  jarWrite(s, "=nameless; Max-Age=60", T);
  jarWrite(s, "", T);
  assert.equal(jarRead(s, T), "");
});

test("iPhone cookie jar: speed, a signed-in session of two chunks (about 3.6 kB)", () => {
  const s = fresh();
  const year = { path: "/", sameSite: "lax" as const, maxAge: 400 * 24 * 3600 };
  jarWrite(s, serializeCookieHeader("sb-10-auth-token.0", "x".repeat(3180), year), T);
  jarWrite(s, serializeCookieHeader("sb-10-auth-token.1", "y".repeat(420), year), T);
  const reads = 10_000;
  let start = performance.now();
  for (let i = 0; i < reads; i++) parseCookieHeader(jarRead(s, T));
  const readMs = (performance.now() - start) / reads;
  start = performance.now();
  for (let i = 0; i < 2_000; i++) jarWrite(s, serializeCookieHeader("sb-10-auth-token.1", "y".repeat(420), year), T);
  const writeMs = (performance.now() - start) / 2_000;
  console.log(`cookie jar: ${(readMs * 1000).toFixed(1)} µs per read+parse, ${(writeMs * 1000).toFixed(1)} µs per write`);
  // Generous bounds for a slow CI machine; a phone is in the same order.
  assert.ok(readMs < 1, `read took ${readMs} ms`);
  assert.ok(writeMs < 2, `write took ${writeMs} ms`);
});

test("iPhone cookie jar: sign-out's storage sweep leaves it for auth-js, which ends the session through it", async () => {
  const { accountStorageKeys } = await import("../../../lib/supabase/tabIdentity.ts");
  const userId = "39a86329-8fbd-45e9-ab56-c1cf8074fa78";
  const s = fresh();
  const session = Buffer.from(JSON.stringify({ access_token: "x", refresh_token: "y", user: { id: userId } })).toString("base64url");
  jarWrite(s, serializeCookieHeader("sb-10-auth-token", `base64-${session}`, { path: "/", maxAge: 3600 }), T);
  // The sweep runs first; the jar must still hold the session for signOut()'s server call.
  assert.deepEqual(accountStorageKeys([[JAR_KEY, s.persistent.getItem(JAR_KEY)]], userId), []);
  // auth-js then removes it the way it removes a cookie.
  jarWrite(s, serializeCookieHeader("sb-10-auth-token", "", { path: "/", maxAge: 0 }), T);
  assert.equal(s.persistent.getItem(JAR_KEY), null);
});
