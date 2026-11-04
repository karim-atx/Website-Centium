// The one place the website asks "am I running inside the Centium phone app?"
//
// The app (App-Centium) is this website's /app code in a Capacitor shell, so
// the same bundle runs in a browser tab, as an installed PWA, and in the iOS
// and Android apps. Code that has to behave differently on native (session
// storage, Google sign-in, push, links, the service worker) branches on
// isNative() from here rather than sniffing the user agent, so every such
// branch can be found by searching for this module.
//
// On the web @capacitor/core is inert: Capacitor.isNativePlatform() is false
// and getPlatform() is "web", and nothing else in it runs.
//
// Mobile round Z (App-Centium docs/mobile-round-z/PLAN.md §3.2-3.3). The
// native implementations behind this layer (storage adapter, links, share,
// haptics, back button, keyboard) arrive in Phase 1 as Capacitor plugins.
import { Capacitor } from "@capacitor/core";

export type Platform = "web" | "ios" | "android";

/** True inside the iOS or Android app, false in any browser (PWA included). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Which shell the page runs in. */
export function platform(): Platform {
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}
