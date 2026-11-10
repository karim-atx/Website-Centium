// Where "Continue with Apple" is offered (App-Centium IPHONE_ROUND_1.md §2,
// D-R1-1): the iPhone app, through Apple's own sheet, and the website, through
// Supabase's Apple redirect. Not yet in the Android app or the desktop app,
// which would need Apple's web sign-in in a browser (a later round).
//
// THE WEBSITE WAITS FOR PRODUCTION. Its redirect needs the hosted project's
// Apple provider (the Services ID org.atraxia.centium.web, the Sign in with
// Apple key, the client secret). Until Karim has set those up, a web visitor
// tapping the button would get Supabase's "provider is not enabled". So the
// web button shows only in a build with NEXT_PUBLIC_APPLE_SIGN_IN_WEB=1, set
// in the website's build settings once production is ready (AuthStep reads it
// and passes it in). The iPhone app needs no switch: only TestFlight testers
// reach it.
import type { Platform } from "./index";

export function appleSignInOfferedOn(platform: Platform, desktopApp: boolean, webReady: boolean): boolean {
  if (desktopApp) return false;
  if (platform === "ios") return true;
  return platform === "web" && webReady;
}
