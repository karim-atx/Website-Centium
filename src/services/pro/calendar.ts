// Release 3 · W4 Calendar (CA1 to CA23): the professional's scheduling readers
// and writers (Database HANDOVER_API.md "Release 3", DB-4 · Scheduling and
// booking, and the "Release 3 follow-up · Time off and the today bar").
//
// One slot engine (J6): an independent professional's availability, time off
// and session types are the Business UI's own tables with business_id null
// (pro-wide). Rows a business keeps for this professional (business_id set)
// are read here and shown read only; the business console writes them.
// Whole-practice time off (business_id null) also blocks business slots
// (staff_is_free, the follow-up), so nothing extra is written for that.
//
// - instructor_availability: weekday 1 = Monday … 7 = Sunday (isodow).
// - instructor_unavailable_dates: one row per date; starts_time / ends_time
//   null = the whole day. reason (≤ 200) is the only text.
// - appointment_services: pro rows (professional_id, business_id null);
//   location_kind in_person | online | home_visit | phone, null = both.
// - professional_booking_policies (CA18 to CA21) and practice_settings'
//   default_alert / default_alert_2 (CA22). Column grants differ between
//   INSERT and UPDATE, so these are "update, else insert", never an upsert.
// - appointments: `requested` ones are booking requests; accept / decline /
//   cancel are the DB-4 functions (ATX08, ATX10, ATXG6).
// - calendar_events: outcome (set_session_outcome), paid (set_session_paid),
//   appointment_service_id and price on the professional's sessions.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import type { Read, Write } from "./clients";
import type { EventAlert } from "../../components/calendar/eventAlert";

const from = (table: string) => supabase.from(table as never);
const failed = (error: unknown, fallback: string): Write => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });
const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

// ---------------------------------------------------------------------------
// Availability (instructor_availability)
// ---------------------------------------------------------------------------

export interface AvailabilityRow {
  id: string;
  /** null = the professional's own practice. */
  businessId: string | null;
  businessName: string | null;
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;
  start: string;
  end: string;
  location: string | null;
}

export async function fetchAvailability(me: string): Promise<Read<AvailabilityRow[]>> {
  const { data, error } = await from("instructor_availability")
    .select("id, business_id, weekday, starts_at, ends_at, location, business_profiles(business_name)")
    .eq("professional_id", me)
    .order("weekday")
    .order("starts_at");
  if (error) return readFail(error);
  type Row = { id: string; business_id: string | null; weekday: number; starts_at: string; ends_at: string; location: string | null; business_profiles: { business_name: string } | null };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      businessId: r.business_id,
      businessName: r.business_profiles?.business_name ?? null,
      weekday: r.weekday,
      start: hhmm(r.starts_at)!,
      end: hhmm(r.ends_at)!,
      location: r.location,
    })),
  };
}

/**
 * One weekday's pro-wide hours: the day's own rows go, then one row with the
 * new hours (none for a day off). Business rows are never touched.
 */
export async function setDayHours(me: string, weekday: number, hours: { start: string; end: string } | null): Promise<Write> {
  const del = await from("instructor_availability").delete().eq("professional_id", me).is("business_id", null).eq("weekday", weekday);
  if (del.error) return failed(del.error, "Couldn't save your hours. Try again.");
  if (!hours) return { ok: true };
  const ins = await from("instructor_availability").insert({ professional_id: me, business_id: null, weekday, starts_at: hours.start, ends_at: hours.end } as never);
  if (ins.error) return failed(ins.error, "Couldn't save your hours. Try again.");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Time off (instructor_unavailable_dates)
// ---------------------------------------------------------------------------

export interface TimeOffRow {
  id: string;
  businessId: string | null;
  businessName: string | null;
  date: string;
  start: string | null;
  end: string | null;
  reason: string | null;
  createdAt: string;
}

export async function fetchTimeOff(me: string, fromDate: string): Promise<Read<TimeOffRow[]>> {
  const { data, error } = await from("instructor_unavailable_dates")
    .select("id, business_id, on_date, starts_time, ends_time, reason, created_at, business_profiles(business_name)")
    .eq("professional_id", me)
    .gte("on_date", fromDate)
    .order("on_date");
  if (error) return readFail(error);
  type Row = { id: string; business_id: string | null; on_date: string; starts_time: string | null; ends_time: string | null; reason: string | null; created_at: string; business_profiles: { business_name: string } | null };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      businessId: r.business_id,
      businessName: r.business_profiles?.business_name ?? null,
      date: r.on_date,
      start: hhmm(r.starts_time),
      end: hhmm(r.ends_time),
      reason: r.reason,
      createdAt: r.created_at,
    })),
  };
}

