// Where "Continue with Google" is offered.
//
// EVERYWHERE, the iPhone included since iPhone Round 1 PR 2 (App-Centium
// IPHONE_ROUND_1.md §3, D-R1-3). The iPhone app signs in with Google's own
// iOS sign-in (GoogleSignIn-iOS), and it came back in the same release as
// Sign in with Apple, which the App Store asks for wherever another account
// sign-in is offered (guideline 4.8). Website #118 had hidden it on the
// iPhone until then.
import type { Platform } from "./index";

export function googleSignInOfferedOn(_platform: Platform): boolean {
  return true;
}
