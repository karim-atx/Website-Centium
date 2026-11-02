import React from "react";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, Clock, Coffee, Moon, Plane, Plus, X } from "lucide-react";
import { CtaButton } from "../../ui/PinnedCta";
import { JumpToToday } from "../../ui/JumpToToday";
import { eventColours } from "../../calendar/eventColour";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { hourLabel12, range12 } from "../../../utils/time12";
import { weekdayNarrow } from "../proDates";
import { INK } from "../proInk";
import { TicketCheck } from "../../market/ProfessionalCard";
import { primaryLine, REQUEST_GOLD, FOLLOW_UP_PLUM, DEFAULT_SESSION, type CalItem } from "./calendarItems";
import { minutes, offBands, type TimeOffEntry } from "./calendarModel";
import { TicketRow, classBadgeText, classInk } from "./TicketRow";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

// Release 3 · W4 CA1 v2 Month, CA3 v2 Week, CA4 v2 Day (source/gen/cal.js
// calMonth, calWeek, calDay, agendaRow, headerCard; Monday-first per FINAL_PLAN
// section 3 item 5; 12-hour per item 4). Literal values from the board:
// - headerCard: 40 high, r16, pad 0 12, #F6F4FE (dark #2B2C3A), chevrons 16 /
//   2.2 #5B3FE4 (dark #B7ABDE), label 15 / 600;
// - agendaRow: r15, pad 12 14, gap 11, the event colour at 16% (#hex29), a 3
//   wide bar (min 32), title 12.5 / 700, time line 10 text.tertiary, badge
//   11 / 600 (Completed status.good + check, Business gold.text #9A7424 /
//   #CAB082 + store, Request gold.text, Follow-up text.soft);
// - eyebrow: 9 / 700, 0.2em, caps, rgba(36,31,27,0.42) (dark 0.55 of #F5F3FA).
// Market + Share 3.0 W5 (P-CA, D-40): gym classes are tickets in their class
// colour (TicketRow: tint, bar, the 30 dashed stub, "Hired via Centium" only
// for hires); the gold "Business" look is gone. The Month grid has two dot
// rows (sessions booked #6F9993, classes #667BB1); the Day timeline's class
// blocks carry the mark; legends name "Your sessions" and the class colour.

/** P-CA.3 the hired classes dot (#667BB1); dark: lifted to read on the dark card, as the teal dot is. */
const HIRED_DOT = "#667BB1";
const HIRED_DOT_DARK = "#8D9CC8";
/** P-CA.2 the Day legend's class swatch (the board's Cedar #4F8F8A). */
const CLASS_SWATCH = "#4F8F8A";

const GOLD_TEXT = "#9A7424";
const GOLD_TEXT_DARK = "#CAB082";

export const Eyebrow: React.FC<{ children: React.ReactNode; mb?: number; mt?: number }> = ({ children, mb = 9, mt }) => {
  const dark = useIsDark();
  return (
    <p
      className="[.high-contrast_&]:!text-charcoal"
      style={{ marginTop: mt, marginBottom: mb, fontSize: textPx(9), fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: dark ? "rgba(245,243,250,0.55)" : "rgba(36,31,27,0.42)" }}
    >
      {children}
    </p>
  );
};

