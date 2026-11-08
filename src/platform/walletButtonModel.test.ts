import { strict as assert } from "node:assert";
import { test } from "node:test";
import { WALLET_ADDED, WALLET_BUTTON_HEIGHT, WALLET_FAILED, walletArtWidth, walletButton, walletOutcome, type WalletButtonInput } from "./walletButtonModel.ts";

const ready: WalletButtonInput = {
  platform: "android",
  availability: { ok: true, wallet: "google" },
  switchOn: true,
  passState: "valid",
  centiumEntry: true,
  passCodeOn: true,
};

test("the Android app with Google Wallet, the switch on and a valid pass shows Google's button", () => {
  assert.equal(walletButton(ready), "google");
});

test("a browser and the iPhone app keep the disabled placeholder, whatever the rest says", () => {
  assert.equal(walletButton({ ...ready, platform: "web", availability: { ok: false, reason: "not_native" } }), "placeholder");
  assert.equal(walletButton({ ...ready, platform: "web" }), "placeholder");
  assert.equal(walletButton({ ...ready, platform: "ios" }), "placeholder");
  assert.equal(walletButton({ ...ready, platform: "ios", availability: { ok: true, wallet: "apple" } }), "placeholder");
});

test("on Android it hides while availability is being asked, and where Google Wallet can't save passes", () => {
  assert.equal(walletButton({ ...ready, availability: null }), "none");
  assert.equal(walletButton({ ...ready, availability: { ok: false, reason: "no_wallet" } }), "none");
  assert.equal(walletButton({ ...ready, availability: { ok: false, reason: "unsupported" } }), "none");
  assert.equal(walletButton({ ...ready, availability: { ok: true } }), "none");
  assert.equal(walletButton({ ...ready, availability: { ok: true, wallet: "apple" } }), "none");
});

test("on Android it hides with the switch off", () => {
  assert.equal(walletButton({ ...ready, switchOn: false }), "none");
});

test("on Android it hides for every pass that isn't valid", () => {
  for (const s of ["awaiting_payment", "expired", "cancelled", "refunded", "upcoming", "unknown", null, undefined]) {
    assert.equal(walletButton({ ...ready, passState: s }), "none", String(s));
  }
});

test("a gym with only its own entry system shows no Wallet anywhere; with the pass code off Android shows none", () => {
  for (const platform of ["web", "ios", "android"] as const) assert.equal(walletButton({ ...ready, platform, centiumEntry: false }), "none");
  assert.equal(walletButton({ ...ready, passCodeOn: false }), "none");
});

test("added: the success line, and the devices are read again", () => {
  assert.deepEqual(walletOutcome("added"), { note: { key: WALLET_ADDED, error: false }, reloadDevices: true });
});

test("cancelled: nothing is said and nothing is re-read", () => {
  assert.deepEqual(walletOutcome("cancelled"), { note: null, reloadDevices: false });
});

test("failed: the one error line", () => {
  assert.deepEqual(walletOutcome("failed"), { note: { key: WALLET_FAILED, error: true }, reloadDevices: false });
  assert.equal(WALLET_FAILED, "Couldn't add your pass to Google Wallet. Try again later.");
});

test("the button is 48 tall and keeps the artwork's ratio", () => {
  assert.equal(WALLET_BUTTON_HEIGHT, 48);
  assert.equal(walletArtWidth("en"), 271.68);
  assert.equal(walletArtWidth("ar"), 299.52);
});
