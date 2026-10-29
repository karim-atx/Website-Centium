/// <reference lib="webworker" />
import { notificationTarget } from "./services/push/messagePushUrl";
import { collapsedText, collapseTag } from "./services/push/collapse";

/** The `?v=` cache-buster for the app icons, injected at build time from ICON_VERSION in vite.config.ts. */
declare const __ICON_VERSION__: string;

/**
 * Centium's service worker: push notifications, and since Round D (D24)
 * the app shell, so the app opens with no connection.
 *
 * WHAT IS CACHED, AND WHAT NEVER IS. Only the build's own static files: the
 * page (index.html), the scripts and styles, and the barcode / pass wasm
 * (vite.config.ts lists them). They are precached at install under a cache
 * named after their revisions, and an old cache is deleted when a new
 * worker takes over. NO DATA IS EVER CACHED HERE: requests to Supabase, the
 * Edge Functions and every other origin go straight to the network. What the
 * app shows offline comes from its own device cache (usePersistentState), as
 * before, and the outbox saves what was logged.
 *
 * HOW REQUESTS ARE ANSWERED. A page load (navigation) goes to the network
 * first, so a new release is picked up at once; with no connection it gets
 * the cached index.html. A precached file is served from the cache (its URL
 * carries a content hash, so it never goes stale). Nothing else is touched.
 *
 * NOTHING SENDS A PUSH YET. No VAPID key exists, so `PushManager.subscribe()`
 * is never called and no subscription is registered anywhere. These handlers
 * are wired ahead of that on purpose: the alternative is a worker that
 * installs, does nothing, and has to be revisited before the first push can
 * ever be delivered. When the key lands, the only missing piece is the
 * subscribe call and somewhere on the server to store the result.
 */

// `self` in a worker is a ServiceWorkerGlobalScope, which the DOM lib does not
// describe. `__WB_MANIFEST` is vite-plugin-pwa's injection point, declared here
// rather than pulled from workbox's types so this file needs no import at all.
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown };

// THE PRECACHE LIST, substituted at build by vite-plugin-pwa (injectManifest):
// [{ url, revision }]. Hashed asset URLs carry revision null.
type PrecacheEntry = string | { url: string; revision?: string | null };
const PRECACHE = ((self.__WB_MANIFEST as PrecacheEntry[] | undefined) ?? []).map((e) =>
  typeof e === "string" ? { url: e, revision: null } : { url: e.url, revision: e.revision ?? null }
);
const scopeUrl = (url: string) => new URL(url, self.registration.scope).href;
const PRECACHED = new Set(PRECACHE.map((e) => scopeUrl(e.url)));
const SHELL_URL = scopeUrl("index.html");
// One cache per set of revisions: a new build gets a new name, the old one is deleted on activate.
const SHELL_CACHE = `centium-shell-${hashOf(PRECACHE.map((e) => `${e.url}@${e.revision ?? ""}`).join("|"))}`;

