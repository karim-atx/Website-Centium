// Round J · J-2d: the events the phone's "Centium" calendar holds (website
// PLAN.md §2.3; App-Centium ROUND_J.md §6). Pure, so the rules are tested on
// their own; PhoneCalendarSync reads the lists and hands the result to
// calendar.sync(), which adds, moves and removes to match.
//
// - What goes in: the account's bookings (classes, appointments, hires: a
//   calendar_events row a booking made, source_kind set) and the sessions it
//   booked a place on (an accepted invitation), from the past 7 days to the
//   next 90. A professional also gets the classes they teach (my_calendar,
//   not cancelled). A business account gets nothing.
// - What stays out: the person's own events, programme sessions, sessions a
//   professional scheduled for a client, pending or declined invitations.
// - The id is stable ("event:<calendar_events id>", "class:<class session
//   id>"), so a later sync moves or removes the same event.
// - "Hide details on lock screen" on (notification_lock_screen_details =
//   false): every title is "Centium booking" and no location is written.
import type { PhoneCalendarEvent } from "../../platform/contracts";
import type { AccountType } from "../../types";

export const CALENDAR_PAST_DAYS = 7;
export const CALENDAR_NEXT_DAYS = 90;
/** A timed booking with no end time is written as this long. */
export const DEFAULT_MINUTES = 60;

/** A calendar_events row as getCalendar() returns it (the fields used here). */
export type BookedEventIn = {
  id: string;
  title: string;
  date: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  mine: boolean;
  sourceKind?: "class_booking" | "hire" | "appointment";
  invite?: { status: "pending" | "accepted" | "declined" };
  scheduledForClient?: boolean;
};

/** A class the professional teaches, as my_calendar returns it. */
export type TaughtClassIn = {
  classSessionId: string;
  title: string;
  location: string | null;
  date: string;
  start: string;
  end: string;
  status: "scheduled" | "cancelled" | "completed";
};

export type PhoneEventsInput = {
  accountType: AccountType;
  /** Local YYYY-MM-DD. */
  today: string;
  booked: BookedEventIn[];
  /** Null for anyone but a professional (or while not read). */
  taught: TaughtClassIn[] | null;
  /** notification_lock_screen_details = false. */
  hideDetails: boolean;
  /** "Centium booking", in the app's language. */
  neutralTitle: string;
};

/** Where each kind of event opens in the app (NativeOpenPath follows /app paths). */
export const BOOKINGS_PATH = "/app/marketplace/bookings?tab=upcoming";
export const CLIENT_CALENDAR_PATH = "/app/calendar";
export const TEACHING_PATH = "/app/professionals/calendar";

const pad = (n: number) => String(n).padStart(2, "0");

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** A local date and "HH:MM" (on this phone) as an ISO instant. */
export function localIso(date: string, time: string, plusMinutes = 0): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi + plusMinutes).toISOString();
}

export function calendarWindow(today: string): { from: string; to: string } {
  return { from: addDays(today, -CALENDAR_PAST_DAYS), to: addDays(today, CALENDAR_NEXT_DAYS) };
}

function timed(date: string, start: string, end: string | undefined): { start: string; end: string } {
  const s = localIso(date, start);
  const e = end && end > start ? localIso(date, end) : localIso(date, start, DEFAULT_MINUTES);
  return { start: s, end: e };
}

export function buildPhoneEvents(i: PhoneEventsInput): PhoneCalendarEvent[] {
  if (i.accountType === "business") return [];
  const { from, to } = calendarWindow(i.today);
  const inWindow = (d: string) => d >= from && d <= to;
  const title = (t: string) => (i.hideDetails ? i.neutralTitle : t);
  const place = (l: string | null | undefined) => (i.hideDetails ? null : l?.trim() || null);
  const out: PhoneCalendarEvent[] = [];

  for (const e of i.booked) {
    const booking = e.mine && !!e.sourceKind && !e.scheduledForClient;
    const place_ = !e.mine && e.invite?.status === "accepted";
    if ((!booking && !place_) || !inWindow(e.date)) continue;
    const when = e.allDay || !e.startTime ? { start: e.date, end: e.date } : timed(e.date, e.startTime, e.endTime);
    out.push({
      id: `event:${e.id}`,
      title: title(e.title),
      start: when.start,
      end: when.end,
      allDay: e.allDay || !e.startTime,
      location: place(e.location),
      url: booking ? BOOKINGS_PATH : CLIENT_CALENDAR_PATH,
    });
  }

  if (i.accountType === "professional") {
    for (const c of i.taught ?? []) {
      if (c.status === "cancelled" || !inWindow(c.date)) continue;
      const when = timed(c.date, c.start, c.end);
      out.push({ id: `class:${c.classSessionId}`, title: title(c.title), start: when.start, end: when.end, allDay: false, location: place(c.location), url: TEACHING_PATH });
    }
  }

  return out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.id < b.id ? -1 : 1));
}

/** The list without volatile parts, to sync only when it changed. */
export const eventsKey = (events: PhoneCalendarEvent[]): string => JSON.stringify(events);
