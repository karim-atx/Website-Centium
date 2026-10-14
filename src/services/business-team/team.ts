import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";

// v6 Batch 4 · Team (OP1-053…073, 112…139): B0 consent and B6 roles, seats
// and join requests, read and written as the owner of a business.
//
// WHAT B0 AND B6 SAY (HANDOVER_API.md "business_employees: several
// businesses, with consent" and "B6 · Team, roles and seats"):
// - Every employment starts UNACCEPTED (accepted_at null). Unaccepted rows
//   are not affiliated, use no seat and grant no access. The professional
//   accepts through accept_business_employment(); there is no other path.
// - invite_employee(identifier, role, business, message) and
//   respond_join_request(id, approve) both create unaccepted rows and both
//   check for a free seat first (ATXC0), counting accepted rows only.
// - role and permissions are readable and not client-writable: there is no
//   function that changes them after creation (B6 "Still open").
// - employee_credentials(business) returns licence fields of accepted
//   employees, never the document (V6-32).
//
// NONE OF B6 IS IN THE PRODUCTION-GENERATED TYPES (gen:types reads
// production and B6 ships with Release 2), so calls go through one loose
// handle at this boundary.

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- B6 tables and functions, not in the production-generated types
const db = supabase as any;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

const fail = <T>(error: { code?: string; message?: string } | null | undefined, fallback: string): Result<T> => ({
  ok: false,
  code: error?.code,
  message: isOffline(error) ? OFFLINE_MESSAGE : fallback,
});

export type BusinessRole = "instructor" | "trainer" | "front_desk" | "manager" | "staff" | "shop_assistant";

export interface TeamPerson {
  professionalId: string;
  name: string;
  avatarUrl: string | null;
  role: BusinessRole;
  permissions: string[];
  /** business_employees.created_at: when they were invited or approved. */
  invitedAt: string;
  /** null = invited, not accepted (B0): no seat, no access. */
  acceptedAt: string | null;
}

interface EmployeeRow {
  professional_id: string;
  created_at: string;
  accepted_at: string | null;
  role: BusinessRole | null;
  permissions: string[] | null;
}

async function namesFor(ids: string[]): Promise<Map<string, { name: string; avatarUrl: string | null }>> {
  if (ids.length === 0) return new Map();
  // public_profile_summary covers professional and business accounts (first
  // name and photo only). A staff member on another kind of account (V6-65)
  // has no row there and keeps the "Unnamed" fallback rather than vanishing.
  const { data } = await db.from("public_profile_summary").select("id, first_name, avatar_url").in("id", ids);
  return new Map(
    ((data ?? []) as { id: string; first_name: string | null; avatar_url: string | null }[]).map((p) => [
      p.id,
      { name: p.first_name?.trim() || "Unnamed", avatarUrl: p.avatar_url ?? null },
    ])
  );
}

/** Everyone on the business's team, accepted and invited, earliest first. */
export async function fetchTeam(businessId: string): Promise<Result<TeamPerson[]>> {
  const rows = await db
    .from("business_employees")
    .select("professional_id, created_at, accepted_at, role, permissions")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (rows.error) return fail(rows.error, "Couldn't load your team. Check your connection and try again.");
  const list = (rows.data ?? []) as EmployeeRow[];
  const names = await namesFor(list.map((r) => r.professional_id));
  return {
    ok: true,
    value: list.map((r) => ({
      professionalId: r.professional_id,
      name: names.get(r.professional_id)?.name ?? "Unnamed",
      avatarUrl: names.get(r.professional_id)?.avatarUrl ?? null,
      role: r.role ?? "staff",
      permissions: r.permissions ?? [],
      invitedAt: r.created_at,
      acceptedAt: r.accepted_at,
    })),
  };
}

/** Seat capacity (B6: included seats + blocks × seats per block; 0 without an active plan). */
export interface SeatCapacity {
  capacity: number;
  seatBlocks: number;
  seatsPerUnit: number | null;
}

