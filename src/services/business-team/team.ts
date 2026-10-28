import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { CLOSED_APPROVE_JOIN, CLOSED_INVITE_STAFF, closureMessage, isBusinessClosedError } from "../business-closure/logic";
import type { PublicDetails } from "./types";

export type { PublicDetails } from "./types";

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

const db = supabase;

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

const fail = <T>(error: { code?: string; message?: string } | null | undefined, fallback: string): Result<T> => ({
  ok: false,
  code: error?.code,
  message: isOffline(error) ? OFFLINE_MESSAGE : fallback,
});

import type { BusinessRole, ClassSession, InviteWindow, TeamPerson } from "./types";
export type { BusinessRole, ClassSession, InviteWindow, TeamPerson } from "./types";
import { reinviteRefusal, resendRefusal, revokeRefusal } from "./inviteRefusals";
import { rpc } from "../pro/rpc";

export { roleUsesSeat } from "./seats";

interface EmployeeRow {
  id: string;
  professional_id: string;
  invite_message: string | null;
  created_at: string;
  accepted_at: string | null;
  role: BusinessRole | null;
  permissions: string[] | null;
  /** Batch 2 CO window (migration 20261201000000); absent on the fallback read. */
  expires_at?: string | null;
  revoked_at?: string | null;
  resent_count?: number | null;
  sent_at?: string | null;
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

interface About {
  subtype: string | null;
  otherDiscipline: string | null;
  closestGroup: string | null;
  usesSeat: boolean | null;
}

/**
 * Profession and seat answer per accepted employee, from employee_credentials
 * (one row per licence, so the first row per person is enough). A failed read
 * only loses the profession; the team still loads.
 */
async function professionsFor(businessId: string): Promise<Map<string, About>> {
  const { data, error } = await db.rpc("employee_credentials", { p_business_id: businessId });
  const out = new Map<string, About>();
  if (error) return out;
  for (const r of (data ?? []) as {
    professional_id: string;
    professional_subtype: string | null;
    other_discipline: string | null;
    closest_group: string | null;
    uses_seat: boolean | null;
  }[]) {
    if (out.has(r.professional_id)) continue;
    out.set(r.professional_id, {
      subtype: r.professional_subtype ?? null,
      otherDiscipline: r.other_discipline ?? null,
      closestGroup: r.closest_group ?? null,
      usesSeat: typeof r.uses_seat === "boolean" ? r.uses_seat : null,
    });
  }
  return out;
}

/**
 * Pay per class by employment id. pay_rate_per_class is no longer readable on
 * business_employees (column grant); employee_pay_rates() returns the whole team
 * to the owner or a holder of revenue, and only the caller's own row to anyone
 * else. A failed read leaves pay unknown rather than failing the team.
 */
async function payRatesFor(businessId: string): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  const { data, error } = await db.rpc("employee_pay_rates", { p_business_id: businessId });
  if (error) return out;
  for (const r of (data ?? []) as { employment_id: string; pay_rate_per_class: number | string | null }[]) {
    out.set(r.employment_id, r.pay_rate_per_class == null ? null : Number(r.pay_rate_per_class));
  }
  return out;
}

const TEAM_COLUMNS = "id, professional_id, created_at, accepted_at, role, permissions, invite_message";
/** Batch 2 CO: the invitation window, SELECT-granted to authenticated (migration 20261201000000). */
const WINDOW_COLUMNS = "expires_at, revoked_at, resent_count, sent_at";

/** An unaccepted row's window; null when the read didn't include it (the fallback). */
function windowOf(r: EmployeeRow): InviteWindow | null {
  if (r.accepted_at || !("revoked_at" in r)) return null;
  return {
    expiresAt: r.expires_at ?? null,
    revokedAt: r.revoked_at ?? null,
    sentAt: r.sent_at ?? null,
    resentCount: Number(r.resent_count ?? 0),
  };
}

/**
 * Everyone on the business's team, accepted and invited, earliest first,
 * with each invitation's window (expires_at, revoked_at, sent_at,
 * resent_count). A withdrawn invitation stays in the list so the screens show
 * it as "Withdrawn {date}" with "Invite again" for the owner (teamLogic
 * isWithdrawn / onTeam). It holds no seat.
 *
 * FALLBACK: if the read naming the window columns is refused (a database
 * without their grant answers 42501 for the whole statement), the team is read
 * again without them, and the screens show no expiry and no withdrawn state
 * rather than a guessed one.
 */
