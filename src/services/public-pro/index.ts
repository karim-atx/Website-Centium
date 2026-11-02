import { supabase } from "../../../lib/supabase/client";
import { rpc } from "../pro/rpc";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Enums } from "../../../lib/supabase/database.types";
import { describeBookingError, isPublicReturnPath, publicReviewRows, readReturn, PUBLIC_REVIEWS_PAGE, type PublicReviewDbRow, type Slot } from "./logic";
import type { ReviewRow } from "../professional-reviews";
import { tk } from "../../i18n/core";

export * from "./logic";

// Release 3 · W7 the public professional readers (HANDOVER_API "Release 3 ·
// Professional UI backend" DB-1, DB-2, DB-4 and "Bookings and the public
// booking page"). Every reader here is granted to anon and returns only what
// the professional publishes:
// - preview_invite_link(p_code): the invite page;
// - professional_by_handle(p_handle): the public profile;
// - professional_booking_allowed(p_professional): whether the caller may book;
// - appointment_services (professional_id, active): the session types,
//   readable signed out only when anyone may book and the link is on (with
//   DB3 `visible`: a hidden one is still bookable by its link);
// - professional_open_slots(p_professional, p_from, p_to, p_service_id): ATXG5
//   when the caller may not book;
// - request_professional_booking(p_service_id, p_starts_at): signed in.
// - professional_reviews_public(p_professional_id, p_sort, p_limit, p_offset):
//   the reviews, no reviewer names or ids for a visitor; an unlisted
//   professional returns none.
// The functions are called through the untyped rpc (pro/rpc.ts) and cast at
// this boundary: the generated types predate them.

type Subtype = Enums<"professional_subtype">;

export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean; message: string };

const fail = (error: unknown, message: string) => ({
  ok: false as const,
  offline: isOffline(error),
  message: isOffline(error) ? OFFLINE_MESSAGE : message,
});

export interface InvitePreview {
  code: string;
  professionalId: string;
  firstName: string;
  avatarUrl: string | null;
  subtype: Subtype | null;
  handle: string | null;
  licenceVerified: boolean;
  usable: boolean;
  usableMessage: string | null;
}

/** preview_invite_link(code): null when there is no such invite link. */
export async function previewInviteLink(code: string): Promise<Read<InvitePreview | null>> {
  try {
    const { data, error } = await rpc("preview_invite_link", { p_code: code.trim() });
    if (error) return fail(error, tk("Couldn't open this invite. Try again."));
    type Row = {
      professional_id: string;
      first_name: string | null;
      avatar_url: string | null;
      professional_subtype: Subtype | null;
      handle: string | null;
      licence_verified: boolean | null;
      usable: boolean | null;
      usable_message: string | null;
    };
    const r = ((data ?? []) as Row[])[0];
    if (!r) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        code: code.trim().toUpperCase(),
        professionalId: r.professional_id,
        firstName: r.first_name?.trim() ?? "",
        avatarUrl: r.avatar_url,
        subtype: r.professional_subtype,
        handle: r.handle,
        licenceVerified: r.licence_verified === true,
        usable: r.usable === true,
        usableMessage: r.usable_message,
      },
    };
  } catch (e) {
    return fail(e, tk("Couldn't open this invite. Try again."));
  }
}

/**
 * W2-5c (20261216070000) record_invite_open(p_code): stamps
 * client_codes.opened_at the first time the link is loaded, so the
 * professional's sent invites can say "Opened". From the link only (Karim),
 * granted to anon and authenticated, and silent whether or not the code is
 * real, so nothing comes back and a failure is not the visitor's problem.
 */
export async function recordInviteOpen(code: string): Promise<void> {
  try {
    await rpc("record_invite_open", { p_code: code.trim() });
  } catch {
    /* silent by design */
  }
}

export interface Workplace {
  businessId: string;
  name: string;
  /** business_role ("instructor", "trainer", …). */
  role: string | null;
  location: string | null;
}