export async function fetchSeatCapacity(): Promise<Result<SeatCapacity>> {
  const { data, error } = await db.rpc("my_business_seat_capacity");
  if (error) return fail(error, "Couldn't check your seats.");
  const row = (Array.isArray(data) ? data[0] : data) as
    | { capacity: number | null; seat_blocks: number | null; seats_per_unit: number | null }
    | undefined;
  return {
    ok: true,
    value: {
      capacity: row?.capacity ?? 0,
      seatBlocks: row?.seat_blocks ?? 0,
      seatsPerUnit: row?.seats_per_unit ?? null,
    },
  };
}

/** The seat block's monthly price from subscription_tiers (V6-40: never hard-coded). */
export async function fetchSeatBlockPrice(): Promise<Result<{ monthly: number; seatsPerUnit: number } | null>> {
  const { data, error } = await db
    .from("subscription_tiers")
    .select("monthly_price, seats_per_unit")
    .eq("tier_type", "business")
    .eq("is_addon", true)
    .maybeSingle();
  if (error) return fail(error, "Couldn't load the seat price.");
  if (!data) return { ok: true, value: null };
  return { ok: true, value: { monthly: Number(data.monthly_price), seatsPerUnit: data.seats_per_unit ?? 5 } };
}

export type InviteOutcome =
  | { ok: true }
  | { ok: false; reason: "not_found" | "no_seats" | "rate_limited" | "not_allowed" | "failed"; message: string };

/**
 * invite_employee(identifier, role, business, message). The identifier is an
 * email (exact match) or a business code; one not-found answer covers a
 * missing account, yourself and somebody already on the team (ATXB9 22023).
 * The message parameter exists but is not stored anywhere yet, so the sheet
 * does not offer it.
 */
export async function inviteEmployee(businessId: string, identifier: string, role: BusinessRole): Promise<InviteOutcome> {
  const { error } = await db.rpc("invite_employee", {
    p_identifier: identifier.trim(),
    p_role: role,
    p_business_id: businessId,
    p_message: null,
  });
  if (!error) return { ok: true };
  const text = `${error.message ?? ""}`;
  if (isOffline(error)) return { ok: false, reason: "failed", message: "Invite didn't send. Check your connection and try again. Nothing was sent." };
  if (text.includes("ATXC0") || error.code === "23514") return { ok: false, reason: "no_seats", message: "All seats are in use." };
  if (text.includes("ATXB9") && error.code === "22023") return { ok: false, reason: "not_found", message: "No professional found with that ID or email." };
  if (error.code === "42501") return { ok: false, reason: "not_allowed", message: "You can't invite people to this business." };
  if (error.code === "ATX02") return { ok: false, reason: "rate_limited", message: "Too many invites in a short time. Try again in an hour." };
  console.error("[business-team] invite_employee failed:", error.code, error.message);
  return { ok: false, reason: "failed", message: "Invite didn't send. Check your connection and try again. Nothing was sent." };
}