export const HeaderCard: React.FC<{
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  jump?: (() => void) | null;
}> = ({ label, onPrev, onNext, prevLabel, nextLabel, jump }) => {
  const dark = useIsDark();
  const chev = dark ? "#B7ABDE" : "#5B3FE4";
  return (
    <div className="flex items-center" style={{ gap: 8, borderRadius: 16, height: 40, padding: "0 12px", background: dark ? "#2B2C3A" : "#F6F4FE" }}>
      <button type="button" onClick={onPrev} aria-label={prevLabel} className="tap flex items-center justify-center shrink-0" style={{ width: 26, height: 26, color: chev }}>
        <ChevronLeft size={16} strokeWidth={2.2} />
      </button>
      <p className="flex-1 min-w-0 text-center truncate" style={{ fontSize: textPx(15), fontWeight: 600, color: INK.ch }}>
        {label}
      </p>
      {jump && <JumpToToday onClick={jump} />}
      <button type="button" onClick={onNext} aria-label={nextLabel} className="tap flex items-center justify-center shrink-0" style={{ width: 26, height: 26, color: chev }}>
        <ChevronRight size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
};

const Badge: React.FC<{ item: CalItem }> = ({ item }) => {
  const dark = useIsDark();
  const gold = dark ? GOLD_TEXT_DARK : GOLD_TEXT;
  const style: React.CSSProperties = { fontSize: textPx(11), fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 };
  switch (item.badge) {
    case "completed":
      return (
        <span style={{ ...style, color: INK.good }}>
          <Check size={11} strokeWidth={2.4} aria-hidden />{" "}{t("Completed")}</span>
      );
    case "request":
      return <span style={{ ...style, color: gold }}>{t("Request")}</span>;
    case "followup":
      return <span style={{ ...style, color: INK.chS }}>{t("Follow-up")}</span>;
    case "invitation":
      return <span style={{ ...style, color: gold }}>{t("Invitation")}</span>;
    case "going":
      return <span style={{ ...style, color: INK.prDeep }}>{t("Going")}</span>;
    case "declined":
      return <span style={{ ...style, color: INK.chF }}>{t("Declined")}</span>;
    case "scheduled":
      return <span style={{ ...style, color: INK.tealDark }}>{t("Scheduled for a client")}</span>;
    default:
      return null;
  }
};

/** cal.js agendaRow: the Month list and the Week cards. */
export const AgendaRow: React.FC<{ item: CalItem; onOpen: (i: CalItem) => void; outline?: boolean; notchBg?: string }> = ({ item, onOpen, outline, notchBg }) => {
  const dark = useIsDark();
  const { tint, bar } = eventColours(item.colour, dark);
  const time = item.allDay ? t("All day") : range12(item.start, item.end);
  if (item.kind === "class" && item.cls) {
    const c = item.cls;
    const badge = classBadgeText(item.badge, c.colour, dark);
    return (
      <TicketRow
        title={primaryLine(item)}
        sub={[time, c.location].filter(Boolean).join(" · ")}
        colour={c.colour}
        mark={c.hired}
        stub
        badge={badge}
        dim={c.status === "cancelled" ? 0.55 : c.status === "completed" ? 0.6 : 1}
        strike={c.status === "cancelled"}
        outline={outline || (c.updated && c.status === "scheduled")}
        notchBg={notchBg ?? "rgb(var(--c-cream))"}
        onClick={() => onOpen(item)}
        ariaLabel={[primaryLine(item), time, c.location, c.hired ? t("Hired via Centium") : null, badge?.text].filter(Boolean).join(", ")}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="tap w-full flex items-start text-start"
      style={{ gap: 11, borderRadius: 15, padding: "12px 14px", background: tint, opacity: item.badge === "declined" ? 0.6 : 1 }}
    >
      <span aria-hidden style={{ width: 3, alignSelf: "stretch", minHeight: 32, borderRadius: 9999, background: bar, flexShrink: 0 }} />
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch, lineHeight: 1.5 }}>
          {item.kind === "request" ? (item.name ? t("Request · {name} wants this slot", { name: item.name }) : t("Request · {title}", { title: item.title })) : primaryLine(item)}
        </span>
        <span className="block" style={{ fontSize: textPx(10), color: INK.chT, lineHeight: 1.5 }}>
          {[time, item.place].filter(Boolean).join(" · ")}
        </span>
      </span>
      <Badge item={item} />
    </button>
  );
};

// ---------------------------------------------------------------------------
// Month (CA1 v2)
// ---------------------------------------------------------------------------

