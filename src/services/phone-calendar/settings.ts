// Round J · J-2d: Centium's page in the phone's settings, where calendar
// access is allowed again after "Don't allow" (PLAN.md §2.3: "Calendar access
// is off · Open settings"). In the app only; does nothing in a browser.
import { isNative } from "../../platform";
import { calendar } from "../../platform/calendar";

export async function openCalendarSettings(): Promise<void> {
  if (!isNative()) return;
  try {
    await calendar.openSettings();
  } catch (e) {
    console.error("[calendar] Couldn't open the phone's settings:", e);
  }
}
