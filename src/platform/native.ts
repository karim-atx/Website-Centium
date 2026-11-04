// The Centium app's own native code, as the website sees it.
//
// App-Centium registers one Capacitor plugin, "CentiumNative" (Android:
// android/app/src/main/java/org/atraxia/centium/CentiumNativePlugin.java).
// This is its typed proxy. On the web registerPlugin() returns a proxy whose
// every call rejects as unimplemented, so callers branch on isNative() first.
//
// Mobile round Z, Phase 1 (App-Centium docs/mobile-round-z/PLAN.md Z1.3, Z1.5).
import { registerPlugin } from "@capacitor/core";

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
}

export const CentiumNative = registerPlugin<CentiumNativePlugin>("CentiumNative");
