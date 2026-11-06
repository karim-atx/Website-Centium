import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { SettingsRow } from "../ui/SettingsRows";
import { useApp } from "../../context/AppContext";
import { isNative } from "../../platform";
import { calendar } from "../../platform/calendar";
import { calendarChanged } from "../../services/phone-calendar/bus";
import { openCalendarSettings } from "../../services/phone-calendar/settings";
import { t } from "../../i18n/core";

/**
 * Round J · J-2d, website PLAN.md §2.3: Settings › General › "Add to my
 * calendar", in the app only, where calendar_sync and this build allow it,
 * and never for a business account (it gets no events).
 *
 * - On: the phone's calendar prompt (calendar.enable()), then a sync.
 * - Access refused: "Calendar access is off · Open settings" (Centium's page
 *   in the phone's settings, calendar.openSettings()).
 * - Off: calendar.disable() removes the Centium calendar and its events.
 * The state is the phone's own (calendar.status()), read again when the app
 * comes back to the front.
 */
type State = { enabled: boolean; permission: "granted" | "denied" | "prompt" };

export function CalendarSyncRow() {
  const { user } = useApp();
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const business = user.accountType === "business";

  useEffect(() => {
    if (!isNative() || business) return;
    let live = true;
    const read = () =>
      void calendar
        .available()
        .then(async (a) => {
          if (!live) return;
          setAvailable(a.ok);
          if (a.ok) {
            const s = await calendar.status();
            if (live) setState(s);
          }
        })
        .catch(() => live && setAvailable(false));
    read();
    const onVisible = () => document.visibilityState === "visible" && read();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [business]);

  if (!available || business) return null;

  const on = !!state && state.enabled && state.permission === "granted";
  const denied = state?.permission === "denied";

  const toggle = async (next: boolean) => {
    setBusy(true);
    setNote(null);
    try {
      if (next) {
        const r = await calendar.enable();
        const s = await calendar.status();
        setState(s);
        if (r.granted) calendarChanged();
      } else {
        await calendar.disable();
        setState(await calendar.status());
        setNote(t("Removed from this phone's calendar."));
      }
    } catch {
      setNote(t("Couldn't save. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsRow
      icon={CalendarPlus}
      title={t("Add to my calendar")}
      subtitle={
        <span data-calendar-sync={on ? "on" : denied ? "denied" : "off"}>
          {denied && !on ? (
            <>
              {t("Calendar access is off")} ·{" "}
              <button type="button" onClick={() => void openCalendarSettings()} className="tap font-semibold underline">
                {t("Open settings")}
              </button>
            </>
          ) : (
            t("Your bookings, classes and appointments go into a Centium calendar on this phone. Changes and cancellations follow.")
          )}
          {note && (
            <span role="status" className="block mt-1">
              {note}
            </span>
          )}
        </span>
      }
      toggle={{ checked: on, disabled: busy || state === null, onChange: (v) => void toggle(v) }}
    />
  );
}
