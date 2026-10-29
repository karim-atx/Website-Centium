import { strict as assert } from "node:assert";
import { test } from "node:test";
import { onPassCached, readPassCache, writePassCache, PASS_CACHE_HOURS } from "./passCache";

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    keys: () => [...m.keys()],
  };
}

test("the pass cache is per account, short-lived, drops ended memberships, and is a centium-state key", () => {
  const s = fakeStorage();
  (globalThis as { window?: unknown }).window = { localStorage: s };
  const t0 = new Date(2026, 9, 14, 9, 0);
  const rows = [
    { id: "a", expiresOn: "2026-10-27" },
    { id: "b", expiresOn: "2026-10-13" },
  ];
  writePassCache("u1", rows, t0);
  assert.ok(s.keys().every((k) => k.startsWith("centium-state")));
  assert.equal(readPassCache<{ id: string; expiresOn: string }>("u2", (r) => r.expiresOn, t0), null);
  const hit = readPassCache<{ id: string; expiresOn: string }>("u1", (r) => r.expiresOn, new Date(2026, 9, 14, 20, 0));
  assert.deepEqual(hit?.rows.map((r) => r.id), ["a"]);
  const late = new Date(t0.getTime() + (PASS_CACHE_HOURS + 1) * 3_600_000);
  assert.equal(readPassCache<{ id: string; expiresOn: string }>("u1", (r) => r.expiresOn, late), null);
  assert.equal(s.keys().length, 0);
  delete (globalThis as { window?: unknown }).window;
});

test("caching an active pass tells the QR writer to load; an empty write does not", () => {
  let calls = 0;
  const off = onPassCached(() => calls++);
  writePassCache("u-listen", [{ id: "m1" }]);
  writePassCache("u-listen", []);
  assert.equal(calls, 1);
  off();
  writePassCache("u-listen", [{ id: "m1" }]);
  assert.equal(calls, 1);
});
