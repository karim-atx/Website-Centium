import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { fetchInvitees, getCalendar, type ClientCalendarEvent, type InviteeRow } from "../../../services/calendar";
import { fetchClassesAssignedToMe, type BusinessClassRow } from "../../../services/business-classes";
import {
  fetchAvailability,
  fetchBookingRequests,
  fetchFollowUps,
  fetchSessionExtras,
  fetchSessionTypes,
  fetchTimeOff,
  type AvailabilityRow,
  type BookingRow,
  type DueFollowUp,
  type SessionExtras,
  type SessionType,
  type TimeOffRow,
} from "../../../services/pro/calendar";
import type { ExceptionMap } from "../../calendar/occurrences";
import { fetchMyCalendar, type HiredClassEvent, type NotificationLike, SYNC_KINDS } from "../../../services/calendar-sync";
import { fetchMemberInbox, markMemberRead } from "../../../services/pro/notifications";
import { CALENDAR_SYNC_KINDS } from "../../../services/notifications/notificationsModel";
import { addDays, groupTimeOff, isoOf, type TimeOffEntry } from "./calendarModel";

/**
 * Release 3 · W4 the professional calendar's data, in one place:
 * - own events, invitations and the sessions this account scheduled for a
 *   client through a programme (services/calendar getCalendar, as the client
 *   calendar reads them), with the invitees on own events;
 * - business classes a business assigned to this professional (kept from the
 *   old CalendarTab, FINAL_PLAN 2.4);
 * - DB-4: availability (pro-wide and per-business), time off, session types,
 *   booking requests, each session's outcome / type / price / paid state;
 * - Clinical overview: follow-ups due (care plans).
 * - Market + Share 3.0 W5 (P-CA): the hired class events (my_calendar, DB9;
 *   pending until it lands, then they replace the live class rows by session)
 *   and the unread calendar sync notices (the member inbox's calendar kinds,
 *   my_notifications(p_kinds = CALENDAR_SYNC_KINDS)).
 * A failed read keeps whatever was on screen (the rule every calendar here
 * follows): an empty calendar is a claim about somebody's day.
 */
export interface AssignedClass extends BusinessClassRow {
  businessName: string;
}

export interface ProCalendarData {
  loaded: boolean;
  error: boolean;
  online: boolean;
  events: ClientCalendarEvent[];
  exceptions: ExceptionMap;
  invitees: Record<string, InviteeRow[]>;
  classes: AssignedClass[];
  availability: AvailabilityRow[];
  timeOff: TimeOffRow[];
  timeOffEntries: TimeOffEntry[];
  types: SessionType[];
  requests: BookingRow[];
  extras: Record<string, SessionExtras>;
  followUps: DueFollowUp[];
  /** my_calendar's hired class events (empty while DB9 is pending). */
  hired: HiredClassEvent[];
  /** my_calendar answered (DB9 landed): the "Hired" words may show. */
  hiredLive: boolean;
  /** Unread calendar sync notifications (on hire, edited, cancelled, removed). */
  notices: NotificationLike[];
  dismissNotice: (id: string) => void;
  /** Display names by profile id: the roster first, then related_profile_summary. */
  names: Record<string, string>;
  reload: () => Promise<void>;
}