/**
 * W7-9 (20261216050000) professional_workplaces(p_professional_id), anon and
 * authenticated: where a professional works, accepted and unrevoked, and only
 * while the business is publicly visible. A Centium hire shows by default;
 * a team they joined only when they turned on show_team_workplaces (default
 * false). No pay or dates.
 */
export async function fetchProfessionalWorkplaces(professionalId: string): Promise<Read<Workplace[]>> {
  try {
    const { data, error } = await rpc("professional_workplaces", { p_professional_id: professionalId });
    if (error) return fail(error, tk("Couldn't load where they work."));
    type Row = { business_id: string; business_name: string | null; location: string | null; role: string | null };
    return {
      ok: true,
      data: ((data ?? []) as Row[]).map((r) => ({ businessId: r.business_id, name: r.business_name?.trim() || "A business", role: r.role, location: r.location?.trim() || null })),
    };
  } catch (e) {
    return fail(e, tk("Couldn't load where they work."));
  }
}

export interface HandleProfile {
  profileId: string;
  handle: string;
  firstName: string;
  avatarUrl: string | null;
  subtype: Subtype | null;
  headline: string | null;
  specialty: string | null;
  listedPublicly: boolean;
  licenceVerified: boolean;
}

/** professional_by_handle(handle): null when no professional holds it. */
export async function professionalByHandle(handle: string): Promise<Read<HandleProfile | null>> {
  try {
    const { data, error } = await rpc("professional_by_handle", { p_handle: handle.trim().toLowerCase() });
    if (error) return fail(error, tk("Couldn't load this profile. Try again."));
    type Row = {
      profile_id: string;
      handle: string;
      first_name: string | null;
      avatar_url: string | null;
      professional_subtype: Subtype | null;
      headline: string | null;
      specialty: string | null;
      listed_publicly: boolean | null;
      licence_verified: boolean | null;
    };
    const r = ((data ?? []) as Row[])[0];
    if (!r) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        profileId: r.profile_id,
        handle: r.handle,
        firstName: r.first_name?.trim() ?? "",
        avatarUrl: r.avatar_url,
        subtype: r.professional_subtype,
        headline: r.headline?.trim() || null,
        specialty: r.specialty?.trim() || null,
        listedPublicly: r.listed_publicly === true,
        licenceVerified: r.licence_verified === true,
      },
    };
  } catch (e) {
    return fail(e, tk("Couldn't load this profile. Try again."));
  }
}

/** professional_booking_allowed(professional): may the caller (signed in or not) book? */
export async function bookingAllowed(professionalId: string): Promise<Read<boolean>> {
  try {
    const { data, error } = await rpc("professional_booking_allowed", { p_professional: professionalId });
    if (error) return fail(error, tk("Couldn't load booking. Try again."));
    return { ok: true, data: data === true };
  } catch (e) {
    return fail(e, tk("Couldn't load booking. Try again."));
  }
}

export interface BookableSession {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  currency: string;
  locationKind: string | null;
  description: string | null;
  /** DB3 Show in Showcase (Database PR #39): false = left off the profile's Services list, still bookable by its link. */
  visible: boolean;
}

/** The professional's own active session types the caller may read (RLS decides). */
export async function fetchBookableSessions(professionalId: string): Promise<Read<BookableSession[]>> {
  try {
    const { data, error } = await supabase
      .from("appointment_services" as never)
      .select("id, name, duration_min, price, currency, location_kind, description, visible")
      .eq("professional_id", professionalId)
      .is("business_id", null)
      .eq("active", true)
      .order("created_at");
    if (error) return fail(error, tk("Couldn't load session types. Try again."));
    type Row = { id: string; name: string; duration_min: number; price: number | string | null; currency: string | null; location_kind: string | null; description: string | null; visible: boolean | null };
    return {
      ok: true,
      data: ((data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        name: r.name,
        durationMin: r.duration_min,
        price: Number(r.price) || 0,
        currency: r.currency ?? "USD",
        locationKind: r.location_kind,
        description: r.description?.trim() || null,
        visible: r.visible !== false,
      })),
    };
  } catch (e) {
    return fail(e, tk("Couldn't load session types. Try again."));
  }
}

