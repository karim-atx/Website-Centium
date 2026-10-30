// Release 3 · W4 Calendar: the pure parts (no DOM, no Supabase), so node
// --test can check them. Dates are "YYYY-MM-DD" local days; times "HH:MM".

import { minutesOfDay, range12 } from "../../../utils/time12";
import { appLocale } from "../../../i18n/format";

const pad = (n: number) => String(n).padStart(2, "0");

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

/** ISO weekday of a day: 1 = Monday … 7 = Sunday (instructor_availability.weekday). */
export function isoWeekday(iso: string): number {
  const js = new Date(`${iso}T00:00:00`).getDay();
  return js === 0 ? 7 : js;
}

/** "Thu, Oct 8" (COPY {day_date}: weekday and date from one value). */
export function dayDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" });
}

/** "Thu, Oct 8, 2026" (CA5 / CA14 Date field). */
export function fieldDate(iso: string): string {
  return `${dayDate(iso)}, ${iso.slice(0, 4)}`;
}

/** "Thursday, October 8" (S011, the Day navigator and the Month eyebrow). */
export function longDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" });
}

/** "Oct 5 to Oct 11, 2026" (COPY {date_range}, FINAL_PLAN section 3 item 5). */
export function dateRange(fromIso: string, toIso: string): string {
  const f = new Date(`${fromIso}T00:00:00`);
  const t = new Date(`${toIso}T00:00:00`);
  const dm = (d: Date) => `${d.toLocaleDateString(appLocale("en-US"), { month: "short" })} ${d.getDate()}`;
  const fromPart = f.getFullYear() === t.getFullYear() ? dm(f) : `${dm(f)}, ${f.getFullYear()}`;
  return `${fromPart} to ${dm(t)}, ${t.getFullYear()}`;
}

