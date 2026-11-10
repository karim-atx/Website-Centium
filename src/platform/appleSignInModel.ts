// Where "Continue with Apple" is offered (App-Centium IPHONE_ROUND_1.md §2,
// D-R1-1): the iPhone app, through Apple's own sheet, and the website, through
// Supabase's Apple redirect. Not yet in the Android app or the desktop app,
// which would need Apple's web sign-in in a browser (a later round).
import type { Platform } from "./index";

export function appleSignInOfferedOn(platform: Platform, desktopApp: boolean): boolean {
  if (desktopApp) return false;
  return platform === "ios" || platform === "web";
}
