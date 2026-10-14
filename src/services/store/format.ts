import { clock12 } from "../../utils/time12";
import { DAY_SHORT, mondayIndex } from "../../utils/week";

// Display helpers for orders, returns and appointments (12-hour, Monday-first
// week names, money from recorded amounts only).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "$58.00", "$1,240.00": the order screens' two-decimal form (OP1-005 row 8). */
export function money(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "$58", "$42.50": the product list's form (OP1-008 row 8 draws whole dollars). */
export function moneyShort(n: number): string {
  return "$" + (Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Mon 6 Oct". */
export function shortDate(d: Date): string {
  return `${DAY_SHORT[mondayIndex(d.getDay())]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "6 Oct". */
export function dayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "today", "yesterday", else "Mon 6 Oct" (OP1-005 row 5, OURS). */
export function dayWord(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return "today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "yesterday";
  return shortDate(d);
}

/** "Today", "Tomorrow", else "Mon 13 Oct" (capitalised, for fields and labels). */
export function dayTitle(d: Date, now = new Date()): string {
  if (sameDay(d, now)) return "Today";
  const t = new Date(now);
  t.setDate(now.getDate() + 1);
  if (sameDay(d, t)) return "Tomorrow";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  return shortDate(d);
}

/** "today, 6:12 PM" / "Mon 6 Oct, 6:12 PM". */
export function dayClock(iso: string, now = new Date()): string {
  return `${dayWord(iso, now)}, ${clock12(iso)}`;
}

/** Order age in a list row: "12 min ago", "1 h ago"; after 24 hours "Mon 6 Oct, 6:12 PM" (OP1-001 row 13). */
export function ageLabel(iso: string, now = new Date()): string {
  const mins = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${shortDate(new Date(iso))}, ${clock12(iso)}`;
}

/** Completed-list time: "4:10 PM" today, "Mon 4:10 PM" this week, "6 Oct" earlier (OURS-OP1-store-orders-completed row 8). */
export function completedWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (sameDay(d, now)) return clock12(iso);
  if (startOfWeekMs(d) === startOfWeekMs(now)) return `${DAY_SHORT[mondayIndex(d.getDay())]} ${clock12(iso)}`;
  return dayMonth(d);
}

export function startOfWeekMs(d: Date): number {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - mondayIndex(s.getDay()));
  return s.getTime();
}

/** "Today" / "This week" / "Earlier" bucket for the Completed tab. */
export function completedBucket(iso: string, now = new Date()): "today" | "week" | "earlier" {
  const d = new Date(iso);
  if (sameDay(d, now)) return "today";
  if (startOfWeekMs(d) === startOfWeekMs(now)) return "week";
  return "earlier";
}

/** A local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
