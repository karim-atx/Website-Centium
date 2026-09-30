import { signedUrlFor } from "../storage";

// Signed URLs for message images shown inline, and their remembered shapes.
//
// THE BUCKET STAYS PRIVATE. Every image in a thread is still read through a
// short-lived signed URL; what changes is WHEN it is minted. An inline
// thumbnail needs one at display time, so each path is signed once, the URL is
// kept here with its expiry, and it is re-signed shortly before that expiry
// rather than on every render. The thread's 8-second poll re-renders every
// bubble; without this cache each tick would mint a fresh URL per image.
//
// A URL that fails anyway (a clock skew, a revoked relationship, an object
// purged since) is re-signed once on demand; see InlineImage.

const TTL_SECONDS = 600; // signedUrlFor's ceiling
const REFRESH_MARGIN_MS = 90_000; // re-sign in the last 90s of a URL's life

type Entry = { url: string; expiresAt: number };
const urls = new Map<string, Entry>();
const inflight = new Map<string, Promise<string | null>>();

/** A usable signed URL for this attachment, minted or reused. */
export async function attachmentUrl(path: string, force = false): Promise<string | null> {
  const hit = urls.get(path);
  if (!force && hit && hit.expiresAt - Date.now() > REFRESH_MARGIN_MS) return hit.url;
  const pending = inflight.get(path);
  if (pending && !force) return pending;

  const job = signedUrlFor("message-attachments", path, TTL_SECONDS).then((r) => {
    inflight.delete(path);
    if (!r.ok || !r.url) {
      urls.delete(path);
      return null;
    }
    urls.set(path, { url: r.url, expiresAt: Date.now() + TTL_SECONDS * 1000 });
    return r.url;
  });
  inflight.set(path, job);
  return job;
}

// ---------------------------------------------------------------------------
// Shapes. The message row carries no width or height, so an image's aspect
// ratio is only known once it has loaded. Remembering it per path (on this
// device) means the second time a thread opens, each thumbnail reserves its
// exact box before the pixels arrive and nothing jumps. Only the ratio is
// kept: no URL, no content.
// ---------------------------------------------------------------------------

const DIMS_KEY = "centium-state:messageImageRatios";
const DIMS_MAX = 400;

function readRatios(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DIMS_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function knownRatio(path: string): number | null {
  const r = readRatios()[path];
  return typeof r === "number" && r > 0 ? r : null;
}

export function rememberRatio(path: string, width: number, height: number) {
  if (!width || !height) return;
  try {
    const all = readRatios();
    all[path] = Math.round((width / height) * 1000) / 1000;
    const keys = Object.keys(all);
    // Oldest first: insertion order is preserved for string keys.
    for (const k of keys.slice(0, Math.max(0, keys.length - DIMS_MAX))) delete all[k];
    localStorage.setItem(DIMS_KEY, JSON.stringify(all));
  } catch {
    /* only costs a layout shift next time */
  }
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** Whether a stored attachment path is an image (the extension is derived from the validated MIME type). */
export const isImagePath = (path: string) => IMAGE_EXT.test(path);