/** "$60", "$60.50": a stored price in its currency. */
export function money(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(appLocale("en-US"), {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function minutes(hhmm: string | null | undefined): number {
  return minutesOfDay(hhmm) ?? 0;
}

export function hhmmOf(total: number): string {
  // "24:00" is not a `time` the database stores; the end of the day is 23:59.
  const t = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

// ---------------------------------------------------------------------------
// Working hours
// ---------------------------------------------------------------------------

export interface HoursRow {
  businessId: string | null;
  weekday: number;
  start: string;
  end: string;
}

/** The pro-wide working windows on one day (one slot engine: business rows aside). */
export function workingWindows(rows: HoursRow[], iso: string): { start: string; end: string }[] {
  const wd = isoWeekday(iso);
  return rows
    .filter((r) => r.businessId === null && r.weekday === wd)
    .map((r) => ({ start: r.start, end: r.end }))
    .sort((a, b) => minutes(a.start) - minutes(b.start));
}

/** "8:00 AM to 6:30 PM" for a day's windows (several joined with ", "). */
export function hoursLabel(windows: { start: string; end: string }[]): string {
  return windows.map((w) => range12(w.start, w.end)).join(", ");
}

/**
 * The Day timeline's hours: 7 AM to 8 PM as the frame draws them, widened to
 * hold every timed item, working window and time-off block that falls outside.
 */
export function dayBounds(spans: { start: string; end: string }[]): { from: number; to: number } {
  let from = 7;
  let to = 20;
  for (const s of spans) {
    const a = Math.floor(minutes(s.start) / 60);
    const b = Math.ceil(minutes(s.end) / 60);
    if (a < from) from = Math.max(0, a);
    if (b > to) to = Math.min(24, b);
  }
  return { from, to };
}

/** Outside-working-hours bands between `from` and `to` (hours), as minute ranges. */
export function offBands(windows: { start: string; end: string }[], from: number, to: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let cursor = from * 60;
  for (const w of windows) {
    const a = minutes(w.start);
    const b = minutes(w.end);
    if (a > cursor) out.push({ start: cursor, end: Math.min(a, to * 60) });
    cursor = Math.max(cursor, b);
  }
  if (cursor < to * 60) out.push({ start: cursor, end: to * 60 });
  return out.filter((b) => b.end > b.start);
}

// ---------------------------------------------------------------------------
// Open slots (professional_open_slots) as windows
// ---------------------------------------------------------------------------

/**
 * The engine answers with every start it would accept (15 minutes apart).
 * Overlapping answers are one open window: "Open slot" from the first start
 * to the last end, per day, in the device's local time.
 */
export function slotWindows(slots: { startsAt: string; endsAt: string }[]): Record<string, { start: string; end: string }[]> {
  const byDay: Record<string, { a: number; b: number }[]> = {};
  for (const s of slots) {
    const a = new Date(s.startsAt);
    const b = new Date(s.endsAt);
    const day = isoOf(a);
    const am = a.getHours() * 60 + a.getMinutes();
    const bm = isoOf(b) === day ? b.getHours() * 60 + b.getMinutes() : 24 * 60;
    (byDay[day] ??= []).push({ a: am, b: bm });
  }
  const out: Record<string, { start: string; end: string }[]> = {};
  for (const [day, list] of Object.entries(byDay)) {
    list.sort((x, y) => x.a - y.a);
    const merged: { a: number; b: number }[] = [];
    for (const s of list) {
      const last = merged[merged.length - 1];
      if (last && s.a <= last.b) last.b = Math.max(last.b, s.b);
      else merged.push({ ...s });
    }
    out[day] = merged.map((m) => ({ start: hhmmOf(m.a), end: hhmmOf(m.b) }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Time off: rows → entries
// ---------------------------------------------------------------------------

export type TimeOffRepeat = "none" | "daily" | "weekdays" | "weekly";

export interface TimeOffInput {
  id: string;
  businessId: string | null;
  date: string;
  start: string | null;
  end: string | null;
  reason: string | null;
  createdAt: string;
}

export interface TimeOffEntry {
  key: string;
  ids: string[];
  dates: string[];
  start: string | null;
  end: string | null;
  reason: string | null;
  businessId: string | null;
  repeat: TimeOffRepeat;
}

/**
 * Rows written together (one insert: the same created_at, reason, hours and
 * owner) are one entry. The repeat is read back from the dates' spacing; a
 * set that matches no pattern reads as "none" (a range of single days).
 */
export function groupTimeOff(rows: TimeOffInput[]): TimeOffEntry[] {
  const groups = new Map<string, TimeOffInput[]>();
  for (const r of rows) {
    const key = [r.createdAt, r.businessId ?? "", r.reason ?? "", r.start ?? "", r.end ?? ""].join("|");
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  const out: TimeOffEntry[] = [];
  for (const [key, list] of groups) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const dates = list.map((r) => r.date);
    out.push({
      key,
      ids: list.map((r) => r.id),
      dates,
      start: list[0].start,
      end: list[0].end,
      reason: list[0].reason,
      businessId: list[0].businessId,
      repeat: repeatOf(dates),
    });
  }
  return out.sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
}

export function repeatOf(dates: string[]): TimeOffRepeat {
  if (dates.length < 2) return "none";
  const steps = dates.slice(1).map((d, i) => Math.round((new Date(`${d}T00:00:00`).getTime() - new Date(`${dates[i]}T00:00:00`).getTime()) / 86400000));
  if (steps.every((s) => s === 7)) return "weekly";
  if (steps.every((s) => s === 1)) return "daily";
  const allWeekdays = dates.every((d) => isoWeekday(d) <= 5);
  if (allWeekdays && dates.slice(1).every((d, i) => addDays(dates[i], isoWeekday(dates[i]) === 5 ? 3 : 1) === d)) return "weekdays";
  return "none";
}

/** The dates a time off covers: from `first` to `until` by the repeat (at most 366). */
export function timeOffDates(first: string, repeat: TimeOffRepeat, until: string | null): string[] {
  if (repeat === "none" || !until || until < first) return [first];
  const out: string[] = [];
  for (let d = first; d <= until && out.length < 366; d = addDays(d, repeat === "weekly" ? 7 : 1)) {
    if (repeat === "weekdays" && isoWeekday(d) > 5) continue;
    out.push(d);
  }
  return out.length ? out : [first];
}

// ---------------------------------------------------------------------------
// Reminders (CA12, CA22): two calendar_alert slots
// ---------------------------------------------------------------------------

export type AlertValue = "none" | "at_time" | "min_5" | "min_10" | "min_15" | "min_30" | "hour_1" | "hour_2" | "day_1" | "day_2" | "week_1";

/** The two reminders as the frames word them: "24 hours and 1 hour before". */
export function remindersLabel(a: AlertValue, b: AlertValue): string {
  const word: Partial<Record<AlertValue, string>> = {
    at_time: "At the start",
    min_5: "5 minutes",
    min_10: "10 minutes",
    min_15: "15 minutes",
    min_30: "30 minutes",
    hour_1: "1 hour",
    hour_2: "2 hours",
    day_1: "24 hours",
    day_2: "48 hours",
    week_1: "1 week",
  };
  const list = [a, b].filter((x) => x !== "none");
  if (list.length === 0) return "No reminder";
  if (list.length === 1) return list[0] === "at_time" ? "At the start" : `${word[list[0]]} before`;
  return `${word[list[0]]} and ${word[list[1]]} before`;
}

/** Repeat choices of CA12 ("Weekly · 8 times"). */
export const REPEAT_TIMES = [4, 8, 12] as const;

export function weeklyDates(first: string, times: number): string[] {
  return Array.from({ length: Math.max(1, times) }, (_, i) => addDays(first, i * 7));
}
