import test from "node:test";
import assert from "node:assert/strict";
import { base64url, encodeKey } from "./encode";

// The two keys a Web Push subscription carries, at the sizes the spec fixes
// them at: p256dh is an uncompressed P-256 point (65 bytes, 0x04 then two
// 32-byte coordinates) and auth is a 16-byte secret. Base64 of 65 bytes is 88
// chars with one `=`; of 16 bytes, 24 chars with two `=`. Stripped, that is 87
// and 22 — the numbers every assertion below turns on.

/** Bytes that are certain to produce `+` and `/` in standard base64. */
function bytesWithPlusAndSlash(length: number): Uint8Array {
  // 0xFB 0xEF -> "++8" territory; 0xFF 0xFF -> "///". Cycling three values
  // across the whole buffer guarantees both appear whatever the length.
  const pattern = [0xfb, 0xef, 0xff];
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = pattern[i % pattern.length];
  return out;
}

const p256dh = (): Uint8Array => {
  const b = bytesWithPlusAndSlash(65);
  b[0] = 0x04; // uncompressed point marker, as a real key has
  return b;
};

const auth = (): Uint8Array => bytesWithPlusAndSlash(16);

const toBuffer = (b: Uint8Array): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

// --- the two sizes ----------------------------------------------------------

test("A 65-BYTE p256dh ENCODES TO 87 CHARACTERS", () => {
  assert.equal(base64url(p256dh()).length, 87);
});

test("A 16-BYTE auth ENCODES TO 22 CHARACTERS", () => {
  assert.equal(base64url(auth()).length, 22);
});

// --- the alphabet, which is the whole bug -----------------------------------

test("NEITHER KEY CONTAINS + / OR =", () => {
  for (const [name, bytes] of [
    ["p256dh", p256dh()],
    ["auth", auth()],
  ] as const) {
    const encoded = base64url(bytes);
    assert.ok(!encoded.includes("+"), `${name} contains "+"`);
    assert.ok(!encoded.includes("/"), `${name} contains "/"`);
    assert.ok(!encoded.includes("="), `${name} contains "="`);
  }
});

test("the fixtures really would have tripped the old code", () => {
  // Guards the test rather than the code: if these bytes stopped producing
  // + and / under plain base64, the assertions above would pass vacuously.
  const plain = (bytes: Uint8Array) => {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };
  assert.match(plain(p256dh()), /\+/);
  assert.match(plain(p256dh()), /\//);
  assert.match(plain(p256dh()), /=$/);
  assert.match(plain(auth()), /\+/);
  assert.match(plain(auth()), /\//);
  assert.match(plain(auth()), /=$/);
});

test("every character is in the base64url alphabet", () => {
  for (const bytes of [p256dh(), auth()]) {
    assert.match(base64url(bytes), /^[A-Za-z0-9_-]+$/);
  }
});

// --- it is still the same bytes ---------------------------------------------

test("IT ROUND-TRIPS: the substitutions are reversible, not lossy", () => {
  for (const original of [p256dh(), auth()]) {
    const encoded = base64url(original);
    // Undo base64url, pad back to a multiple of four, and decode.
    const standard = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
    const decoded = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    assert.deepEqual([...decoded], [...original]);
  }
});

test("the p256dh keeps its 0x04 uncompressed-point marker", () => {
  const encoded = base64url(p256dh());
  const standard = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
  assert.equal(atob(padded).charCodeAt(0), 0x04);
});

// --- padding is stripped at every remainder ---------------------------------

test("no padding survives, whatever the length mod 3", () => {
  for (let n = 1; n <= 66; n++) {
    const encoded = base64url(bytesWithPlusAndSlash(n));
    assert.ok(!encoded.includes("="), `${n} bytes left padding`);
    // 4 chars per 3 bytes, minus the padding that would have been added.
    assert.equal(encoded.length, Math.ceil((n * 4) / 3), `${n} bytes`);
  }
});

test("known vectors, so the alphabet is pinned and not merely self-consistent", () => {
  // RFC 4648 §10 test vectors, base64url and unpadded.
  const enc = (s: string) => base64url(Uint8Array.from(s, (c) => c.charCodeAt(0)));
  assert.equal(enc(""), "");
  assert.equal(enc("f"), "Zg");
  assert.equal(enc("fo"), "Zm8");
  assert.equal(enc("foo"), "Zm9v");
  assert.equal(enc("foob"), "Zm9vYg");
  assert.equal(enc("fooba"), "Zm9vYmE");
  assert.equal(enc("foobar"), "Zm9vYmFy");
  // The two bytes that differ between the alphabets, isolated:
  // 0xFB 0xFF 0xFE -> "+//+" in base64, "-__-" in base64url.
  assert.equal(base64url(new Uint8Array([0xfb, 0xff, 0xbf])), "-_-_");
});

// --- encodeKey's own contract -----------------------------------------------

test("encodeKey returns null for a missing key rather than an empty string", () => {
  // The caller refuses to record a subscription missing either key; "" would
  // pass that check and then violate the column's non-blank CHECK.
  assert.equal(encodeKey(null), null);
});

test("encodeKey agrees with base64url on both real sizes", () => {
  for (const bytes of [p256dh(), auth()]) {
    assert.equal(encodeKey(toBuffer(bytes)), base64url(bytes));
  }
  assert.equal(encodeKey(toBuffer(p256dh()))!.length, 87);
  assert.equal(encodeKey(toBuffer(auth()))!.length, 22);
});

test("encodeKey reads a view's own bytes, not the whole backing buffer", () => {
  // getKey() can hand back a view into a larger allocation; encoding the
  // buffer rather than the view would silently include its neighbours.
  const backing = new Uint8Array(32).fill(0xaa);
  backing.set(auth(), 8);
  const view = backing.subarray(8, 24);
  assert.equal(encodeKey(toBuffer(view)), base64url(auth()));
});
