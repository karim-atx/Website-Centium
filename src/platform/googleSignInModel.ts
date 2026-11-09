// Where "Continue with Google" is offered.
//
// NOT ON THE iPHONE YET. In the phone app Google's sign-in page can't run in
// the WebView, so the app asks the phone's own Google sign-in for an ID token
// (services/auth signInWithGoogleNative). That native half exists on Android
// only; on iOS the call fails. The App Store also asks for Sign in with Apple
// wherever another account sign-in is offered, so the two arrive together in
// iPhone Round 1 (Karim, 2026-11-09). Until then the iPhone shows email only.
//
// The web, the Android app and the desktop app keep the button.
import type { Platform } from "./index";

export function googleSignInOfferedOn(platform: Platform): boolean {
  return platform !== "ios";
}
