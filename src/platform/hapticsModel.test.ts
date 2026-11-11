import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createHaptics, ALLOWED_TTL_MS, MIN_GAP_MS, RING_PAIR_MS, RING_PAUSE_MS, type HapticsAllowed, type HapticsDeps } from "./hapticsModel.ts";

// A page and a phone in a box: a clock that only moves when told, timers on
// that clock, and a log of what the plugin was asked to play.
function rig(opts: { native?: boolean; on?: boolean; visible?: boolean; allowed?: HapticsAllowed | "reject" } = {}) {
  const state = { native: opts.native ?? true, on: opts.on ?? true, visible: opts.visible ?? true, allowed: opts.allowed ?? ({ allowed: true, reduced: false } as HapticsAllowed | "reject") };
  let now = 1_000_000;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const log: string[] = [];
  let asked = 0;
  const hidden = new Set<() => void>();
  const deps: HapticsDeps = {
    isNative: () => state.native,
    switchOn: () => state.on,
    visible: () => state.visible,
    hapticsAllowed: async () => {
      asked++;
      if (state.allowed === "reject") throw new Error("not implemented");
      return state.allowed;
    },
    impact: async (w) => {
      log.push(`impact:${w}@${now}`);
    },
    success: async () => {
      log.push(`success@${now}`);
    },
    vibrate: (ms) => {
      log.push(`vibrate:${ms}`);
    },
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id as number);
    },
    onHidden: (fn) => {
      hidden.add(fn);
      return () => hidden.delete(fn);
    },
  };
  const advance = async (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].fn();
      await flush();
    }
    now = end;
  };
  const flush = () => new Promise<void>((r) => setImmediate(r));
  const h = createHaptics(deps);
  return {
    h,
    state,
    log,
    advance,
    flush,
    asked: () => asked,
    hide: () => {
      state.visible = false;
      [...hidden].forEach((fn) => fn());
    },
    listeners: () => hidden.size,
    pending: () => timers.size,
    // Times relative to the start, for readable assertions.
    rel: () => log.map((l) => l.replace(/@(\d+)/, (_, n) => `@${Number(n) - 1_000_000}`)),
  };
}

test("a banner is one Light impact", async () => {
  const r = rig();
  assert.equal(await r.h.play("banner"), true);
  assert.deepEqual(r.rel(), ["impact:light@0"]);
});

test("a celebration is Success, then Medium at +140 and Heavy at +280", async () => {
  const r = rig();
  assert.equal(await r.h.play("celebrate"), true);
  await r.advance(400);
  assert.deepEqual(r.rel(), ["success@0", "impact:medium@140", "impact:heavy@280"]);
});

test("reduced: a celebration is the Success notification only", async () => {
  const r = rig({ allowed: { allowed: true, reduced: true } });
  await r.h.play("celebrate");
  await r.advance(1000);
  assert.deepEqual(r.rel(), ["success@0"]);
});

test("the Vibration switch off: nothing plays, and the phone isn't asked", async () => {
  const r = rig({ on: false });
  assert.equal(await r.h.play("banner"), false);
  assert.equal(await r.h.play("celebrate", { key: "a" }), false);
  r.h.startRing();
  r.h.vibrate(40);
  await r.advance(5000);
  assert.deepEqual(r.log, []);
  assert.equal(r.asked(), 0);
});

test("not in the app: nothing plays, and the phone isn't asked", async () => {
  const r = rig({ native: false });
  assert.equal(await r.h.play("banner"), false);
  assert.equal(await r.h.play("celebrate"), false);
  r.h.startRing();
  await r.advance(5000);
  assert.deepEqual(r.log, []);
  assert.equal(r.asked(), 0);
});

test("the phone says no, or has no such method (an old build): nothing plays", async () => {
  const no = rig({ allowed: { allowed: false, reduced: false } });
  assert.equal(await no.h.play("banner"), false);
  no.h.startRing();
  await no.advance(5000);
  assert.deepEqual(no.log, []);
  const old = rig({ allowed: "reject" });
  assert.equal(await old.h.play("celebrate"), false);
  await old.advance(5000);
  assert.deepEqual(old.log, []);
});