export interface TimeOffDraft {
  dates: string[];
  start: string | null;
  end: string | null;
  reason: string;
}

/** One row per date, in one statement (so the rows share created_at: one entry). */
export async function addTimeOff(me: string, d: TimeOffDraft): Promise<Write> {
  if (d.dates.length === 0) return { ok: true };
  const reason = d.reason.trim() || null;
  const { error } = await from("instructor_unavailable_dates").insert(
    d.dates.map((on_date) => ({ professional_id: me, business_id: null, on_date, starts_time: d.start, ends_time: d.end, reason })) as never
  );
  return error ? failed(error, "Couldn't save your time off. Try again.") : { ok: true };
}

export async function deleteTimeOff(ids: string[]): Promise<Write> {
  if (ids.length === 0) return { ok: true };
  const { error } = await from("instructor_unavailable_dates").delete().in("id", ids);
  return error ? failed(error, "Couldn't delete this time off. Try again.") : { ok: true };
}

/** An edit is the old rows out and the new rows in (a repeat may change its dates). */
export async function replaceTimeOff(me: string, ids: string[], d: TimeOffDraft): Promise<Write> {
  const del = await deleteTimeOff(ids);
  if (!del.ok) return del;
  return addTimeOff(me, d);
}

// ---------------------------------------------------------------------------
// Session types (appointment_services, pro rows)
// ---------------------------------------------------------------------------

export type LocationKind = "in_person" | "online" | "home_visit" | "phone" | null;

export interface SessionType {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  currency: string;
  bufferMin: number;
  colour: string | null;
  locationKind: LocationKind;
}

export async function fetchSessionTypes(me: string): Promise<Read<SessionType[]>> {
  const { data, error } = await from("appointment_services")
    .select("id, name, duration_min, price, currency, buffer_min, colour, location_kind")
    .eq("professional_id", me)
    .is("business_id", null)
    .eq("active", true)
    .order("created_at");
  if (error) return readFail(error);
  type Row = { id: string; name: string; duration_min: number; price: number | string; currency: string; buffer_min: number; colour: string | null; location_kind: LocationKind };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      name: r.name,
      durationMin: r.duration_min,
      price: Number(r.price) || 0,
      currency: r.currency,
      bufferMin: r.buffer_min,
      colour: r.colour,
      locationKind: r.location_kind,
    })),
  };
}

export interface SessionTypeDraft {
  name: string;
  durationMin: number;
  bufferMin: number;
  price: number;
  colour: string;
  locationKind: LocationKind;
}

export async function saveSessionType(me: string, id: string | null, d: SessionTypeDraft): Promise<Write> {
  const row = { name: d.name.trim(), duration_min: d.durationMin, buffer_min: d.bufferMin, price: d.price, colour: d.colour, location_kind: d.locationKind };
  const { error } = id
    ? await from("appointment_services").update(row as never).eq("id", id).eq("professional_id", me)
    : await from("appointment_services").insert({ ...row, professional_id: me, business_id: null } as never);
  return error ? failed(error, "Couldn't save this session type. Try again.") : { ok: true };
}

/** Deleting hides the type (active false): past sessions keep their link to it. */
export async function deleteSessionType(me: string, id: string): Promise<Write> {
  const { error } = await from("appointment_services").update({ active: false } as never).eq("id", id).eq("professional_id", me);
  return error ? failed(error, "Couldn't delete this session type. Try again.") : { ok: true };
}

// ---------------------------------------------------------------------------
// Booking policy (CA17 to CA21) and practice default reminders (CA22)
// ---------------------------------------------------------------------------

export type BookingAudience = "everyone" | "clients_only" | "approved_only";

export interface BookingPolicy {
  whoCanBook: BookingAudience;
  minNoticeHours: number;
  freeCancelHours: number;
  lateCancelPct: number;
  noShowPct: number;
  newClientApproval: boolean;
  windowDays: number;
  bookingLinkEnabled: boolean;
}

/** The column defaults: what applies while no row exists. */
export const DEFAULT_POLICY: BookingPolicy = {
  whoCanBook: "clients_only",
  minNoticeHours: 12,
  freeCancelHours: 24,
  lateCancelPct: 0,
  noShowPct: 0,
  newClientApproval: true,
  windowDays: 30,
  bookingLinkEnabled: false,
};

