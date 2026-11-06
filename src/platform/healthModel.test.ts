import { strict as assert } from "node:assert";
import { test } from "node:test";
import { healthView, rowLine } from "../services/health-connect/model.ts";
import { autoSyncDue, AUTO_SYNC_EVERY_MS, ingestBatches, runSync, tallyIngest, type SyncSteps } from "./healthModel.ts";

const range = (k: number, tag: string) => Array.from({ length: k }, (_, i) => `${tag}${i}`);

test("a sync with nothing new is still one call", () => {
  assert.deepEqual(ingestBatches([], []), [{ samples: [], deleted: [] }]);
});

test("calls hold at most the limit, deletions first", () => {
  const b = ingestBatches(range(7, "s"), range(3, "d"), 4);
  assert.deepEqual(b, [
    { deleted: ["d0", "d1", "d2"], samples: ["s0"] },
    { deleted: [], samples: ["s1", "s2", "s3", "s4"] },
    { deleted: [], samples: ["s5", "s6"] },
  ]);
  for (const call of b) assert.ok(call.samples.length + call.deleted.length <= 4);
});

test("more deletions than one call carry over", () => {
  const b = ingestBatches(range(1, "s"), range(5, "d"), 2);
  assert.deepEqual(b.map((c) => [c.deleted.length, c.samples.length]), [[2, 0], [2, 0], [1, 1]]);
});

test("500 a call by default", () => {
  const b = ingestBatches(range(1200, "s"), []);
  assert.deepEqual(b.map((c) => c.samples.length), [500, 500, 200]);
});

test("the tally counts saved apart from everything else", () => {
  assert.deepEqual(
    tallyIngest([
      { saved: 3, duplicate: 2, hidden: 1, rejected: 0 },
      { saved: 1, duplicate: 0, hidden: 0, rejected: 2 },
      { saved: "x" },
    ]),
    { saved: 4, skipped: 5 },
  );
});

test("opening the app syncs at most every 15 minutes", () => {
  assert.equal(autoSyncDue(null, 0), true);
  assert.equal(autoSyncDue(1000, 1000 + AUTO_SYNC_EVERY_MS - 1), false);
  assert.equal(autoSyncDue(1000, 1000 + AUTO_SYNC_EVERY_MS), true);
});

// A server whose report_health_integration_sync answers a moment later, as
// the real one does: "Last synced" moves only once the report lands.
function fakeServer(ingestError: { message: string; code?: string } | null = null) {
  const server = { lastSyncedAt: "2026-11-06T16:42:00.000Z" as string | null, accessState: "ok" as string, reports: [] as string[], notConnected: 0 };
  const later = () => new Promise((r) => setTimeout(r, 20));
  const steps: SyncSteps<string, string> = {
    collect: async () => ({ syncId: "s1", samples: ["a"], deleted: [] }),
    ingest: async () => (ingestError ? { data: null, error: ingestError } : { data: { saved: 1 }, error: null }),
    commit: async () => {},
    report: async (accessState, lastSyncedAt) => {
      await later();
      server.reports.push(accessState);
      server.accessState = accessState;
      if (lastSyncedAt) server.lastSyncedAt = lastSyncedAt;
    },
    isOffline: () => false,
    notConnected: () => void server.notConnected++,
    now: () => "2026-11-06T18:48:00.000Z",
  };
  return { server, steps };
}

test("Settings shows this sync's time right after it (not the sync before)", async () => {
  const { server, steps } = fakeServer();
  // HealthConnectPage: await health.syncNow(), then read the status again.
  assert.deepEqual(await runSync(steps), { saved: 1, skipped: 0 });
  const view = healthView({ ok: true }, { connected: true, granted: ["steps"], lastSyncedAt: server.lastSyncedAt, accessState: "ok" });
  assert.deepEqual(rowLine(view!), { key: "Connected · synced {time}", time: "2026-11-06T18:48:00.000Z" });
});

test("access withdrawn, or a refused sync, is reported before the sync ends", async (t) => {
  t.mock.method(console, "error", () => {});
  const off = fakeServer();
  off.steps.collect = () => Promise.reject(Object.assign(new Error("off"), { code: "access_off" }));
  assert.equal((await runSync(off.steps)).error, "access_off");
  assert.deepEqual(off.server.reports, ["access_off"]);

  const refused = fakeServer({ message: "slow down", code: "ATXZ2" });
  assert.equal((await runSync(refused.steps)).error, "server");
  assert.deepEqual(refused.server.reports, ["error"]);
});

test("not connected on the server yet: nothing reported, and not counted as an attempt", async (t) => {
  t.mock.method(console, "error", () => {});
  const { server, steps } = fakeServer({ message: "not connected", code: "ATXZ1" });
  assert.equal((await runSync(steps)).error, "server");
  assert.deepEqual(server.reports, []);
  assert.equal(server.notConnected, 1);
});
