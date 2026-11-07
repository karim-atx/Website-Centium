import React, { useEffect, useRef } from "react";
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, MapPin, Moon, Plus, Settings2, Video, X } from "lucide-react";
import { useWebLayout, WEB_CONTENT_MAX } from "../../web/useWebLayout";
import { useIsDark } from "../../../hooks/useIsDark";
import { eventColours } from "../../calendar/eventColour";
import { hourLabel12, range12 } from "../../../utils/time12";
import { JumpToToday } from "../../ui/JumpToToday";
import { weekdayNarrow } from "../proDates";
import { primaryLine, REQUEST_GOLD, type CalItem } from "../calendar/calendarItems";
import { appLocale } from "../../../i18n/format";
import { t, tn } from "../../../i18n/core";

// Professional handover v1, WP-CA.1-.3 (WP-CA Calendar Web v4.dc.html, the
// markup's W tokens): the calendar from 1024px. The 64 header (Calendar 28/36,
// two round 40 buttons: Availability and session types, and New session), the
// view tabs across the page (40, 16 below), then the view in the page's
// height: Month = the month card 7 (5 on the rail; r20, padding 20, its own
// 44 period card inside, cells filling the card) + the day's agenda 5 (3);
// Week = the 44 period card, then a time grid 6 AM - 10 PM (44 a hour, 36 on
// the rail), all seven days in the card; Day = the period card, Requests,
// then the timeline. Mobile keeps its own page.

const LINE = "1px solid rgba(36,31,27,0.06)";

export const CalendarTopBarWeb: React.FC<{ clinical: boolean; onAvailability: () => void; onNew: () => void }> = ({ clinical, onAvailability, onNew }) => {
  const { rail } = useWebLayout();
  const newLabel = clinical ? t("New appointment") : t("New session");
  return (
    <header className="flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 12, paddingInline: rail ? 24 : 32, borderBottom: LINE }}>
      <h1 className="flex-1 truncate" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>
        {t("Calendar")}
      </h1>
      <button
        type="button"
        onClick={onAvailability}
        aria-label={t("Availability and session types")}
        title={t("Availability and session types")}
        className="flex shrink-0 items-center justify-center hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)", color: "#5B5349" }}
      >
        <Settings2 size={20} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onNew}
        aria-label={newLabel}
        title={newLabel}
        className="flex shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 40, height: 40, borderRadius: 999, background: "linear-gradient(150deg,#aea1dc,#6f5fa6)", color: "#FFFFFF" }}
      >
        <Plus size={20} strokeWidth={2} aria-hidden />
      </button>
    </header>
  );
};

/** The page body: the page's height under the 64 header, padding 32 (24 on the rail), the 2.1 cap. */
export const CalendarBodyWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rail } = useWebLayout();
  return (
    <div
      data-pro-web="calendar"
      className="flex flex-col"
      style={{ maxWidth: WEB_CONTENT_MAX, height: "calc(100dvh - 64px)", minHeight: 560, boxSizing: "border-box", padding: `32px ${rail ? 24 : 32}px` }}
    >
      {children}
    </div>
  );
};

/** The 44 period card (r16, #F6F4FE; 32 arrow boxes with the 20 chevrons, the label 17 / 600). */
export const PeriodCardWeb: React.FC<{
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  jump?: (() => void) | null;
  mb?: number;
}> = ({ label, onPrev, onNext, prevLabel, nextLabel, jump, mb = 0 }) => (
  <div className="flex shrink-0 items-center" style={{ gap: 8, borderRadius: 16, height: 44, padding: "0 12px", background: "#F6F4FE", marginBottom: mb }}>
    <button type="button" onClick={onPrev} aria-label={prevLabel} className="flex shrink-0 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ width: 32, height: 32, color: "#5B3FE4" }}>
      <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
    </button>
    <p className="min-w-0 flex-1 truncate text-center" style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#241F1B" }}>
      {label}
    </p>
    {jump && <JumpToToday onClick={jump} />}
    <button type="button" onClick={onNext} aria-label={nextLabel} className="flex shrink-0 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ width: 32, height: 32, color: "#5B3FE4" }}>
      <ChevronRight size={20} strokeWidth={2.2} aria-hidden />
    </button>
  </div>
);

