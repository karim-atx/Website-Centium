import React from "react";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, Clock, Coffee, Moon, Plane, Plus, Store, X } from "lucide-react";
import { CtaButton } from "../../ui/PinnedCta";
import { JumpToToday } from "../../ui/JumpToToday";
import { eventColours } from "../../calendar/eventColour";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { hourLabel12, range12 } from "../../../utils/time12";
import { DAY_LETTERS } from "../../../utils/week";
import { INK } from "../proInk";
import { primaryLine, BUSINESS_GOLD, FOLLOW_UP_PLUM, type CalItem } from "./calendarItems";
import { minutes, offBands, type TimeOffEntry } from "./calendarModel";

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

const GOLD_TEXT = "#9A7424";
const GOLD_TEXT_DARK = "#CAB082";

export const Eyebrow: React.FC<{ children: React.ReactNode; mb?: number }> = ({ children, mb = 9 }) => {
  const dark = useIsDark();
  return (
    <p
      className="[.high-contrast_&]:!text-charcoal"
      style={{ marginBottom: mb, fontSize: textPx(9), fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: dark ? "rgba(245,243,250,0.55)" : "rgba(36,31,27,0.42)" }}
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
          <Check size={11} strokeWidth={2.4} aria-hidden /> Completed
        </span>
      );
    case "business":
      return (
        <span style={{ ...style, color: gold }}>
          <Store size={11} strokeWidth={2} aria-hidden /> Business
        </span>
      );
    case "request":
      return <span style={{ ...style, color: gold }}>Request</span>;
    case "followup":
      return <span style={{ ...style, color: INK.chS }}>Follow-up</span>;
    case "invitation":
      return <span style={{ ...style, color: gold }}>Invitation</span>;
    case "going":
      return <span style={{ ...style, color: INK.prDeep }}>Going</span>;
    case "declined":
      return <span style={{ ...style, color: INK.chF }}>Declined</span>;
    case "scheduled":
      return <span style={{ ...style, color: INK.tealDark }}>Scheduled for a client</span>;
    default:
      return null;
  }
};

/** cal.js agendaRow: the Month list and the Week cards. */
export const AgendaRow: React.FC<{ item: CalItem; onOpen: (i: CalItem) => void }> = ({ item, onOpen }) => {
  const dark = useIsDark();
  const { tint, bar } = eventColours(item.colour, dark);
  const time = item.allDay ? "All day" : range12(item.start, item.end);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="tap w-full flex items-start text-left"
      style={{ gap: 11, borderRadius: 15, padding: "12px 14px", background: tint, opacity: item.badge === "declined" ? 0.6 : 1 }}
    >
      <span aria-hidden style={{ width: 3, alignSelf: "stretch", minHeight: 32, borderRadius: 9999, background: bar, flexShrink: 0 }} />
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch, lineHeight: 1.5 }}>
          {item.kind === "request" ? `Request · ${item.name ? `${item.name} wants this slot` : item.title}` : primaryLine(item)}
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

