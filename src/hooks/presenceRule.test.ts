import { strict as assert } from "node:assert";
import { test } from "node:test";
import { PRESENCE_INTERVAL_MS, presenceWanted } from "./presenceRule.ts";

test("presence: reported only while the tab is shown and in front, every 30–45 s", () => {
  assert.equal(presenceWanted("visible", true), true);
  assert.equal(presenceWanted("visible", false), false);
  assert.equal(presenceWanted("hidden", true), false);
  assert.ok(PRESENCE_INTERVAL_MS >= 30_000 && PRESENCE_INTERVAL_MS <= 45_000);
});

test("away: leaving the screen says away once, coming back says active at once", async () => {
  const { presenceStep } = await import("./presenceRule.ts");
  // Phone: pause → away; resume → active.
  assert.deepEqual(presenceStep("active", "left"), { next: "away", action: "away" });
  assert.deepEqual(presenceStep("away", "front"), { next: "active", action: "active" });
  // Said once: pause, then visibilitychange, then pagehide send nothing more.
  assert.deepEqual(presenceStep("away", "left"), { next: "away", action: null });
  // In front already: the timer keeps reporting; no extra call.
  assert.deepEqual(presenceStep("active", "front"), { next: "active", action: null });
  // A page that opens hidden says away; one that opens in front says active.
  assert.deepEqual(presenceStep("unknown", "left"), { next: "away", action: "away" });
  assert.deepEqual(presenceStep("unknown", "front"), { next: "active", action: "active" });
});

test("hidden then visible again within the interval: away, then active at once (not on the next tick)", async () => {
  const { presenceStep, presenceSignal } = await import("./presenceRule.ts");
  let s: "unknown" | "active" | "away" = "unknown";
  const actions: (string | null)[] = [];
  for (const [v, f] of [["visible", true], ["hidden", false], ["visible", true]] as const) {
    const r = presenceStep(s, presenceSignal(v, f));
    s = r.next;
    actions.push(r.action);
  }
  assert.deepEqual(actions, ["active", "away", "active"]);
  // Blurred but visible (another window in front) counts as left too.
  assert.equal(presenceSignal("visible", false), "left");
});

test("a missing report_app_away (before the migration) is ignored silently", async () => {
  const { presenceErrorIgnorable } = await import("./presenceRule.ts");
  assert.equal(presenceErrorIgnorable({ code: "PGRST202", message: "Could not find the function public.report_app_away" }), true);
  assert.equal(presenceErrorIgnorable({ status: 404, message: "Not Found" }), true);
  assert.equal(presenceErrorIgnorable(null), true);
  assert.equal(presenceErrorIgnorable({ code: "42501", message: "permission denied" }), false);
});

test("an active still in flight when the app leaves reaches the server before the away (the queue)", async () => {
  const { presenceQueue } = await import("./presenceRule.ts");
  const arrived: string[] = [];
  const pending: (() => void)[] = [];
  // A request that answers only when released, as on a slow network.
  const send = (fn: string) => new Promise<void>((resolve) => pending.push(() => (arrived.push(fn), resolve())));
  const call = presenceQueue(send, 3000);
  const tick = call("report_app_active"); // a timer tick, in flight
  const away = call("report_app_away"); // the app leaves meanwhile
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(pending.length, 1, "the away waits for the active to answer");
  pending.shift()!();
  await tick;
  await new Promise((r) => setTimeout(r, 10));
  pending.shift()!();
  await away;
  assert.deepEqual(arrived, ["report_app_active", "report_app_away"]);
});

test("a stuck active never holds the away for more than the cap", async () => {
  const { presenceQueue } = await import("./presenceRule.ts");
  const sent: string[] = [];
  const send = (fn: string) => {
    sent.push(fn);
    return fn === "report_app_active" ? new Promise<void>(() => {}) : Promise.resolve();
  };
  const call = presenceQueue(send, 50);
  void call("report_app_active");
  const t0 = Date.now();
  await call("report_app_away");
  assert.deepEqual(sent, ["report_app_active", "report_app_away"]);
  assert.ok(Date.now() - t0 < 1000);
});

test("leave then come back quickly: away, then active, in that order", async () => {
  const { presenceQueue } = await import("./presenceRule.ts");
  const order: string[] = [];
  const send = (fn: string) => new Promise<void>((r) => setTimeout(() => (order.push(fn), r()), fn === "report_app_away" ? 30 : 5));
  const call = presenceQueue(send, 3000);
  await Promise.all([call("report_app_away"), call("report_app_active")]);
  assert.deepEqual(order, ["report_app_away", "report_app_active"]);
});
