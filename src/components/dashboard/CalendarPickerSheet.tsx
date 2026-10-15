import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { JumpToToday } from "../ui/JumpToToday";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { useBackCloses } from "../../hooks/useBackCloses";
import { DAY_LETTERS, monthLeadingBlanks } from "../../utils/week";

// Monday first (v6 X-13), from utils/week.
const WEEKDAYS = DAY_LETTERS;

/**
 * Mobile v5.1 R3, dark mode (no light islands): the lavender chrome as
 * [light, dark]. Shell primary.tint #303141 with a primary.accent hairline
 * and a primary.deeper title (7.4:1); the month bar primary.tint.2 #2B2C3A;
 * weekday letters and chevrons tabs.inactive.text #B7ABDE (6.5:1 on the bar,
 * 7.8:1 on the card); a day past maxDate the board's disabled text #8A8698.
 * The panel, month label and day numbers take cream-card / charcoal.
 */
const CAL_COLORS = {
  shell: ["rgb(var(--th-edeafe))", "rgb(var(--th-303141))"],
  hairline: ["rgb(var(--th-7155ca))", "rgb(var(--th-9a8cd6))"],
  title: ["rgb(var(--th-7155ca))", "rgb(var(--th-c8bfe9))"],
  bar: ["rgb(var(--th-f6f4fe))", "rgb(var(--th-2b2c3a))"],
  accent: ["rgb(var(--th-5b3fe4))", "rgb(var(--th-b7abde))"],
  future: ["#CFCBD6", "#8A8698"],
  day: ["#000000", "rgb(var(--c-charcoal))"],
} as const;

