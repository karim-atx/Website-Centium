import { strict as assert } from "node:assert";
import { test } from "node:test";
import { deviceLabelFrom, hexToBytes, passCode, passCounter, passQrValue, secondsLeft, truncate } from "./passCode.ts";

// RFC 6238 appendix B, the SHA-256 column: the 32-byte ASCII seed, 8 digits
// there; the last 6 of each are what a 6-digit code reads (the migration
// asserts counter 1 → 119246 and counter 37037036 → 084774).
const SEED = new TextEncoder().encode("12345678901234567890123456789012");

test("RFC 6238 SHA-256 vectors, 6 digits", async () => {
  assert.equal(await passCode(SEED, 1), "119246");
  assert.equal(await passCode(SEED, 37037036), "084774");
  assert.equal(await passCode(SEED, passCounter(59_000)), "119246");
  assert.equal(await passCode(SEED, passCounter(1111111109_000)), "084774");
});

test("RFC 6238 SHA-256 vectors, 8 digits (the RFC's own table)", async () => {
  const rows: [number, string][] = [
    [59, "46119246"],
    [1111111109, "68084774"],
    [1111111111, "67062674"],
    [1234567890, "91819424"],
    [2000000000, "90698825"],
    [20000000000, "77737706"],
  ];
  for (const [s, want] of rows) assert.equal(await passCode(SEED, passCounter(s * 1000), 8), want, `T = ${s}`);
});

test("the secret's hex is decoded to raw bytes, as the server keys its HMAC", async () => {
  const hex = Buffer.from(SEED).toString("hex");
  const bytes = hexToBytes(hex);
  assert.ok(bytes);
  assert.equal(await passCode(bytes, 1), "119246");
  assert.equal(hexToBytes("abc"), null);
  assert.equal(hexToBytes("zz"), null);
  assert.equal(hexToBytes(""), null);
  assert.deepEqual([...(hexToBytes("00ff10") ?? [])], [0, 255, 16]);
});

test("the window and the ring", () => {
  assert.equal(passCounter(0), 0);
  assert.equal(passCounter(29_999), 0);
  assert.equal(passCounter(30_000), 1);
  assert.equal(secondsLeft(0), 30);
  assert.equal(secondsLeft(29_000), 1);
  assert.equal(secondsLeft(30_500), 30);
});

test("truncation keeps leading zeros", () => {
  // offset 0, bytes 00 00 03 e8 → 1000 → "001000"
  const mac = new Uint8Array(20);
  mac.set([0, 0, 3, 0xe8]);
  assert.equal(truncate(mac), "001000");
});

test("the QR payload is pd:<device>:<code>, lowercase", () => {
  assert.equal(passQrValue("0A1B2C3D-0000-4000-8000-00000000ABCD", "012345"), "pd:0a1b2c3d-0000-4000-8000-00000000abcd:012345");
});

test("the device label names the browser and system, never the whole user agent", () => {
  const chromeWin = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
  const safariIphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const edge = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0";
  const firefoxAndroid = "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0";
  assert.equal(deviceLabelFrom(chromeWin, "4F2A"), "Chrome on Windows · 4F2A");
  assert.equal(deviceLabelFrom(safariIphone, "B7"), "Safari on iPhone · B7");
  assert.equal(deviceLabelFrom(edge, ""), "Edge on Windows");
  assert.equal(deviceLabelFrom(firefoxAndroid, "x"), "Firefox on Android · x");
  assert.equal(deviceLabelFrom("", ""), "Browser");
});
