import { db, loadFail, writeFail, type Load, type Write } from "../store/backend";
import type { Row } from "../store/mapping";
import { isoDate } from "../store/format";
import { fetchBusinessPeople } from "../business-members";
import {
  APPOINTMENT_TERMS_KINDS,
  freeStretches,
  waiverPending,
  toDiaryAppt,
  toMyAppt,
  toService,
  toSlot,
  toStaffHours,
  type DiaryAppt,
  type MyAppt,
  type Service,
  type Slot,
  type StaffHours,
} from "./model";

// B12 · Appointments (Database docs/HANDOVER_API.md "B12 · Appointments"),
// both sides. Wellness Service stores that offer appointments
// (business_store_settings.offers_appointments, B5).
//   appointment_services(business_id, gym_id?, name, description,
//     duration_min, price, active): public reads active services of a listed
//     business; writing needs `schedule`.
//   Staff hours are the B6 tables instructor_availability (weekday 1 = Monday)
//     and instructor_unavailable_dates; written with `schedule`.
//   appointment_slots(p_service_id, p_day, p_staff_id?) → staff_id,
//     staff_name (null unless listed publicly), starts_at, ends_at.
//   book_appointment(p_service_id, p_staff_id, p_starts_at, p_method) → id.
//     ATXE4 = the venue's terms first (as book_class); ATXF2 outside hours,
//     ATXF3 taken, ATXF4 service unavailable.
//   my_appointments(p_include_past) · cancel_appointment(id, reason) →
//     paid_to_refund.
//   business_appointments(business, from, to, staff?) (schedule; masked
//     labels) · mark_appointment(id, completed|no_show) (schedule) ·
//     mark_appointment_paid(id) (front_desk or schedule).
//   book_appointment_for(business, person, service, staff|null, start, method)
//     → (appointment_id, waiver_pending) (B12 follow-up, schedule or
//     front_desk): the business books for its own people (ATX96 otherwise).
// Walk-ins without an account are not built (B12 "Not built").

export * from "./model";

// ---------------------------------------------------------------------------
// Services (business and public)

export async function fetchServices(businessId: string, activeOnly = false): Promise<Load<Service[]>> {
  let q = db.from("appointment_services").select("id, name, description, duration_min, price, active").eq("business_id", businessId);
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q.order("name");
  if (error) return loadFail(error, "Could not read the services");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toService) };
}

export async function saveService(
  businessId: string,
  s: { id?: string; name: string; description: string | null; durationMin: number; price: number; active: boolean }
): Promise<Write<null>> {
  const payload = { name: s.name.trim(), description: s.description?.trim() || null, duration_min: s.durationMin, price: s.price, active: s.active };
  const { error } = s.id
    ? await db.from("appointment_services").update(payload).eq("id", s.id)
    : await db.from("appointment_services").insert({ ...payload, business_id: businessId });
  if (error) return writeFail(error, "Could not save the service");
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Staff hours (instructor_availability)

export async function fetchStaffHours(businessId: string): Promise<Load<StaffHours[]>> {
  const { data, error } = await db
    .from("instructor_availability")
    .select("id, professional_id, weekday, starts_at, ends_at")
    .eq("business_id", businessId)
    .order("weekday")
    .order("starts_at");
  if (error) return loadFail(error, "Could not read the staff hours");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toStaffHours) };
}

/** weekday 1 = Monday … 7 = Sunday; times "HH:MM". */
export async function addStaffHours(businessId: string, staffId: string, weekday: number, starts: string, ends: string): Promise<Write<null>> {
  const { error } = await db.from("instructor_availability").insert({ business_id: businessId, professional_id: staffId, weekday, starts_at: starts, ends_at: ends });
  if (error) return writeFail(error, "Could not save the hours");
  return { ok: true, value: null };
}

