import { stage4Message } from "../venues/venueLogic";
import { PAST_MIDNIGHT_CODE, PAST_MIDNIGHT_MESSAGE } from "../booking/pastMidnight";
import { num, str, type Row } from "../store/mapping";

// B12 · Appointments (Database docs/HANDOVER_API.md "B12 · Appointments",
// migrations 20261121270000 / 20261121280000): the rows the functions return
// → the app's shapes, and the B12 refusals in words. Pure (no Supabase
// import) so node:test holds every mapping (model.test.ts). Column names are
// the local functions' RETURNS TABLE columns.

export type ApptStatus = "booked" | "completed" | "cancelled" | "no_show";
export type PayStatus = "pending" | "paid" | "refunded";

const STATUSES: readonly ApptStatus[] = ["booked", "completed", "cancelled", "no_show"];
const toStatus = (v: unknown): ApptStatus => (STATUSES.includes(v as ApptStatus) ? (v as ApptStatus) : "booked");
const toPay = (v: unknown): PayStatus => (v === "paid" || v === "refunded" ? v : "pending");

/** Whole minutes between two instants (60 when the row is unreadable). */
export function minutesBetween(startsAt: string, endsAt: string): number {
  const m = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  return Number.isFinite(m) && m > 0 ? m : 60;
}

/** appointment_services (name ≤ 60, description ≤ 500, duration 5-480 in 5s, price ≥ 0). */
export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  active: boolean;
}

export const toService = (r: Row): Service => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  description: str(r.description),
  durationMin: num(r.duration_min) || 60,
  price: num(r.price),
  active: r.active !== false,
});

/** The duration choices: the table takes 5 to 480 in 5-minute steps. */
export const DURATIONS = [15, 30, 45, 60, 75, 90, 120] as const;

/** One business_appointments row: the diary, with the server's MASKED client label. */
export interface DiaryAppt {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  status: ApptStatus;
  serviceName: string;
  staffId: string | null;
  staffFirstName: string | null;
  clientId: string | null;
  /** The server's label ("Member #0042" unless the client shared their name). Render as is. */
  clientLabel: string;
  clientIsMinor: boolean;
  price: number;
  paymentStatus: PayStatus;
}

export function toDiaryAppt(r: Row): DiaryAppt {
  const startsAt = String(r.starts_at);
  const endsAt = String(r.ends_at ?? r.starts_at);
  return {
    id: String(r.appointment_id),
    startsAt,
    endsAt,
    durationMin: minutesBetween(startsAt, endsAt),
    status: toStatus(r.status),
    serviceName: String(r.service_name ?? ""),
    staffId: str(r.staff_id),
    staffFirstName: str(r.staff_first_name),
    clientId: str(r.client_id),
    clientLabel: str(r.client_label) ?? "Client",
    clientIsMinor: r.client_is_minor === true,
    price: num(r.price_agreed),
    paymentStatus: toPay(r.payment_status),
  };
}

/** One my_appointments row (the client's own). */
export interface MyAppt {
  id: string;
  businessId: string;
  businessName: string | null;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  status: ApptStatus;
  price: number;
  paymentStatus: PayStatus;
  /** The server's answer: booked and not started. */
  canCancel: boolean;
}

export function toMyAppt(r: Row): MyAppt {
  const startsAt = String(r.starts_at);
  const endsAt = String(r.ends_at ?? r.starts_at);
  return {
    id: String(r.appointment_id),
    businessId: String(r.business_id ?? ""),
    businessName: str(r.business_name),
    serviceName: String(r.service_name ?? ""),
    startsAt,
    endsAt,
    durationMin: minutesBetween(startsAt, endsAt),
    status: toStatus(r.status),
    price: num(r.price_agreed),
    paymentStatus: toPay(r.payment_status),
    canCancel: r.can_cancel === true,
  };
}

/** Upcoming = booked and not over yet; everything else is Past. */
export const isUpcoming = (a: Pick<MyAppt, "status" | "endsAt">, now = Date.now()) => a.status === "booked" && new Date(a.endsAt).getTime() > now;

/** One appointment_slots row: a free start for one staff member. */
export interface Slot {
  staffId: string;
  /** Null unless the professional is listed publicly: show "Any available". */
  staffName: string | null;
  startsAt: string;
  endsAt: string;
}

export const toSlot = (r: Row): Slot => ({
  staffId: String(r.staff_id),
  staffName: str(r.staff_name),
  startsAt: String(r.starts_at),
  endsAt: String(r.ends_at),
});

export const ANY_AVAILABLE = "Any available";

/** A slot's person as the client sees them. */
export const staffLabel = (name: string | null) => name ?? ANY_AVAILABLE;

/** The free start times, one per time (several people can be free at once), in time order. */
export function slotTimes(slots: Slot[]): Slot[] {
  const seen = new Map<string, Slot>();
  for (const s of slots) if (!seen.has(s.startsAt)) seen.set(s.startsAt, s);
  return [...seen.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Who the client can book at one time: each publicly listed person by first
 * name, and one "Any available" for everyone who isn't listed (the first of
 * them is booked; the client never learns who). Named first, by name.
 */
export function staffChoices(slots: Slot[], startsAt: string): { staffId: string; label: string }[] {
  const at = slots.filter((s) => s.startsAt === startsAt);
  const named = new Map<string, string>();
  let anyone: string | null = null;
  for (const s of at) {
    if (s.staffName) {
      if (!named.has(s.staffId)) named.set(s.staffId, s.staffName);
    } else if (anyone === null) anyone = s.staffId;
  }
  const out = [...named.entries()].map(([staffId, label]) => ({ staffId, label })).sort((a, b) => a.label.localeCompare(b.label));
  if (anyone !== null) out.push({ staffId: anyone, label: ANY_AVAILABLE });
  return out;
}

/**
 * The business's free time on a day, from appointment_slots across its active
 * services: every free [start, end) merged into stretches, so the diary shows
 * "Free slot · 9:00 AM to 12:00 PM" instead of a row every 15 minutes.
 */
export function freeStretches(slots: Pick<Slot, "startsAt" | "endsAt">[], from = 0): { startsAt: string; endsAt: string }[] {
  const spans = slots
    .map((s) => ({ a: new Date(s.startsAt).getTime(), b: new Date(s.endsAt).getTime() }))
    .filter((s) => Number.isFinite(s.a) && Number.isFinite(s.b) && s.b > s.a && s.a > from)
    .sort((x, y) => x.a - y.a);
  const out: { a: number; b: number }[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s.a <= last.b) last.b = Math.max(last.b, s.b);
    else out.push({ ...s });
  }
  return out.map((s) => ({ startsAt: new Date(s.a).toISOString(), endsAt: new Date(s.b).toISOString() }));
}

