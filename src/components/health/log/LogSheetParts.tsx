import React from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { CalendarPickerSheet } from "../../dashboard/CalendarPickerSheet";
import { WheelPicker, type WheelOption } from "../../ui/WheelPicker";
import { useIsDark } from "../../../hooks/useIsDark";
import { clock12 } from "../../../utils/time12";
import { formatShortDate } from "../../../utils/date";
import { t } from "../../../i18n/core";

// The shared pieces of the Health B log sheets (HE1.1.1 water, HE1.6.1 blood
// pressure, HE1.7.1 weight; health-b-handover.md "Shared Log sheet"): field
// labels, the When field, the segmented control, the value box, and the
// "Measured on" date-time popup (HE1.6.1.a). Every value is the tables'
// literal; dark from the Dark column (* derived values recorded in the
// checklists).

/** 0.5px hairline at the given ink alpha (#241F1B light, #F5F3FA dark; 30% under High contrast via --hair-*). */
export function hairAt(dark: boolean, alpha: number): string {
  return dark ? `rgba(245,243,250,${alpha})` : `rgba(36,31,27,${alpha})`;
}

/** Field label: 12/16 600 #8C8378 (dark #B8B3C7), margin 0 0 6 2 (HE1.6.1 #60, #64, #69). */
export const FieldLabel: React.FC<{ children: React.ReactNode; htmlFor?: string; id?: string; style?: React.CSSProperties }> = ({
  children,
  htmlFor,
  id,
  style,
}) => (
  <label
    htmlFor={htmlFor}
    id={id}
    className="block text-charcoal-faint"
    style={{ marginBlock: "0 6px", marginInline: "2px 0", fontSize: textPx(12), lineHeight: "16px", fontWeight: 600, ...style }}
  >
    {children}
  </label>
);

/**
 * The When field (HE1.6.1 #65-#68): 44 tall, r12, pad 0 12, #F5F5F6 with a
 * 0.5px #241F1B@10% border (dark #242730 / #F5F3FA@10%), CalendarDays 15 and
 * ChevronDown 15 #8C8378, value 14/20 400. Opens the Measured on popup.
 */
export const WhenField: React.FC<{ value: string; onClick: () => void; ariaLabel?: string; icon?: React.ReactNode; style?: React.CSSProperties }> = ({
  value,
  onClick,
  ariaLabel,
  icon,
  style,
}) => {
  const dark = useIsDark();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="tap w-full flex items-center bg-cream-soft text-start"
      style={{ minHeight: 44, borderRadius: 12, padding: "0 12px", gap: 8, border: `0.5px solid ${hairAt(dark, 0.1)}`, ...style }}
    >
      {icon ?? <CalendarDays size={15} className="shrink-0 text-charcoal-faint" aria-hidden />}
      <span className="flex-1 min-w-0 truncate text-charcoal" style={{ fontSize: textPx(14), lineHeight: "20px", fontWeight: 400 }}>
        {value}
      </span>
      <ChevronDown size={15} className="shrink-0 text-charcoal-faint" aria-hidden />
    </button>
  );
};

/**
 * Segmented control (HE1.6.1 #61-#63): 44 tall, pad 4, r12, track #F3F3FD
 * (dark #303141); options 36 tall r9 12.5/18.8 700, gap 4; selected #A79AD5
 * white (dark #A991FE / #0D0B1A), idle #F5F4FE ink #5B5349 (dark #303141 /
 * #B8B3C7). Single select; tapping the selected option again clears it when
 * `clearable` (arm and position stay optional).
 */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  clearable,
  label,
}: {
  options: { value: V; label: string }[];
  value: V | null;
  onChange: (v: V | null) => void;
  clearable?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={t(label)} className="flex bg-th-f3f3fd dark:bg-th-303141" style={{ minHeight: 44, padding: 4, borderRadius: 12, gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on && clearable ? null : o.value)}
            className={`tap flex-1 min-w-0 flex items-center justify-center ${on ? "bg-seg-active" : "bg-th-f5f4fe dark:bg-th-303141"}`}
            style={{
              minHeight: 36,
              borderRadius: 9,
              fontSize: textPx(12.5),
              lineHeight: "18.8px",
              fontWeight: 700,
              color: on ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--c-charcoal-soft))",
            }}
          >
            {t(o.label)}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dates and times

const pad2 = (n: number) => String(n).padStart(2, "0");

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayFromIso(iso: string): Date {
  return new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
}

/** "Today" / "Yesterday" / "Sat, Oct 3" (HE1.6.1 #67 formats, date part). */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return t("Today");
  const y = dayFromIso(today);
  y.setDate(y.getDate() - 1);
  if (iso === isoDay(y)) return t("Yesterday");
  const d = dayFromIso(iso);
  return formatShortDate(d, { weekday: "short", day: "numeric", month: "short" });
}

