import { test } from "node:test";
import assert from "node:assert/strict";
import { nextTioState, TIO_STATES, tioKey, type TioViewport } from "./tioRotation.ts";

// RULE B2: random on every open, never the same state twice in a row (NONE
// included), the last state kept per viewport.

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

test("each viewport rotates only its own states", () => {
  assert.deepEqual([...TIO_STATES.mobile], ["lie", "wave", "peek", "none"]);
  assert.deepEqual([...TIO_STATES.web], ["lean", "sidepeek", "none"]);
});

for (const v of ["mobile", "web"] as TioViewport[]) {
  test(`${v}: never twice in a row over many opens, every state appears, roughly evenly`, () => {
    const store = memoryStore();
    const counts = new Map<string, number>();
    let prev: string | null = null;
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const s = nextTioState(v, Math.random, store);
      assert.ok((TIO_STATES[v] as readonly string[]).includes(s));
      assert.notEqual(s, prev, `repeat at open ${i}`);
      prev = s;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const share = 1 / TIO_STATES[v].length;
    for (const s of TIO_STATES[v]) {
      const got = (counts.get(s) ?? 0) / N;
      assert.ok(Math.abs(got - share) < 0.03, `${s}: ${got.toFixed(3)} vs ${share.toFixed(3)}`);
    }
  });
}

test("the pool leaves out the last state, then picks uniformly from the rest", () => {
  const store = memoryStore();
  store.setItem(tioKey("mobile"), "wave");
  assert.equal(nextTioState("mobile", () => 0, store), "lie");
  store.setItem(tioKey("mobile"), "wave");
  assert.equal(nextTioState("mobile", () => 0.5, store), "peek");
  store.setItem(tioKey("mobile"), "wave");
  assert.equal(nextTioState("mobile", () => 0.9999, store), "none");
  store.setItem(tioKey("web"), "none");
  assert.equal(nextTioState("web", () => 0.9999, store), "sidepeek");
});

test("the last state is stored per viewport (shared by every popup, kept across sessions)", () => {
  const store = memoryStore();
  const a = nextTioState("mobile", () => 0, store);
  assert.equal(store.m.get("centium.tio.last.mobile"), a);
  assert.equal(store.m.get("centium.tio.last.web"), undefined);
  const b = nextTioState("web", () => 0, store);
  assert.equal(store.m.get("centium.tio.last.web"), b);
  assert.equal(store.m.get("centium.tio.last.mobile"), a);
  // A new session reads the same store: the next pick still avoids the last.
  assert.notEqual(nextTioState("mobile", () => 0, store), a);
});

test("no storage (private mode) still picks a state", () => {
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.ok((TIO_STATES.web as readonly string[]).includes(nextTioState("web", Math.random, broken)));
  assert.ok((TIO_STATES.mobile as readonly string[]).includes(nextTioState("mobile", Math.random, null)));
});
