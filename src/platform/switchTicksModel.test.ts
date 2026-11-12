import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createSwitchTickTracker, WINDOW_MS } from "./switchTicksModel.ts";

function rig() {
  let now = 0;
  const t = createSwitchTickTracker<string>(() => now);
  return { t, advance: (ms: number) => (now += ms) };
}

test("a tapped switch that turns on ticks once", () => {
  const { t } = rig();
  t.tapped("wifi", "false");
  assert.equal(t.changed("wifi", "true"), true);
  assert.equal(t.changed("wifi", "false"), false); // not tapped again
});

test("turning off ticks too", () => {
  const { t } = rig();
  t.tapped("wifi", "true");
  assert.equal(t.changed("wifi", "false"), true);
});

test("a switch that refuses (aria-checked unchanged) is silent", () => {
  const { t } = rig();
  t.tapped("wifi", "false");
  assert.equal(t.changed("wifi", "false"), false);
});

test("a switch that waits for the server ticks when it flips, within the window", () => {
  const { t, advance } = rig();
  t.tapped("sync", "false");
  advance(WINDOW_MS);
  assert.equal(t.changed("sync", "true"), true);
});

test("too late: a flip after the window is not the tap's", () => {
  const { t, advance } = rig();
  t.tapped("sync", "false");
  advance(WINDOW_MS + 1);
  assert.equal(t.changed("sync", "true"), false);
});

test("other switches moving (loading data, a master's children) never tick", () => {
  const { t } = rig();
  assert.equal(t.changed("child", "true"), false); // nothing tapped
  t.tapped("master", "true");
  assert.equal(t.changed("child", "false"), false);
  assert.equal(t.changed("master", "false"), true);
});

test("the last tap wins: two switches tapped in turn each tick", () => {
  const { t, advance } = rig();
  t.tapped("a", "false");
  assert.equal(t.changed("a", "true"), true);
  advance(300);
  t.tapped("b", "true");
  assert.equal(t.changed("b", "false"), true);
});