/**
 * A page of reviews, newest first. `read` is how many rows the database
 * returned (removed reviews included), which is what the next offset must
 * advance by; `more` is true when a full page came back.
 */
export async function fetchPublicReviews(professionalId: string, offset = 0): Promise<Read<{ reviews: ReviewRow[]; read: number; more: boolean }>> {
  try {
    const { data, error } = await rpc("professional_reviews_public", {
      p_professional_id: professionalId,
      p_sort: "recent",
      p_limit: PUBLIC_REVIEWS_PAGE,
      p_offset: offset,
    });
    if (error) return fail(error, tk("Couldn't load reviews. Try again."));
    const rows = (data ?? []) as PublicReviewDbRow[];
    return { ok: true, data: { reviews: publicReviewRows(rows, professionalId), read: rows.length, more: rows.length === PUBLIC_REVIEWS_PAGE } };
  } catch (e) {
    return fail(e, tk("Couldn't load reviews. Try again."));
  }
}

export type SlotsResult = { ok: true; slots: Slot[] } | { ok: false; code?: string; offline: boolean; message: string };

/** professional_open_slots for at most 31 days ("YYYY-MM-DD" in the professional's calendar). */
export async function fetchOpenSlots(professionalId: string, from: string, to: string, serviceId: string): Promise<SlotsResult> {
  try {
    const { data, error } = await rpc("professional_open_slots", { p_professional: professionalId, p_from: from, p_to: to, p_service_id: serviceId });
    if (error) {
      const offline = isOffline(error);
      return {
        ok: false,
        code: error.code,
        offline,
        message: error.code === "ATXG5" || error.code === "ATXF4" ? describeBookingError(error.code) : offline ? OFFLINE_MESSAGE : tk("Couldn't load open times. Try again."),
      };
    }
    return { ok: true, slots: ((data ?? []) as { starts_at: string; ends_at: string }[]).map((r) => ({ startsAt: r.starts_at, endsAt: r.ends_at })) };
  } catch (e) {
    return { ok: false, offline: isOffline(e), message: isOffline(e) ? OFFLINE_MESSAGE : tk("Couldn't load open times. Try again.") };
  }
}

export type BookingResult = { ok: true; status: "booked" | "requested"; startsAt: string } | { ok: false; code?: string; message: string };

/** request_professional_booking(service, starts_at): signed in only. */
export async function requestBooking(serviceId: string, startsAt: string): Promise<BookingResult> {
  try {
    const { data, error } = await rpc("request_professional_booking", { p_service_id: serviceId, p_starts_at: startsAt });
    if (error) return { ok: false, code: error.code, message: describeBookingError(error.code, isOffline(error)) };
    const row = data as { status?: string; starts_at?: string } | null;
    return { ok: true, status: row?.status === "booked" ? "booked" : "requested", startsAt: row?.starts_at ?? startsAt };
  } catch (e) {
    return { ok: false, message: describeBookingError(undefined, isOffline(e)) };
  }
}

// ---------------------------------------------------------------------------
// Coming back to a public page after signing in or signing up
// ---------------------------------------------------------------------------

const RETURN_KEY = "centium:public-return";

/** Remembers the public page (and its chosen slot, in the query) to reopen after auth. */
export function rememberPublicReturn(path: string): void {
  if (!isPublicReturnPath(path)) return;
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // Storage blocked: the visitor simply lands on Home after signing in.
  }
}

/** Reads and clears the remembered page; null when none, expired or not ours. */
export function takePublicReturn(): string | null {
  try {
    const path = readReturn(localStorage.getItem(RETURN_KEY));
    localStorage.removeItem(RETURN_KEY);
    return path;
  } catch {
    return null;
  }
}

export function hasPublicReturn(): boolean {
  try {
    return readReturn(localStorage.getItem(RETURN_KEY)) !== null;
  } catch {
    return false;
  }
}