export async function fetchTeam(businessId: string): Promise<Result<TeamPerson[]>> {
  const read = (cols: string) =>
    db
      .from("business_employees")
      .select(cols)
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });
  let rows = await read(`${TEAM_COLUMNS}, ${WINDOW_COLUMNS}`);
  if (rows.error && !isOffline(rows.error)) rows = await read(TEAM_COLUMNS);
  if (rows.error) return fail(rows.error, "Couldn't load your team. Check your connection and try again.");
  const list = (rows.data ?? []) as unknown as EmployeeRow[];
  const [names, about, pay] = await Promise.all([namesFor(list.map((r) => r.professional_id)), professionsFor(businessId), payRatesFor(businessId)]);
  return {
    ok: true,
    value: list.map((r) => ({
      invite: windowOf(r),
      employmentId: r.id,
      professionalId: r.professional_id,
      name: names.get(r.professional_id)?.name ?? "Unnamed",
      avatarUrl: names.get(r.professional_id)?.avatarUrl ?? null,
      role: r.role ?? "staff",
      permissions: r.permissions ?? [],
      invitedAt: r.created_at,
      acceptedAt: r.accepted_at,
      // Only the owner / a holder of revenue sees everyone's pay; anyone else
      // sees their own row (employee_pay_rates). Not visible = null here.
      payRate: pay.get(r.id) ?? null,
      inviteMessage: r.invite_message,
      subtype: about.get(r.professional_id)?.subtype ?? null,
      otherDiscipline: about.get(r.professional_id)?.otherDiscipline ?? null,
      closestGroup: about.get(r.professional_id)?.closestGroup ?? null,
      // employee_credentials.uses_seat is business_seats_used()'s own test (Database PR #39 correction 1:
      // source <> 'hire' and role_uses_seat(role)), so the server's flag is the answer as it stands.
      usesSeat: about.get(r.professional_id)?.usesSeat ?? null,
    })),
  };
}

/**
 * Seat capacity (B6 follow-up: my_business_seat_capacity returns seats_total =
 * included seats + blocks × seats per block (0 without an active plan),
 * seats_used = ACCEPTED seat-using roles only, seats_invited = unaccepted
 * seat-using roles, reported separately and never counted as used).
 */
export interface SeatCapacity {
  capacity: number;
  seatBlocks: number;
  seatsPerUnit: number | null;
  used: number;
  invited: number;
}