export async function removeStaffHours(id: string): Promise<Write<null>> {
  const { error } = await db.from("instructor_availability").delete().eq("id", id);
  if (error) return writeFail(error, "Could not remove the hours");
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Slots

/** appointment_slots for one service and day (ATXF4 = not bookable: no slots). */
export async function fetchSlots(serviceId: string, day: string, staffId: string | null = null): Promise<Load<Slot[]>> {
  const { data, error } = await db.rpc("appointment_slots", { p_service_id: serviceId, p_day: day, p_staff_id: staffId });
  if (error) {
    if (error.code === "ATXF4") return { status: "ok", value: [] };
    return loadFail(error, "Could not read the free times");
  }
  return { status: "ok", value: ((data ?? []) as Row[]).map(toSlot) };
}

/** The business's free stretches on a day, across its active services (the diary's "Free slot" rows). */
export async function fetchFreeStretches(services: Service[], day: string): Promise<Load<{ startsAt: string; endsAt: string }[]>> {
  const active = services.filter((s) => s.active);
  if (active.length === 0) return { status: "ok", value: [] };
  const all = await Promise.all(active.map((s) => fetchSlots(s.id, day)));
  const slots: Slot[] = [];
  for (const r of all) {
    if (r.status !== "ok") return r;
    slots.push(...r.value);
  }
  return { status: "ok", value: freeStretches(slots, Date.now()) };
}

// ---------------------------------------------------------------------------
// Business diary

/** business_appointments for [from, to] (local dates; at most two months). */
export async function fetchDiary(businessId: string, from: string, to: string): Promise<Load<DiaryAppt[]>> {
  const { data, error } = await db.rpc("business_appointments", { p_business_id: businessId, p_from: from, p_to: to });
  if (error) return loadFail(error, "Could not read the appointments");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toDiaryAppt) };
}

/** Whether the business has ever had an appointment ("No appointments yet" vs "No appointments today"). */
export async function hasAppointments(businessId: string): Promise<Load<boolean>> {
  const { count, error } = await db.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", businessId);
  if (error) return loadFail(error, "Could not count the appointments");
  return { status: "ok", value: (count ?? 0) > 0 };
}

export interface DiaryDetail extends DiaryAppt {
  bookedAt: string | null;
  paymentMethod: "cash" | "whish";
  /** The client still has the appointment terms to accept (null: unknown, or not a booked appointment). */
  waiverPending: boolean | null;
}

/**
 * One appointment for the business: the row (RLS: schedule) for its day,
 * booking time and method, then that day's business_appointments row for the
 * masked label and the rest. Null when neither can be read.
 */
export async function fetchDiaryDetail(appointmentId: string): Promise<Load<DiaryDetail | null>> {
  const { data, error } = await db.from("appointments").select("id, business_id, starts_at, created_at, payment_method").eq("id", appointmentId).maybeSingle();
  if (error) return loadFail(error, "Could not read the appointment");
  if (!data) return { status: "ok", value: null };
  const r = data as Row;
  const day = new Date(String(r.starts_at));
  const from = isoDate(new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1));
  const to = isoDate(new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1));
  const diary = await fetchDiary(String(r.business_id), from, to);
  if (diary.status !== "ok") return diary;
  const a = diary.value.find((x) => x.id === appointmentId);
  if (!a) return { status: "ok", value: null };
  // The waiver never blocks a desk booking; a booked one says when it is still owed.
  const w = a.status === "booked" && a.clientId ? await fetchWaiverPending(String(r.business_id), a.clientId) : null;
  return {
    status: "ok",
    value: { ...a, bookedAt: typeof r.created_at === "string" ? r.created_at : null, paymentMethod: r.payment_method === "whish" ? "whish" : "cash", waiverPending: w && w.status === "ok" ? w.value : null },
  };
}

export async function markAppointment(id: string, status: "completed" | "no_show"): Promise<Write<null>> {
  const { error } = await db.rpc("mark_appointment", { p_appointment_id: id, p_status: status });
  if (error) return writeFail(error, "Could not mark the appointment");
  return { ok: true, value: null };
}

export async function markAppointmentPaid(id: string): Promise<Write<null>> {
  const { error } = await db.rpc("mark_appointment_paid", { p_appointment_id: id });
  if (error) return writeFail(error, "Couldn't record the payment. Try again.");
  return { ok: true, value: null };
}

/**
 * book_appointment_for (B12 follow-up, schedule or front_desk): the business
 * books for one of its own people (within 90 days, else ATX96). staffId null
 * = "Any available". The waiver doesn't block it: waiverPending says the
 * client still has terms to accept.
 */
