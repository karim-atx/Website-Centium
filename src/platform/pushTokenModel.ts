// The push token as the server keeps it.
//
// iOS: Capacitor's push plugin hands over the APNs token as UPPERCASE hex
// (String(format: "%02X")), and register_push_device stores it lowercased
// (DB-Z3). Kept uppercase here, the check that follows a registration
// (nativePushRegistered: push_devices.token = the stored token) never found
// the row the server had just written, so the iPhone said "Couldn't register
// for notifications." with permission granted and the device registered
// (TestFlight, 2026-11-10). So it's lowercased the moment it arrives, and the
// stored copy, the record and every lookup match the server.
// Android: an FCM token is case-sensitive and stays as it is.
import type { Platform } from "./index";

export function serverPushToken(platform: Platform, token: string): string {
  const t = token.trim();
  return platform === "ios" ? t.toLowerCase() : t;
}