/** instructor_availability: weekday 1 = Monday … 7 = Sunday, times HH:MM(:SS). */
export interface StaffHours {
  id: string;
  staffId: string;
  weekday: number;
  starts: string;
  ends: string;
}

export const toStaffHours = (r: Row): StaffHours => ({
  id: String(r.id),
  staffId: String(r.professional_id),
  weekday: num(r.weekday),
  starts: String(r.starts_at ?? "").slice(0, 5),
  ends: String(r.ends_at ?? "").slice(0, 5),
});

/** The business's appointment chip (OURS-OP1-appointments-detail row 9; Open = a free slot). */
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

/** The client's words (OURS-customer-appointments row 14). */
export function apptWords(a: Pick<MyAppt, "status" | "startsAt">, now = Date.now()): { label: string; tone: "good" | "soft" | "bad" | "warn" } {
  if (a.status === "cancelled") return { label: "Cancelled", tone: "bad" };
  if (a.status === "no_show") return { label: "Missed", tone: "warn" };
  if (a.status === "completed") return { label: "Done", tone: "soft" };
  return new Date(a.startsAt).getTime() > now ? { label: "Booked", tone: "good" } : { label: "Booked", tone: "soft" };
}

/** Payment, as recorded by the business (Centium processes no money: cash at the visit). */
export function payWords(p: PayStatus): string | null {
  if (p === "paid") return "Paid";
  if (p === "refunded") return "Refunded";
  return null;
}

/**
 * The B12 refusals a client meets when booking, in words, then the stage 4
 * codes. ATXE2 carries the window ("bookings open 14 days ahead").
 */
export function bookErrorMessage(code: string | undefined, serverMessage: string, fallback: string): string {
  switch (code) {
    case "ATXF2":
      return "That time is outside their hours. Pick another.";
    case "ATXF3":
      return "That time was just booked. Pick another.";
    case "ATXF4":
      return "This service isn't available any more.";
    case "ATXE2": {
      const n = /open (\d+) days?/i.exec(serverMessage)?.[1];
      return n ? `Bookings open ${n} ${n === "1" ? "day" : "days"} ahead.` : "Bookings for that day aren't open yet.";
    }
    case "ATXE3":
      return "Bookings for that time have closed. Pick a later one.";
    case "ATXE4":
      return "Accept this place's terms before booking.";
    case "ATX76":
      return "That person doesn't work here any more. Pick another time.";
    case PAST_MIDNIGHT_CODE:
      return PAST_MIDNIGHT_MESSAGE;
    default:
      return stage4Message(code, serverMessage, fallback);
  }
}

/**
 * book_appointment_for's refusals (the business books for a client), in the
 * business kit's words.
 */
export function bookForErrorMessage(code: string | undefined, serverMessage: string, fallback: string): string {
  switch (code) {
    case "ATX96":
      return "You can book for your own clients only: people seen in the last 90 days.";
    case "ATXF2":
      return "That time is outside their hours. Pick another.";
    case "ATXF3":
      return "That time is no longer free. Pick another.";
    case "ATXF4":
      return "That service isn't available. Check it's shown for booking.";
    case "ATX76":
      return "That person isn't on your team any more. Pick another.";
    case PAST_MIDNIGHT_CODE:
      return PAST_MIDNIGHT_MESSAGE;
    default:
      return stage4Message(code, serverMessage, fallback);
  }
}

/** The kinds a booking's terms are (book_appointment / book_appointment_for). */
export const APPOINTMENT_TERMS_KINDS = ["appointment_waiver", "waiver", "house_rules"] as const;

/**
 * Whether a client still has the business's appointment terms to accept: the
 * same test book_appointment_for() writes out for waiver_pending. A document
 * counts when its current version is published; it is accepted when the
 * client accepted that version, or any version of it when the current one
 * doesn't ask to be accepted again.
 */
export function waiverPending(
  docs: { id: string; kind: string; currentVersion: number | null }[],
  versions: { id: string; documentId: string; version: number; published: boolean; requiresReacceptance: boolean }[],
  acceptedVersionIds: Set<string>
): boolean {
  return docs.some((d) => {
    if (!(APPOINTMENT_TERMS_KINDS as readonly string[]).includes(d.kind) || d.currentVersion === null) return false;
    const cur = versions.find((v) => v.documentId === d.id && v.version === d.currentVersion && v.published);
    if (!cur) return false;
    const accepted = versions.some((v) => v.documentId === d.id && acceptedVersionIds.has(v.id) && (v.version === cur.version || !cur.requiresReacceptance));
    return !accepted;
  });
}

/** A refusal that means the times on screen are stale: read them again. */
export const refreshesTimes = (code: string | undefined) => code === "ATXF2" || code === "ATXF3" || code === "ATXE3" || code === "ATX76";