export async function bookAppointmentFor(
  businessId: string,
  personId: string,
  serviceId: string,
  staffId: string | null,
  startsAt: string
): Promise<Write<{ id: string; waiverPending: boolean }>> {
  const { data, error } = await db.rpc("book_appointment_for", {
    p_business_id: businessId,
    p_person_id: personId,
    p_service_id: serviceId,
    p_staff_id: staffId,
    p_starts_at: startsAt,
    p_method: "cash",
  });
  if (error) return writeFail(error, "Could not add the appointment");
  const row = (Array.isArray(data) ? data[0] : data) as Row | null;
  return { ok: true, value: { id: String(row?.appointment_id ?? ""), waiverPending: row?.waiver_pending === true } };
}

/**
 * Whether a client still has this business's appointment terms to accept,
 * read by the business (published documents are public; a business insider
 * reads acceptances of its own documents). The waiverPending test of
 * book_appointment_for, for an appointment opened later.
 */
export async function fetchWaiverPending(businessId: string, clientId: string): Promise<Load<boolean>> {
  const docs = await db.from("policy_documents").select("id, kind, current_version").eq("business_id", businessId).in("kind", [...APPOINTMENT_TERMS_KINDS]);
  if (docs.error) return loadFail(docs.error, "Couldn't load the terms. Try again.");
  const d = ((docs.data ?? []) as Row[]).map((r) => ({ id: String(r.id), kind: String(r.kind), currentVersion: r.current_version === null || r.current_version === undefined ? null : Number(r.current_version) }));
  if (d.length === 0) return { status: "ok", value: false };
  const vers = await db.from("policy_versions").select("id, document_id, version, published_at, requires_reacceptance").in("document_id", d.map((x) => x.id));
  if (vers.error) return loadFail(vers.error, "Couldn't load the terms. Try again.");
  const v = ((vers.data ?? []) as Row[]).map((r) => ({ id: String(r.id), documentId: String(r.document_id), version: Number(r.version), published: !!r.published_at, requiresReacceptance: r.requires_reacceptance === true }));
  if (v.length === 0) return { status: "ok", value: false };
  const acc = await db.from("policy_acceptances").select("version_id").eq("person_id", clientId).in("version_id", v.map((x) => x.id));
  if (acc.error) return loadFail(acc.error, "Couldn't load what was accepted. Try again.");
  return { status: "ok", value: waiverPending(d, v, new Set(((acc.data ?? []) as Row[]).map((r) => String(r.version_id)))) };
}

/** The business's own people for the Add appointment client search (business_people: shared name or member number). */
export async function searchClients(businessId: string, search: string): Promise<Load<{ id: string; label: string }[]>> {
  const r = await fetchBusinessPeople(businessId, { segment: "all", search, limit: 8 });
  if (!r.ok) return r.pending ? { status: "pending" } : { status: "error", offline: false };
  return { status: "ok", value: r.people.map((p) => ({ id: p.personId, label: p.label })) };
}

// ---------------------------------------------------------------------------
// Both sides

/** cancel_appointment: the client (own) or the business (schedule), before the start. */
export async function cancelAppointment(id: string, reason: string | null = null): Promise<Write<{ paidToRefund: boolean }>> {
  const { data, error } = await db.rpc("cancel_appointment", { p_appointment_id: id, p_reason: reason?.trim() || null });
  if (error) return writeFail(error, "Could not cancel the appointment");
  const row = (Array.isArray(data) ? data[0] : data) as Row | null;
  return { ok: true, value: { paidToRefund: row?.paid_to_refund === true } };
}

// ---------------------------------------------------------------------------
// Client

/** Cash only today; Whish is "Soon". The error carries the server's code (ATXE4 → the terms step). */
export async function bookAppointment(serviceId: string, staffId: string, startsAt: string): Promise<Write<string>> {
  const { data, error } = await db.rpc("book_appointment", { p_service_id: serviceId, p_staff_id: staffId, p_starts_at: startsAt, p_method: "cash" });
  if (error) return writeFail(error, "Could not book the appointment");
  return { ok: true, value: String(data ?? "") };
}

export async function fetchMyAppointments(includePast = true): Promise<Load<MyAppt[]>> {
  const { data, error } = await db.rpc("my_appointments", { p_include_past: includePast });
  if (error) return loadFail(error, "Could not read your appointments");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toMyAppt) };
}

/** One of the caller's appointments (my_appointments, past included). */
export async function fetchMyAppointment(id: string): Promise<Load<MyAppt | null>> {
  const r = await fetchMyAppointments(true);
  if (r.status !== "ok") return r;
  return { status: "ok", value: r.value.find((a) => a.id === id) ?? null };
}