// P-CA.3 (raw P-CA.3_Month_Month-day-agenda): the month's header card sits
// in the page header like Week / Day; the grid card is pad 12 12 10, letters
// 26 high (margin-bottom 4), cells 40 high, the legend 8 / 8.
export const MonthGrid: React.FC<{
  year: number;
  month: number;
  todayIso: string;
  selected: string;
  /** P-CA.3's two dot rows: own sessions booked, and gym classes. */
  dots: (iso: string) => { own: boolean; cls: boolean };
  /** my_calendar answered: the class dot is "Hired classes" (the board); else "Classes". */
  hiredLive: boolean;
  dayOff: (iso: string) => boolean;
  leading: number;
  onSelect: (iso: string) => void;
}> = ({ year, month, todayIso, selected, dots, hiredLive, dayOff, leading, onSelect }) => {
  const dark = useIsDark();
  const days = new Date(year, month + 1, 0).getDate();
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const firstOff = Array.from({ length: days }, (_, i) => i + 1).find((d) => dayOff(iso(d)));
  return (
    <div style={{ borderRadius: 15, background: dark ? "#1C1F28" : "#FFFFFF", border: `1px solid rgba(143,104,246,${dark ? 0.28 : 0.16})`, padding: "12px 12px 10px" }}>
      <div className="grid grid-cols-7" style={{ gap: 2, marginBottom: 4 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: 26, fontSize: textPx(13), fontWeight: 600, color: dark ? "#B7ABDE" : "#5B3FE4" }}>
            {weekdayNarrow(i)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gap: 2 }}>
        {Array.from({ length: leading }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const id = iso(d);
          const sel = id === selected;
          const off = dayOff(id);
          const dot = dots(id);
          const has = dot.own;
          return (
            <button
              key={id}
              type="button"
              data-today={id === todayIso || undefined}
              onClick={() => onSelect(id)}
              aria-pressed={sel}
              aria-label={[new Date(`${id}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" }), has ? t("sessions booked") : null, dot.cls ? (hiredLive ? t("hired classes") : t("classes")) : null, off ? t("day off") : null].filter(Boolean).join(t(", "))}
              className={clsx(
                "tap flex flex-col items-center justify-center",
                sel ? "bg-primary-fill text-on-primary-fill" : id === todayIso ? "bg-team-lavender/[0.16]" : ""
              )}
              style={{
                height: 40,
                borderRadius: 10,
                gap: 2,
                fontSize: textPx(15),
                fontWeight: sel ? 600 : 500,
                color: sel ? undefined : off ? INK.chT : INK.ch,
              }}
            >
              {d}
              <span aria-hidden className="flex" style={{ gap: 2 }}>
                <span style={{ width: 3.5, height: 3.5, borderRadius: 9999, background: has ? (sel ? INK.onFill : dark ? "#4F8F8A" : "#6F9993") : "transparent" }} />
                <span style={{ width: 3.5, height: 3.5, borderRadius: 9999, background: dot.cls ? (sel ? INK.onFill : dark ? HIRED_DOT_DARK : HIRED_DOT) : "transparent" }} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap" style={{ gap: 14, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${INK.b06}`, fontSize: textPx(10.5), color: INK.chF }}>
        <span className="flex items-center whitespace-nowrap" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: 9999, background: dark ? "#4F8F8A" : "#6F9993" }} />{t("Sessions booked")}</span>
        <span className="flex items-center whitespace-nowrap" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: 9999, background: dark ? HIRED_DOT_DARK : HIRED_DOT }} />
          {hiredLive ? t("Hired classes") : t("Classes")}
        </span>
        {firstOff && (
          <span className="flex items-center" style={{ gap: 5 }}>
            <span aria-hidden style={{ fontWeight: 700, color: INK.chT }}>
              {firstOff}
            </span>{t("Greyed: day off")}</span>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Week (CA3 v2)
// ---------------------------------------------------------------------------

export const WeekDayRow: React.FC<{
  iso: string;
  today: boolean;
  /** The working hours; null = Day off; undefined = no working hours set at all (no line). */
  hours: string | null | undefined;
  items: CalItem[];
  loaded: boolean;
  onDay: () => void;
  onOpen: (i: CalItem) => void;
  /** P-CA.5.1: the rows a hire just added are outlined. */
  outlineOf?: (i: CalItem) => boolean;
}> = ({ iso, today, hours, items, loaded, onDay, onOpen, outlineOf }) => {
  const d = new Date(`${iso}T00:00:00`);
  const off = hours === null;
  const known = hours !== undefined;
  return (
    <div className="flex items-start" data-today={today || undefined} style={{ gap: 12 }}>
      <button
        type="button"
        onClick={onDay}
        aria-label={t("{v}, open in Day view", { v: d.toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" }) })}
        className={clsx("tap shrink-0 flex flex-col items-center justify-center", today ? "bg-primary-fill text-on-primary-fill" : "")}
        style={{ width: 56, borderRadius: 16, padding: "8px 0", gap: 2, background: today ? undefined : INK.soft, color: today ? undefined : INK.chS }}
      >
        <span style={{ fontSize: textPx(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em" }}>{d.toLocaleDateString(appLocale("en-US"), { weekday: "short" })}</span>
        <span style={{ fontSize: textPx(16), fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</span>
      </button>
      <div className="flex-1 min-w-0" style={{ paddingTop: 4 }}>
        {known && (
          <p className="flex items-center" style={{ gap: 5, fontSize: textPx(10.5), fontWeight: 600, color: off ? INK.chT : INK.tealDark, marginBottom: 6 }}>
            {off ? <Moon size={11} strokeWidth={2} aria-hidden /> : <Clock size={11} strokeWidth={2} aria-hidden />}
            {off ? t("Day off") : hours}
          </p>
        )}
        {!loaded ? (
          <div aria-hidden className="bg-cream-soft animate-skeleton-pulse" style={{ height: 16, borderRadius: 8 }} />
        ) : items.length ? (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {items.map((i) => (
              <AgendaRow key={i.key} item={i} onOpen={onOpen} outline={outlineOf?.(i)} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{off || !known ? t("No sessions") : t("Open all day")}</p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Day (CA4 v2)
// ---------------------------------------------------------------------------

/** P-CA.2 (raw P-CA.2_Day_Day-timeline, the board's `HP = 52`): px per hour; every top / height below derives from it. */
const HP = 52;
/** P-CA.2: the board's timeline box runs 40 past its last hour line (560 high for lines 0..520), then the legend at margin-top 6. */
const TAIL = 40;

export const RequestCard: React.FC<{ item: CalItem; busy: boolean; onAccept: () => void; onDecline: () => void }> = ({ item, busy, onAccept, onDecline }) => {
  const dark = useIsDark();
  const { tint } = eventColours(REQUEST_GOLD, dark);
  const who = item.name ?? t("Someone new");
  return (
    <div style={{ borderRadius: 22, padding: "16px 20px", background: tint, borderInlineStart: `3px solid ${REQUEST_GOLD}`, marginBottom: 10 }}>
      <div className="flex justify-between" style={{ gap: 10 }}>
        <div className="min-w-0">
          <p style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>{`${who} · ${item.title}`}</p>
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{range12(item.start, item.end)}</p>
        </div>
        <span style={{ fontSize: textPx(11), fontWeight: 600, color: dark ? GOLD_TEXT_DARK : GOLD_TEXT, flexShrink: 0 }}>{t("Request")}</span>
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 10 }}>
        <CtaButton size="page" variant="secondary" label={t("Decline")} icon={<X size={15} aria-hidden />} disabled={busy} onClick={onDecline} aria-label={t("Decline {who}'s booking request", { who })} />
        <CtaButton size="page" label={t("Accept")} icon={<Check size={15} aria-hidden />} disabled={busy} onClick={onAccept} aria-label={t("Accept {who}'s booking request", { who })} />
      </div>
    </div>
  );
};

export interface DayTimelineProps {
  from: number;
  to: number;
  windows: { start: string; end: string }[];
  items: CalItem[];
  breaks: { entry: TimeOffEntry; start: string; end: string }[];
  open: { start: string; end: string }[];
  nowMinutes: number | null;
  clinical: boolean;
  /** my_calendar answered: the class legend reads "Hired · class colour" (the board); else "Classes · class colour". */
  hiredLive: boolean;
  onOpen: (i: CalItem) => void;
  onBreak: (e: TimeOffEntry) => void;
  onOpenSlot: (start: string) => void;
}

/** Items that overlap share the width: each gets a lane. */
function lanesOf(items: CalItem[]): { lane: Map<string, number>; count: number } {
  const lane = new Map<string, number>();
  const ends: number[] = [];
  for (const i of [...items].sort((a, b) => minutes(a.start) - minutes(b.start))) {
    const s = minutes(i.start);
    let l = ends.findIndex((e) => e <= s);
    if (l < 0) {
      l = ends.length;
      ends.push(0);
    }
    ends[l] = Math.max(minutes(i.end), s + 20);
    lane.set(i.key, l);
  }
  return { lane, count: Math.max(1, ends.length) };
}

export const DayTimeline: React.FC<DayTimelineProps> = ({ from, to, windows, items, breaks, open, nowMinutes, clinical, hiredLive, onOpen, onBreak, onOpenSlot }) => {
  const dark = useIsDark();
  const y = (m: number) => ((m - from * 60) / 60) * HP;
  const hatch = `repeating-linear-gradient(135deg, ${INK.soft} 0 6px, transparent 6px 12px)`;
  const timed = items.filter((i) => !i.allDay && i.start);
  const { lane, count } = lanesOf(timed);
  const gold = dark ? GOLD_TEXT_DARK : GOLD_TEXT;
  return (
    <>
      <div className="relative" data-day-timeline style={{ height: (to - from) * HP + TAIL }}>
        {Array.from({ length: to - from + 1 }, (_, k) => {
          const h = from + k;
          return (
            <div key={h} data-hour={h} className="absolute start-0 end-0 flex" style={{ top: k * HP, borderTop: `1px solid ${INK.b06}` }}>
              {/* The board's label: 36 content + 6 padding (content-box), so 42 wide here (border-box), on the page fill. */}
              <span className="shrink-0 text-end" style={{ fontSize: textPx(9), color: INK.chF, marginTop: -6, paddingInlineEnd: 6, width: 42, background: "rgb(var(--c-cream))" }}>
                {hourLabel12(h)}
              </span>
            </div>
          );
        })}
        {offBands(windows, from, to).map((b) => (
          <div key={`off${b.start}`} aria-hidden className="absolute" style={{ insetInlineStart: 40, insetInlineEnd: 0, top: y(b.start), height: y(b.end) - y(b.start), background: hatch, borderRadius: 8 }} />
        ))}
        {breaks.map((b) => (
          <button
            key={`br${b.entry.key}${b.start}`}
            type="button"
            onClick={() => onBreak(b.entry)}
            className="tap absolute flex items-center text-start"
            style={{ insetInlineStart: 40, insetInlineEnd: 4, top: y(minutes(b.start)), height: Math.max(y(minutes(b.end)) - y(minutes(b.start)), 26), borderRadius: 12, background: INK.soft, padding: "0 10px", gap: 6, fontSize: textPx(11), fontWeight: 600, color: INK.chF }}
          >
            <Coffee size={12} strokeWidth={2} aria-hidden />
            {b.entry.reason || t("Break")}
          </button>
        ))}
        {open.map((o) => (
          <button
            key={`open${o.start}`}
            type="button"
            onClick={() => onOpenSlot(o.start)}
            aria-label={t("Open slot, {v}, add a session", { v: range12(o.start, o.end) })}
            className="tap absolute flex items-center justify-between"
            style={{ insetInlineStart: 40, insetInlineEnd: 4, top: y(minutes(o.start)), height: Math.max(y(minutes(o.end)) - y(minutes(o.start)), 26), borderRadius: 12, border: `1.5px dashed ${INK.b10}`, padding: "0 10px", fontSize: textPx(11), fontWeight: 600, color: INK.chF }}
          >{t("Open slot")}<Plus size={13} strokeWidth={2} aria-hidden />
          </button>
        ))}
        {timed.map((i) => {
          const top = y(minutes(i.start));
          const hh = Math.max(y(Math.max(minutes(i.end), minutes(i.start) + 20)) - top, 26);
          const short = hh < 40;
          const l = lane.get(i.key) ?? 0;
          const width = `calc((100% - 44px) / ${count})`;
          const left = `calc(40px + (100% - 44px) * ${l} / ${count})`;
          if (i.kind === "request") {
            return (
              <button
                key={i.key}
                type="button"
                onClick={() => onOpen(i)}
                className="tap absolute flex items-center text-start"
                style={{ left, width, top, height: hh, borderRadius: 12, border: `1.5px dashed ${REQUEST_GOLD}`, padding: "0 10px", fontSize: textPx(11), fontWeight: 600, color: gold }}
              >
                <span className="truncate">{t("Requested · {name}", { name: i.name ?? i.title })}</span>
              </button>
            );
          }
          const { tint, bar } = eventColours(i.colour, dark);
          // CA4: the client on top, "{time_range} · {session type}" under it;
          // P-CA.2 a class: "{class} · {gym}" (+ the mark for a hire), "{time_range} · {location}".
          const cls = i.kind === "class" ? i.cls ?? null : null;
          const label = cls ? primaryLine(i) : i.name ?? i.title;
          const sub = cls ? cls.location : i.name ? i.title : i.place;
          const cancelled = cls?.status === "cancelled";
          return (
            <button
              key={i.key}
              type="button"
              onClick={() => onOpen(i)}
              className="tap absolute text-start overflow-hidden shadow-soft"
              style={{
                left,
                width,
                top,
                height: hh,
                borderRadius: 12,
                background: tint,
                borderInlineStart: `3px solid ${bar}`,
                padding: short ? "0 10px" : "6px 10px",
                display: short ? "flex" : "block",
                alignItems: "center",
                gap: 6,
                opacity: cancelled ? 0.55 : i.done || i.badge === "declined" ? 0.6 : 1,
              }}
            >
              <p className="flex items-center truncate" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.ch, gap: 6, minWidth: 0 }}>
                <span className="truncate" style={{ textDecoration: cancelled ? "line-through" : undefined }}>{label}</span>
                {cls?.hired && (
                  <span className="shrink-0" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: textPx(9.5), fontWeight: 700, color: classInk(i.colour, dark), whiteSpace: "nowrap" }}>
                    <TicketCheck size={11} />{t("Hired via Centium")}</span>
                )}
                {cancelled && <span className="sr-only">{t("Cancelled")}</span>}
                {i.done && <Check size={10} strokeWidth={2.4} aria-label={t("Completed")} className="shrink-0" style={{ color: INK.good }} />}
              </p>
              <p className="truncate" style={{ fontSize: textPx(10), color: INK.chF, textDecoration: cancelled ? "line-through" : undefined }}>
                {[range12(i.start, i.end), sub].filter(Boolean).join(" · ")}
              </p>
            </button>
          );
        })}
        {nowMinutes !== null && nowMinutes >= from * 60 && nowMinutes <= to * 60 && (
          <div aria-hidden className="absolute" style={{ insetInlineStart: 36, insetInlineEnd: 0, top: y(nowMinutes), height: 2, background: INK.hi }}>
            <span className="absolute" style={{ insetInlineStart: -4, top: -3, width: 8, height: 8, borderRadius: 9999, background: INK.hi }} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap" style={{ gap: "10px 14px", marginTop: 6, fontSize: textPx(10.5), color: INK.chF }}>
        <span className="flex items-center" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 14, height: 10, borderRadius: 3, background: `repeating-linear-gradient(135deg, ${INK.soft} 0 3px, transparent 3px 6px)`, border: `1px solid ${INK.b10}` }} />{t("Outside working hours")}</span>
        <span className="flex items-center" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: eventColours(DEFAULT_SESSION, dark).bar }} />{t("Your sessions")}</span>
        <span className="flex items-center" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: eventColours(CLASS_SWATCH, dark).bar }} />
          {hiredLive ? t("Hired · class colour") : t("Classes · class colour")}
        </span>
        {clinical && (
          <span className="flex items-center" style={{ gap: 5 }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: FOLLOW_UP_PLUM }} />{t("Follow-up")}</span>
        )}
      </div>
    </>
  );
};

/** A whole day of time off, above the Day timeline (not drawn: the Time off row's own shape). */
export const DayOffRow: React.FC<{ entry: TimeOffEntry; onOpen: () => void }> = ({ entry, onOpen }) => (
  <button type="button" onClick={onOpen} className="tap w-full flex items-center text-start" style={{ gap: 10, borderRadius: 15, padding: "12px 14px", background: INK.soft, marginBottom: 10 }}>
    <Plane size={14} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
    <span className="flex-1 min-w-0" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch }}>
      {entry.reason || t("Time off")}
    </span>
    <span style={{ fontSize: textPx(10.5), color: INK.chF }}>{t("All day")}</span>
  </button>
);
