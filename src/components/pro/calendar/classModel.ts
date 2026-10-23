// Market + Share 3.0 · W5 · the classes on the professional's calendar (P-CA):
// the live assigned business classes (services/business-classes, today's
// source) and the hired class events (my_calendar, DB9), merged into one
// shape the agenda rows, the Day timeline, the Month dots and the Class sheet
// read. Pure (type-only imports and the pure calendar-sync model), so
// node:test runs it.
//
// Decision (W5-A, D-40 within the no-fake-data rule): a LIVE assigned class
// takes the hired-event look (its colour's 16% tint, the 3px bar, the 30px
// dashed stub with the ticket tick) with a colour from the fixed palette
// (classColour: a stable hash of its series id, else its own id). It never
// says "Hired via Centium", and shows no pay and no booked count: the live
// row carries none of them, and an assigned class isn't necessarily a
// Centium hire. Its Repeats line comes from its own series' sessions on this
// calendar. When my_calendar answers, its event for the same class session
// replaces the live row (one row per session), and only events with a hire
// carry the "Hired via Centium" mark.

import { classColour, recurrenceText, weekdayOf, type HiredClassEvent, type HiredStatus } from "../../../services/calendar-sync/model";

/** The live assigned class fields read here (services/business-classes BusinessClassRow + businessName). */
export interface LiveClass {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  seriesId?: string | null;
  businessName: string;
}

export interface ClassInfo {
  /** From my_calendar with a hire: the "Hired via Centium" mark, pay and bookings may show. */
  hired: boolean;
  sessionId: string;
  seriesId: string | null;
  hireId: string | null;
  businessId: string | null;
  businessName: string;
  title: string;
  roleTitle: string | null;
  location: string | null;
  recurrence: string | null;
  booked: number | null;
  capacity: number | null;
  pay: number | null;
  status: HiredStatus;
  /** The gym changed this session (updated_fields): the "Updated" badge. */
  updated: boolean;
  notes: string | null;
  colour: string;
  date: string;
  start: string;
  end: string;
}

export function liveInfo(c: LiveClass, all: readonly LiveClass[]): ClassInfo {
  const days = c.seriesId ? all.filter((x) => x.seriesId === c.seriesId).map((x) => weekdayOf(x.date)) : [];
  return {
    hired: false,
    sessionId: c.id,
    seriesId: c.seriesId ?? null,
    hireId: null,
    businessId: null,
    businessName: c.businessName,
    title: c.title,
    roleTitle: null,
    location: null,
    recurrence: recurrenceText(null, days),
    booked: null,
    capacity: null,
    pay: null,
    status: "scheduled",
    updated: false,
    notes: c.notes,
    colour: classColour(null, c.seriesId ?? c.id),
    date: c.date,
    start: c.startTime,
    end: c.endTime,
  };
}

export function hiredInfo(e: HiredClassEvent): ClassInfo {
  return {
    hired: !!e.hireId,
    sessionId: e.classSessionId,
    seriesId: e.classSeriesId,
    hireId: e.hireId,
    businessId: e.businessId,
    businessName: e.businessName,
    title: e.title,
    // my_calendar carries the role (role_title) and the gym's series colour
    // (Database #38; null → the palette). It has no changed-fields list, so
    // the "Updated" badge stays off (Database gap, W5.md).
    roleTitle: e.hireId ? e.roleTitle : null,
    location: e.location,
    recurrence: recurrenceText(e.recurrenceLabel, []),
    booked: e.bookedCount,
    capacity: e.capacity,
    pay: e.payPerSession,
    status: e.status,
    updated: false,
    notes: null,
    colour: classColour(e.colour, e.classSeriesId ?? e.classSessionId),
    date: e.date,
    start: e.start,
    end: e.end,
  };
}

/** One row per class session: a my_calendar event wins over the live row of the same session. */
export function mergeClasses(live: readonly LiveClass[], hired: readonly HiredClassEvent[]): ClassInfo[] {
  const seen = new Set(hired.map((e) => e.classSessionId));
  return [...hired.map(hiredInfo), ...live.filter((c) => !seen.has(c.id)).map((c) => liveInfo(c, live))];
}

export type ClassBadge = "cancelled" | "completed" | "updated" | null;

/** Cancelled (red, struck, 55%), Completed (good, 60%), Updated (the class colour); else none. */
export function classBadge(i: Pick<ClassInfo, "status" | "updated">): ClassBadge {
  if (i.status === "cancelled") return "cancelled";
  if (i.status === "completed") return "completed";
  return i.updated ? "updated" : null;
}

/** The Month grid's two dot rows for a day: own sessions (booked) and classes (not cancelled). */
export function dayDots(items: readonly { kind: string; badge: string | null; cls?: Pick<ClassInfo, "status"> }[]): { own: boolean; cls: boolean } {
  let own = false;
  let cls = false;
  for (const i of items) {
    if (i.kind === "class") cls ||= i.cls?.status !== "cancelled";
    else if (i.kind !== "request" && i.badge !== "declined") own = true;
  }
  return { own, cls };
}
