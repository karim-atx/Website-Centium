import { strict as assert } from "node:assert";
import { test } from "node:test";
import { autoSyncDue, AUTO_SYNC_EVERY_MS, ingestBatches, tallyIngest } from "./healthModel.ts";

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
