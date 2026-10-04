/// <reference lib="webworker" />
import { notificationTarget } from "./services/push/messagePushUrl";
import { collapsedText, collapseTag } from "./services/push/collapse";

/** The `?v=` cache-buster for the app icons, injected at build time from ICON_VERSION in vite.config.ts. */
declare const __ICON_VERSION__: string;

/**
 * Centium's service worker. Two handlers, and deliberately nothing else.
 *
 * WHAT THIS IS FOR, AND WHAT IT IS NOT. This worker exists so the app can
 * receive a push notification when it is closed — the case the calling
 * investigation identified as needing infrastructure that did not exist.
 * It is NOT an offline strategy. Nothing is precached and no fetch handler is
 * registered, so every request goes to the network exactly as it did before
 * this file existed. A worker that quietly started serving stale responses
 * would be a much larger change than the one being made here, and this app
 * reads live health data.
 *
 * THE MISSING FETCH HANDLER DOES NOT COST INSTALLABILITY, which is the reason
 * someone would otherwise add one. Chrome dropped that requirement from its
 * install criteria — Chrome 108 on mobile, 112 on desktop — so a manifest plus
 * a registered worker is enough. Adding a no-op fetch handler to satisfy a
 * rule that no longer exists would be pure cargo cult; adding a real one is an
 * offline strategy, which is the decision above.
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

// THE INJECTION POINT HAS TO APPEAR IN THE SOURCE. vite-plugin-pwa's
// injectManifest strategy fails the build if it cannot find this token, so it
// is referenced and thrown away. What gets substituted is a one-entry list
// holding manifest.webmanifest — `globPatterns: []` and
// `includeManifestIcons: false` in vite.config.ts remove everything the plugin
// would otherwise add, and that last entry has no opt-out. It does not matter:
// this list is only ever precached by passing it to Workbox's
// precacheAndRoute, which this worker never imports and never calls. Nothing
// here caches anything.
void self.__WB_MANIFEST;

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
self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