export async function fetchSeatCapacity(): Promise<Result<SeatCapacity>> {
  const { data, error } = await db.rpc("my_business_seat_capacity");
  if (error) return fail(error, "Couldn't check your seats.");
  const row = (Array.isArray(data) ? data[0] : data) as
    | { seats_total: number | null; seat_blocks: number | null; seats_per_unit: number | null; seats_used: number | null; seats_invited: number | null }
    | undefined;
  return {
    ok: true,
    value: {
      capacity: row?.seats_total ?? 0,
      seatBlocks: row?.seat_blocks ?? 0,
      seatsPerUnit: row?.seats_per_unit ?? null,
      used: Number(row?.seats_used ?? 0),
      invited: Number(row?.seats_invited ?? 0),
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
  | { ok: false; reason: "not_found" | "no_seats" | "rate_limited" | "not_allowed" | "professional_account" | "professional_code" | "failed"; message: string };

/**
 * invite_employee(identifier, role, business, message). The identifier is an
 * email (exact match) or a business code; one not-found answer covers a
 * missing account, yourself and somebody already on the team (ATXB9 22023).
 * The optional message is stored on the employment (invite_message, B6
 * follow-up) and shown to the invitee. Roles that don't use a seat (front
 * desk, manager) can be invited into a full business.
 */
export async function inviteEmployee(businessId: string, identifier: string, role: BusinessRole, message?: string | null): Promise<InviteOutcome> {
  const { error } = await db.rpc("invite_employee", {
    p_identifier: identifier.trim(),
    p_role: role,
    p_business_id: businessId,
    // Omitted rather than null: the parameter defaults to null (typed optional).
    p_message: message?.trim() ? message.trim() : undefined,
  });
  if (!error) return { ok: true };
  const text = `${error.message ?? ""}`;
  if (isOffline(error)) return { ok: false, reason: "failed", message: "Invite didn't send. Check your connection and try again. Nothing was sent." };
  if (text.includes("ATXC0") || error.code === "23514") return { ok: false, reason: "no_seats", message: "All seats are in use." };
  if (text.includes("ATXB9") && error.code === "22023") return { ok: false, reason: "not_found", message: "No professional found with that ID or email." };
  if (isBusinessClosedError(error)) return { ok: false, reason: "not_allowed", message: closureMessage(CLOSED_INVITE_STAFF, error.message) };
  // Database Release 2: ATXH17 (22023) "add professionals to your team through Hiring" for a
  // professional's own code, or a professional ACCOUNT once the free window has closed (the hint says
  // which). Both show the B-MA.8.7 card.
  if (text.includes("ATXH17")) {
    return /window/i.test(error.hint ?? "")
      ? { ok: false, reason: "professional_account", message: "New professionals join through Hiring." }
      : { ok: false, reason: "professional_code", message: "Add professionals to your team through Hiring." };
  }
  if (error.code === "42501") return { ok: false, reason: "not_allowed", message: "You can't invite people to this business." };
  if (error.code === "ATX02") return { ok: false, reason: "rate_limited", message: "Too many invites in a short time. Try again in an hour." };
  console.error("[business-team] invite_employee failed:", error.code, error.message);
  return { ok: false, reason: "failed", message: "Invite didn't send. Check your connection and try again. Nothing was sent." };
}

export type InviteWrite = { ok: true; at: string | null } | { ok: false; message: string; refresh: boolean; noSeats?: boolean };

/**
 * resend_team_invite(business, professional) (Batch 2 CO): extends a pending
 * invitation 14 days from now, an already-lapsed one too, and answers the new
 * expires_at. Needs business_can(members); 10 resends an hour (ATX02).
 */
export async function resendTeamInvite(businessId: string, professionalId: string): Promise<InviteWrite> {
  const { data, error } = await rpc("resend_team_invite", { p_business_id: businessId, p_professional_id: professionalId });
  if (!error) return { ok: true, at: typeof data === "string" ? data : null };
  const r = resendRefusal(error);
  if (!r.refresh) console.error("[business-team] resend_team_invite failed:", error.code, error.message);
  return { ok: false, ...r };
}

/**
 * revoke_team_invite(business, professional) (Batch 2 CO): marks a pending
 * invitation withdrawn (the row stays) and answers revoked_at; a second call
 * answers the first time. Refused on an accepted one (Remove from team is
 * that act). Replaces deleting a pending row from the console.
 */
export async function revokeTeamInvite(businessId: string, professionalId: string): Promise<InviteWrite> {
  const { data, error } = await rpc("revoke_team_invite", { p_business_id: businessId, p_professional_id: professionalId });
  if (!error) return { ok: true, at: typeof data === "string" ? data : null };
  const r = revokeRefusal(error);
  if (!r.refresh) console.error("[business-team] revoke_team_invite failed:", error.code, error.message);
  return { ok: false, ...r };
}

/**
 * reinvite_revoked_team_member(business, professional, message) (Batch 2 CO):
 * revives a withdrawn or expired invitation (a new 14-day window, counted as a
 * resend) and answers the new expires_at; a still-live one answers its
 * current window. Needs business_can(members); 10 an hour (ATX02).
 */
export async function reinviteTeamMember(businessId: string, professionalId: string, message?: string | null): Promise<InviteWrite> {
  const { data, error } = await rpc("reinvite_revoked_team_member", {
    p_business_id: businessId,
    p_professional_id: professionalId,
    p_message: message?.trim() ? message.trim() : null,
  });
  if (!error) return { ok: true, at: typeof data === "string" ? data : null };
  const r = reinviteRefusal(error);
  if (!r.refresh) console.error("[business-team] reinvite_revoked_team_member failed:", error.code, error.message);
  return { ok: false, ...r };
}

export interface JoinRequest {
  id: string;
  professionalId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  /** W6A-1 (20261216080000): the role they asked for (a wish, not binding) and their note, when given. */
  requestedRole: BusinessRole | null;
  message: string | null;
}

/** Pending join requests (B6 business_join_requests: readable with the members permission). */
export async function fetchJoinRequests(businessId: string): Promise<Result<JoinRequest[]>> {
  const rows = await db
    // requested_role (Release A) isn't in the generated types yet: cast at this boundary.
    .from("business_join_requests" as never)
    .select("id, professional_id, created_at, message, requested_role")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (rows.error) return fail(rows.error, "Couldn't load join requests. Try again.");
  const list = (rows.data ?? []) as unknown as { id: string; professional_id: string; created_at: string; message: string | null; requested_role?: BusinessRole | null }[];
  const names = await namesFor(list.map((r) => r.professional_id));
  return {
    ok: true,
    value: list.map((r) => ({
      id: r.id,
      professionalId: r.professional_id,
      name: names.get(r.professional_id)?.name ?? "Unnamed",
      avatarUrl: names.get(r.professional_id)?.avatarUrl ?? null,
      createdAt: r.created_at,
      requestedRole: r.requested_role ?? null,
      message: r.message?.trim() || null,
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
  if (isBusinessClosedError(error)) return { ok: false, reason: "failed", message: closureMessage(CLOSED_APPROVE_JOIN, text) };
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

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/**
 * What a professional shows the public (OP1-132 C1, C2, C5; OP1-124 9c):
 * public_professional_directory (subtype, specialty, bio) and
 * public_professional_experience. Both views read listed_publicly
 * professionals only: an unlisted one answers null, and the person page
 * leaves those rows out (since Database #38 joining a team no longer unlists
 * anybody).
 *
 * NO WEBSITE OR SOCIAL LINKS (DB7, 20261211000000): the directory no longer
 * carries website / instagram / facebook / x, and per D-27 a business does
 * not see a professional's socials at all (professional_social_handles is
 * for connected clients only), so nothing here asks for them.
 *
 * W6L-3 (20261216050000): with `staffOf` (the Team › Person page, accepted
 * staff), the experience comes from business_staff_experience(business,
 * professional) instead: the `members` permission and an accepted, unrevoked
 * employment, so a business reads its own staff's CV even when they aren't
 * listed (the public view answers nothing for an unlisted professional).
 * The directory half (specialty, bio) stays public-only.
 */
export async function fetchPublicDetails(professionalId: string, staffOf?: string): Promise<Result<PublicDetails | null>> {
  const [dir, exp] = await Promise.all([
    db.from("public_professional_directory").select("professional_subtype, specialty, bio").eq("profile_id", professionalId).maybeSingle(),
    staffOf
      ? rpc("business_staff_experience", { p_business_id: staffOf, p_professional_id: professionalId })
      : db.from("public_professional_experience").select("title, organisation, start_month, end_month, position").eq("professional_id", professionalId).order("position"),
  ]);
  if (dir.error) return fail(dir.error, "Couldn't load their profile.");
  const rows = (exp.error ? [] : exp.data ?? []) as { title: string | null; organisation: string | null; start_month: string | null; end_month: string | null }[];
  if (!dir.data && !(staffOf && rows.length)) return { ok: true, value: null };
  const d = (dir.data ?? { professional_subtype: null, specialty: null, bio: null }) as { professional_subtype: string | null; specialty: string | null; bio: string | null };
  return {
    ok: true,
    value: {
      subtype: d.professional_subtype ?? null,
      specialty: clean(d.specialty),
      bio: clean(d.bio),
      experience: rows
        .filter((r) => clean(r.title))
        .map((r) => ({ title: (r.title as string).trim(), organisation: clean(r.organisation), startMonth: r.start_month, endMonth: r.end_month })),
    },
  };
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

export type TermsOutcome = { ok: true } | { ok: false; reason: "own" | "no_seats" | "unknown_permission" | "failed"; message: string };

/**
 * set_employee_terms(employment, role, permissions, pay rate, clear pay rate)
 * (B6 follow-up). Needs members; nobody changes their own (ATXC1). A role that
 * starts using a seat in a full business is refused (ATXC0). Pass only what
 * changes: a role change does not reset tailored permissions.
 */
export async function setEmployeeTerms(
  employmentId: string,
  terms: { role?: BusinessRole; permissions?: string[]; payRate?: number; clearPayRate?: boolean }
): Promise<TermsOutcome> {
  const { error } = await db.rpc("set_employee_terms", {
    p_employment_id: employmentId,
    // Omitted rather than null: each defaults to null ("leave unchanged").
    p_role: terms.role,
    p_permissions: terms.permissions,
    p_pay_rate_per_class: terms.payRate,
    p_clear_pay_rate: !!terms.clearPayRate,
  });
  if (!error) return { ok: true };
  const text = `${error.message ?? ""}`;
  if (isOffline(error)) return { ok: false, reason: "failed", message: "Couldn't save. Check your connection and try again." };
  if (text.includes("your own")) return { ok: false, reason: "own", message: "You can't change your own role or access. Ask the owner." };
  if (text.includes("ATXC0") || error.code === "23514") return { ok: false, reason: "no_seats", message: "All seats are in use." };
  // B7 added 'venues' to the permission vocabulary, but set_employee_terms()
  // still checks the B6 list (reported to the Database session), so any list
  // holding venues is refused until it is updated.
  if (text.includes("unknown permission")) return { ok: false, reason: "unknown_permission", message: "Venue access can't be saved yet. Try again later." };
  console.error("[business-team] set_employee_terms failed:", error.code, error.message);
  return { ok: false, reason: "failed", message: "Couldn't save. Try again." };
}
