// Calendar sync on the phone (App-Centium ROUND_J.md §6): opt-in and
// one-way, into a phone-only "Centium" calendar that is synced nowhere, so
// nothing leaves the phone.
//
// The website builds the list (bookings, classes, appointments and hires for
// the next 90 days and the past 7; nothing for business accounts) and its
// titles: "Centium booking" for every event while "Hide details on lock
// screen" is on (D16). The phone only writes it: sync() adds, moves and
// removes events to match, so a cancelled booking disappears.
//
// Turning it off removes the calendar and its events. A sign-out leaves it,
// since it belongs to the phone's owner; the next account starts with sync off
// in its own settings and turns it on again if it wants.
//
// Shown only where all three agree: the app, the "calendar_sync" switch
// (app_config), and a build that has the feature.
import { registerPlugin } from "@capacitor/core";
import { nativeFeatureOn } from "./appConfig";
import type { CalendarModule, PhoneCalendarEvent } from "./contracts";
import { featureAvailable } from "./features";

interface CentiumCalendarPlugin {
  status(): Promise<{ enabled: boolean; permission: "granted" | "denied" | "prompt" }>;
  enable(): Promise<{ granted: boolean }>;
  disable(): Promise<void>;
  sync(options: { events: PhoneCalendarEvent[] }): Promise<{ added: number; updated: number; removed: number }>;
}

const CentiumCalendar = registerPlugin<CentiumCalendarPlugin>("CentiumCalendar");

export const calendar: CalendarModule = {
  async available() {
    const a = await featureAvailable("calendar");
    return { ok: a.ok && nativeFeatureOn("calendar_sync") };
  },
  status: () => CentiumCalendar.status(),
  enable: () => CentiumCalendar.enable(),
  disable: () => CentiumCalendar.disable(),
  /** Rejects with code "not_enabled" when sync is off or calendar access was withdrawn. */
  sync: (events) => CentiumCalendar.sync({ events }),
};