export function useProCalendar(clinical: boolean): ProCalendarData {
  const { authUserId, profileReady, professionalClients } = useApp();
  const online = useOnline();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionMap>({});
  const [invitees, setInvitees] = useState<Record<string, InviteeRow[]>>({});
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRow[]>([]);
  const [types, setTypes] = useState<SessionType[]>([]);
  const [requests, setRequests] = useState<BookingRow[]>([]);
  const [extras, setExtras] = useState<Record<string, SessionExtras>>({});
  const [followUps, setFollowUps] = useState<DueFollowUp[]>([]);
  const [extraNames, setExtraNames] = useState<Record<string, string>>({});
  const [hired, setHired] = useState<HiredClassEvent[]>([]);
  const [hiredLive, setHiredLive] = useState(false);
  const [notices, setNotices] = useState<NotificationLike[]>([]);

  const reload = useCallback(async () => {
    if (!authUserId) return;
    const today = isoOf(new Date());
    const from = addDays(today, -400);
    const to = addDays(today, 800);
    const [cal, cls, av, off, ty, rq, ex, fu, mc, nt] = await Promise.all([
      getCalendar(authUserId),
      fetchClassesAssignedToMe(authUserId),
      fetchAvailability(authUserId),
      fetchTimeOff(authUserId, from),
      fetchSessionTypes(authUserId),
      fetchBookingRequests(authUserId),
      fetchSessionExtras(authUserId, from, to),
      clinical ? fetchFollowUps(authUserId, from, to) : Promise.resolve({ ok: true as const, data: [] as DueFollowUp[] }),
      // awaiting DB stage DB9 (my_calendar)
      fetchMyCalendar(from, to),
      fetchMemberInbox(CALENDAR_SYNC_KINDS),
    ]);
    setLoaded(true);
    setError(!cal.ok || !av.ok || !off.ok || !ty.ok || !rq.ok);
    if (cal.ok) {
      setEvents(cal.events);
      setExceptions(cal.exceptions);
      setInvitees(await fetchInvitees(cal.events.filter((e) => e.mine).map((e) => e.id)));
    }
    if (cls.ok) setClasses(cls.classes);
    if (av.ok) setAvailability(av.data);
    if (off.ok) setTimeOff(off.data);
    if (ty.ok) setTypes(ty.data);
    if (rq.ok) setRequests(rq.data);
    setExtras(ex);
    if (fu.ok) setFollowUps(fu.data);
    if (mc.ok) {
      setHired(mc.value);
      setHiredLive(true);
    } else if (mc.pending) {
      setHired([]);
      setHiredLive(false);
    }
    // The member inbox's calendar kinds (Database 20261210600000).
    // awaiting DB stage DB12: nothing writes classes_added / class_changed / removed_from_team
    // (or class_cancelled to an instructor) yet.
    if (nt.ok) setNotices(nt.data.filter((n) => !n.readAt && !!SYNC_KINDS[n.kind]));
  }, [authUserId, clinical]);

  /** Seen: hidden here at once, read_at set on the server (the owner's own update). */
  const dismissNotice = useCallback((id: string) => {
    setNotices((list) => list.filter((n) => n.id !== id));
    void markMemberRead([id]);
  }, []);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    void reload();
  }, [profileReady, authUserId, reload]);

  // Back online after a failed read: one retry (OURS O-OF, as the client calendar).
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current && error) void reload();
    wasOnline.current = online;
  }, [online, error, reload]);

  // Names the roster doesn't hold (a booking request from someone new, a colleague).
  const rosterNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of professionalClients) if (c.clientId) m[c.clientId] = c.name;
    return m;
  }, [professionalClients]);
  const missing = useMemo(() => {
    const ids = new Set<string>();
    for (const r of requests) if (r.clientId && !rosterNames[r.clientId]) ids.add(r.clientId);
    for (const f of followUps) if (!rosterNames[f.clientId]) ids.add(f.clientId);
    return [...ids].filter((id) => !(id in extraNames)).sort();
  }, [requests, followUps, rosterNames, extraNames]);
  useEffect(() => {
    if (missing.length === 0) return;
    let live = true;
    void supabase
      .from("related_profile_summary")
      .select("id, first_name")
      .in("id", missing)
      .then(({ data }) => {
        if (!live) return;
        const m: Record<string, string> = {};
        for (const id of missing) m[id] = "";
        for (const r of data ?? []) if (r.id) m[r.id as string] = ((r.first_name as string | null) ?? "").trim();
        setExtraNames((prev) => ({ ...prev, ...m }));
      });
    return () => {
      live = false;
    };
  }, [missing]);

  const names = useMemo(() => {
    const m: Record<string, string> = { ...extraNames, ...rosterNames };
    // Invitees carry their own resolved first names.
    for (const list of Object.values(invitees)) for (const i of list) if (!m[i.userId]) m[i.userId] = i.name;
    return m;
  }, [extraNames, rosterNames, invitees]);

  const timeOffEntries = useMemo(() => groupTimeOff(timeOff), [timeOff]);

  return {
    loaded,
    error,
    online,
    events,
    exceptions,
    invitees,
    classes,
    availability,
    timeOff,
    timeOffEntries,
    types,
    requests,
    extras,
    followUps,
    hired,
    hiredLive,
    notices,
    dismissNotice,
    names,
    reload,
  };
}
