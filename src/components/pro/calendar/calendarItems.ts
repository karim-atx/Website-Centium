// Release 3 · W4 Calendar: everything on the professional's calendar as one
// list of items per day (CA1 agenda rows, CA3 week cards, CA4 day blocks).

import { expandOccurrences, occurrenceKey } from "../../calendar/occurrences";
import type { ClientCalendarEvent } from "../../../services/calendar";
import type { BookingRow, DueFollowUp, SessionExtras } from "../../../services/pro/calendar";
import type { ProCalendarData } from "./useProCalendar";
import { isoOf, minutes } from "./calendarModel";
import { classBadge, mergeClasses, type ClassInfo } from "./classModel";

export type ItemKind = "session" | "event" | "invite" | "class" | "request" | "followup" | "programme";
export type ItemBadge = "completed" | "cancelled" | "updated" | "followup" | "request" | "invitation" | "going" | "declined" | "scheduled" | null;

export interface CalItem {
  key: string;
  kind: ItemKind;
  date: string;
  allDay: boolean;
  start?: string;
  end?: string;
  /** The client's (or the class's) name, shown before the title. */
  name: string | null;
  title: string;
  place: string | null;
  colour: string;
  badge: ItemBadge;
  done: boolean;
  clientId: string | null;
  event?: ClientCalendarEvent;
  request?: BookingRow;
  followUp?: DueFollowUp;
  extras?: SessionExtras;
  /** A gym class (live assigned or hired; P-CA). */
  cls?: ClassInfo;
}

/** Board colours (cal.js SES): the request gold, the follow-up plum. */
export const REQUEST_GOLD = "#D9A441";
export const FOLLOW_UP_PLUM = "#9C4F7C";
export const DEFAULT_SESSION = "#7D6BB5";

const placeOf = (e: { location?: string; url?: string }) => (e.location ? e.location : e.url ? "Online" : null);
const localHHMM = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function buildItems(d: ProCalendarData, from: string, to: string): Record<string, CalItem[]> {
  const out: Record<string, CalItem[]> = {};
  const push = (i: CalItem) => (out[i.date] ??= []).push(i);
  const linkedFollowUp = new Map(d.followUps.filter((f) => f.calendarEventId).map((f) => [f.calendarEventId!, f]));

  for (const e of expandOccurrences(d.events, d.exceptions, from, to)) {
    const base = { key: occurrenceKey(e), date: e.date, allDay: e.allDay, start: e.startTime, end: e.endTime, place: placeOf(e), event: e as ClientCalendarEvent };
    if (e.invite) {
      push({
        ...base,
        kind: "invite",
        name: null,
        title: e.title,
        colour: e.color ?? DEFAULT_SESSION,
        badge: e.invite.status === "accepted" ? "going" : e.invite.status === "declined" ? "declined" : "invitation",
        done: false,
        clientId: null,
      });
      continue;
    }
    if (e.scheduledForClient) {
      push({ ...base, kind: "programme", name: null, title: e.title, colour: e.color ?? "#6F9993", badge: "scheduled", done: false, clientId: null });
      continue;
    }
    if (!e.mine) continue;
    const guest = (d.invitees[e.id] ?? []).find((i) => i.status !== "declined") ?? null;
    const extras = d.extras[e.id];
    const fu = linkedFollowUp.get(e.id);
    const completed = extras?.outcome === "completed";
    push({
      ...base,
      kind: fu ? "followup" : guest ? "session" : "event",
      name: guest ? d.names[guest.userId] || guest.name : null,
      title: e.title,
      colour: fu ? FOLLOW_UP_PLUM : e.color ?? DEFAULT_SESSION,
      badge: completed ? "completed" : fu ? "followup" : null,
      done: completed,
      clientId: guest?.userId ?? null,
      extras,
    });
  }

  // Market + Share 3.0 W5 (P-CA, D-40): the gym classes, the live assigned
  // rows merged with the my_calendar hired events (classModel), each in its
  // class colour (the gold "Scheduled by" look is gone).
  for (const c of mergeClasses(d.classes, d.hired)) {
    if (c.date < from || c.date > to) continue;
    const badge = classBadge(c);
    push({
      key: `class:${c.sessionId}`,
      kind: "class",
      date: c.date,
      allDay: false,
      start: c.start,
      end: c.end,
      name: c.title,
      title: c.businessName,
      place: c.location,
      colour: c.colour,
      badge,
      done: badge === "completed",
      clientId: null,
      cls: c,
    });
  }

  for (const r of d.requests) {
    const date = isoOf(new Date(r.startsAt));
    if (date < from || date > to) continue;
    push({
      key: `req:${r.id}`,
      kind: "request",
      date,
      allDay: false,
      start: localHHMM(r.startsAt),
      end: localHHMM(r.endsAt),
      name: (r.clientId && d.names[r.clientId]) || null,
      title: r.serviceName,
      place: null,
      colour: REQUEST_GOLD,
      badge: "request",
      done: false,
      clientId: r.clientId,
      request: r,
    });
  }

  for (const f of d.followUps) {
    if (f.calendarEventId || f.status !== "planned" || f.dueOn < from || f.dueOn > to) continue;
    push({
      key: `fu:${f.id}`,
      kind: "followup",
      date: f.dueOn,
      allDay: true,
      name: d.names[f.clientId] || null,
      title: f.note || "Follow-up",
      place: null,
      colour: FOLLOW_UP_PLUM,
      badge: "followup",
      done: false,
      clientId: f.clientId,
      followUp: f,
    });
  }

  for (const list of Object.values(out)) {
    list.sort((a, b) => (a.allDay === b.allDay ? minutes(a.start) - minutes(b.start) : a.allDay ? -1 : 1));
  }
  return out;
}

/** "{client_name} · {session_type}", or the title alone. */
export const primaryLine = (i: CalItem) => (i.name ? `${i.name} · ${i.title}` : i.title);