export interface JoinRequest {
  id: string;
  professionalId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

/** Pending join requests (B6 business_join_requests: readable with the members permission). */
export async function fetchJoinRequests(businessId: string): Promise<Result<JoinRequest[]>> {
  const rows = await db
    .from("business_join_requests")
    .select("id, professional_id, created_at")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (rows.error) return fail(rows.error, "Couldn't load join requests. Try again.");
  const list = (rows.data ?? []) as { id: string; professional_id: string; created_at: string }[];
  const names = await namesFor(list.map((r) => r.professional_id));
  return {
    ok: true,
    value: list.map((r) => ({
      id: r.id,
      professionalId: r.professional_id,
      name: names.get(r.professional_id)?.name ?? "Unnamed",
      avatarUrl: names.get(r.professional_id)?.avatarUrl ?? null,
      createdAt: r.created_at,
    })),
  };
}

export type RespondOutcome = { ok: true } | { ok: false; reason: "no_seats" | "gone" | "failed"; message: string };

/** respond_join_request(id, approve): approval adds an UNACCEPTED employment (they still accept). */
export async function respondJoinRequest(requestId: string, approve: boolean, name: string): Promise<RespondOutcome> {
  const { error } = await db.rpc("respond_join_request", { p_request_id: requestId, p_approve: approve });
  if (!error) return { ok: true };
  const text = `${error.message ?? ""}`;
  if (text.includes("ATXC0")) return { ok: false, reason: "no_seats", message: "All seats are in use." };
  if (text.includes("already") || text.includes("no such request")) return { ok: false, reason: "gone", message: "That request was already answered." };
  console.error("[business-team] respond_join_request failed:", error.code, error.message);
  return { ok: false, reason: "failed", message: approve ? `Couldn't approve ${name}. Try again.` : "Couldn't deny the request. Try again." };
}

export interface Credential {
  professionalId: string;
  licenceName: string | null;
  issuingBody: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  noExpiry: boolean;
  verified: boolean;
}

/** employee_credentials(business): accepted employees only; never the document path (V6-32). */
export async function fetchCredentials(businessId: string): Promise<Result<Credential[]>> {
  const { data, error } = await db.rpc("employee_credentials", { p_business_id: businessId });
  if (error) return fail(error, "Couldn't load credentials.");
  return {
    ok: true,
    value: ((data ?? []) as {
      professional_id: string;
      licence_name: string | null;
      issuing_body: string | null;
      issued_on: string | null;
      expires_on: string | null;
      no_expiry: boolean | null;
      verified: boolean | null;
    }[]).map((r) => ({
      professionalId: r.professional_id,
      licenceName: r.licence_name,
      issuingBody: r.issuing_body,
      issuedOn: r.issued_on,
      expiresOn: r.expires_on,
      noExpiry: !!r.no_expiry,
      verified: !!r.verified,
    })),
  };
}

export interface ClassSession {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM:SS
  end: string;
  capacity: number;
  professionalId: string | null;
}

/** The business's classes between two dates (inclusive), for team counts, previews and the week grid. */
export async function fetchSessions(businessId: string, from: string, to: string): Promise<Result<ClassSession[]>> {
  const { data, error } = await db
    .from("business_classes")
    .select("id, title, event_date, start_time, end_time, max_capacity, professional_id")
    .eq("business_id", businessId)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) return fail(error, "Couldn't load sessions.");
  return {
    ok: true,
    value: ((data ?? []) as {
      id: string;
      title: string;
      event_date: string;
      start_time: string;
      end_time: string;
      max_capacity: number;
      professional_id: string | null;
    }[]).map((r) => ({
      id: r.id,
      title: r.title,
      date: r.event_date,
      start: r.start_time,
      end: r.end_time,
      capacity: r.max_capacity,
      professionalId: r.professional_id,
    })),
  };
}

/** Booked count for a class: capacity minus class_seats_left(). Null when it can't be read. */
export async function fetchBooked(classId: string, capacity: number): Promise<number | null> {
  const { data, error } = await db.rpc("class_seats_left", { p_class_id: classId });
  if (error || typeof data !== "number") return null;
  return Math.max(0, capacity - data);
}

export interface AvailabilityWindow {
  weekday: number; // 1 = Monday … 7 = Sunday
  start: string; // HH:MM:SS
  end: string;
}

/** instructor_availability for one person at this business (readable with the schedule permission). */
export async function fetchAvailability(businessId: string, professionalId: string): Promise<Result<AvailabilityWindow[]>> {
  const { data, error } = await db
    .from("instructor_availability")
    .select("weekday, starts_at, ends_at")
    .eq("business_id", businessId)
    .eq("professional_id", professionalId)
    .order("weekday", { ascending: true })
    .order("starts_at", { ascending: true });
  if (error) return fail(error, "Couldn't load availability. Try again.");
  return {
    ok: true,
    value: ((data ?? []) as { weekday: number; starts_at: string; ends_at: string }[]).map((r) => ({
      weekday: r.weekday,
      start: r.starts_at,
      end: r.ends_at,
    })),
  };
}
