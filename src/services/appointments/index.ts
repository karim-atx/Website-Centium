import { db, loadFail, num, str, writeFail, type Load, type Write } from "../store/backend";

// Appointments (B12 · AP-01), both sides. Wellness Service stores that offer
// appointments (business_store_settings.offers_appointments, B5).
//
// CONTRACT ASSUMED (BACKEND_REQUIREMENTS-v6 AP-01; re-check against
// HANDOVER_API.md "B12" when it lands, and change the names here only):
//   appointment_services(id, business_id, name, duration_min, price, active)
//   appointment_availability(id, business_id, staff_id, weekday 0 = Monday,
//     starts time, ends time)
//   appointments(id, business_id, client_id, client_name, service_id,
//     starts_at, ends_at, status booked|completed|cancelled|no_show,
//     booked_at, price, payment_method, appointment_services(name, duration_min))
//   appointment_free_slots(p_business_id, p_service_id, p_from, p_to)
//     → (starts_at, ends_at)  open slots left, after bookings
//   book_appointment(p_service_id, p_starts_at, p_client_id default caller) → uuid
//     (calendar row, waiver acceptance, pending payment; ATX code when the
//     slot is taken)
//   cancel_appointment(p_appointment_id) → { notified }
//   set_appointment_status(p_appointment_id, p_status) → { notified }
// Walk-in clients without an account are not supported (V6-158).

export type ApptStatus = "booked" | "completed" | "cancelled" | "no_show";

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number | null;
  active: boolean;
}

export interface Appointment {
  id: string;
  businessId: string;
  businessName: string | null;
  clientId: string | null;
  clientName: string | null;
  serviceId: string | null;
  serviceName: string;
  durationMin: number;
  startsAt: string;
  endsAt: string;
  status: ApptStatus;
  bookedAt: string | null;
  price: number | null;
  paymentMethod: "cash" | "whish";
}

export interface Slot {
  startsAt: string;
  endsAt: string;
}

export interface Availability {
  id: string;
  weekday: number;
  starts: string;
  ends: string;
}

type Row = Record<string, unknown>;

const toService = (r: Row): Service => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  durationMin: num(r.duration_min) || 60,
  price: r.price === null || r.price === undefined ? null : num(r.price),
  active: r.active !== false,
});

export function toAppointment(r: Row): Appointment {
  const s = (r.appointment_services as Row | null) ?? {};
  const b = (r.business_profiles as Row | null) ?? null;
  const startsAt = String(r.starts_at);
  const dur = num(s.duration_min) || Math.round((new Date(String(r.ends_at ?? startsAt)).getTime() - new Date(startsAt).getTime()) / 60000) || 60;
  return {
    id: String(r.id),
    businessId: String(r.business_id ?? ""),
    businessName: b ? str(b.business_name) : null,
    clientId: str(r.client_id),
    clientName: str(r.client_name),
    serviceId: str(r.service_id),
    serviceName: String(s.name ?? r.service_name ?? ""),
    durationMin: dur,
    startsAt,
    endsAt: String(r.ends_at ?? new Date(new Date(startsAt).getTime() + dur * 60000).toISOString()),
    status: (str(r.status) as ApptStatus) ?? "booked",
    bookedAt: str(r.booked_at) ?? str(r.created_at),
    price: r.price === null || r.price === undefined ? (s.price !== undefined && s.price !== null ? num(s.price) : null) : num(r.price),
    paymentMethod: r.payment_method === "whish" ? "whish" : "cash",
  };
}

const APPT_SELECT = "*, appointment_services(name, duration_min, price)";

const dayBounds = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const from = new Date(y, m - 1, d);
  const to = new Date(y, m - 1, d + 1);
  return { from: from.toISOString(), to: to.toISOString() };
};

// ---------------------------------------------------------------------------
// Business side

export async function fetchServices(businessId: string, activeOnly = false): Promise<Load<Service[]>> {
  let q = db.from("appointment_services").select("*").eq("business_id", businessId);
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q.order("name");
  if (error) return loadFail(error, "Could not read the services");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toService) };
}

export async function fetchDayAppointments(businessId: string, date: string): Promise<Load<Appointment[]>> {
  const { from, to } = dayBounds(date);
  const { data, error } = await db
    .from("appointments")
    .select(APPT_SELECT)
    .eq("business_id", businessId)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at");
  if (error) return loadFail(error, "Could not read the appointments");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toAppointment) };
}

/** Any appointment ever (decides "No appointments yet" vs "No appointments today"). */
export async function countAppointments(businessId: string): Promise<Load<number>> {
  const { count, error } = await db.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", businessId);
  if (error) return loadFail(error, "Could not count the appointments");
  return { status: "ok", value: count ?? 0 };
}

export async function fetchAppointment(id: string): Promise<Load<Appointment | null>> {
  const { data, error } = await db.from("appointments").select(APPT_SELECT + ", business_profiles(business_name)").eq("id", id).maybeSingle();
  if (error) return loadFail(error, "Could not read the appointment");
  return { status: "ok", value: data ? toAppointment(data as Row) : null };
}