/** "Today · 8:12 AM" / "Yesterday · 9:40 PM" / "Sat 3 Oct · 7:30 AM" (HE1.6.1 #67, 12-hour per D-04). */
export function whenLabel(d: Date, today: string): string {
  return `${dayLabel(isoDay(d), today)} · ${clock12(d)}`;
}

const HOURS: WheelOption<number>[] = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: pad2(i + 1) }));
const MERIDIEM: WheelOption<string>[] = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

/**
 * The Part B time wheel (HE1.6.1.a #86-#91, HE1.8.2 #56-#60): hours and
 * minutes in 70 × 40 bands with ":" between, rows 28.5 apart, plus an AM/PM
 * column (the board draws 24-hour; built 12-hour per D-04 / X-14). `maxTime`
 * greys later times on the same day (today: no future time).
 */
export const TimeWheel: React.FC<{
  value: { h: number; m: number };
  onChange: (v: { h: number; m: number }) => void;
  minuteStep?: number;
  /** Minutes since midnight after which times are disabled. */
  maxMinutes?: number;
}> = ({ value, onChange, minuteStep = 1, maxMinutes }) => {
  const h12 = value.h % 12 === 0 ? 12 : value.h % 12;
  const pm = value.h >= 12;
  const to24 = (h: number, isPm: boolean) => (h % 12) + (isPm ? 12 : 0);
  const over = (h24: number, m: number) => maxMinutes !== undefined && h24 * 60 + m > maxMinutes;
  const minutes: WheelOption<number>[] = [];
  for (let m = 0; m < 60; m += minuteStep) minutes.push({ value: m, label: pad2(m), disabled: over(value.h, m) });
  const hours = HOURS.map((o) => ({ ...o, disabled: over(to24(o.value, pm), 0) }));
  const mer = MERIDIEM.map((o) => ({ ...o, label: t(o.label), disabled: over(to24(h12, o.value === "PM"), 0) }));
  const minuteValue = minutes.some((o) => o.value === value.m) ? value.m : Math.floor(value.m / minuteStep) * minuteStep;
  return (
    <WheelPicker
      variant="partB"
      rowHeight={28.5}
      separator={{ text: ":", size: 22 }}
      columns={[
        { label: t("Hours"), options: hours, value: h12, bandWidth: 70, onChange: (v) => onChange({ h: to24(Number(v), pm), m: value.m }) },
        { label: t("Minutes"), options: minutes, value: minuteValue, bandWidth: 70, onChange: (v) => onChange({ h: value.h, m: Number(v) }) },
        { label: t("AM or PM"), options: mer, value: pm ? "PM" : "AM", bandWidth: 70, onChange: (v) => onChange({ h: to24(h12, v === "PM"), m: value.m }) },
      ]}
    />
  );
};

/**
 * HE1.6.1.a "Measured on": the Part B calendar card with the time wheel under
 * it; future days muted, and on today no time later than now. `dateOnly`
 * hides the wheel (the weigh-in fallback until its time is stored, PB-HB-43).
 */
export const MeasuredOnPopup: React.FC<{
  open: boolean;
  onClose: () => void;
  value: Date;
  today: string;
  onDone: (d: Date) => void;
  dateOnly?: boolean;
  title?: string;
}> = ({ open, onClose, value, today, onDone, dateOnly, title = t("Measured on") }) => {
  const [time, setTime] = React.useState({ h: value.getHours(), m: value.getMinutes() });
  const [wasOpen, setWasOpen] = React.useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setTime({ h: value.getHours(), m: value.getMinutes() });
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    <CalendarPickerSheet
      variant="partB"
      open={open}
      onClose={onClose}
      title={title}
      today={today}
      selectedDate={isoDay(value)}
      maxDate={today}
      onSelect={(iso) => {
        const d = dayFromIso(iso);
        if (dateOnly) {
          d.setHours(value.getHours(), value.getMinutes(), 0, 0);
        } else {
          let { h, m } = time;
          if (iso === today && h * 60 + m > nowMinutes) {
            h = now.getHours();
            m = now.getMinutes();
          }
          d.setHours(h, m, 0, 0);
        }
        onDone(d);
      }}
    >
      {dateOnly
        ? undefined
        : (pending: string) => <TimeWheel value={time} onChange={setTime} maxMinutes={pending === today ? nowMinutes : undefined} />}
    </CalendarPickerSheet>
  );
};

/**
 * The Part B Log sheet chrome colours (HE1.1.1 #65-#68, HE1.6.1 #51-#54,
 * HE1.8.2 #46-#49): the app's sheet band, border and body, with the title
 * in #7248F8 light and #A991FE dark (the app's dark sheet title is #C3B3FB;
 * the Health B tables draw #A991FE). Passed as BottomSheet `tone`.
 */
export function partBSheetTone(dark: boolean) {
  return {
    band: "var(--sheet-band)",
    border: "var(--sheet-border)",
    title: dark ? "#A991FE" : "var(--sheet-title)",
    body: "var(--sheet-body)",
  };
}
