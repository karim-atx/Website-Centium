// Round F2 · AB5 (Karim F23): the gym pass's 30-second code, pure.
//
// Contract (Database 20261226070000, HANDOVER_API "The pass code (AB5)"):
// issue_pass_device_secret(p_membership_id, p_device_label) hands this device
// a secret once (hex, 32 bytes; the server decodes the hex and keys the HMAC
// with the RAW BYTES, pass_code_for(bytea, bigint)). The phone computes:
// counter = floor(unix seconds / 30) as 8 bytes big-endian, HMAC-SHA256(secret,
// counter), RFC 4226 dynamic truncation, the last 6 digits. The QR carries
// "pd:<device id>:<code>" and no member data; the desk accepts the current or
// the previous code. Works offline: nothing here touches the network.
//
// Web Crypto only (crypto.subtle), which browsers and Node 20 both have, so
// node --test runs the RFC 6238 vectors against this exact code.

export const PASS_CODE_PERIOD_SECONDS = 30;
export const PASS_CODE_DIGITS = 6;

/** The secret's hex as bytes; null for anything that isn't whole hex bytes. */
export function hexToBytes(hex: string): Uint8Array | null {
  const h = hex.trim().toLowerCase();
  if (h.length === 0 || h.length % 2 !== 0 || !/^[0-9a-f]+$/.test(h)) return null;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** The 30-second window a moment falls in: floor(unix seconds / 30). */
export const passCounter = (ms: number, period = PASS_CODE_PERIOD_SECONDS): number => Math.floor(ms / 1000 / period);

/** Seconds until the next code (1–30), for the ring. */
export function secondsLeft(ms: number, period = PASS_CODE_PERIOD_SECONDS): number {
  const s = ms / 1000;
  return period - Math.floor(s % period);
}

/** The counter as 8 bytes, big-endian (counters stay far below 2^53). */
function counterBytes(counter: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(8);
  let c = Math.floor(counter);
  for (let i = 7; i >= 0; i--) {
    b[i] = c % 256;
    c = Math.floor(c / 256);
  }
  return b;
}

/** RFC 4226 dynamic truncation of an HMAC to `digits` digits. */
export function truncate(mac: Uint8Array, digits = PASS_CODE_DIGITS): string {
  const off = mac[mac.length - 1] & 15;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** The code for a secret (raw bytes) and a counter: HMAC-SHA256 then truncation. */
export async function passCode(secret: Uint8Array, counter: number, digits = PASS_CODE_DIGITS): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new Uint8Array(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes(counter)));
  return truncate(mac, digits);
}

/** What the QR carries: "pd:<device id>:<code>", as pass_device_membership reads it. */
export const passQrValue = (deviceId: string, code: string): string => `pd:${deviceId.toLowerCase()}:${code}`;

/**
 * A short name for this browser and system, for the device list ("Chrome on
 * Windows"); never the full user agent. `tag` tells two browsers with the
 * same name apart (the server keeps one secret per label, so a second
 * "Chrome on Windows" would otherwise revoke the first).
 */
export function deviceLabelFrom(userAgent: string, tag: string): string {
  const ua = userAgent || "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS/.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Browser";
  const system = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(ua)
            ? "Mac"
            : /CrOS/.test(ua)
              ? "ChromeOS"
              : /Linux/.test(ua)
                ? "Linux"
                : null;
  const name = system ? `${browser} on ${system}` : browser;
  const t = tag.trim().slice(0, 8);
  return (t ? `${name} · ${t}` : name).slice(0, 80);
}