function hashOf(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Shown when a push arrives carrying nothing usable. */
const FALLBACK_TITLE = "Centium";
const FALLBACK_BODY = "You have a new notification.";

interface PushPayload {
  title: string;
  body: string;
  /** Where a click should land. Same-origin path, not an absolute URL. */
  url: string;
  /** Collapses repeat notifications about the same thing. */
  tag?: string;
  /** Set when this is a chat message that collapses with others from its chat. */
  chatTag?: string;
}

/**
 * Reads a push payload without trusting it.
 *
 * The body of a push is whatever the sender put there, so every field is
 * checked for being a non-empty string before it is used. A malformed payload
 * degrades to the fallback notification rather than throwing — an exception in
 * here means no notification is shown at all, which the browser then reports to
 * the user as "This site has been updated in the background", a message that
 * explains nothing and looks like a bug.
 *
 * `url` is deliberately constrained to a same-origin path. A pushed absolute
 * URL that this worker opened on click would make a notification into an open
 * redirect, which is worth closing before anything can send one rather than
 * after.
 */
function readPayload(data: PushMessageData | null): PushPayload {
  const fallback: PushPayload = { title: FALLBACK_TITLE, body: FALLBACK_BODY, url: "/app" };
  if (!data) return fallback;

  let parsed: unknown;
  try {
    parsed = data.json();
  } catch {
    // Not JSON. Plain text is still worth showing as the body.
    const text = data.text().trim();
    return text ? { ...fallback, body: text } : fallback;
  }

  if (typeof parsed !== "object" || parsed === null) return fallback;
  const raw = parsed as Record<string, unknown>;

  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  return {
    title: str(raw.title) ?? fallback.title,
    body: str(raw.body) ?? fallback.body,
    // A message notification opens its conversation; anything else a
    // same-origin path or the fallback. See notificationTarget.
    url: notificationTarget(raw, fallback.url),
    tag: str(raw.tag),
    chatTag: collapseTag(raw),
  };
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event.data);
  // ALWAYS SHOWS SOMETHING. A push handler that resolves without showing a
  // notification gets the browser's own "updated in the background" notice
  // instead, and repeated offences can cost the origin its push permission.
  event.waitUntil(
    (async () => {
      // ONE NOTIFICATION PER CHAT: a new message from a chat already on screen
      // replaces it and counts ("3 new messages from Sarah"), and still
      // alerts. The count lives on the notification itself, so it resets
      // once that notification is dismissed or opened.
      let title = payload.title;
      let body = payload.body;
      let count = 1;
      if (payload.chatTag) {
        let previous = 0;
        try {
          const shown = await self.registration.getNotifications({ tag: payload.chatTag });
          for (const n of shown) {
            const c = (n.data as { count?: unknown } | undefined)?.count;
            previous = Math.max(previous, typeof c === "number" ? c : 1);
          }
        } catch {
          /* Can't read what is shown: show this one on its own terms. */
        }
        ({ title, body, count } = collapsedText(payload.title, payload.body, previous));
      }
      await self.registration.showNotification(title, {
        body,
        icon: `/pwa-192x192.png${__ICON_VERSION__}`,
        badge: `/pwa-192x192.png${__ICON_VERSION__}`,
        tag: payload.chatTag ?? payload.tag,
        // Without this a replaced notification updates silently.
        renotify: !!payload.chatTag,
        data: { url: payload.url, count },
      } as NotificationOptions);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data as { url?: string } | undefined;
  const target = typeof data?.url === "string" ? data.url : "/app";

  // FOCUS AN OPEN TAB BEFORE OPENING A NEW ONE. Someone who already has
  // Centium open does not want a second copy of it; for a call notification
  // that would be two tabs racing for the same microphone.
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        // Without this, a window not yet controlled by this worker — every
        // tab open at the moment it first installs — is invisible here.
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        // navigate() is not in every engine; focusing is the part that matters,
        // so a missing navigate leaves the tab where it was rather than failing.
        if ("navigate" in client) {
          try {
            await client.navigate(target);
          } catch {
            /* Focused but not navigated. Still better than a new tab. */
          }
        }
        return;
      }

      await self.clients.openWindow(target);
    })()
  );
});

// TAKES OVER IMMEDIATELY, which is safe precisely because nothing is cached.
// The usual reason to let an old worker finish its lifetime is that pages are
// holding responses it served; this one serves nothing, so waiting only means
// a notification fix sits behind a tab close.
self.addEventListener("install", (event) => {
  // The shell is fetched fresh (not from the HTTP cache) and stored before
  // this worker takes over. A failed download fails the install, so a half
  // shell is never used; the previous worker keeps serving.
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((e) => new Request(scopeUrl(e.url), { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith("centium-shell-") && n !== SHELL_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // A page load: the network first, the cached page when there is none.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(SHELL_URL, { cacheName: SHELL_CACHE })) ?? Response.error())
    );
    return;
  }
  // A precached build file: from the cache, else the network.
  const href = url.origin + url.pathname;
  if (PRECACHED.has(href)) {
    event.respondWith(caches.match(href, { cacheName: SHELL_CACHE }).then((hit) => hit ?? fetch(req)));
  }
});