/** The month grid 7 + the agenda 5 on the 12-column grid (5 + 3 of 8 on the rail), 24 apart, filling the page's height. */
export const MonthSplitWeb: React.FC<{ left: React.ReactNode; right: React.ReactNode }> = ({ left, right }) => {
  const { rail } = useWebLayout();
  return (
    <div className="min-h-0 flex-1" style={{ display: "grid", gridTemplateColumns: `repeat(${rail ? 8 : 12},minmax(0,1fr))`, columnGap: 24 }}>
      <div className="flex min-h-0 min-w-0 flex-col" style={{ gridColumn: `span ${rail ? 5 : 7}` }}>
        {left}
      </div>
      <section aria-label={t("Day agenda")} className="flex min-h-0 min-w-0 flex-col" style={{ gridColumn: `span ${rail ? 3 : 5}` }}>
        {right}
      </section>
    </div>
  );
};

/** The markup's eyebrow: 13/20 700, .08em, caps, rgba(36,31,27,0.42), 12 below. */
export const EyebrowWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="shrink-0" style={{ margin: "0 0 12px", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(36,31,27,0.42)" }}>
    {children}
  </p>
);

const SESSION_DOT = "#6F9993";
const CLASS_DOT = "#667BB1";

/**
 * WP-CA.1 the month card: r20, the 0.16 lavender border, padding 20; the 44
 * period card; letters 31 high 15 / 600 #5B3FE4 (10 above, 4 below); the
 * cells share the card's height (gap 4, r10, the date 17, the 6 dots 6
 * apart; selected #9A8CD6 with white); the legend 13/20 under a rule.
 */
export const MonthCardWeb: React.FC<{
  label: string;
  onPrev: () => void;
  onNext: () => void;
  jump?: (() => void) | null;
  year: number;
  month: number;
  todayIso: string;
  selected: string;
  dots: (iso: string) => { own: boolean; cls: boolean };
  hiredLive: boolean;
  dayOff: (iso: string) => boolean;
  leading: number;
  onSelect: (iso: string) => void;
}> = ({ label, onPrev, onNext, jump, year, month, todayIso, selected, dots, hiredLive, dayOff, leading, onSelect }) => {
  const days = new Date(year, month + 1, 0).getDate();
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const firstOff = Array.from({ length: days }, (_, i) => i + 1).find((d) => dayOff(iso(d)));
  const anyClass = Array.from({ length: days }, (_, i) => i + 1).some((d) => dots(iso(d)).cls);
  const trailing = (7 - ((leading + days) % 7)) % 7;
  return (
    <section aria-label={t("Month")} className="flex min-h-0 flex-1 flex-col" style={{ boxSizing: "border-box", borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(143,104,246,0.16)", padding: 20 }}>
      <PeriodCardWeb label={label} onPrev={onPrev} onNext={onNext} prevLabel={t("Previous month")} nextLabel={t("Next month")} jump={jump} />
      <div className="grid shrink-0 grid-cols-7" style={{ gap: 2, margin: "10px 0 4px" }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: 31, fontSize: 15, fontWeight: 600, color: "#5B3FE4" }}>
            {weekdayNarrow(i)}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7" style={{ gridAutoRows: "minmax(0,1fr)", gap: 4 }}>
        {Array.from({ length: leading }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const id = iso(d);
          const sel = id === selected;
          const off = dayOff(id);
          const dot = dots(id);
          return (
            <button
              key={id}
              type="button"
              data-today={id === todayIso || undefined}
              onClick={() => onSelect(id)}
              aria-pressed={sel}
              aria-label={[new Date(`${id}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" }), dot.own ? t("sessions booked") : null, dot.cls ? (hiredLive ? t("hired classes") : t("classes")) : null, off ? t("day off") : null].filter(Boolean).join(t(", "))}
              className={`flex min-h-0 min-w-0 flex-col items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8] ${sel ? "" : "hover:bg-[#F6F4FE]"}`}
              style={{ gap: 6, borderRadius: 10, fontSize: 17, fontWeight: sel ? 600 : 500, background: sel ? "#9A8CD6" : id === todayIso ? "rgba(174,161,220,0.16)" : "transparent", color: sel ? "#FFFFFF" : off ? "#A79E93" : "#241F1B" }}
            >
              <span>{d}</span>
              <span aria-hidden className="flex" style={{ gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: dot.own ? (sel ? "#FFFFFF" : SESSION_DOT) : "transparent" }} />
                {dot.cls && <span style={{ width: 6, height: 6, borderRadius: 999, background: sel ? "#FFFFFF" : CLASS_DOT }} />}
              </span>
            </button>
          );
        })}
        {Array.from({ length: trailing }, (_, i) => (
          <div key={`a${i}`} />
        ))}
      </div>
      <div className="flex shrink-0 flex-wrap" style={{ gap: 14, marginTop: 10, paddingTop: 10, borderTop: LINE, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
        <span className="flex items-center whitespace-nowrap" style={{ gap: 6 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: SESSION_DOT }} />
          {t("Sessions booked")}
        </span>
        {anyClass && (
          <span className="flex items-center whitespace-nowrap" style={{ gap: 6 }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: CLASS_DOT }} />
            {hiredLive ? t("Hired classes") : t("Classes")}
          </span>
        )}
        {firstOff && (
          <span className="flex items-center whitespace-nowrap" style={{ gap: 6 }}>
            <span aria-hidden style={{ fontWeight: 700, color: "#A79E93" }}>
              {firstOff}
            </span>
            {t("Greyed: day off")}
          </span>
        )}
      </div>
    </section>
  );
};

/**
 * WP-CA.1 an agenda card on web: r15, padding 12 20, 14 apart, the 4 bar, the
 * title 22/30 600, the time and place 17/24 500 with their 16 icons in the
 * bar's colour, the badge 13/20 600. Classes keep the repo's ticket.
 */
export const AgendaCardWeb: React.FC<{ item: CalItem; onOpen: (i: CalItem) => void }> = ({ item, onOpen }) => {
  const dark = useIsDark();
  const { tint, bar } = eventColours(item.colour, dark);
  const time = item.allDay ? t("All day") : range12(item.start, item.end);
  const title = item.kind === "request" ? (item.name ? t("Request · {name} wants this slot", { name: item.name }) : t("Request · {title}", { title: item.title })) : primaryLine(item);
  const online = !!item.place && /^online$/i.test(item.place);
  const badge =
    item.badge === "completed" ? { text: t("Completed"), ink: "#3F9165", icon: <Check size={16} strokeWidth={2.4} aria-hidden /> }
    : item.badge === "request" ? { text: t("Request"), ink: "#9A7424", icon: null }
    : item.badge === "followup" ? { text: t("Follow-up"), ink: "#5B5349", icon: null }
    : item.badge === "invitation" ? { text: t("Invitation"), ink: "#9A7424", icon: null }
    : item.badge === "going" ? { text: t("Going"), ink: "#5F5093", icon: null }
    : item.badge === "declined" ? { text: t("Declined"), ink: "#8C8378", icon: null }
    : item.badge === "scheduled" ? { text: t("Scheduled for a client"), ink: "#3E6E68", icon: null }
    : null;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full shrink-0 items-center text-start hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
      style={{ boxSizing: "border-box", gap: 14, borderRadius: 15, padding: "12px 20px", background: tint, opacity: item.badge === "declined" ? 0.6 : 1 }}
    >
      <span aria-hidden style={{ width: 4, alignSelf: "stretch", minHeight: 32, borderRadius: 999, background: bar, flexShrink: 0 }} />
      <span className="flex min-w-0 flex-1 flex-col" style={{ gap: 8 }}>
        <span className="block" style={{ fontSize: 22, lineHeight: "30px", fontWeight: 600, color: "#241F1B" }}>
          {title}
        </span>
        <span className="flex flex-wrap items-center" style={{ columnGap: 16, rowGap: 4, fontSize: 17, lineHeight: "24px", fontWeight: 500 }}>
          <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 6, color: "#241F1B" }}>
            <Clock size={16} strokeWidth={2} color={bar} aria-hidden />
            {time}
          </span>
          {item.place && (
            <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 6, color: "#5B5349" }}>
              {online ? <Video size={16} strokeWidth={2} color={bar} aria-hidden /> : <MapPin size={16} strokeWidth={2} color={bar} aria-hidden />}
              {item.place}
            </span>
          )}
        </span>
      </span>
      {badge && (
        <span className="flex shrink-0 items-center whitespace-nowrap" style={{ gap: 4, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: badge.ink }}>
          {badge.icon}
          {badge.text}
        </span>
      )}
    </button>
  );
};

/**
 * WP-CA.3 a booking request on web: r22, padding 16 24, the gold at 16% with
 * its 3 bar; the name 17/24 600 and the time 13/20 beside Decline and Accept
 * (a 360 pair of 40 buttons, r16, 15/24 600, the 18 icons), 16 below.
 */
export const RequestCardWeb: React.FC<{ item: CalItem; busy: boolean; onAccept: () => void; onDecline: () => void }> = ({ item, busy, onAccept, onDecline }) => {
  const who = item.name ?? t("Someone new");
  const btn: React.CSSProperties = { height: 40, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600 };
  return (
    <div className="flex shrink-0 items-center" style={{ boxSizing: "border-box", borderRadius: 22, padding: "16px 24px", background: `${REQUEST_GOLD}29`, borderInlineStart: `3px solid ${REQUEST_GOLD}`, marginBottom: 16, gap: 24 }}>
      <div className="flex min-w-0 flex-1 justify-between" style={{ gap: 10 }}>
        <div className="min-w-0">
          <p className="truncate" style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{`${who} · ${item.title}`}</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{range12(item.start, item.end)}</p>
        </div>
        <span className="shrink-0" style={{ fontSize: 13, fontWeight: 600, color: "#9A7424" }}>
          {t("Request")}
        </span>
      </div>
      <div className="shrink-0" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, width: 360 }}>
        <button type="button" disabled={busy} onClick={onDecline} aria-label={t("Decline {who}'s booking request", { who })} className="hover:bg-[#E7E2F6] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ ...btn, background: "#F0EDF9", color: "#5F5093" }}>
          <X size={18} strokeWidth={2} aria-hidden />
          {t("Decline")}
        </button>
        <button type="button" disabled={busy} onClick={onAccept} aria-label={t("Accept {who}'s booking request", { who })} className="hover:bg-[#8E7FD0] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ ...btn, background: "#9A8CD6", color: "#FFFFFF" }}>
          <Check size={18} strokeWidth={2} aria-hidden />
          {t("Accept")}
        </button>
      </div>
    </div>
  );
};

const FIRST_HOUR = 6;
const LAST_HOUR = 22;
/** The markup's padding above the 6 AM line and below the 10 PM line. */
const PAD_T = 10;
const minutesOf = (hhmm?: string) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

/**
 * WP-CA.2 Week (the markup's isWeekWeb): one card (r20, the lavender border)
 * with the seven days across (a 64 gutter, 56 on the rail): the header pills
 * (min 64, r16; day 13/20 caps, date 22/30; today #9A8CD6 with white), then
 * the hours 6 AM - 10 PM at 44 a hour (36 on the rail) with half-hour lines,
 * the labels 13/20; events by time (r8, the colour at 16% with a 3 bar, the
 * name 13/20 600, the time 11/16 when 40 or taller, completed at 0.6), side
 * by side when they overlap; a Day off chip on days without hours; the now
 * line #8F68F6 on today. The body scrolls inside the card and opens at 7 AM.
 */
export const WeekTimeGridWeb: React.FC<{
  days: string[];
  todayIso: string;
  nowMinutes: number;
  items: Record<string, CalItem[]>;
  dayOff: (iso: string) => boolean;
  onDay: (iso: string) => void;
  onOpen: (i: CalItem) => void;
  /** The week-empty card (no items all week), drawn over the grid. */
  empty?: React.ReactNode;
}> = ({ days, todayIso, nowMinutes, items, dayOff, onDay, onOpen, empty }) => {
  const dark = useIsDark();
  const { rail } = useWebLayout();
  const hp = rail ? 36 : 44;
  const gut = rail ? 56 : 64;
  const cols = `${gut}px repeat(${days.length},minmax(0,1fr))`;
  const yy = (m: number) => PAD_T + Math.round(((Math.min(Math.max(m, FIRST_HOUR * 60), LAST_HOUR * 60) - FIRST_HOUR * 60) / 60) * hp);
  const bodyH = (LAST_HOUR - FIRST_HOUR) * hp + 2 * PAD_T;
  const lines = `repeating-linear-gradient(to bottom, rgba(36,31,27,0.08) 0 1px, transparent 1px ${hp / 2}px, rgba(36,31,27,0.035) ${hp / 2}px ${hp / 2 + 1}px, transparent ${hp / 2 + 1}px ${hp}px)`;
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = yy(7 * 60) - 4;
    // Opens at 7 AM once per hour scale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp]);
  const anyAllDay = days.some((d) => (items[d] ?? []).some((i) => i.allDay));
  return (
    <section aria-label={t("Week")} className="relative flex min-h-0 flex-1 flex-col overflow-hidden" style={{ borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(143,104,246,0.16)" }}>
      <div className="shrink-0" style={{ display: "grid", gridTemplateColumns: cols, borderBottom: "1px solid rgba(36,31,27,0.08)", background: "#FFFFFF" }}>
        <div />
        {days.map((iso) => {
          const d = new Date(`${iso}T00:00:00`);
          const today = iso === todayIso;
          return (
            <div key={iso} className="flex min-w-0 justify-center" style={{ padding: "8px 6px", borderInlineStart: LINE }}>
              <button
                type="button"
                onClick={() => onDay(iso)}
                aria-current={today ? "date" : undefined}
                aria-label={t("{v}, open in Day view", { v: d.toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" }) })}
                className={`flex flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8] ${today ? "" : "hover:bg-[#F6F4FE]"}`}
                style={{ minWidth: 64, boxSizing: "border-box", padding: "4px 12px", borderRadius: 16, background: today ? "#9A8CD6" : "transparent" }}
              >
                <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: today ? "#FFFFFF" : "#8C8378" }}>
                  {d.toLocaleDateString(appLocale("en-US"), { weekday: "short" })}
                </span>
                <span style={{ fontSize: 22, lineHeight: "30px", fontWeight: 700, color: today ? "#FFFFFF" : "#241F1B" }}>{d.getDate()}</span>
              </button>
            </div>
          );
        })}
        {anyAllDay && (
          <>
            <div style={{ fontSize: 11, lineHeight: "16px", fontWeight: 700, color: "#8C8378", padding: "8px 10px 8px 0", borderTop: LINE, textAlign: "end" }}>{t("All day")}</div>
            {days.map((iso) => (
              <div key={iso} className="flex min-w-0 flex-col" style={{ gap: 4, padding: 4, borderTop: LINE, borderInlineStart: LINE }}>
                {(items[iso] ?? [])
                  .filter((i) => i.allDay)
                  .map((i) => {
                    const { tint, bar } = eventColours(i.colour, dark);
                    return (
                      <button key={i.key} type="button" onClick={() => onOpen(i)} className="truncate text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: tint, color: "#241F1B", borderInlineStart: `3px solid ${bar}` }}>
                        {i.name ? `${i.name} · ${i.title}` : i.title}
                      </button>
                    );
                  })}
              </div>
            ))}
          </>
        )}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1" style={{ overflowY: "auto", overflowX: "hidden" }}>
        <div className="relative" style={{ height: bodyH, display: "grid", gridTemplateColumns: cols }}>
          <div className="relative">
            {Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, k) => (
              <span key={k} className="absolute whitespace-nowrap" style={{ insetInlineEnd: 10, top: yy((FIRST_HOUR + k) * 60) - 10, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                {hourLabel12(FIRST_HOUR + k)}
              </span>
            ))}
          </div>
          {days.map((iso) => {
            const timed = (items[iso] ?? [])
              .filter((i) => !i.allDay && minutesOf(i.start) !== null)
              .map((i) => {
                const s = minutesOf(i.start)!;
                return { i, s, e: Math.max(minutesOf(i.end) ?? s + 60, s + 15), lane: 0, lanes: 1 };
              })
              .sort((a, b) => a.s - b.s);
            // Overlapping events share the column side by side (the markup's clusters).
            let cluster: typeof timed = [];
            let end = -1;
            const flush = () => {
              const ends: number[] = [];
              cluster.forEach((ev) => {
                let l = ends.findIndex((x) => x <= ev.s);
                if (l < 0) {
                  l = ends.length;
                  ends.push(0);
                }
                ends[l] = ev.e;
                ev.lane = l;
              });
              cluster.forEach((ev) => (ev.lanes = ends.length));
              cluster = [];
            };
            timed.forEach((ev) => {
              if (ev.s >= end && cluster.length) flush();
              cluster.push(ev);
              end = Math.max(end, ev.e);
            });
            if (cluster.length) flush();
            const off = dayOff(iso);
            return (
              <div key={iso} className="relative min-w-0" style={{ borderInlineStart: LINE, backgroundImage: lines, backgroundPosition: `0 ${PAD_T}px` }}>
                {off && (
                  <div className="absolute inset-x-0 flex items-center justify-center" style={{ top: yy(FIRST_HOUR * 60), height: yy(LAST_HOUR * 60) - yy(FIRST_HOUR * 60) }}>
                    <span className="flex items-center" style={{ gap: 6, padding: "4px 10px", borderRadius: 999, background: "#F5F5F6", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#A79E93" }}>
                      <Moon size={16} strokeWidth={2} aria-hidden />
                      {t("Day off")}
                    </span>
                  </div>
                )}
                {timed.map(({ i, s, e, lane, lanes }) => {
                  const top = yy(s) + 1;
                  const h = yy(e) - top - 1;
                  const tall = h >= 40;
                  const { tint, bar } = eventColours(i.colour, dark);
                  const w = 100 / lanes;
                  return (
                    <button
                      key={i.key}
                      type="button"
                      onClick={() => onOpen(i)}
                      title={`${i.name ? `${i.name} · ` : ""}${i.title} · ${range12(i.start, i.end)}`}
                      className="absolute flex flex-col overflow-hidden text-start hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
                      style={{ top, height: Math.max(h, 18), insetInlineStart: `calc(${lane * w}% + 3px)`, width: `calc(${w}% - 6px)`, boxSizing: "border-box", borderRadius: 8, background: tint, borderInlineStart: `3px solid ${bar}`, padding: tall ? "4px 8px" : "0 8px", justifyContent: tall ? "flex-start" : "center", opacity: i.done ? 0.6 : 1, boxShadow: "0 1px 2px rgba(36,31,27,0.06)" }}
                    >
                      <span className="flex min-w-0 items-center" style={{ gap: 4, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#241F1B" }}>
                        <span className="min-w-0 truncate">{i.name ?? i.title}</span>
                        {i.done && <Check size={14} strokeWidth={2.4} color="#3F9165" aria-hidden className="shrink-0" />}
                      </span>
                      {tall && (
                        <span className="truncate" style={{ fontSize: 11, lineHeight: "16px", color: "#8C8378" }}>
                          {range12(i.start, i.end)}
                        </span>
                      )}
                    </button>
                  );
                })}
                {iso === todayIso && nowMinutes >= FIRST_HOUR * 60 && nowMinutes <= LAST_HOUR * 60 && (
                  <div aria-hidden className="absolute inset-x-0" style={{ top: yy(nowMinutes) - 1, height: 2, background: "#8F68F6", zIndex: 3 }}>
                    <span className="absolute" style={{ insetInlineStart: -5, top: -4, width: 10, height: 10, borderRadius: 999, background: "#8F68F6" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {empty}
    </section>
  );
};

const NewSessionButton: React.FC<{ label: string; onNew: () => void; mt: number; maxWidth?: number }> = ({ label, onNew, mt, maxWidth }) => (
  <button
    type="button"
    onClick={onNew}
    className="flex items-center justify-center hover:bg-[#8E7FD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
    style={{ marginTop: mt, width: "100%", maxWidth, height: 44, borderRadius: 16, background: "#9A8CD6", color: "#FFFFFF", gap: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
  >
    <CalendarPlus size={20} strokeWidth={2} aria-hidden />
    {label}
  </button>
);

/** WP-CA.1 month-empty: the agenda's empty card (r20, #FAFAFB, the 96 tile r28 with the 44 calendar, "No sessions" 22/30 700, New session 44 up to 320). */
export const AgendaEmptyWeb: React.FC<{ newLabel: string; onNew: () => void }> = ({ newLabel, onNew }) => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center" style={{ boxSizing: "border-box", borderRadius: 20, background: "#FAFAFB", border: "1px solid rgba(36,31,27,0.08)", padding: 32 }}>
    <span className="flex items-center justify-center" style={{ width: 96, height: 96, borderRadius: 28, background: "#F0EDF9", color: "#7D67D9" }}>
      <CalendarDays size={44} strokeWidth={1.5} aria-hidden />
    </span>
    <p style={{ margin: "20px 0 0", fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#241F1B" }}>{t("No sessions")}</p>
    <NewSessionButton label={newLabel} onNew={onNew} mt={24} maxWidth={320} />
  </div>
);

/** WP-CA.2 week-empty: the card over the empty grid (340 wide, 300 on the rail; r24, the 0 18 50 shadow, the 80 tile, "No sessions", New session). */
export const WeekEmptyWeb: React.FC<{ newLabel: string; onNew: () => void }> = ({ newLabel, onNew }) => {
  const { rail } = useWebLayout();
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ top: 79, zIndex: 4 }}>
      <div className="pointer-events-auto flex flex-col items-center text-center" style={{ boxSizing: "border-box", width: rail ? 300 : 340, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", borderRadius: 24, boxShadow: "0 18px 50px rgba(36,31,27,0.12)", padding: 32 }}>
        <span className="flex items-center justify-center" style={{ width: 80, height: 80, borderRadius: 24, background: "#F0EDF9", color: "#7D67D9" }}>
          <CalendarDays size={36} strokeWidth={1.5} aria-hidden />
        </span>
        <p style={{ margin: "16px 0 0", fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#241F1B" }}>{t("No sessions")}</p>
        <NewSessionButton label={newLabel} onNew={onNew} mt={20} />
      </div>
    </div>
  );
};

/**
 * WP-CA.4 Year (WP-CA Calendar Extras Web, yearWeb): this year and the next,
 * each a 30/36 800 heading over a rule (8 above, 16 below), then the months 6
 * across (4 on the rail; 24 by 20 apart): the name 15/24 600 (this month
 * #7D67D9), the days 13/20 600 in 22 circles (today #9A8CD6 with white), a 4
 * dot under days with events. A month opens Month.
 */
export const YearWeb: React.FC<{ year: number; todayIso: string; eventDays: string[]; onOpenMonth: (y: number, m: number) => void }> = ({ year, todayIso, eventDays, onOpenMonth }) => {
  const { rail } = useWebLayout();
  const events = new Set(eventDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  const thisYear = Number(todayIso.slice(0, 4));
  const thisMonth = Number(todayIso.slice(5, 7)) - 1;
  return (
    <div className="flex flex-col" style={{ gap: 30, paddingTop: 14 }}>
      {[year, year + 1].map((y) => (
        <section key={y} aria-label={String(y)} className="flex flex-col">
          <h2 style={{ margin: 0, fontSize: 30, lineHeight: "36px", fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: "#241F1B" }}>{y}</h2>
          <div aria-hidden style={{ height: 1, background: "rgba(36,31,27,0.08)", margin: "8px 0 16px" }} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${rail ? 4 : 6},minmax(0,1fr))`, columnGap: 24, rowGap: 20 }}>
            {Array.from({ length: 12 }, (_, mo) => {
              const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
              const days = new Date(y, mo + 1, 0).getDate();
              const name = new Date(y, mo, 1).toLocaleDateString(appLocale("en-US"), { month: "short" });
              const long = new Date(y, mo, 1).toLocaleDateString(appLocale("en-US"), { month: "long", year: "numeric" });
              const count = Array.from({ length: days }, (_, i) => events.has(`${y}-${pad(mo + 1)}-${pad(i + 1)}`)).filter(Boolean).length;
              const cur = y === thisYear && mo === thisMonth;
              return (
                <button
                  key={mo}
                  type="button"
                  onClick={() => onOpenMonth(y, mo)}
                  aria-label={count ? tn(count, "{month}, {n} day with events", "{month}, {n} days with events", { month: long }) : long}
                  className="flex min-w-0 flex-col text-start hover:bg-[#F7F6FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
                  style={{ padding: 8, margin: -8, borderRadius: 14 }}
                >
                  <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: cur ? "#7D67D9" : "#241F1B" }}>{name}</span>
                  <span aria-hidden style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", rowGap: 2, marginTop: 6 }}>
                    {Array.from({ length: lead }, (_, i) => (
                      <span key={`b${i}`} style={{ height: 22 }} />
                    ))}
                    {Array.from({ length: days }, (_, i) => {
                      const iso = `${y}-${pad(mo + 1)}-${pad(i + 1)}`;
                      const today = iso === todayIso;
                      return (
                        <span key={iso} className="relative flex items-center justify-center" style={{ height: 22 }}>
                          <span className="flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: 999, fontSize: 13, lineHeight: "20px", fontWeight: today ? 700 : 600, fontVariantNumeric: "tabular-nums", background: today ? "#9A8CD6" : "transparent", color: today ? "#FFFFFF" : "#241F1B" }}>
                            {i + 1}
                          </span>
                          {events.has(iso) && <span className="absolute" style={{ bottom: 0, insetInlineStart: "50%", marginInlineStart: -2, width: 4, height: 4, borderRadius: 999, background: today ? "#FFFFFF" : "#6F9993" }} />}
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
