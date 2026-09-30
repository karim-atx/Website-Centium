import React from "react";

/**
 * "Jump to today": the one control for returning a date view to today, used
 * by the Home / Food date row, the shared calendar sheet, the Calendar pages
 * and the Cycle scrubber. Each caller shows it ONLY when the selected or
 * visible date is not today, and wires it to select today and bring it into
 * view. A real button of its own — never nested inside another tappable
 * element, where the parent's hit box swallowed the tap (the old Home one was
 * a <span> inside the date button, so tapping it opened the picker instead).
 */
export const JumpToToday: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={`tap text-[10px] font-bold text-team-nav-accent bg-team-nav-accent/[0.14] rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap ${className ?? ""}`}
  >
    Jump to today
  </button>
);

/** yyyy-mm-dd of a local Date. */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * The Calendar pages' rule (year / month / week / day views): show the jump
 * when the selected day is not today, or the page is showing a year (year
 * view) or month (month view) other than today's. Jumping selects today, moves
 * the view to today's month, and scrolls today's cell ([data-today]) into view.
 */
export function calendarJump(opts: {
  view: "year" | "month" | "week" | "day";
  cursor: { year: number; month: number };
  selectedDate: string;
  setCursor: (c: { year: number; month: number }) => void;
  setSelectedDate: (d: string) => void;
  root?: HTMLElement | null;
}): { show: boolean; jump: () => void } {
  const now = new Date();
  const todayIso = iso(now);
  const show =
    opts.selectedDate !== todayIso ||
    opts.cursor.year !== now.getFullYear() ||
    (opts.view === "month" && opts.cursor.month !== now.getMonth());
  const jump = () => {
    opts.setCursor({ year: now.getFullYear(), month: now.getMonth() });
    opts.setSelectedDate(todayIso);
    // After React has rendered today's month / week.
    window.setTimeout(() => {
      const target = (opts.root ?? document).querySelector<HTMLElement>("[data-today]");
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
  };
  return { show, jump };
}
