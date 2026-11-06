import React from "react";
import { Plus, Settings2 } from "lucide-react";
import { useWebLayout, WEB_CONTENT_MAX } from "../../web/useWebLayout";
import { useIsDark } from "../../../hooks/useIsDark";
import { eventColours } from "../../calendar/eventColour";
import { hourLabel12, range12 } from "../../../utils/time12";
import type { CalItem } from "../calendar/calendarItems";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

// Professional handover v1, WP-CA.1-.5 (WP-CA Calendar Web v4): the calendar
// from 1024px. A 64 page header (Calendar 28/36; Availability 40 and the
// primary New session 44), the view tabs and the period card, then the view:
// Month = the month grid 7 + the day's agenda 5; Week = a time grid from 6 AM
// to 10 PM, one column per day (four visible on the rail, the rest scroll),
// all-day items above, a now line; Day = the timeline 7 + requests 5; Year =
// mini months 6 across (4 on the rail). The parts are the repo's apart from
// the week time grid, which only the web draws. Mobile keeps its own page.

export const CalendarTopBarWeb: React.FC<{ clinical: boolean; onAvailability: () => void; onNew: () => void }> = ({ clinical, onAvailability, onNew }) => {
  const { rail } = useWebLayout();
  return (
    <header className="flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 12, paddingInline: rail ? 24 : 32, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
      <h1 className="flex-1 truncate" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", color: "#241F1B" }}>
        {t("Calendar")}
      </h1>
      <button
        type="button"
        onClick={onAvailability}
        className="flex items-center hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ height: 40, boxSizing: "border-box", padding: "0 16px", gap: 8, borderRadius: 12, border: "1px solid rgba(36,31,27,0.11)", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5B5349" }}
      >
        <Settings2 size={20} strokeWidth={2} aria-hidden />
        {t("Availability")}
      </button>
      <button
        type="button"
        onClick={onNew}
        className="flex items-center hover:bg-[#8E7FD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ height: 44, boxSizing: "border-box", padding: "0 18px", gap: 8, borderRadius: 14, background: "#9A8CD6", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
      >
        <Plus size={20} strokeWidth={2} aria-hidden />
        {clinical ? t("New appointment") : t("New session")}
      </button>
    </header>
  );
};

/** The page body (32 / 24 padding, the 2.1 cap). */
export const CalendarBodyWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rail } = useWebLayout();
  return (
    <div data-pro-web="calendar" style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: rail ? 24 : 32 }}>
      {children}
    </div>
  );
};

/** Two columns on the 12-column grid (8 on the rail): 7 + 5 (5 + 3). */
export const SplitWeb: React.FC<{ left: React.ReactNode; right: React.ReactNode }> = ({ left, right }) => {
  const { rail } = useWebLayout();
  const cols = rail ? 8 : 12;
  const l = rail ? 5 : 7;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, columnGap: 24, rowGap: 24, alignItems: "start" }}>
      <div style={{ gridColumn: `span ${l}`, minWidth: 0 }}>{left}</div>
      <div style={{ gridColumn: `span ${cols - l}`, minWidth: 0 }}>{right}</div>
    </div>
  );
};

const FIRST_HOUR = 6;
const LAST_HOUR = 22;
const HOUR_H = 56;
const minutesOf = (hhmm?: string) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

/**
 * WP-CA.2 Week: a plain white time grid, 6 AM to 10 PM (56 a hour), the hour
 * labels 11/16 in a 56 gutter, one column per day (header: day 13/20 caps,
 * date 22/30; today in accent), all-day items in a band above, events placed
 * by time (r10, the session's tint with its colour bar), a now line on today,
 * "Day off" on days without working hours. A day header opens Day.
 */
