import { WheelPicker } from "../ui/WheelPicker";
import { ALL_MINUTES, fromParts, minutesOf, toParts, type Meridiem, type TimeParts } from "./calendarTime";
import { t } from "../../i18n/core";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MERIDIEMS: Meridiem[] = ["AM", "PM"];

/**
 * The shared 12-hour time wheel: Hours 1-12, Minutes 00-59 (FV: any minute),
 * AM / PM («ص/م» in Arabic). Value and onChange are "HH:MM" (24-hour). The
 * calendar's TimeField opens it under its field; the business staff hours and
 * the professional's form schedule open it under theirs.
 */
export function ClockWheel({
  value,
  onChange,
  notBefore,
  band,
}: {
  value: string;
  onChange: (hhmm: string) => void;
  /** Nothing earlier than this ("HH:MM") can be chosen. */
  notBefore?: string;
  band?: "default" | "business";
}) {
  const parts = toParts(value);
  const floor = notBefore ? minutesOf(notBefore) : -1;
  const tooEarly = (p: TimeParts) => minutesOf(fromParts(p)) < floor;
  const set = (p: Partial<TimeParts>) => {
    const next = { ...parts, ...p };
    if (!tooEarly(next)) onChange(fromParts(next));
  };
  return (
    <WheelPicker
      band={band}
      columns={[
        {
          label: t("Hours"),
          value: parts.hour,
          options: HOURS.map((h) => ({ value: h, label: String(h), disabled: tooEarly({ ...parts, hour: h }) })),
          onChange: (v) => set({ hour: Number(v) }),
        },
        {
          label: t("Minutes"),
          value: parts.minute,
          options: ALL_MINUTES.map((m) => ({
            value: m,
            label: String(m).padStart(2, "0"),
            disabled: tooEarly({ ...parts, minute: m }),
          })),
          onChange: (v) => set({ minute: Number(v) }),
        },
        {
          label: t("AM or PM"),
          value: parts.meridiem,
          options: MERIDIEMS.map((m) => ({ value: m, label: t(m), disabled: tooEarly({ ...parts, meridiem: m }) })),
          onChange: (v) => set({ meridiem: v as Meridiem }),
        },
      ]}
    />
  );
}
