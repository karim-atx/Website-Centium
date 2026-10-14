import type { CalendarEvent } from "../../types";

// Repeating events, expanded into the days they fall on (Database B3,
// 20261116020000: calendar_events.repeat_until + calendar_event_exceptions).
//
// THE SAME RULE THE REMINDER SWEEP USES (queue_calendar_event_alerts), so what
// the calendar draws and what gets pushed cannot disagree:
// - on or after the first date, and on or before repeat_until when there is one;
// - daily every day, weekly on the same weekday, monthly on the same day of the
//   month (a month without that day has no occurrence);
// - an exception for that date either cancels it or overrides title, times,
//   location, notes and all day for that one occurrence. The date itself is
//   never overridden.

/** The keys an override may carry (calendar_override_keys_ok). */
export interface OccurrenceOverride {
  title?: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  notes?: string | null;
  all_day?: boolean;
}

export interface OccurrenceException {
  cancelled: boolean;
  override: OccurrenceOverride | null;
}

/** Exceptions by event id, then by occurrence date (YYYY-MM-DD). */
export type ExceptionMap = Record<string, Record<string, OccurrenceException>>;

export interface Repeating {
  id: string;
  date: string;
  repeat: CalendarEvent["repeat"];
  repeatUntil?: string;
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The day before `date` (a "this and following" split ends the old series there). */
export function dayBefore(date: string): string {
  const d = parse(date);
  d.setDate(d.getDate() - 1);
  return iso(d);
}

/** `date` moved by `days`. */
export function addDays(date: string, days: number): string {
  const d = parse(date);
  d.setDate(d.getDate() + days);
  return iso(d);
}

/** Whole days from `a` to `b`. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

/** Every date in [from, to] the event falls on, before exceptions. */
export function occurrenceDates(e: Repeating, from: string, to: string): string[] {
  const end = e.repeatUntil && e.repeatUntil < to ? e.repeatUntil : to;
  if (e.repeat === "none") return e.date >= from && e.date <= to ? [e.date] : [];
  const out: string[] = [];
  const first = parse(e.date);
  if (e.repeat === "monthly") {
    const day = first.getDate();
    for (let k = 0; ; k++) {
      const d = new Date(first.getFullYear(), first.getMonth() + k, day);
      // A month without this day: JS rolls over; the sweep simply has none.
      if (d.getDate() !== day) continue;
      const s = iso(d);
      if (s > end) break;
      if (s >= from) out.push(s);
    }
    return out;
  }
  const step = e.repeat === "weekly" ? 7 : 1;
  let cursor = first;
  if (e.date < from) {
    const behind = daysBetween(e.date, from);
    const skip = Math.floor(behind / step) * step;
    cursor = parse(addDays(e.date, skip));
  }
  for (let s = iso(cursor); s <= end; s = addDays(s, step)) if (s >= from) out.push(s);
  return out;
}

/**
 * The events on screen between `from` and `to`, one item per occurrence.
 * Each keeps its series' id and gains `seriesDate` (the series' own first
 * date) and `date` = the day it falls on, with that day's override applied.
 */
export function expandOccurrences<
  T extends Repeating & {
    title: string;
    allDay: boolean;
    startTime?: string;
    endTime?: string;
    location?: string;
    notes?: string;
  },
>(events: T[], exceptions: ExceptionMap, from: string, to: string): (T & { seriesDate: string; overridden: boolean })[] {
  const out: (T & { seriesDate: string; overridden: boolean })[] = [];
  for (const e of events) {
    const byDate = exceptions[e.id] ?? {};
    for (const date of occurrenceDates(e, from, to)) {
      const x = byDate[date];
      if (x?.cancelled) continue;
      const o = x?.override ?? null;
      out.push({
        ...e,
        date,
        seriesDate: e.date,
        overridden: !!o,
        ...(o
          ? {
              title: o.title ?? e.title,
              allDay: o.all_day ?? e.allDay,
              startTime: o.start_time !== undefined ? o.start_time?.slice(0, 5) ?? undefined : e.startTime,
              endTime: o.end_time !== undefined ? o.end_time?.slice(0, 5) ?? undefined : e.endTime,
              location: o.location !== undefined ? o.location ?? undefined : e.location,
              notes: o.notes !== undefined ? o.notes ?? undefined : e.notes,
            }
          : null),
      });
    }
  }
  return out;
}

/** A stable key for one occurrence (the series id is shared by all of them). */
export const occurrenceKey = (e: { id: string; date: string }) => `${e.id}:${e.date}`;
