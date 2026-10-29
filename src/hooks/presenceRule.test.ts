import { strict as assert } from "node:assert";
import { test } from "node:test";
import { PRESENCE_INTERVAL_MS, presenceWanted } from "./presenceRule.ts";

test("presence: reported only while the tab is shown and in front, every 30–45 s", () => {
  assert.equal(presenceWanted("visible", true), true);
  assert.equal(presenceWanted("visible", false), false);
  assert.equal(presenceWanted("hidden", true), false);
  assert.ok(PRESENCE_INTERVAL_MS >= 30_000 && PRESENCE_INTERVAL_MS <= 45_000);
});
