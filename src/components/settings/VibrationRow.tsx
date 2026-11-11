import { useState } from "react";
import { Vibrate } from "lucide-react";
import { SettingsRow } from "../ui/SettingsRows";
import { setVibrationOn, vibrationOn } from "../../platform/haptics";
import { openPushSettings } from "../../services/push";
import { t } from "../../i18n/core";

// FX item 30: the "Vibration" switch, in Settings › Notifications › On this
// phone (shown wherever that section is: the phone app). Device-local and on
// by default (platform/haptics.ts): it governs Centium's own haptics while it
// is open (banner taps, the call ring, achievement celebrations) and the
// scanners' and EMOM beeper's vibration. A notification that arrives while
// Centium is closed vibrates as the phone's own settings say (neither iOS nor
// Android lets a push turn its vibration off on its own), so the line links
// there.
//
// One control, role switch (FP): the row is the switch; "Open settings" in
// the subtitle keeps its own tap (inner, as CalendarSyncRow).
export function VibrationRow() {
  const [on, setOn] = useState(vibrationOn);
  return (
    <SettingsRow
      icon={Vibrate}
      title={t("Vibration")}
      subtitle={
        <span data-vibration={on ? "on" : "off"}>
          {t("A tap for banners and calls, and a buzz for achievements.")}{" "}
          {t("Notifications outside Centium vibrate as your phone's settings say.")} ·{" "}
          <button type="button" onClick={() => void openPushSettings()} className="tap font-semibold underline">
            {t("Open settings")}
          </button>
        </span>
      }
      toggle={{
        checked: on,
        onChange: (v) => {
          setVibrationOn(v);
          setOn(v);
        },
        inner: true,
      }}
    />
  );
}