export async function fetchBookingPolicy(me: string): Promise<Read<BookingPolicy>> {
  const { data, error } = await from("professional_booking_policies")
    .select("who_can_book, min_notice_hours, free_cancel_hours, late_cancel_pct, no_show_pct, new_client_approval, window_days, booking_link_enabled")
    .eq("professional_id", me)
    .maybeSingle();
  if (error) return readFail(error);
  const r = data as unknown as {
    who_can_book: BookingAudience;
    min_notice_hours: number;
    free_cancel_hours: number;
    late_cancel_pct: number;
    no_show_pct: number;
    new_client_approval: boolean;
    window_days: number;
    booking_link_enabled: boolean;
  } | null;
  if (!r) return { ok: true, data: DEFAULT_POLICY };
  return {
    ok: true,
    data: {
      whoCanBook: r.who_can_book,
      minNoticeHours: r.min_notice_hours,
      freeCancelHours: r.free_cancel_hours,
      lateCancelPct: r.late_cancel_pct,
      noShowPct: r.no_show_pct,
      newClientApproval: r.new_client_approval,
      windowDays: r.window_days,
      bookingLinkEnabled: r.booking_link_enabled,
    },
  };
}

export async function saveBookingPolicy(me: string, p: BookingPolicy): Promise<Write> {
  const row = {
    who_can_book: p.whoCanBook,
    min_notice_hours: p.minNoticeHours,
    free_cancel_hours: p.freeCancelHours,
    late_cancel_pct: p.lateCancelPct,
    no_show_pct: p.noShowPct,
    new_client_approval: p.newClientApproval,
    window_days: p.windowDays,
    booking_link_enabled: p.bookingLinkEnabled,
  };
  const up = await from("professional_booking_policies").update(row as never).eq("professional_id", me).select("professional_id");
  if (up.error) return failed(up.error, "Couldn't save your booking settings. Try again.");
  if ((up.data ?? []).length > 0) return { ok: true };
  const ins = await from("professional_booking_policies").insert({ ...row, professional_id: me } as never);
  return ins.error ? failed(ins.error, "Couldn't save your booking settings. Try again.") : { ok: true };
}

export interface ReminderDefaults {
  alert: EventAlert;
  alert2: EventAlert;
  /** No practice_settings row yet: the professional's sessions use hour_1 (FINAL_PLAN DB-4 item 4). */
  stored: boolean;
}

export async function fetchReminderDefaults(me: string): Promise<Read<ReminderDefaults>> {
  const { data, error } = await from("practice_settings").select("default_alert, default_alert_2").eq("professional_id", me).maybeSingle();
  if (error) return readFail(error);
  const r = data as unknown as { default_alert: EventAlert; default_alert_2: EventAlert } | null;
  return { ok: true, data: r ? { alert: r.default_alert, alert2: r.default_alert_2, stored: true } : { alert: "hour_1", alert2: "none", stored: false } };
}

export async function saveReminderDefaults(me: string, alert: EventAlert, alert2: EventAlert): Promise<Write> {
  const row = { default_alert: alert, default_alert_2: alert2 };
  const up = await from("practice_settings").update(row as never).eq("professional_id", me).select("professional_id");
  if (up.error) return failed(up.error, "Couldn't save your reminders. Try again.");
  if ((up.data ?? []).length > 0) return { ok: true };
  const ins = await from("practice_settings").insert({ ...row, professional_id: me } as never);
  return ins.error ? failed(ins.error, "Couldn't save your reminders. Try again.") : { ok: true };
}

/** The booking link's handle (DB-1 professional_profiles.handle); null until one is chosen. */
export async function fetchMyHandle(me: string): Promise<Read<string | null>> {
  const { data, error } = await from("professional_profiles").select("handle").eq("profile_id", me).maybeSingle();
  if (error) return readFail(error);
  return { ok: true, data: (data as unknown as { handle: string | null } | null)?.handle ?? null };
}

/** COPY `{booking_url}` = centium.app/p/{handle}/book (FINAL_PLAN section 3). */
export const bookingUrl = (handle: string) => `centium.app/p/${handle}/book`;

// ---------------------------------------------------------------------------
// Booking requests and bookings (appointments, own practice)
// ---------------------------------------------------------------------------

export interface BookingRow {
  id: string;
  serviceId: string | null;
  serviceName: string;
  clientId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  price: number;
  calendarEventId: string | null;
}

