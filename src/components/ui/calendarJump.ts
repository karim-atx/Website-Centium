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
