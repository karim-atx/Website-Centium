import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectErrorKey, healthView, rowLine, syncResultKey, typesToRead, type HealthStatus } from "./model.ts";

const status = (over: Partial<HealthStatus> = {}): HealthStatus => ({ connected: true, granted: ["steps"], lastSyncedAt: "2026-11-06T08:05:00.000Z", accessState: "ok", ...over });

describe("healthView and rowLine", () => {
  it("not installed, out of date, or not offered", () => {
    assert.deepEqual(healthView({ ok: false, reason: "needs_install" }, null), { kind: "install", update: false });
    assert.deepEqual(healthView({ ok: false, reason: "needs_update" }, null), { kind: "install", update: true });
    assert.deepEqual(healthView({ ok: false, reason: "not_native" }, null), { kind: "unavailable" });
    assert.deepEqual(healthView({ ok: false }, null), { kind: "unavailable" });
    assert.equal(rowLine({ kind: "unavailable" }), null);
    assert.equal(rowLine({ kind: "install", update: false })?.key, "Health Connect isn't installed");
    assert.equal(rowLine({ kind: "install", update: true })?.key, "Health Connect needs an update");
  });

  it("waits for both answers", () => {
    assert.equal(healthView(null, status()), null);
    assert.equal(healthView({ ok: true }, null), null);
  });

  it("the four lines of PLAN §2.1", () => {
    assert.equal(rowLine(healthView({ ok: true }, status({ connected: false }))!)?.key, "Not connected");
    assert.deepEqual(rowLine(healthView({ ok: true }, status())!), { key: "Connected · synced {time}", time: "2026-11-06T08:05:00.000Z" });
    assert.equal(rowLine(healthView({ ok: true }, status({ accessState: "access_off" }))!)?.key, "Access is off");
    assert.equal(rowLine(healthView({ ok: true }, status({ accessState: "error" }))!)?.key, "Couldn't sync");
    assert.equal(rowLine(healthView({ ok: true }, status({ lastSyncedAt: null, accessState: null }))!)?.key, "Connected");
  });
});

describe("typesToRead", () => {
  it("leaves weight and body fat out while recovery-sensitive", () => {
    assert.deepEqual(typesToRead(false), ["steps", "sleep", "exercise", "heart_rate", "weight", "body_fat"]);
    assert.deepEqual(typesToRead(true), ["steps", "sleep", "exercise", "heart_rate"]);
  });
});

describe("errors in words", () => {
  it("syncNow's answers", () => {
    assert.deepEqual(syncResultKey({ saved: 3, skipped: 1 }), { key: "Synced.", danger: false });
    assert.equal(syncResultKey({ saved: 0, skipped: 0, error: "offline" }).danger, true);
    assert.match(syncResultKey({ saved: 0, skipped: 0, error: "access_off" }).key, /Access is off/);
    assert.match(syncResultKey({ saved: 0, skipped: 0, error: "server" }).key, /server/);
  });
  it("connect's: ATXZ0 is the switch, then offline, then anything else", () => {
    assert.match(connectErrorKey({ code: "ATXZ0" }, true), /switched off/);
    assert.match(connectErrorKey({ code: "XX000" }, true), /offline/);
    assert.match(connectErrorKey(new Error("x"), false), /Couldn't connect/);
  });
});
