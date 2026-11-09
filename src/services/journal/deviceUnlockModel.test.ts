import { strict as assert } from "node:assert";
import { test } from "node:test";
import { deviceButtonLabel, deviceUnlockStatus, edgeOutcome, enrolFirstLine, phoneLabel, phoneLabelFrom, signFailure, turnOnLabel } from "./deviceUnlockModel";

test("the phone's status: off, enrol, setup or ready", () => {
  assert.equal(deviceUnlockStatus({ ok: false, reason: "not_native" }, false, false), "off");
  assert.equal(deviceUnlockStatus({ ok: false, reason: "unsupported" }, true, true), "off");
  assert.equal(deviceUnlockStatus({ ok: false, reason: "no_hardware" }, false, false), "off");
  assert.equal(deviceUnlockStatus({ ok: false, reason: "none_enrolled" }, false, false), "enrol");
  assert.equal(deviceUnlockStatus({ ok: true, kind: "fingerprint" }, false, false), "setup");
  // A key the server doesn't list (revoked elsewhere), or a listed key the phone lost: set up again.
  assert.equal(deviceUnlockStatus({ ok: true, kind: "fingerprint" }, true, false), "setup");
  assert.equal(deviceUnlockStatus({ ok: true, kind: "fingerprint" }, false, true), "setup");
  assert.equal(deviceUnlockStatus({ ok: true, kind: "fingerprint" }, true, true), "ready");
});

test("the labels follow the kind, and removing says so", () => {
  assert.equal(deviceButtonLabel("fingerprint", "unlock"), "Unlock with fingerprint");
  assert.equal(deviceButtonLabel("face", "write"), "Unlock with face");
  assert.equal(deviceButtonLabel(undefined, "delete"), "Unlock with fingerprint or face");
  assert.equal(deviceButtonLabel("fingerprint", "remove"), "Remove with fingerprint");
  assert.equal(turnOnLabel("fingerprint"), "Unlock locked folders with your fingerprint");
  assert.equal(turnOnLabel(undefined), "Unlock locked folders with your fingerprint or face");
  assert.equal(enrolFirstLine("fingerprint"), "Set up a fingerprint in your phone's settings first.");
});

test("a refused prompt: quiet on cancel, revoke and set up again on a changed fingerprint", () => {
  assert.deepEqual(signFailure("cancelled"), { line: null, setup: false, revoke: false });
  assert.equal(signFailure("locked_out").setup, false);
  assert.match(signFailure("locked_out").line ?? "", /password or the emailed code/);
  assert.deepEqual({ ...signFailure("key_invalidated"), line: !!signFailure("key_invalidated").line }, { line: true, setup: true, revoke: true });
  assert.deepEqual({ ...signFailure("no_key"), line: !!signFailure("no_key").line }, { line: true, setup: true, revoke: false });
  assert.equal(signFailure("failed").revoke, false);
});

test("the Edge Function's answers", () => {
  assert.deepEqual(edgeOutcome(200, { success: true, message: "Unlocked.", unlocked_until: "2026-11-08T10:05:00Z" }), {
    ok: true,
    unlockedUntil: "2026-11-08T10:05:00Z",
  });
  // remove: success with no window.
  assert.deepEqual(edgeOutcome(200, { success: true, message: "Lock removed.", unlocked_until: null }), { ok: true, unlockedUntil: null });
  const refused = edgeOutcome(200, { success: false, message: "This device could not be verified." });
  assert.equal(refused.ok, false);
  assert.equal(!refused.ok && refused.line, "This device could not be verified.");
  for (const [status, needle] of [
    [401, /Sign in again/],
    [403, /switched off/],
    [404, /no longer exists/],
    [500, /connection/],
  ] as const) {
    const o = edgeOutcome(status, null);
    assert.equal(o.ok, false);
    assert.match(!o.ok ? (o.line ?? "") : "", needle);
  }
  assert.equal(edgeOutcome(429, null).ok, false);
});

test("the phone's name comes from the WebView's user agent", () => {
  assert.equal(
    phoneLabel("Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A.240205.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36 Centium/1.0 (Android)"),
    "Pixel 8"
  );
  assert.equal(phoneLabel("Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36"), "SM-S918B");
  // Chrome's reduced agent and desktops fall back.
  assert.equal(phoneLabel("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"), "Android phone");
  assert.equal(phoneLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "Android phone");
  assert.ok(phoneLabel(`Mozilla/5.0 (Linux; Android 14; ${"X".repeat(120)})`).length <= 80);
});

test("phoneLabelFrom: the app's model first, else the user agent's", () => {
  const reduced = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36";
  assert.equal(phoneLabelFrom("Pixel 8", reduced), "Pixel 8");
  assert.equal(phoneLabelFrom("  Galaxy\nS24  ", reduced), "Galaxy S24");
  assert.equal(phoneLabelFrom("X".repeat(120), reduced).length, 80);
  // App builds before Round K have no deviceModel(): the user agent decides.
  assert.equal(phoneLabelFrom(undefined, reduced), "Android phone");
  assert.equal(phoneLabelFrom("", "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36"), "SM-S918B");
});
