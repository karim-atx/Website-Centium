// The one place the website asks "am I running inside the Centium desktop app?"
//
// Desktop-Centium (karim-atx/Desktop-Centium) is a Tauri shell that opens this
// website's /app in a window of its own. It is the web build, not the phone
// app: isNative() stays false, the service worker registers as in a browser,
// and everything works as on the web unless a branch here says otherwise.
//
// The shell injects `window.centiumDesktop` before any script of ours runs,
// and only on this origin (Desktop-Centium src-tauri/src/bridge.rs, which
// docs/website-contract.md there describes). Its presence is the whole test:
// no user-agent sniffing. Every desktop branch goes through this module, so
// they can all be found by searching for it.
//
// WHAT CHANGES ON DESKTOP, and why:
//   - Google sign-in opens the default browser (Google refuses its sign-in
//     page inside an embedded browser) and comes back by centium://
//     (services/auth signInWithGoogle).
//   - Notifications are Windows notifications, not Web Push, which an embedded
//     browser can't receive (useDesktopNotifications, services/push).
//   - Notification settings show Windows' answer, link to Windows' settings,
//     and offer "Start Centium when I sign in" (settings/NotificationsPage).
//   - A click on a notification routes inside the app (DesktopOpenRoutes).

/** A notification as the shell shows it. `path` is an /app path for the click. */
export interface DesktopNotice {
  title: string;
  body?: string | null;
  path?: string | null;
  /** The same tag replaces an earlier notification instead of stacking. */
  tag?: string | null;
}

/** window.centiumDesktop, as the shell defines it. */
export interface CentiumDesktop {
  platform: "windows" | "macos";
  version: string;
  openExternal(url: string): Promise<void>;
  openNotificationSettings(): Promise<void>;
  notify(notice: DesktopNotice): Promise<void>;
  notificationsEnabled(): Promise<boolean>;
  getAutostart(): Promise<boolean>;
  setAutostart(on: boolean): Promise<boolean>;
  /** The router, for notification clicks; without one the shell reloads the page. */
  onOpen(handler: ((path: string) => void) | null): void;
}

declare global {
  interface Window {
    centiumDesktop?: CentiumDesktop;
  }
}

/** The bridge, or null in a browser, the installed PWA and the phone app. */
export function desktop(): CentiumDesktop | null {
  // globalThis rather than window: this module is also compiled for the tests,
  // which have no DOM.
  return (globalThis as { centiumDesktop?: CentiumDesktop }).centiumDesktop ?? null;
}

/** True inside the Centium desktop app. */
export function isDesktop(): boolean {
  return desktop() !== null;
}

/** Where Google sends a desktop sign-in back to (the shell's deep link). */
export const DESKTOP_AUTH_RETURN = "centium://auth/callback";
