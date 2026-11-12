import { useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { calendar } from "../../platform/calendar";
import { getCalendar } from "../../services/calendar";
import { fetchMyCalendar } from "../../services/calendar-sync";
import { fetchLockScreenDetails } from "../../services/preferences";
import { onCalendarChanged } from "../../services/phone-calendar/bus";
import { buildPhoneEvents, calendarWindow, eventsKey } from "../../services/phone-calendar/eventsModel";
import { t } from "../../i18n/core";

/**
 * Round J · J-2d (website PLAN.md §2.3; App-Centium ROUND_J.md §6): keeps the
 * phone's "Centium" calendar matching the account's bookings, accepted
 * places and own events (services/phone-calendar/eventsModel). Mounted once,
 * in the app only (App.tsx); does nothing unless the person turned "Add to my
 * calendar" on (calendar.status().enabled) and the calendar_sync switch and
 * this build allow it.
 *
 * Syncs when the app opens, when it comes back to the front, and after a
 * booking, a cancellation, an answered invitation or a change to the person's
 * own events (services/phone-calendar/bus). A change that arrives while a
 * sync is running syncs again once it ends. sync() rejecting
 * with "not_enabled" (turned off, or access withdrawn) just stops; Settings
 * shows the switch off. Never disables the calendar: sign-out leaves it on
 * the phone.
 *
 * The lists are the existing readers: getCalendar() (calendar_events,
 * including the rows a booking, hire or appointment made, and invitations),
 * my_calendar for a professional's classes (fetchMyCalendar), and
 * notification_lock_screen_details for the neutral titles.
 */
const SYNC_AFTER_MS = 1000;
let lastSynced: string | null = null;

export function PhoneCalendarSync() {
  const { authUserId, profileReady, user, today } = useApp();
  const ready = !!authUserId && profileReady && user.onboarded;
  const accountType = user.accountType;
  const running = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    if (!ready || !authUserId || accountType === "business") return;
    let live = true;
    let timer: number | undefined;

    const run = async () => {
      if (running.current) {
        again.current = true;
        return;
      }
      running.current = true;
      again.current = false;
      try {
        if (!(await calendar.available()).ok) return;
        const status = await calendar.status();
        if (!status.enabled || status.permission !== "granted") return;
        const { from, to } = calendarWindow(today);
        const [own, taught, lock] = await Promise.all([
          getCalendar(authUserId),
          accountType === "professional" ? fetchMyCalendar(from, to) : Promise.resolve(null),
          fetchLockScreenDetails(),
        ]);
        // A failed read never empties the phone's calendar.
        if (!live || !own.ok || (taught && !taught.ok)) return;
        const events = buildPhoneEvents({
          accountType,
          today,
          booked: own.events,
          taught: taught && taught.ok ? taught.value : null,
          // Unknown reads as hidden, the safer of the two.
          hideDetails: lock.status === "ok" ? !lock.details : true,
          neutralTitle: t("Centium booking"),
          neutralEventTitle: t("Centium event"),
          exceptions: own.exceptions,
        });
        const key = `${authUserId}:${eventsKey(events)}`;
        if (key === lastSynced) return;
        await calendar.sync(events);
        lastSynced = key;
      } catch (e) {
        if ((e as { code?: string })?.code !== "not_enabled") console.warn("[calendar]", e);
      } finally {
        running.current = false;
        // Something changed mid-sync: read and sync once more.
        if (again.current && live) {
          lastSynced = null;
          soon();
        }
      }
    };
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), SYNC_AFTER_MS);
    };

    soon();
    const onVisible = () => document.visibilityState === "visible" && soon();
    document.addEventListener("visibilitychange", onVisible);
    const off = onCalendarChanged(() => {
      // An event changed: sync even if the list looks the same as last time.
      lastSynced = null;
      soon();
    });
    return () => {
      live = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      off();
    };
  }, [ready, authUserId, accountType, today]);

  return null;
}