// Local getters, formatted by hand — d is built with the local `new Date(y,
// m, day)` constructor, so going through toISOString() here would round-trip
// through UTC and silently land on the wrong day in any UTC+ timezone.
function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// V4 (QA 4.0): a top-anchored dropdown that slides down, rather than the
// shared BottomSheet's slide-up-from-bottom pattern — a calendar picker
// reads as an extension of the date bar it's opened from, not a full
// modal form. Portaled to <body> for the same reason as BottomSheet (an
// ancestor's `animate-fade-slide-up` transform would otherwise clip a
// `position: fixed` popover to that ancestor's box).
//
// Master handover (CentiumFrame `ovCalendarLav`): its own lavender chrome —
// a #EDEAFE shell with a #7155CA hairline and a centred 20px title, a white
// panel beneath holding a #F6F4FE month bar, #5B3FE4 weekday letters and
// chevrons, and the selected day filled #AB9ED7. There is no close button;
// tapping the backdrop closes it.
//
// Handover 2026-09-29, 02 "CalendarPickerSheet": the shared picker gains
// optional, off-by-default extras so Home and Food are unaffected —
//   title      replaces "Choose a date" ("Change workout date", "Measured on")
//   markers    a 4px #AB9ED7 dot under each listed day (white on the selected day)
//   maxDate    later days greyed #CFCBD6 and unselectable; next-month arrow
//              disabled past it
//   confirm    tapping a day only selects it; a filled lavender "Done" footer
//              applies it (children render between the grid and Done — e.g. the
//              WO4.1 wheel time picker)
export const CalendarPickerSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
  title?: string;
  markers?: ReadonlySet<string> | readonly string[];
  maxDate?: string;
  confirm?: boolean;
  confirmLabel?: string;
  /** Rendered above Done; a function receives the day currently picked (WO4.1's time wheel greys later times on today). */
  children?: React.ReactNode | ((pendingDate: string) => React.ReactNode);
  /**
   * v6 Part B (Health B HE1.6.1.a "Measured on", HE1.9.2.2a report date,
   * HE1.8.1 / HE1.8.2 date fields): a centred white card 350 wide, r24, pad
   * 18 (dark #1C1F28, no shadow), the title 17/25.5 800 left, the month bar
   * 314 × 40 r16, days 32 r10 13.5/20.3 500, the selected day #A79AD5 800
   * white (dark #A991FE / #0D0B1A), children under a 0.5px rule, and Cancel /
   * Done side by side (46, r14). Implies `confirm`. Default "default" is the
   * lavender drop-down above, unchanged.
   */
  variant?: "default" | "partB";
  /** Earlier days greyed and unselectable (HE1.8.2: past days disabled); the previous-month arrow stops at it. */
  minDate?: string;
  /**
   * Light day-number ink of the default variant. "black" (default) is the
   * Part B calendar's #000000 (calendar-handover rows 18-19); "ink" is the
   * page ink #241F1B (BU AN3-018 row 7, the New class Date card). Dark is
   * charcoal (#F5F3FA) either way.
   */
  dayInk?: "black" | "ink";
}> = ({ open, onClose, selectedDate, today, onSelect, title = "Choose a date", markers, maxDate, confirm, confirmLabel = "Done", children, variant = "default", minDate, dayInk = "black" }) => {
  // Batch E (E5): the phone's back closes this first.
  useBackCloses(open, onClose);
  const dark = useIsDark();
  const cal = (key: keyof typeof CAL_COLORS) => CAL_COLORS[key][dark ? 1 : 0];
  const [cursor, setCursor] = useState(() => new Date(`${selectedDate}T00:00:00`));
  const [pending, setPending] = useState(selectedDate);

  useEffect(() => {
    if (open) {
      setCursor(new Date(`${selectedDate}T00:00:00`));
      setPending(selectedDate);
    }
  }, [open, selectedDate]);

  const markerSet = markers ? new Set(markers) : null;

  if (!open) return null;
  if (variant === "partB") {
    return (
      <PartBCalendar
        onClose={onClose}
        cursor={cursor}
        setCursor={setCursor}
        pending={pending}
        setPending={setPending}
        today={today}
        title={title}
        maxDate={maxDate}
        minDate={minDate}
        markerSet={markerSet}
        confirmLabel={confirmLabel}
        onDone={() => {
          onSelect(pending);
          onClose();
        }}
        dark={dark}
      >
        {typeof children === "function" ? children(pending) : children}
      </PartBCalendar>
    );
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startWeekday = monthLeadingBlanks(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const shown = confirm ? pending : selectedDate;
  // The next month is out of reach once its first day is past maxDate.
  const nextMonthBlocked = !!maxDate && toIso(new Date(year, month + 1, 1)) > maxDate;
  // Only when today is not both shown and picked; it picks today (as a tap on
  // today's cell would) and turns the page to today's month.
  const todayDate = new Date(`${today}T00:00:00`);
  const showJump = shown !== today || year !== todayDate.getFullYear() || month !== todayDate.getMonth();
  const jumpToToday = () => {
    setCursor(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
    if (confirm) {
      setPending(today);
      return;
    }
    onSelect(today);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+80px)]">
        <div
          className="relative w-full max-w-[398px] shadow-lift overflow-hidden animate-drop-down"
          style={{ background: cal("shell"), borderRadius: 28, border: `1px solid ${cal("hairline")}` }}
        >
          <div className="flex items-center justify-center" style={{ height: 37 }}>
            <p style={{ margin: 0, fontSize: textPx(20), fontWeight: 800, letterSpacing: "-0.015em", color: cal("title") }}>
              {title}
            </p>
          </div>

          <div style={{ background: "rgb(var(--c-cream-card))", borderRadius: "22px 22px 0 0", padding: "14px 12px 16px" }}>
            <div
              className="flex items-center justify-between"
              style={{ background: cal("bar"), borderRadius: 16, height: 40, padding: "0 12px", marginBottom: 10 }}
            >
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="tap flex items-center justify-center"
                style={{ width: 26, height: 26, color: cal("accent") }}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} strokeWidth={2.2} />
              </button>
              <span className="flex items-center" style={{ gap: 8 }}>
                <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>{monthLabel}</p>
                {showJump && <JumpToToday onClick={jumpToToday} />}
              </span>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                disabled={nextMonthBlocked}
                className="tap flex items-center justify-center disabled:opacity-30"
                style={{ width: 26, height: 26, color: cal("accent") }}
                aria-label="Next month"
              >
                <ChevronRight size={16} strokeWidth={2.2} />
              </button>
            </div>

            <div className="grid grid-cols-7" style={{ gap: 2, marginBottom: 2 }}>
              {WEEKDAYS.map((w, i) => (
                <div
                  key={i}
                  className="text-center"
                  style={{ fontSize: textPx(13), fontWeight: 600, color: cal("accent"), padding: "6px 0" }}
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7" style={{ gap: 2 }}>
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const iso = toIso(d);
                const isSelected = iso === shown;
                // v6 Batch 4 (AN3-018 row 10): minDate greys and blocks earlier
                // days here too, as it already did in the Part B variant.
                const isFuture = (!!maxDate && iso > maxDate) || (!!minDate && iso < minDate);
                const marked = !!markerSet?.has(iso);
                return (
                  <button
                    key={i}
                    disabled={isFuture}
                    onClick={() => {
                      if (confirm) {
                        setPending(iso);
                        return;
                      }
                      onSelect(iso);
                      onClose();
                    }}
                    data-today={iso === today || undefined}
                    className="tap relative aspect-square flex items-center justify-center"
                    style={{
                      borderRadius: 12,
                      fontSize: textPx(15),
                      fontWeight: isSelected ? 600 : 500,
                      background: isSelected ? "rgb(var(--c-fill-day))" : "transparent",
                      color: isSelected ? "rgb(var(--c-on-primary-fill))" : isFuture ? cal("future") : dayInk === "ink" ? "rgb(var(--c-charcoal))" : cal("day"),
                    }}
                  >
                    {d.getDate()}
                    {marked && (
                      <span
                        aria-hidden
                        className="absolute left-1/2 -translate-x-1/2 rounded-full"
                        style={{ bottom: 5, width: 4, height: 4, background: isSelected ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--th-ab9ed7))" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {typeof children === "function" ? children(pending) : children}
            {confirm && (
              <button
                onClick={() => {
                  onSelect(pending);
                  onClose();
                }}
                className="tap w-full flex items-center justify-center"
                style={{ marginTop: 14, height: 44, borderRadius: 14, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(15), fontWeight: 700 }}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * The Part B calendar card (HE1.6.1.a #76-#93). Values are the table's; dark
 * derivations recorded in the checklist: month bar #F6F4FE* → #303141,
 * weekday letters / chevrons #5B3FE4* → #C3B3FB, a blocked day #575170.
 * Scrim backdrop.dim rgba(36,31,27,0.4) in both modes (X-07).
 */
const PartBCalendar: React.FC<{
  onClose: () => void;
  cursor: Date;
  setCursor: (d: Date) => void;
  pending: string;
  setPending: (iso: string) => void;
  today: string;
  title: string;
  maxDate?: string;
  minDate?: string;
  markerSet: Set<string> | null;
  confirmLabel: string;
  onDone: () => void;
  dark: boolean;
  children?: React.ReactNode;
}> = ({ onClose, cursor, setCursor, pending, setPending, today, title, maxDate, minDate, markerSet, confirmLabel, onDone, dark, children }) => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const blanks = monthLeadingBlanks(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const nextBlocked = !!maxDate && toIso(new Date(year, month + 1, 1)) > maxDate;
  const prevBlocked = !!minDate && toIso(new Date(year, month, 0)) < minDate;
  const accent = dark ? "rgb(var(--c-primary-deep-text))" : "rgb(var(--thi-5b3fe4))";
  const muted = dark ? "#575170" : "#CFCBD6";
  const btn = { height: 46, borderRadius: 14, fontSize: textPx(14), lineHeight: "21px", fontWeight: 700 } as const;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 animate-fade-in" style={{ background: "var(--backdrop-dim)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-variant="partB"
        className="relative w-full bg-cream-card animate-popup-in max-h-[calc(100dvh-96px)] overflow-y-auto overscroll-contain"
        style={{ maxWidth: 350, borderRadius: 24, padding: 18, boxShadow: dark ? "none" : "var(--shadow-sheet)" }}
      >
        <p style={{ margin: "0 0 12px", fontSize: textPx(17), lineHeight: "25.5px", fontWeight: 800, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>
          {title}
        </p>
        <div className="flex items-center justify-between bg-th-f6f4fe dark:bg-th-303141" style={{ height: 40, borderRadius: 16, padding: "0 8px" }}>
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            disabled={prevBlocked}
            className="tap relative flex items-center justify-center disabled:opacity-30 before:absolute before:-inset-[9px] before:content-['']"
            style={{ width: 26, height: 26, color: accent }}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
          <p style={{ margin: 0, fontSize: textPx(15), lineHeight: "22.5px", fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>{monthLabel}</p>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            disabled={nextBlocked}
            className="tap relative flex items-center justify-center disabled:opacity-30 before:absolute before:-inset-[9px] before:content-['']"
            style={{ width: 26, height: 26, color: accent }}
            aria-label="Next month"
          >
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="grid grid-cols-7" style={{ gap: 2, marginTop: 6 }}>
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center" style={{ padding: "4px 0", fontSize: textPx(13), lineHeight: "19.5px", fontWeight: 600, color: accent }}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7" style={{ columnGap: 2, rowGap: 4, marginTop: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const iso = toIso(d);
            const selected = iso === pending;
            const blocked = (!!maxDate && iso > maxDate) || (!!minDate && iso < minDate);
            return (
              <div key={i} className="flex justify-center">
                <button
                  disabled={blocked}
                  onClick={() => setPending(iso)}
                  data-today={iso === today || undefined}
                  aria-pressed={selected}
                  className={`tap relative flex items-center justify-center ${selected ? "bg-seg-active" : ""}`}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    fontSize: textPx(13.5),
                    lineHeight: "20.3px",
                    fontWeight: selected ? 800 : 500,
                    color: selected ? "rgb(var(--c-on-primary-fill))" : blocked ? muted : "rgb(var(--c-charcoal))",
                  }}
                >
                  {d.getDate()}
                  {markerSet?.has(iso) && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 -translate-x-1/2 rounded-full"
                      style={{ bottom: 3, width: 4, height: 4, background: selected ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--th-ab9ed7))" }}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
        {children && <div style={{ marginTop: 6, paddingTop: 6, borderTop: "0.5px solid var(--hair-08)" }}>{children}</div>}
        <div className="flex" style={{ gap: 8, marginTop: 14 }}>
          <button
            onClick={onClose}
            className="tap flex-1 min-w-0 flex items-center justify-center bg-cream-card"
            style={{ ...btn, border: `0.5px solid ${dark ? "rgba(245,243,250,0.14)" : "rgba(36,31,27,0.14)"}`, color: "rgb(var(--c-charcoal-soft))" }}
          >
            Cancel
          </button>
          <button onClick={onDone} className="tap flex-1 min-w-0 flex items-center justify-center bg-fill-pinned" style={{ ...btn, color: "rgb(var(--c-on-primary-fill))" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
