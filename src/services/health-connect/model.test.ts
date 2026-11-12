import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { backgroundAfter, connectErrorKey, healthCopy, healthView, rowLine, syncResultKey, typesToRead, type HealthStatus } from "./model.ts";

describe("backgroundAfter (Sync in the background)", () => {
  it("on and off move the switch, with no line", () => {
    assert.deepEqual(backgroundAfter("on"), { sw: { available: true, on: true }, note: null });
    assert.deepEqual(backgroundAfter("off"), { sw: { available: true, on: false }, note: null });
  });
  it("refused stays off, says so, and offers Health Connect's settings", () => {
    const r = backgroundAfter("refused");
    assert.deepEqual(r.sw, { available: true, on: false });
    assert.equal(r.note?.settings, true);
    assert.equal(r.note?.danger, true);
    assert.match(r.note!.key, /wasn't allowed/);
  });
  it("unavailable disables the switch; its reason is the row's own line", () => {
    assert.deepEqual(backgroundAfter("unavailable"), { sw: { available: false, on: false }, note: null });
  });
});

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

describe("Apple Health on iPhone (Batch C item 36)", () => {
  const conn: HealthStatus = { connected: true, granted: ["steps"], lastSyncedAt: null, accessState: "ok" };

  it("is named Apple Health, opens Health, and says where access is changed", () => {
    const c = healthCopy("apple_health");
    assert.equal(c.name, "Apple Health");
    assert.equal(c.connect, "Connect Apple Health");
    assert.equal(c.changeAccess, "Open Health");
    assert.equal(c.showsAccessPerType, false);
    assert.match(c.accessHint ?? "", /Health › your profile › Apps › Centium/);
    assert.match(c.disconnectNote ?? "", /Centium stops reading/);
    assert.match(c.backgroundOn, /iOS decides the exact time/);
    assert.equal(c.disconnectTitle, "Disconnect Apple Health?");
  });

  it("Android keeps every Health Connect word as it was", () => {
    const c = healthCopy("android_health");
    assert.equal(c.name, "Health Connect");
    assert.equal(c.connect, "Connect Health Connect");
    assert.equal(c.changeAccess, "Change access");
    assert.equal(c.showsAccessPerType, true);
    assert.equal(c.accessHint, null);
    assert.equal(c.disconnectNote, null);
    assert.equal(c.backgroundOn, "About once an hour, while Centium is closed.");
  });

  it("never shows the install or update state on iPhone", () => {
    assert.deepEqual(healthView({ ok: false, reason: "needs_install" }, null, "apple_health"), { kind: "unavailable" });
    assert.deepEqual(healthView({ ok: false, reason: "needs_update" }, null, "apple_health"), { kind: "unavailable" });
    assert.deepEqual(healthView({ ok: false, reason: "needs_install" }, null, "android_health"), { kind: "install", update: false });
    assert.deepEqual(healthView({ ok: true }, conn, "apple_health"), { kind: "connected", lastSyncedAt: null, accessState: "ok" });
  });

  it("connect errors name Apple Health on iPhone", () => {
    assert.equal(connectErrorKey({ code: "ATXZ0" }, false, "apple_health"), "Syncing from Apple Health is switched off right now. Try again later.");
    assert.equal(connectErrorKey(new Error("x"), false, "apple_health"), "Couldn't connect to Apple Health. Try again.");
    assert.equal(connectErrorKey(new Error("x"), true, "apple_health"), "You're offline. Connect again when you're back online.");
    assert.equal(connectErrorKey(new Error("x"), false), "Couldn't connect to Health Connect. Try again.");
  });
});