/** Own-practice appointments still waiting for an answer (status requested). */
export async function fetchBookingRequests(me: string): Promise<Read<BookingRow[]>> {
  const { data, error } = await from("appointments")
    .select("id, service_id, service_name, client_id, starts_at, ends_at, status, price_agreed, calendar_event_id")
    .eq("staff_id", me)
    .is("business_id", null)
    .eq("status", "requested")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  if (error) return readFail(error);
  type Row = { id: string; service_id: string | null; service_name: string; client_id: string | null; starts_at: string; ends_at: string; status: string; price_agreed: number | string; calendar_event_id: string | null };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      serviceId: r.service_id,
      serviceName: r.service_name,
      clientId: r.client_id,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      status: r.status,
      price: Number(r.price_agreed) || 0,
      calendarEventId: r.calendar_event_id,
    })),
  };
}

function bookingError(error: { code?: string } | null, fallback: string): Write {
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error?.code === "ATXG6") return { ok: false, message: "That time is no longer free." };
  if (error?.code === "ATX10") return { ok: false, message: "This booking has already been answered." };
  if (error?.code === "ATX08") return { ok: false, message: "This booking no longer exists." };
  return { ok: false, message: fallback };
}

export async function acceptBooking(id: string): Promise<Write> {
  const { error } = await rpc("accept_booking_request", { p_appointment_id: id });
  return error ? bookingError(error, "Couldn't accept this booking. Try again.") : { ok: true };
}

export async function declineBooking(id: string, reason?: string): Promise<Write> {
  const { error } = await rpc("decline_booking_request", { p_appointment_id: id, p_reason: reason?.trim() || null });
  return error ? bookingError(error, "Couldn't decline this booking. Try again.") : { ok: true };
}

/** A booked appointment the professional cancels: the client is told, the event goes. */
export async function cancelBooking(id: string): Promise<Write> {
  const { error } = await rpc("cancel_professional_booking", { p_appointment_id: id, p_reason: null });
  return error ? bookingError(error, "Couldn't cancel this session. Try again.") : { ok: true };
}

/**
 * The open windows of the one slot engine (professional_open_slots, J6) for a
 * session type, at most 31 days. Each row is a start the engine would accept.
 */
export async function fetchOpenSlots(me: string, fromDate: string, toDate: string, serviceId: string): Promise<Read<{ startsAt: string; endsAt: string }[]>> {
  const { data, error } = await rpc("professional_open_slots", { p_professional: me, p_from: fromDate, p_to: toDate, p_service_id: serviceId });
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as { starts_at: string; ends_at: string }[]).map((r) => ({ startsAt: r.starts_at, endsAt: r.ends_at })) };
}

// ---------------------------------------------------------------------------
// Sessions (calendar_events the professional owns)
// ---------------------------------------------------------------------------

export interface SessionExtras {
  outcome: "completed" | "no_show" | "late_cancel" | null;
  serviceId: string | null;
  price: number | null;
  paidAt: string | null;
}

/** Outcome, session type, price and paid state of own events (DB-4 columns). */
export async function fetchSessionExtras(me: string, fromDate: string, toDate: string): Promise<Record<string, SessionExtras>> {
  const { data, error } = await from("calendar_events")
    .select("id, outcome, appointment_service_id, price, paid_at")
    .eq("owner_id", me)
    .gte("event_date", fromDate)
    .lte("event_date", toDate);
  if (error) return {};
  const out: Record<string, SessionExtras> = {};
  for (const r of (data ?? []) as unknown as { id: string; outcome: SessionExtras["outcome"]; appointment_service_id: string | null; price: number | string | null; paid_at: string | null }[]) {
    out[r.id] = { outcome: r.outcome, serviceId: r.appointment_service_id, price: r.price === null ? null : Number(r.price), paidAt: r.paid_at };
  }
  return out;
}

export interface NewSession {
  clientId: string;
  serviceId: string;
  title: string;
  colour: string;
  price: number | null;
  dates: string[];
  start: string;
  end: string;
  location: string | null;
  url: string | null;
  notes: string | null;
  alert: EventAlert;
  alert2: EventAlert;
}

/**
 * Saves a session on each date (one calendar_events row per occurrence, so
 * each keeps its own outcome and pack count) and invites the client with the
 * two reminders (calendar_event_invitees.alert / alert_2). Returns the first
 * event's id. A failure part way says how many were saved.
 */
