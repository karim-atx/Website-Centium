import { supabase } from "../../../../lib/supabase/client";
import { isOffline } from "../../../services/network-error";
import {
  fetchJoinRequests,
  fetchSeatBlockPrice,
  fetchSeatCapacity,
  fetchSessions,
  fetchTeam,
  inviteEmployee as inviteViaTeam,
  type BusinessRole as ServiceRole,
} from "../../../services/business-team/team";
import type { BusinessRole, ClassRow, SeatInfo, TeamData, TeamPerson } from "./teamTypes";
import { assignInstructor as assignViaClasses, fetchClassBookings } from "../../../services/business-classes";

// AN5 Team analytics: an adapter over the shared services this batch's Team
// agent (services/business-team/team.ts: team, seats, seat price, join
// requests, invite) and Classes agent (services/business-classes: bookings,
// assign) own, shaped for the Analytics pages. Pay rates now come from the
// Team service's person (pay_rate_per_class; written on the Team person page
// through set_employee_terms, B6 follow-up). Only the first day a class was
// taught (the early-data rule) is read here.
//
// Not here because the backend does not exist yet (each screen draws its
// pending state): scorecard readers and return rates (B15), instructor
// reviews (B14, V6-85), a server-side assign / move with member notices (B9),
// seat purchase (B8). Role, permission and pay changes live on the Team
// person page (set_employee_terms).

const db = supabase;

export type { BusinessRole, ClassRow, SeatInfo, TeamData, TeamPerson };

// The pure shapes live in teamTypes.ts (no runtime imports, for the node test
// project); this fails to compile if its role union drifts from the service's.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const ROLE_UNION_MATCHES: Same<BusinessRole, ServiceRole> = true;
void ROLE_UNION_MATCHES;

export type Res<T> = { ok: true; value: T } | { ok: false; offline: boolean };

const OFFLINE = (m: string | undefined) => !!m && /connection|reach the server/i.test(m);

