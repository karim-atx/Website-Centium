// The Centium app's own native code, as the website sees it.
//
// App-Centium registers one Capacitor plugin, "CentiumNative" (Android:
// android/app/src/main/java/org/atraxia/centium/CentiumNativePlugin.java).
// This is its typed proxy. On the web registerPlugin() returns a proxy whose
// every call rejects as unimplemented, so callers branch on isNative() first.
//
// Mobile round Z, Phase 1 (App-Centium docs/mobile-round-z/PLAN.md Z1.3, Z1.5)
// and Round J (ROUND_J.md §1: open a path, the language, sign-out, features).
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * The native features of Round J, each its own module in src/platform/.
 * `available` answers per feature, so iOS can catch up one at a time.
 */
export type RoundJFeature =
  | "push"
  | "health"
  | "camera"
  | "widgets"
  | "shortcuts"
  | "calendar"
  | "sessions"
  // Round K (App-Centium ROUND_K.md §3, §4); "wallet" answers no until the Google Wallet build.
  | "biometrics"
  | "wallet";

export interface CentiumNativePlugin {
  /**
   * This install's own id: a random uuid made on first use and kept in the
   * app's private storage, out of backups, so a reinstall or a new phone is a
   * new install. Reported with report_app_install (DB-Z1); never put in the
   * user agent.
   */
  installId(): Promise<{ id: string }>;

  /**
   * Native Google sign-in (Android: Credential Manager, always with the
   * account chooser). `nonce` is the SHA-256 hex of the raw nonce that
   * signInWithIdToken is then given. Rejects with code "cancelled" when the
   * person closes the chooser.
   */
  googleSignIn(options: { serverClientId: string; nonce: string }): Promise<{ idToken: string }>;

  /**
   * Sign in with Apple, on the iPhone only (App-Centium IPHONE_ROUND_1.md §2).
   * `nonce` is the SHA-256 hex of the raw nonce, as for Google. Apple gives the
   * name on the first sign-in only. Rejects with code "cancelled" when the
   * person closes Apple's sheet.
   */
  appleSignIn(options: { nonce: string }): Promise<{ idToken: string; authorizationCode: string; givenName?: string; familyName?: string }>;

  /**
   * Whether this build has a Round J feature (false until its native half
   * exists on this platform). `reason` explains a false that the person can
   * fix, e.g. Health Connect needing an install or update.
   */
  available(options: { feature: RoundJFeature }): Promise<{ ok: boolean; reason?: string }>;

  /**
   * The path a widget, shortcut or notification opened the app on, held
   * from a cold start until the website is ready to ask; null when there is
   * none. Asking clears it.
   */
  takeLaunchPath(): Promise<{ path: string | null }>;

  /**
   * The phone's model ("Pixel 8") and maker, to name this phone in lists such
   * as the fingerprint keys (App-Centium ROUND_K.md §3.3). Never the name the
   * owner gave the phone. Missing on app builds before Round K.
   */
  deviceModel(): Promise<{ model: string; manufacturer: string }>;

  /** The app's language, for what Android draws itself: channel names, widgets, shortcuts. */
  setLanguage(options: { language: "en" | "ar" }): Promise<void>;

  /**
   * The website's Reduce motion setting, so what the phone draws itself
   * follows it too, as well as the phone's own "Remove animations"
   * (App-Centium ROUND_K.md §1.4).
   */
  setReducedMotion(options: { on: boolean }): Promise<void>;

  /**
   * The WebView's text size in percent: the phone's font size, at most `max`
   * (200). The website's "Larger text" goes on top of it, keeping the total
   * within `max` (ROUND_K.md D-ET1).
   */
  textZoom(): Promise<{ percent: number; max: number }>;

  /**
   * Sign-out, on the phone's side: the widget snapshot and shortcuts are
   * cleared and a running session stops. Health Connect access and the
   * Centium calendar are left as they are.
   */
  signedOut(): Promise<void>;

  /**
   * FX (App #31): whether a haptic may play now. Android: a vibrator, the
   * ringer not on silent and the system's touch feedback on; iOS: always,
   * since the phone mutes haptics itself under System Haptics. `reduced`:
   * the phone's Reduce Motion / Remove animations, or the website's Reduce
   * motion (setReducedMotion). Missing on builds before App #31.
   */
  hapticsAllowed(): Promise<{ allowed: boolean; reduced: boolean }>;

  /**
   * The app icon's badge (App-Centium #43): iOS sets it (0–99; missing or
   * negative clears it); Android resolves and does nothing. Missing on builds
   * before #43 (rejects "not implemented").
   */
  setBadge(options: { count: number }): Promise<void>;

  /** The phone's notification settings for Centium (its channels, and the switch the person turned off). */
  openNotificationSettings(): Promise<void>;

  /** A widget, shortcut or notification opened a path while the app was already running. */
  addListener(eventName: "openPath", listener: (event: { path: string }) => void): Promise<PluginListenerHandle>;

  /**
   * The phone's text size changed while the app was open (iOS, App-Centium
   * iPhone Round 1 PR 1); ask textZoom() again. Rejects on builds without it.
   */
  addListener(eventName: "textZoom", listener: () => void): Promise<PluginListenerHandle>;
}

export const CentiumNative = registerPlugin<CentiumNativePlugin>("CentiumNative");