export async function fetchFreeSlots(businessId: string, serviceId: string | null, fromDate: string, toDate: string): Promise<Load<Slot[]>> {
  const { data, error } = await db.rpc("appointment_free_slots", { p_business_id: businessId, p_service_id: serviceId, p_from: fromDate, p_to: toDate });
  if (error) return loadFail(error, "Could not read the free slots");
  return {
    status: "ok",
    value: ((data ?? []) as Row[]).map((r) => ({ startsAt: String(r.starts_at), endsAt: String(r.ends_at) })).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  };
}

const notified = (data: unknown): boolean =>
  data && typeof data === "object" && "notified" in (data as Row) ? (data as Row).notified !== false : true;

export async function setAppointmentStatus(id: string, status: "completed" | "no_show"): Promise<Write<{ notified: boolean }>> {
  const { data, error } = await db.rpc("set_appointment_status", { p_appointment_id: id, p_status: status });
  if (error) return writeFail(error, "Could not update the appointment");
  return { ok: true, value: { notified: notified(data) } };
}

export async function cancelAppointment(id: string): Promise<Write<{ notified: boolean }>> {
  const { data, error } = await db.rpc("cancel_appointment", { p_appointment_id: id });
  if (error) return writeFail(error, "Could not cancel the appointment");
  return { ok: true, value: { notified: notified(data) } };
}

/** Book (client) or add (business, with the client's id). A taken slot comes back as `taken`. */
export async function bookAppointment(serviceId: string, startsAt: string, clientId?: string): Promise<Write<string> & { taken?: boolean }> {
  const args: Row = { p_service_id: serviceId, p_starts_at: startsAt };
  if (clientId) args.p_client_id = clientId;
  const { data, error } = await db.rpc("book_appointment", args);
  if (error) {
    const w = writeFail<string>(error, "Could not book the appointment");
    // 23P01 exclusion / 23505 unique: someone took the slot first.
    return { ...w, taken: error.code === "23P01" || error.code === "23505" || /no longer free|taken/i.test(error.message ?? "") };
  }
  return { ok: true, value: String(data ?? "") };
}

export async function saveService(businessId: string, s: { id?: string; name: string; durationMin: number; price: number | null; active: boolean }): Promise<Write<null>> {
  const payload = { name: s.name.trim(), duration_min: s.durationMin, price: s.price, active: s.active };
  const { error } = s.id
    ? await db.from("appointment_services").update(payload).eq("id", s.id)
    : await db.from("appointment_services").insert({ ...payload, business_id: businessId });
  if (error) return writeFail(error, "Could not save the service");
  return { ok: true, value: null };
}

export async function fetchAvailability(businessId: string): Promise<Load<Availability[]>> {
  const { data, error } = await db.from("appointment_availability").select("*").eq("business_id", businessId).order("weekday").order("starts");
  if (error) return loadFail(error, "Could not read the free slots");
  return {
    status: "ok",
    value: ((data ?? []) as Row[]).map((r) => ({ id: String(r.id), weekday: num(r.weekday), starts: String(r.starts ?? "").slice(0, 5), ends: String(r.ends ?? "").slice(0, 5) })),
  };
}

export async function addAvailability(businessId: string, weekday: number, starts: string, ends: string): Promise<Write<null>> {
  const { error } = await db.from("appointment_availability").insert({ business_id: businessId, weekday, starts, ends });
  if (error) return writeFail(error, "Could not save the hours");
  return { ok: true, value: null };
}

export async function removeAvailability(id: string): Promise<Write<null>> {
  const { error } = await db.from("appointment_availability").delete().eq("id", id);
  if (error) return writeFail(error, "Could not remove the hours");
  return { ok: true, value: null };
}

/** The business's own clients (people who booked before), for the Add appointment search. */
export async function fetchKnownClients(businessId: string): Promise<Load<{ id: string; name: string }[]>> {
  const { data, error } = await db.from("appointments").select("client_id, client_name").eq("business_id", businessId).not("client_id", "is", null);
  if (error) return loadFail(error, "Could not read the clients");
  const seen = new Map<string, string>();
  for (const r of (data ?? []) as Row[]) {
    const id = str(r.client_id);
    if (id && !seen.has(id)) seen.set(id, str(r.client_name) ?? "");
  }
  return { status: "ok", value: [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)) };
}

// ---------------------------------------------------------------------------
// Customer side

export async function fetchMyAppointments(clientId: string): Promise<Load<Appointment[]>> {
  const { data, error } = await db
    .from("appointments")
    .select(APPT_SELECT + ", business_profiles(business_name)")
    .eq("client_id", clientId)
    .order("starts_at", { ascending: false });
  if (error) return loadFail(error, "Could not read your appointments");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toAppointment) };
}

/** Appointment chip (OURS-OP1-appointments-detail row 9; Open = a free slot). */
export function apptChip(s: ApptStatus): { label: string; tone: "good" | "soft" | "bad" | "warn" } {
  switch (s) {
    case "booked":
      return { label: "Booked", tone: "good" };
    case "completed":
      return { label: "Done", tone: "soft" };
    case "cancelled":
      return { label: "Cancelled", tone: "bad" };
    case "no_show":
      return { label: "No-show", tone: "warn" };
  }
}