export async function loadTeam(businessId: string): Promise<Res<TeamData>> {
  try {
    const [team, cap, price, reqs] = await Promise.all([
      fetchTeam(businessId),
      fetchSeatCapacity(),
      fetchSeatBlockPrice(),
      fetchJoinRequests(businessId),
    ]);
    if (!team.ok) return { ok: false, offline: OFFLINE(team.message) };
    if (!cap.ok) return { ok: false, offline: OFFLINE(cap.message) };
    const ordered = [...team.value].sort((a, b) => {
      if (!!a.acceptedAt !== !!b.acceptedAt) return a.acceptedAt ? -1 : 1;
      return (a.acceptedAt ?? a.invitedAt).localeCompare(b.acceptedAt ?? b.invitedAt);
    });
    const perBlock = cap.value.seatsPerUnit ?? (price.ok && price.value ? price.value.seatsPerUnit : 5);
    return {
      ok: true,
      value: {
        people: ordered.map((p, i) => ({
          id: p.professionalId,
          name: p.name,
          role: p.role,
          acceptedAt: p.acceptedAt,
          createdAt: p.invitedAt,
          payRate: p.payRate,
          usesSeat: p.usesSeat,
          seat: i + 1,
        })),
        seats: {
          capacity: cap.value.capacity,
          planActive: cap.value.capacity > 0,
          blocks: cap.value.seatBlocks,
          perBlock,
          blockPrice: price.ok && price.value ? price.value.monthly : null,
        },
        requests: reqs.ok ? reqs.value.length : 0,
      },
    };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}

/** business_classes between two days (inclusive) with their booking counts. */
export async function loadClasses(businessId: string, from: string, to: string): Promise<Res<ClassRow[]>> {
  try {
    const s = await fetchSessions(businessId, from, to);
    if (!s.ok) return { ok: false, offline: OFFLINE(s.message) };
    const b = await fetchClassBookings(s.value.map((x) => x.id));
    if (!b.ok) return { ok: false, offline: typeof navigator !== "undefined" && navigator.onLine === false };
    const counts = new Map<string, number>();
    for (const x of b.bookings) counts.set(x.classId, (counts.get(x.classId) ?? 0) + 1);
    const types = await db.from("business_classes").select("id, class_type").in("id", s.value.map((x) => x.id));
    const typeById = new Map<string, string>(((types.data ?? []) as { id: string; class_type: string | null }[]).map((r) => [r.id, r.class_type ?? ""]));
    return {
      ok: true,
      value: s.value.map((x) => ({
        id: x.id,
        title: x.title,
        classType: typeById.get(x.id) ?? "",
        date: x.date,
        start: x.start.slice(0, 5),
        end: x.end.slice(0, 5),
        capacity: x.capacity,
        professionalId: x.professionalId,
        booked: counts.get(x.id) ?? 0,
      })),
    };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}

/** The first day any class of this business was taught (early-data rule, AN5-003). */
export async function firstTaughtDay(businessId: string, today: string): Promise<Res<string | null>> {
  try {
    const r = await db
      .from("business_classes")
      .select("event_date")
      .eq("business_id", businessId)
      .not("professional_id", "is", null)
      .lte("event_date", today)
      .order("event_date", { ascending: true })
      .limit(1);
    if (r.error) return { ok: false, offline: isOffline(r.error) };
    return { ok: true, value: ((r.data ?? []) as { event_date: string }[])[0]?.event_date ?? null };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}

/**
 * Who on the team is off on one date (OURS availability A1): Database B6
 * instructor_unavailable_dates, readable by anyone with the schedule
 * permission. A failed read hides the state (never guessed).
 */
export async function loadOffOn(businessId: string, date: string): Promise<Set<string>> {
  try {
    const r = await db.from("instructor_unavailable_dates").select("professional_id").eq("business_id", businessId).eq("on_date", date);
    if (r.error) return new Set();
    return new Set(((r.data ?? []) as { professional_id: string }[]).map((x) => x.professional_id));
  } catch {
    return new Set();
  }
}

/** First names for people who left but still teach upcoming sessions (availability A3). */
export async function fetchNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  try {
    const r = await db.from("public_profile_summary").select("id, first_name").in("id", ids);
    return new Map(((r.data ?? []) as { id: string; first_name: string | null }[]).map((p) => [p.id, p.first_name?.trim() || "Unnamed"]));
  } catch {
    return new Map();
  }
}

export type InviteResult = { ok: true } | { ok: false; kind: "notfound" | "noseats" | "network" | "denied" | "limited"; message: string };

/** invite_employee through the Team service (exact match, rate limited, one not-found text). */
export async function inviteEmployee(identifier: string, role: BusinessRole, businessId: string, message?: string | null): Promise<InviteResult> {
  const r = await inviteViaTeam(businessId, identifier, role, message);
  if (r.ok) return { ok: true };
  const kind = r.reason === "not_found" ? "notfound" : r.reason === "no_seats" ? "noseats" : r.reason === "not_allowed" ? "denied" : r.reason === "rate_limited" ? "limited" : "network";
  return { ok: false, kind, message: r.message };
}

/**
 * Assign an instructor to one session (AN5-027) through the Classes service
 * (owner UPDATE on professional_id; the guard trigger refuses anyone not on
 * the team). The overlap re-check runs on the client just before (B9 adds the
 * server check and the instructor's notice).
 */
export async function assignInstructor(classId: string, professionalId: string): Promise<boolean> {
  const r = await assignViaClasses(classId, professionalId);
  return r.ok;
}

/**
 * Move a session with nobody booked (AN5-038). A session with bookings needs
 * the member notice and calendar move of B9's move_class_session, so the UI
 * never offers it for one; this re-checks the count before writing.
 */
export async function moveEmptyClass(classId: string, start: string, end: string): Promise<"ok" | "booked" | "error"> {
  try {
    const b = await fetchClassBookings([classId]);
    if (!b.ok) return "error";
    if (b.bookings.length > 0) return "booked";
    const { error } = await db.from("business_classes").update({ start_time: start, end_time: end }).eq("id", classId);
    return error ? "error" : "ok";
  } catch {
    return "error";
  }
}
