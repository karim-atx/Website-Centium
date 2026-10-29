import { playlistServiceOf, type PlaylistService } from "./playlistLink";

/**
 * Round E · a playlist's cover and name, from the service's PUBLIC lookup
 * (oEmbed: the same open endpoint a website uses to embed a player). No key,
 * no sign-in, nothing read from anyone's account; only the playlist's own
 * link is sent, to the service it belongs to. All three answer a browser:
 *   Spotify        https://open.spotify.com/oembed
 *   Apple Music    https://music.apple.com/api/oembed
 *   YouTube Music  https://www.youtube.com/oembed (a playlist link; an album
 *                  link, music.youtube.com/browse/MPREb_…, has none)
 * Where there is no answer the card shows the Centium music tile instead.
 *
 * Kept on the device for a week (memory, then localStorage when it can be
 * used), so a card seen twice is looked up once.
 */

export interface PlaylistMeta {
  title: string | null;
  cover: string | null;
}

const KEY = "centium.playlistMeta.v1";
const WEEK = 7 * 24 * 3600 * 1000;
const MAX = 200;

type Stored = Record<string, { t: number; m: PlaylistMeta | null }>;
const memory = new Map<string, Promise<PlaylistMeta | null>>();

function readStore(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}

function writeStore(url: string, m: PlaylistMeta | null) {
  try {
    const all = readStore();
    all[url] = { t: Date.now(), m };
    const keys = Object.keys(all);
    if (keys.length > MAX) keys.sort((a, b) => all[a].t - all[b].t).slice(0, keys.length - MAX).forEach((k) => delete all[k]);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // A full or blocked store only means looking it up again next time.
  }
}

/** The oEmbed address for a link, or null when its service has none for it. */
export function oembedUrl(url: string, service: PlaylistService): string | null {
  const q = encodeURIComponent;
  if (service === "spotify") return `https://open.spotify.com/oembed?url=${q(url)}`;
  if (service === "apple_music") return `https://music.apple.com/api/oembed?url=${q(url)}`;
  const list = url.match(/[?&]list=([A-Za-z0-9_-]+)/)?.[1];
  return list ? `https://www.youtube.com/oembed?format=json&url=${q(`https://www.youtube.com/playlist?list=${list}`)}` : null;
}

/** Only an https image from the answer is used. */
const safeImage = (s: unknown) => (typeof s === "string" && /^https:\/\//.test(s) ? s : null);
const safeTitle = (s: unknown) => (typeof s === "string" && s.trim() ? s.trim().slice(0, 120) : null);

async function fetchMeta(url: string): Promise<PlaylistMeta | null> {
  const service = playlistServiceOf(url);
  const endpoint = service ? oembedUrl(url, service) : null;
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint, { credentials: "omit", referrerPolicy: "no-referrer" });
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: unknown; thumbnail_url?: unknown };
    const meta = { title: safeTitle(j.title), cover: safeImage(j.thumbnail_url) };
    return meta.title || meta.cover ? meta : null;
  } catch {
    return null;
  }
}

/** The cover and name for a playlist link, or null (then: the Centium music tile). */
export function lookupPlaylist(url: string): Promise<PlaylistMeta | null> {
  const hit = memory.get(url);
  if (hit) return hit;
  const stored = readStore()[url];
  if (stored && Date.now() - stored.t < WEEK) {
    const p = Promise.resolve(stored.m);
    memory.set(url, p);
    return p;
  }
  const p = fetchMeta(url).then((m) => {
    // A failed lookup (offline) isn't remembered as "no cover".
    if (m !== null || navigator.onLine) writeStore(url, m);
    else memory.delete(url);
    return m;
  });
  memory.set(url, p);
  return p;
}
