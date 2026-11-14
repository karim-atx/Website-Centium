import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff } from "lucide-react";
import clsx from "clsx";
import { ClockWheel } from "../calendar/ClockWheel";
import { DEFAULT_REMINDER, type HabitRemindersOff } from "../../services/habits/reminder";
import { time12 } from "../../utils/time12";
import { textPx } from "../../theme/textSize";
import { t, tk } from "../../i18n/core";

// Batch D FZ: a habit's optional daily reminder, in the add / edit panel of
// Mind › Habits (mobile and web). The server sends the push at this time in
// the member's profile time zone; this only picks and clears the time.
//
// TWO CHOICES: "No reminder" (null) or a time. Choosing a time starts at
// DEFAULT_REMINDER and opens the shared 12-hour wheel (ClockWheel, «ص/م» in
// Arabic) inside the panel, so the pinned mobile panel grows instead of
// dropping a wheel below the screen. The wheel updates the value as it turns;
// the time chip closes it again.

const OFF_LINE: Record<Exclude<HabitRemindersOff, null>, string> = {
  all: tk("Notifications are off."),
  paused: tk("Reminders are paused."),
  habits: tk("Habit reminders are off."),
};

export function HabitReminderField({
  value,
  onChange,
  off,
  variant,
}: {
  /** "HH:MM", or null for no reminder. */
  value: string | null;
  onChange: (next: string | null) => void;
  off: HabitRemindersOff;
  variant: "mobile" | "web";
}) {
  const navigate = useNavigate();
  const [wheel, setWheel] = useState(false);
  const web = variant === "web";
  const chooseTime = () => {
    if (value === null) {
      onChange(DEFAULT_REMINDER);
      setWheel(true);
    } else setWheel((w) => !w);
  };
  const clear = () => {
    onChange(null);
    setWheel(false);
  };

  // Mobile: the panel's suggestion chips (26 tall, 12/18 600); web: its 36 r10 chips.
  const chip = (selected: boolean) =>
    web
      ? {
          className: "mind-web-focus flex items-center whitespace-nowrap",
          style: {
            flex: "none",
            height: 36,
            gap: 6,
            padding: "0 12px",
            borderRadius: 10,
            background: selected ? "#F0EDF9" : "#F5F5F6",
            outline: selected ? "2px solid #AEA1DC" : "none",
            outlineOffset: -2,
            fontSize: 13,
            fontWeight: 600,
            color: selected ? "#241F1B" : "#5B5349",
          } as CSSProperties,
        }
      : {
          className: clsx(
            "tap shrink-0 flex items-center gap-1.5 h-[26px] rounded-full px-3 text-[12px] leading-[18px] font-semibold",
            selected ? "bg-primary-pale text-primary-dark dark:text-primary-deep-text ring-2 ring-inset ring-primary" : "bg-cream-soft text-charcoal-soft"
          ),
          style: undefined,
        };

  const none = chip(value === null);
  const time = chip(value !== null);
  return (
    <div data-habit-reminder className={web ? undefined : "mt-2.5 pe-3.5"}>
      {web ? (
        <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#71685E" }}>{t("Reminder")}</p>
      ) : (
        // As the panel's "Icon" label (9/13.5 700, 1.8 tracking, uppercase).
        <p className="mb-[5px] text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.63]">{t("Reminder")}</p>
      )}
      <div role="group" aria-label={t("Reminder")} className="flex items-center flex-wrap" style={{ gap: 8 }}>
        <button type="button" onClick={clear} aria-pressed={value === null} className={none.className} style={none.style}>
          <BellOff size={web ? 16 : 13} aria-hidden className={web ? undefined : "text-charcoal-faint"} color={web ? "#71685E" : undefined} />
          {t("No reminder")}
        </button>
        <button
          type="button"
          onClick={chooseTime}
          aria-pressed={value !== null}
          aria-expanded={value !== null ? wheel : undefined}
          aria-label={value !== null ? t("Reminder at {time}. Change the time", { time: time12(value) }) : t("Remind me every day")}
          className={time.className}
          style={time.style}
        >
          <Bell size={web ? 16 : 13} aria-hidden className={web ? undefined : "text-primary-dark dark:text-primary-deep-text"} color={web ? "#7D6BB5" : undefined} />
          <span className="tabular-nums">{value !== null ? time12(value) : t("Remind me every day")}</span>
        </button>
      </div>
      {value !== null && wheel && (
        <div
          className={web ? undefined : "mt-1.5 rounded-2xl bg-cream-card border border-team-nav-accent/[0.22] p-1.5"}
          style={web ? { marginTop: 8, maxWidth: 320, borderRadius: 16, border: "1px solid rgba(36,31,27,0.1)", padding: 6 } : undefined}
        >
          <ClockWheel value={value} onChange={onChange} />
        </div>
      )}
      {/* FZ: the time is saved, but the switches would stop the push: the
          same line and link health-check reminders show (NotificationsOffLine),
          with the reason. */}
      {value !== null && off && (
        <p
          data-habit-reminder-off
          className="flex items-center flex-wrap bg-cream-soft text-charcoal-soft"
          style={{ margin: "8px 0 0", borderRadius: 12, padding: "10px 12px", gap: 6, fontSize: web ? 13 : textPx(12), lineHeight: web ? "20px" : "17.4px" }}
        >
          <BellOff size={14} aria-hidden className="shrink-0" />
          <span>{t(OFF_LINE[off])}</span>
          <button
            type="button"
            onClick={() => navigate("/app/settings/notifications")}
            className="tap text-th-7d6bb5 dark:text-primary-deep-text"
            style={{ fontWeight: 700, minHeight: 24 }}
          >
            {t("Turn on ›")}
          </button>
        </p>
      )}
    </div>
  );
}
