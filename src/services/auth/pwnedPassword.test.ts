import { strict as assert } from "node:assert";
import { test } from "node:test";
import { countInRange, pwnedCount, sha1Hex } from "./pwnedPassword.ts";

// SHA-1("password123") = CBFDAC6008F9CAB4083784CBD1874F76618D2A97
const HASH = "CBFDAC6008F9CAB4083784CBD1874F76618D2A97";

test("the SHA-1 is upper-case hex of the UTF-8 text", async () => {
  assert.equal(await sha1Hex("password123"), HASH);
});

test("a listed suffix gives its count; padding and absent suffixes give 0", () => {
  const body = ["0018A45C4D1DEF81644B54AB7F969B88D65:1", `${HASH.slice(5)}:2254650`, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0"].join("\r\n");
  assert.equal(countInRange(body, HASH.slice(5)), 2254650);
  assert.equal(countInRange(body, "ffffffffffffffffffffffffffffffffffF"), 0);
  assert.equal(countInRange(body, "1234567890ABCDEF1234567890ABCDEF123"), 0);
  assert.equal(countInRange("", HASH.slice(5)), 0);
});

test("only the 5-character prefix is sent, with padding asked for", async () => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fake = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: init?.headers as Record<string, string> });
    return new Response(`${HASH.slice(5)}:42\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0`, { status: 200 });
  }) as unknown as typeof fetch;
  assert.equal(await pwnedCount("password123", { fetchImpl: fake }), 42);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.pwnedpasswords.com/range/CBFDA");
  assert.equal(calls[0].headers["Add-Padding"], "true");
  assert.ok(!calls[0].url.includes(HASH.slice(5)));
});

test("a failed, refused or timed-out check says nothing", async () => {
  const down = (async () => {
    throw new TypeError("offline");
  }) as unknown as typeof fetch;
  assert.equal(await pwnedCount("password123", { fetchImpl: down }), null);
  const refused = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
  assert.equal(await pwnedCount("password123", { fetchImpl: refused }), null);
  const slow = ((_u: string, init?: RequestInit) =>
    new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch;
  assert.equal(await pwnedCount("password123", { fetchImpl: slow, timeoutMs: 20 }), null);
  assert.equal(await pwnedCount("", { fetchImpl: down }), null);
});

test("cancelling stops the check", async () => {
  const ctl = new AbortController();
  const slow = ((_u: string, init?: RequestInit) =>
    new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch;
  const p = pwnedCount("password123", { fetchImpl: slow, signal: ctl.signal });
  ctl.abort();
  assert.equal(await p, null);
});