export async function createSessions(me: string, s: NewSession): Promise<{ ok: true; firstId: string } | { ok: false; message: string }> {
  const rows = s.dates.map((date) => ({
    owner_id: me,
    title: s.title,
    event_date: date,
    all_day: false,
    start_time: s.start,
    end_time: s.end,
    location: s.location,
    url: s.url,
    notes: s.notes,
    repeat: "none",
    color: s.colour,
    appointment_service_id: s.serviceId,
    price: s.price && s.price > 0 ? s.price : null,
    created_by_client: true,
  }));
  const ins = await from("calendar_events").insert(rows as never).select("id, event_date");
  if (ins.error) return failed(ins.error, "Couldn't save this session. Try again.") as { ok: false; message: string };
  const ids = ((ins.data ?? []) as unknown as { id: string; event_date: string }[]).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const inv = await from("calendar_event_invitees").insert(
    ids.map((e) => ({ calendar_event_id: e.id, invited_user_id: s.clientId, invited_by: me, alert: s.alert, alert_2: s.alert2 })) as never
  );
  if (inv.error) {
    const code = (inv.error as { code?: string }).code;
    return {
      ok: false,
      message:
        code === "ATX12"
          ? "The session is saved, but the invitation couldn't be sent: you can only invite people you currently work with."
          : "The session is saved, but the invitation couldn't be sent. Open it and try again.",
    };
  }
  return { ok: true, firstId: ids[0]?.id ?? "" };
}

export type Outcome = "completed" | "no_show" | "late_cancel";

export async function setSessionOutcome(eventId: string, outcome: Outcome): Promise<Write> {
  const { error } = await rpc("set_session_outcome", { p_event_id: eventId, p_outcome: outcome });
  return error ? failed(error, "Couldn't save the outcome. Try again.") : { ok: true };
}

export async function setSessionPaid(eventId: string, paid: boolean): Promise<Write> {
  const { error } = await rpc("set_session_paid", { p_event_id: eventId, p_paid: paid });
  return error ? failed(error, "Couldn't save the payment. Try again.") : { ok: true };
}

/** The professional's own note on one session (session_notes.event_id). */
export async function fetchSessionNote(me: string, eventId: string): Promise<Read<{ id: string; body: string } | null>> {
  const { data, error } = await from("session_notes")
    .select("id, body")
    .eq("professional_id", me)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as unknown as { id: string; body: string }[])[0] ?? null };
}

export type NoteKind = "training" | "nutrition" | "clinical";

export async function saveSessionNote(me: string, eventId: string, clientId: string, kind: NoteKind, noteId: string | null, body: string): Promise<Write> {
  const text = body.trim();
  if (noteId && !text) {
    const { error } = await from("session_notes").delete().eq("id", noteId);
    return error ? failed(error, "Couldn't save the note. Try again.") : { ok: true };
  }
  if (!text) return { ok: true };
  const { error } = noteId
    ? await from("session_notes").update({ body: text } as never).eq("id", noteId)
    : await from("session_notes").insert({ professional_id: me, client_id: clientId, event_id: eventId, kind, body: text, shared_with_client: false } as never);
  return error ? failed(error, "Couldn't save the note. Try again.") : { ok: true };
}

/** "{n}-session pack · {n} left" for one client (session_packs). */
export async function fetchPack(clientId: string): Promise<{ planName: string; count: number; left: number } | null> {
  const { data, error } = await rpc("session_packs", { p_client_id: clientId });
  if (error) return null;
  const r = ((data ?? []) as { plan_name: string; session_count: number; sessions_left: number }[])[0];
  return r ? { planName: r.plan_name, count: r.session_count, left: r.sessions_left } : null;
}

// ---------------------------------------------------------------------------
// Follow-ups (Clinical overview, DB-6 follow_ups on the care plan)
// ---------------------------------------------------------------------------

export interface DueFollowUp {
  id: string;
  dueOn: string;
  note: string | null;
  status: string;
  clientId: string;
  calendarEventId: string | null;
}

export async function fetchFollowUps(me: string, fromDate: string, toDate: string): Promise<Read<DueFollowUp[]>> {
  const { data, error } = await from("follow_ups")
    .select("id, due_on, note, status, calendar_event_id, care_plans!inner(client_id, professional_id)")
    .eq("care_plans.professional_id", me)
    .gte("due_on", fromDate)
    .lte("due_on", toDate)
    .order("due_on");
  if (error) return readFail(error);
  type Row = { id: string; due_on: string; note: string | null; status: string; calendar_event_id: string | null; care_plans: { client_id: string } | null };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[])
      .filter((r) => r.care_plans)
      .map((r) => ({ id: r.id, dueOn: r.due_on, note: r.note, status: r.status, clientId: r.care_plans!.client_id, calendarEventId: r.calendar_event_id })),
  };
}
