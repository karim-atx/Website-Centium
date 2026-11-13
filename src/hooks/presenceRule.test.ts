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