export const MonthGrid: React.FC<{
  year: number;
  month: number;
  monthLabel: string;
  todayIso: string;
  selected: string;
  busy: (iso: string) => boolean;
  dayOff: (iso: string) => boolean;
  leading: number;
  onSelect: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
  jump: (() => void) | null;
}> = ({ year, month, monthLabel, todayIso, selected, busy, dayOff, leading, onSelect, onPrev, onNext, jump }) => {
  const dark = useIsDark();
  const days = new Date(year, month + 1, 0).getDate();
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const firstOff = Array.from({ length: days }, (_, i) => i + 1).find((d) => dayOff(iso(d)));
  return (
    <div style={{ borderRadius: 15, background: dark ? "#1C1F28" : "#FFFFFF", border: `1px solid rgba(143,104,246,${dark ? 0.28 : 0.16})`, padding: "13px 14px", marginBottom: 13 }}>
      <HeaderCard label={monthLabel} onPrev={onPrev} onNext={onNext} prevLabel="Previous month" nextLabel="Next month" jump={jump} />
      <div className="grid grid-cols-7" style={{ gap: 2, margin: "10px 0 4px" }}>
        {DAY_LETTERS.map((l, i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: 31, fontSize: textPx(13), fontWeight: 600, color: dark ? "#B7ABDE" : "#5B3FE4" }}>
            {l}
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
          const has = busy(id);
          return (
            <button
              key={id}
              type="button"
              data-today={id === todayIso || undefined}
              onClick={() => onSelect(id)}
              aria-pressed={sel}
              aria-label={`${new Date(`${id}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${has ? ", sessions booked" : ""}${off ? ", day off" : ""}`}
              className={clsx(
                "tap flex flex-col items-center justify-center",
                sel ? "bg-primary-fill text-on-primary-fill" : id === todayIso ? "bg-team-lavender/[0.16]" : ""
              )}
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 10,
                gap: 2,
                fontSize: textPx(15),
                fontWeight: sel ? 600 : 500,
                color: sel ? undefined : off ? INK.chT : INK.ch,
              }}
            >
              {d}
              <span aria-hidden style={{ width: 3.5, height: 3.5, borderRadius: 9999, background: has ? (sel ? INK.onFill : dark ? "#4F8F8A" : "#6F9993") : "transparent" }} />
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap" style={{ gap: 14, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${INK.b06}`, fontSize: textPx(10.5), color: INK.chF }}>
        <span className="flex items-center whitespace-nowrap" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: 9999, background: dark ? "#4F8F8A" : "#6F9993" }} />
          Sessions booked
        </span>
        {firstOff && (
          <span className="flex items-center" style={{ gap: 5 }}>
            <span aria-hidden style={{ fontWeight: 700, color: INK.chT }}>
              {firstOff}
            </span>
            Greyed: day off
          </span>
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
}> = ({ iso, today, hours, items, loaded, onDay, onOpen }) => {
  const d = new Date(`${iso}T00:00:00`);
  const off = hours === null;
  const known = hours !== undefined;
  return (
    <div className="flex items-start" data-today={today || undefined} style={{ gap: 12 }}>
      <button
        type="button"
        onClick={onDay}
        aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, open in Day view`}
        className={clsx("tap shrink-0 flex flex-col items-center justify-center", today ? "bg-primary-fill text-on-primary-fill" : "")}
        style={{ width: 56, borderRadius: 16, padding: "8px 0", gap: 2, background: today ? undefined : INK.soft, color: today ? undefined : INK.chS }}
      >
        <span style={{ fontSize: textPx(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em" }}>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
        <span style={{ fontSize: textPx(16), fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</span>
      </button>
      <div className="flex-1 min-w-0" style={{ paddingTop: 4 }}>
        {known && (
          <p className="flex items-center" style={{ gap: 5, fontSize: textPx(10.5), fontWeight: 600, color: off ? INK.chT : INK.tealDark, marginBottom: 6 }}>
            {off ? <Moon size={11} strokeWidth={2} aria-hidden /> : <Clock size={11} strokeWidth={2} aria-hidden />}
            {off ? "Day off" : hours}
          </p>
        )}
        {!loaded ? (
          <div aria-hidden className="bg-cream-soft animate-skeleton-pulse" style={{ height: 16, borderRadius: 8 }} />
        ) : items.length ? (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {items.map((i) => (
              <AgendaRow key={i.key} item={i} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{off || !known ? "No sessions" : "Open all day"}</p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Day (CA4 v2)
// ---------------------------------------------------------------------------

const HP = 56;

export const RequestCard: React.FC<{ item: CalItem; busy: boolean; onAccept: () => void; onDecline: () => void }> = ({ item, busy, onAccept, onDecline }) => {
  const dark = useIsDark();
  const { tint } = eventColours(BUSINESS_GOLD, dark);
  const who = item.name ?? "Someone new";
  return (
    <div style={{ borderRadius: 22, padding: "16px 20px", background: tint, borderLeft: `3px solid ${BUSINESS_GOLD}`, marginBottom: 10 }}>
      <div className="flex justify-between" style={{ gap: 10 }}>
        <div className="min-w-0">
          <p style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>{`${who} · ${item.title}`}</p>
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{range12(item.start, item.end)}</p>
        </div>
        <span style={{ fontSize: textPx(11), fontWeight: 600, color: dark ? GOLD_TEXT_DARK : GOLD_TEXT, flexShrink: 0 }}>Request</span>
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 10 }}>
        <CtaButton size="page" variant="secondary" label="Decline" icon={<X size={15} aria-hidden />} disabled={busy} onClick={onDecline} aria-label={`Decline ${who}'s booking request`} />
        <CtaButton size="page" label="Accept" icon={<Check size={15} aria-hidden />} disabled={busy} onClick={onAccept} aria-label={`Accept ${who}'s booking request`} />
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

export const DayTimeline: React.FC<DayTimelineProps> = ({ from, to, windows, items, breaks, open, nowMinutes, clinical, onOpen, onBreak, onOpenSlot }) => {
  const dark = useIsDark();
  const y = (m: number) => ((m - from * 60) / 60) * HP;
  const hatch = `repeating-linear-gradient(135deg, ${INK.soft} 0 6px, transparent 6px 12px)`;
  const timed = items.filter((i) => !i.allDay && i.start);
  const { lane, count } = lanesOf(timed);
  const gold = dark ? GOLD_TEXT_DARK : GOLD_TEXT;
  return (
    <>
      <div className="relative" style={{ height: (to - from) * HP }}>
        {Array.from({ length: to - from + 1 }, (_, k) => {
          const h = from + k;
          return (
            <div key={h} data-hour={h} className="absolute left-0 right-0 flex" style={{ top: k * HP, borderTop: `1px solid ${INK.b06}` }}>
              <span className="shrink-0 text-right" style={{ fontSize: textPx(9), color: INK.chF, marginTop: -6, paddingRight: 6, width: 36 }}>
                {hourLabel12(h)}
              </span>
            </div>
          );
        })}
        {offBands(windows, from, to).map((b) => (
          <div key={`off${b.start}`} aria-hidden className="absolute" style={{ left: 40, right: 0, top: y(b.start), height: y(b.end) - y(b.start), background: hatch, borderRadius: 8 }} />
        ))}
        {breaks.map((b) => (
          <button
            key={`br${b.entry.key}${b.start}`}
            type="button"
            onClick={() => onBreak(b.entry)}
            className="tap absolute flex items-center text-left"
            style={{ left: 40, right: 4, top: y(minutes(b.start)), height: Math.max(y(minutes(b.end)) - y(minutes(b.start)), 26), borderRadius: 12, background: INK.soft, padding: "0 10px", gap: 6, fontSize: textPx(11), fontWeight: 600, color: INK.chF }}
          >
            <Coffee size={12} strokeWidth={2} aria-hidden />
            {b.entry.reason || "Break"}
          </button>
        ))}
        {open.map((o) => (
          <button
            key={`open${o.start}`}
            type="button"
            onClick={() => onOpenSlot(o.start)}
            aria-label={`Open slot, ${range12(o.start, o.end)}, add a session`}
            className="tap absolute flex items-center justify-between"
            style={{ left: 40, right: 4, top: y(minutes(o.start)), height: Math.max(y(minutes(o.end)) - y(minutes(o.start)), 26), borderRadius: 12, border: `1.5px dashed ${INK.b10}`, padding: "0 10px", fontSize: textPx(11), fontWeight: 600, color: INK.chF }}
          >
            Open slot
            <Plus size={13} strokeWidth={2} aria-hidden />
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
                className="tap absolute flex items-center text-left"
                style={{ left, width, top, height: hh, borderRadius: 12, border: `1.5px dashed ${BUSINESS_GOLD}`, padding: "0 10px", fontSize: textPx(11), fontWeight: 600, color: gold }}
              >
                <span className="truncate">{`Requested · ${i.name ?? i.title}`}</span>
              </button>
            );
          }
          const { tint, bar } = eventColours(i.colour, dark);
          // CA4: the client (or the class) on top, "{time_range} · {session type}" under it.
          const label = i.name ?? i.title;
          const sub = i.name ? i.title : i.place;
          return (
            <button
              key={i.key}
              type="button"
              onClick={() => onOpen(i)}
              className="tap absolute text-left overflow-hidden shadow-soft"
              style={{
                left,
                width,
                top,
                height: hh,
                borderRadius: 12,
                background: tint,
                borderLeft: `3px solid ${bar}`,
                padding: short ? "0 10px" : "6px 10px",
                display: short ? "flex" : "block",
                alignItems: "center",
                gap: 6,
                opacity: i.done || i.badge === "declined" ? 0.6 : 1,
              }}
            >
              <p className="flex items-center truncate" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.ch, gap: 4, minWidth: 0 }}>
                <span className="truncate">{label}</span>
                {i.kind === "business" && <Store size={10} strokeWidth={2} aria-label="Business" className="shrink-0" />}
                {i.done && <Check size={10} strokeWidth={2.4} aria-label="Completed" className="shrink-0" style={{ color: INK.good }} />}
              </p>
              <p className="truncate" style={{ fontSize: textPx(10), color: INK.chF }}>
                {[range12(i.start, i.end), sub].filter(Boolean).join(" · ")}
              </p>
            </button>
          );
        })}
        {nowMinutes !== null && nowMinutes >= from * 60 && nowMinutes <= to * 60 && (
          <div aria-hidden className="absolute" style={{ left: 36, right: 0, top: y(nowMinutes), height: 2, background: INK.hi }}>
            <span className="absolute" style={{ left: -4, top: -3, width: 8, height: 8, borderRadius: 9999, background: INK.hi }} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap" style={{ gap: "10px 14px", marginTop: 14, fontSize: textPx(10.5), color: INK.chF }}>
        <span className="flex items-center" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 14, height: 10, borderRadius: 3, background: `repeating-linear-gradient(135deg, ${INK.soft} 0 3px, transparent 3px 6px)`, border: `1px solid ${INK.b10}` }} />
          Outside working hours
        </span>
        <span className="flex items-center" style={{ gap: 5 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: BUSINESS_GOLD }} />
          Business
        </span>
        {clinical && (
          <span className="flex items-center" style={{ gap: 5 }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: FOLLOW_UP_PLUM }} />
            Follow-up
          </span>
        )}
      </div>
    </>
  );
};

/** A whole day of time off, above the Day timeline (not drawn: the Time off row's own shape). */
export const DayOffRow: React.FC<{ entry: TimeOffEntry; onOpen: () => void }> = ({ entry, onOpen }) => (
  <button type="button" onClick={onOpen} className="tap w-full flex items-center text-left" style={{ gap: 10, borderRadius: 15, padding: "12px 14px", background: INK.soft, marginBottom: 10 }}>
    <Plane size={14} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
    <span className="flex-1 min-w-0" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.ch }}>
      {entry.reason || "Time off"}
    </span>
    <span style={{ fontSize: textPx(10.5), color: INK.chF }}>All day</span>
  </button>
);