export const WeekTimeGridWeb: React.FC<{
  days: string[];
  todayIso: string;
  nowMinutes: number;
  items: Record<string, CalItem[]>;
  dayOff: (iso: string) => boolean;
  onDay: (iso: string) => void;
  onOpen: (i: CalItem) => void;
}> = ({ days, todayIso, nowMinutes, items, dayOff, onDay, onOpen }) => {
  const dark = useIsDark();
  const { rail } = useWebLayout();
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);
  const gridH = (LAST_HOUR - FIRST_HOUR) * HOUR_H;
  const y = (m: number) => ((Math.min(Math.max(m, FIRST_HOUR * 60), LAST_HOUR * 60) - FIRST_HOUR * 60) / 60) * HOUR_H;
  const colMin = rail ? "calc((100% - 56px) / 4)" : "minmax(120px,1fr)";
  const anyAllDay = days.some((d) => (items[d] ?? []).some((i) => i.allDay));
  const line = "1px solid rgba(36,31,27,0.06)";
  return (
    <section aria-label={t("Week")} style={{ overflowX: "auto", overflowY: "hidden", borderRadius: 20, border: "1px solid rgba(36,31,27,0.08)", background: "#FFFFFF" }}>
      <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${days.length}, ${rail ? colMin : "minmax(120px,1fr)"})`, minWidth: rail ? `calc(56px + ${days.length} * 160px)` : undefined }}>
        <div style={{ borderBottom: line }} />
        {days.map((iso) => {
          const d = new Date(`${iso}T00:00:00`);
          const today = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onDay(iso)}
              aria-label={d.toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" })}
              className="flex flex-col items-center hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ padding: "10px 4px", borderBottom: line, borderInlineStart: line }}
            >
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: today ? "#7D67D9" : "#8C8378" }}>
                {d.toLocaleDateString(appLocale("en-US"), { weekday: "short" })}
              </span>
              <span
                className="flex items-center justify-center"
                style={{ minWidth: 36, height: 36, borderRadius: 999, fontSize: 22, lineHeight: "30px", fontWeight: 700, background: today ? "#7D6BB5" : "transparent", color: today ? "#FFFFFF" : "#241F1B" }}
              >
                {d.getDate()}
              </span>
              {dayOff(iso) && (
                <span style={{ marginTop: 4, fontSize: 11, lineHeight: "16px", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#F5F5F6", color: "#8C8378" }}>{t("Day off")}</span>
              )}
            </button>
          );
        })}
        {anyAllDay && (
          <>
            <div style={{ fontSize: 11, lineHeight: "16px", fontWeight: 700, color: "#8C8378", padding: "8px 6px", borderBottom: line, textAlign: "end" }}>{t("All day")}</div>
            {days.map((iso) => (
              <div key={iso} className="flex flex-col" style={{ gap: 4, padding: 4, borderBottom: line, borderInlineStart: line }}>
                {(items[iso] ?? [])
                  .filter((i) => i.allDay)
                  .map((i) => {
                    const { tint, bar } = eventColours(i.colour, dark);
                    return (
                      <button key={i.key} type="button" onClick={() => onOpen(i)} className="truncate text-start" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: tint, color: "#241F1B", borderInlineStart: `3px solid ${bar}` }}>
                        {i.name ? `${i.name} · ${i.title}` : i.title}
                      </button>
                    );
                  })}
              </div>
            ))}
          </>
        )}
        <div className="relative" style={{ height: gridH }}>
          {hours.map((h) => (
            <span key={h} className="absolute" style={{ top: (h - FIRST_HOUR) * HOUR_H - 8, insetInlineEnd: 8, fontSize: 11, lineHeight: "16px", fontWeight: 700, color: "#8C8378" }}>
              {h === FIRST_HOUR ? "" : hourLabel12(h)}
            </span>
          ))}
        </div>
        {days.map((iso) => {
          const timed = (items[iso] ?? []).filter((i) => !i.allDay && minutesOf(i.start) !== null);
          return (
            <div key={iso} className="relative" style={{ height: gridH, borderInlineStart: line }}>
              {hours.slice(1).map((h) => (
                <div key={h} aria-hidden className="absolute inset-x-0" style={{ top: (h - FIRST_HOUR) * HOUR_H, borderTop: line }} />
              ))}
              {timed.map((i) => {
                const s = minutesOf(i.start)!;
                const e = minutesOf(i.end) ?? s + 60;
                const top = y(s);
                const h = Math.max(28, y(Math.max(e, s + 30)) - top);
                const { tint, bar } = eventColours(i.colour, dark);
                return (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => onOpen(i)}
                    title={`${i.name ? `${i.name} · ` : ""}${i.title} · ${range12(i.start, i.end)}`}
                    className="absolute overflow-hidden text-start hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
                    style={{ top: top + 1, height: h - 2, insetInline: 4, borderRadius: 10, background: tint, borderInlineStart: `3px solid ${bar}`, padding: "4px 8px", opacity: i.done ? 0.7 : 1 }}
                  >
                    <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#241F1B" }}>
                      {i.name ?? i.title}
                    </span>
                    {h >= 44 && (
                      <span className="block truncate" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "#5B5349" }}>
                        {range12(i.start, i.end)}
                      </span>
                    )}
                  </button>
                );
              })}
              {iso === todayIso && nowMinutes >= FIRST_HOUR * 60 && nowMinutes <= LAST_HOUR * 60 && (
                <div aria-hidden className="absolute inset-x-0" style={{ top: y(nowMinutes), height: 2, background: "#C0392B" }}>
                  <span className="absolute" style={{ insetInlineStart: -4, top: -3, width: 8, height: 8, borderRadius: 999, background: "#C0392B" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