test("the phone's answer is kept 30 s", async () => {
  const r = rig();
  await r.h.play("banner");
  await r.advance(MIN_GAP_MS);
  await r.h.play("banner");
  assert.equal(r.asked(), 1);
  await r.advance(ALLOWED_TTL_MS);
  await r.h.play("banner");
  assert.equal(r.asked(), 2);
});

test("a key plays once a session", async () => {
  const r = rig();
  assert.equal(await r.h.play("banner", { key: "thread:1" }), true);
  await r.advance(10_000);
  assert.equal(await r.h.play("banner", { key: "thread:1" }), false);
  assert.equal(await r.h.play("banner", { key: "thread:2" }), true);
  assert.equal(r.log.length, 2);
});

test("two moments are at least 1.5 s apart", async () => {
  const r = rig();
  assert.equal(await r.h.play("banner", { key: "a" }), true);
  await r.advance(MIN_GAP_MS - 1);
  assert.equal(await r.h.play("banner", { key: "b" }), false);
  await r.advance(1);
  assert.equal(await r.h.play("banner", { key: "b" }), true);
  assert.equal(r.log.length, 2);
});

test("two pills in the same moment: one plays (the key is taken before the phone answers)", async () => {
  const r = rig();
  const [a, b] = await Promise.all([r.h.play("banner", { key: "x" }), r.h.play("banner", { key: "x" })]);
  assert.deepEqual([a, b], [true, false]);
  assert.equal(r.log.length, 1);
});

test("only while the page is visible", async () => {
  const r = rig({ visible: false });
  assert.equal(await r.h.play("banner"), false);
  r.h.startRing();
  await r.advance(3000);
  assert.deepEqual(r.log, []);
});

test("the ring: two Medium 150 ms apart, 1.2 s quiet, repeated, until stopped", async () => {
  const r = rig();
  r.h.startRing();
  await r.flush();
  await r.advance(2 * (RING_PAIR_MS + RING_PAUSE_MS) + RING_PAIR_MS + 10);
  assert.deepEqual(r.rel(), ["impact:medium@0", "impact:medium@150", "impact:medium@1350", "impact:medium@1500", "impact:medium@2700", "impact:medium@2850"]);
  assert.equal(r.asked(), 1, "the phone is asked once, at the start");
  r.h.stopRing();
  const n = r.log.length;
  await r.advance(5000);
  assert.equal(r.log.length, n);
  assert.equal(r.pending(), 0);
  assert.equal(r.listeners(), 0);
});

test("the ring, reduced: one impact a cycle", async () => {
  const r = rig({ allowed: { allowed: true, reduced: true } });
  r.h.startRing();
  await r.flush();
  await r.advance(RING_PAIR_MS + RING_PAUSE_MS + 10);
  assert.deepEqual(r.rel(), ["impact:medium@0", "impact:medium@1350"]);
  r.h.stopRing();
});

test("the ring stops when the page goes hidden", async () => {
  const r = rig();
  r.h.startRing();
  await r.flush();
  await r.advance(200);
  assert.equal(r.log.length, 2);
  r.hide();
  await r.advance(5000);
  assert.equal(r.log.length, 2);
  assert.equal(r.pending(), 0);
  assert.equal(r.listeners(), 0);
});

test("the ring: a second start while ringing is ignored; stopped before the phone answers, nothing plays", async () => {
  const r = rig();
  r.h.startRing();
  r.h.startRing();
  await r.flush();
  await r.advance(100);
  assert.deepEqual(r.rel(), ["impact:medium@0"]);
  r.h.stopRing();
  const q = rig();
  q.h.startRing();
  q.h.stopRing();
  await q.flush();
  await q.advance(3000);
  assert.deepEqual(q.log, []);
  // And it can ring again afterwards.
  q.h.startRing();
  await q.flush();
  assert.equal(q.log.length, 1);
  q.h.stopRing();
});

test("the web vibrations (scanners, EMOM) follow the switch only", () => {
  const on = rig({ native: false });
  on.h.vibrate(40);
  assert.deepEqual(on.log, ["vibrate:40"]);
  const off = rig({ native: false, on: false });
  off.h.vibrate(40);
  assert.deepEqual(off.log, []);
});
