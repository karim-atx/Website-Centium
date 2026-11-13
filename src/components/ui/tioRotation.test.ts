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

test("pick then remember: a dropped pick leaves the stored state as it was", async () => {
  const { pickTioState, rememberTioState } = await import("./tioRotation.ts");
  const store = memoryStore();
  store.setItem(tioKey("mobile"), "lie");
  const s = pickTioState("mobile", () => 0.5, store);
  assert.notEqual(s, "lie");
  assert.equal(store.m.get("centium.tio.last.mobile"), "lie");
  rememberTioState("mobile", s, store);
  assert.equal(store.m.get("centium.tio.last.mobile"), s);
});

test("Safari fix: the pick is among the states that fit, never the last; null only when none fits", async () => {
  const { pickFittingTioState } = await import("./tioRotation.ts");
  const store = memoryStore();
  // Only PEEK has room (Safari, sheet top ~80): PEEK and NONE alternate, Tio never skipped for lack of a pick.
  const onlyPeek = (s: string) => s === "peek" || s === "none";
  const seq: (string | null)[] = [];
  for (let i = 0; i < 40; i++) {
    const s = pickFittingTioState("mobile", onlyPeek, Math.random, store);
    seq.push(s);
    if (s) store.setItem(tioKey("mobile"), s);
  }
  assert.ok(seq.every((s) => s === "peek" || s === "none"));
  for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1]);
  assert.equal(seq.filter((s) => s === "peek").length, 20);
  // No pose fits and NONE was last: nothing (no Tio, nothing stored).
  store.setItem(tioKey("mobile"), "none");
  assert.equal(pickFittingTioState("mobile", (s) => s === "none", Math.random, store), null);
  // Everything fits: the plain rotation.
  store.setItem(tioKey("mobile"), "wave");
  assert.equal(pickFittingTioState("mobile", () => true, () => 0, store), "lie");
});

test("no localStorage (a private window that refuses it): the rotation still runs for the tab", async () => {
  const { nextTioState, pickFittingTioState } = await import("./tioRotation.ts");
  const g = globalThis as { localStorage?: unknown };
  const had = Object.getOwnPropertyDescriptor(g, "localStorage");
  const deny = () => {
    throw new Error("QuotaExceededError");
  };
  Object.defineProperty(g, "localStorage", { configurable: true, get: () => ({ getItem: deny, setItem: deny }) });
  try {
    let prev: string | null = null;
    for (let i = 0; i < 30; i++) {
      const s = nextTioState("web");
      assert.notEqual(s, prev, "no back-to-back repeat even without storage");
      prev = s;
    }
    assert.notEqual(pickFittingTioState("web", () => true), prev);
  } finally {
    if (had) Object.defineProperty(g, "localStorage", had);
    else delete g.localStorage;
  }
});
