import { strict as assert } from "node:assert";
import { test } from "node:test";
import { autoSyncDue, AUTO_SYNC_EVERY_MS } from "./healthModel.ts";

// The sync's own cases (batches, the tally, what is reported when) moved to
// App-Centium's HealthSyncModelTest.kt with the sync (ROUND_K.md D-EL3).

test("opening the app syncs at most every 15 minutes", () => {
  assert.equal(autoSyncDue(null, 0), true);
  assert.equal(autoSyncDue(1000, 1000 + AUTO_SYNC_EVERY_MS - 1), false);
  assert.equal(autoSyncDue(1000, 1000 + AUTO_SYNC_EVERY_MS), true);
});
