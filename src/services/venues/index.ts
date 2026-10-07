import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { hostedImageUrl, stage4Message, storagePath, type Billing, type PassState, type PlanLite } from "./venueLogic";
import type { HoursRow } from "./hours";

// Venues, gym memberships and the pass: v5.1 backend stage 4a and 4b
// (Database docs/HANDOVER_API.md, "4a · Venues" and "4b · Memberships,
// checkout and the pass").
//
// VENUES ARE public.gyms, READ DIRECTLY. marketplace_venues (the Explore view)
// predates 4a and carries none of its columns, so the gyms tab and the gym
// page read the table itself. Its SELECT policies already hide a venue an
// admin has hidden (gyms_select_public = hidden_at is null), so there is no
// visibility filter here.
//
// PLANS ARE BUSINESS-LEVEL (the doc's "Read this first"): a gym shows its
// business's membership_plans, and a business with two venues shows the same
// plans on both. A venue with no business_id is a place on the map nobody
// manages: readable, never buyable (purchase raises ATX81).
//
// gym_memberships IS UNREADABLE BY ANY CLIENT ROLE (the pass token is a bearer
// credential). The member's side is purchase_gym_membership() and
// my_gym_memberships(), nothing else. mark_gym_membership_paid() and
// verify_gym_pass() are the venue desk's and have no frame on the member
// screens, so they are not wrapped here.
//
// The generated types come from production, where stage 4 isn't yet, so the
// new columns and functions go through narrow casts at this boundary.
//
// STAGE A4 ("The business side of a venue"): gyms.timezone, gyms.cover_url
// and business_profiles.logo_url (object paths in the PUBLIC gym-covers /
// business-logos buckets, turned into public URLs here), and the public
// readers gym_hours_for() / venue_is_open_at(). The venue console's readers
// are not wrapped here.

export interface Venue {
  id: string;
  name: string;
  location: string;
  bio: string | null;
  lat: number | null;
  lng: number | null;
  /** The managing business, or null for an unclaimed place (not buyable). */
  businessId: string | null;
  kind: "gym" | "studio";
  /** MO1.4.2.5 Call's numbers, in display order (max 5). */
  phones: string[];
  access: { qr: boolean; nfc: boolean; bluetooth: boolean };
  /** A4: the venue's own clock (gyms.timezone), which "today" and "open now" are about. */
  timezone: string;
  /** A4: the cover photo's public URL (gyms.cover_url in gym-covers), or null. May 404: draw with a fallback. */
  coverUrl: string | null;
  /**
   * The logos to try, best first: the venue's own (gyms.logo_url, a hosted
   * URL, stage 4d), then its business's (A4 business_profiles.logo_url in
   * business-logos). Any may 404: draw with the initials as the fallback.
   */
  logoUrls: string[];
}

export interface VenuePlan extends PlanLite {
  businessId: string;
}

export interface GymMembership {
  id: string;
  gymId: string;
  gymName: string;
  planName: string;
  status: "active" | "expired" | "cancelled";
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "refunded";
  priceAgreed: number;
  startedOn: string;
  expiresOn: string | null;
  passToken: string;
  /** The database's single derived truth: active AND paid AND unexpired. */
  passValid: boolean;
  passState: PassState;
  access: { qr: boolean; nfc: boolean; bluetooth: boolean };
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

type VenueRow = {
  id: string;
  name: string;
  location: string;
  bio: string | null;
  lat: number | string;
  lng: number | string;
  business_id: string | null;
  venue_kind: "gym" | "studio";
  public_phones: string[] | null;
  access_qr: boolean;
  access_nfc: boolean;
  access_bluetooth: boolean;
  timezone: string | null;
  cover_url: string | null;
  logo_url: string | null;
};

type MembershipRow = {
  id: string;
  gym_id: string;
  gym_name: string;
  plan_name: string;
  status: GymMembership["status"];
  payment_method: string;
  payment_status: GymMembership["paymentStatus"];
  price_agreed: number | string;
  started_on: string;
  expires_on: string | null;
  pass_token: string;
  pass_valid: boolean;
  pass_state: PassState;
  access_qr: boolean;
  access_nfc: boolean;
  access_bluetooth: boolean;
};

const VENUE_COLUMNS =
  "id, name, location, bio, lat, lng, business_id, venue_kind, public_phones, access_qr, access_nfc, access_bluetooth, timezone, cover_url, logo_url";

/** A4's two buckets are public: an object's URL is built, not signed. */
const publicUrl = (bucket: "business-logos" | "gym-covers", value: string | null): string | null => {
  const path = storagePath(value);
  return path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
};

const num = (v: number | string | null): number | null => (v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

const toVenue = (r: VenueRow, businessLogos: Map<string, string>): Venue => ({
  id: r.id,
  name: r.name,
  location: r.location,
  bio: r.bio,
  lat: num(r.lat),
  lng: num(r.lng),
  businessId: r.business_id,
  kind: r.venue_kind,
  phones: (r.public_phones ?? []).filter((p) => p.trim()),
  access: { qr: r.access_qr, nfc: r.access_nfc, bluetooth: r.access_bluetooth },
  timezone: r.timezone || "Asia/Beirut",
  coverUrl: publicUrl("gym-covers", r.cover_url),
  logoUrls: [hostedImageUrl(r.logo_url), r.business_id ? (businessLogos.get(r.business_id) ?? null) : null].filter((u): u is string => !!u),
});

type LogoQuery = {
  from: (t: "business_profiles") => {
    select: (c: string) => {
      in: (col: string, v: string[]) => PromiseLike<{ data: { id: string; logo_url: string | null }[] | null; error: PostgrestError | null }>;
    };
  };
};

/**
 * A4: the businesses' logos (business_profiles.logo_url, readable like the
 * rest of a listed business's row) as public URLs, by business id. A failed
 * read costs only the logos: the initials show instead.
 */
async function businessLogos(rows: VenueRow[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(rows.flatMap((r) => (r.business_id ? [r.business_id] : [])))];
  if (ids.length === 0) return out;
  // logo_url is A4's and not in the production-generated types.
  const { data, error } = await (supabase as unknown as LogoQuery).from("business_profiles").select("id, logo_url").in("id", ids);
  if (error) {
    console.warn("[venues] Could not read business logos:", error.message);
    return out;
  }
  for (const b of data ?? []) {
    const url = publicUrl("business-logos", b.logo_url);
    if (url) out.set(b.id, url);
  }
  return out;
}

type VenueQuery = {
  select: (cols: string) => VenueQuery & PromiseLike<{ data: VenueRow[] | null; error: PostgrestError | null }>;
  eq: (col: string, v: string) => VenueQuery & PromiseLike<{ data: VenueRow[] | null; error: PostgrestError | null }>;
  order: (col: string) => PromiseLike<{ data: VenueRow[] | null; error: PostgrestError | null }>;
};
// The 4a columns aren't in the production-generated types.
const gymsTable = () => (supabase as unknown as { from: (t: "gyms") => VenueQuery }).from("gyms");

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

const fail = <T>(error: PostgrestError, fallback: string): Result<T> => ({
  ok: false,
  code: error.code,
  message: stage4Message(error.code, error.message, fallback),
});

/** Every visible venue, by name (MO1.4.2). */
export async function fetchVenues(): Promise<Result<Venue[]>> {
  const { data, error } = await gymsTable().select(VENUE_COLUMNS).order("name");
  if (error) {
    console.error("[venues] Could not read venues:", error.message);
    return fail(error, "Couldn't load gyms right now.");
  }
  const rows = data ?? [];
  const logos = await businessLogos(rows);
  return { ok: true, value: rows.map((r) => toVenue(r, logos)) };
}

/** One venue, or null when it doesn't exist or is hidden (MO1.4.2.1). */
export async function fetchVenue(id: string): Promise<Result<Venue | null>> {
  const { data, error } = await gymsTable().select(VENUE_COLUMNS).eq("id", id);
  if (error) {
    console.error("[venues] Could not read the venue:", error.message);
    return fail(error, "Couldn't load this gym right now.");
  }
  const row = (data ?? [])[0];
  if (!row) return { ok: true, value: null };
  return { ok: true, value: toVenue(row, await businessLogos([row])) };
}

/**
 * The plans these businesses sell (membership_plans_select_public: a listed
 * business's plans are public).
 */
export async function fetchPlansFor(businessIds: string[]): Promise<Result<VenuePlan[]>> {
  const ids = [...new Set(businessIds)];
  if (ids.length === 0) return { ok: true, value: [] };
  const { data, error } = await supabase.from("membership_plans").select("id, business_id, name, price, billing").in("business_id", ids);
  if (error) {
    console.error("[venues] Could not read plans:", error.message);
    return fail(error, "Couldn't load memberships right now.");
  }
  return {
    ok: true,
    value: (data ?? []).map((p) => ({
      id: p.id,
      businessId: p.business_id,
      name: p.name,
      price: Number(p.price),
      billing: p.billing as Billing,
    })),
  };
}

/** The caller's memberships, newest first (MO1.4.2.2.2 / .2.3, Profile). */
export async function fetchMyGymMemberships(): Promise<Result<GymMembership[]>> {
  const { data, error } = await rpc<MembershipRow[]>("my_gym_memberships");
  if (error) {
    console.error("[venues] Could not read your memberships:", error.message);
    return fail(error, "Couldn't load your memberships right now.");
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      gymId: r.gym_id,
      gymName: r.gym_name,
      planName: r.plan_name,
      status: r.status,
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status,
      priceAgreed: Number(r.price_agreed),
      startedOn: r.started_on,
      expiresOn: r.expires_on,
      passToken: r.pass_token,
      passValid: r.pass_valid,
      passState: r.pass_state,
      access: { qr: r.access_qr, nfc: r.access_nfc, bluetooth: r.access_bluetooth },
    })),
  };
}

/**
 * MO1.4.2.2.1: creates a PENDING cash membership and its pass. BR-04: nothing
 * moves money; the venue marks it paid on the first visit. 'cash' is the only
 * venue_payment_method until stage 5 adds 'whish'.
 */
export async function purchaseGymMembership(gymId: string, planId: string): Promise<Result<string>> {
  const { data, error } = await rpc<string>("purchase_gym_membership", { p_gym_id: gymId, p_plan_id: planId, p_method: "cash" });
  if (error || !data) {
    console.error("[venues] Could not create the membership:", error?.message);
    return error ? fail(error, "Couldn't book that membership. Try again.") : { ok: false, message: "Couldn't book that membership. Try again." };
  }
  return { ok: true, value: data };
}

// ---------------------------------------------------------------------------
// Stage A4: opening hours and "open now" (MO1.4.2.1 #8-9). Both functions are
// public (anon + authenticated) and raise no ATX code; gym_hours_for()
// returns nothing for a hidden venue, which the page never shows anyway.

/** The venue's hours, Monday first (up to seven rows; a missing day is "not published"). */
export async function fetchGymHours(gymId: string): Promise<Result<HoursRow[]>> {
  type Row = { weekday: number; closed: boolean; open_24h: boolean; opens_at: string | null; closes_at: string | null; wraps_midnight: boolean | null };
  const { data, error } = await rpc<Row[]>("gym_hours_for", { p_gym_id: gymId });
  if (error) {
    console.error("[venues] Could not read opening hours:", error.message);
    return fail(error, "Couldn't load opening hours right now.");
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      weekday: Number(r.weekday),
      closed: r.closed,
      open24h: r.open_24h,
      opensAt: r.opens_at,
      closesAt: r.closes_at,
      wrapsMidnight: !!r.wraps_midnight,
    })),
  };
}

/**
 * venue_is_open_at(id, now()), on the venue's clock. Three-valued: null is
 * "no hours for now", which is not "closed".
 */
export async function fetchVenueOpenNow(gymId: string): Promise<Result<boolean | null>> {
  const { data, error } = await rpc<boolean>("venue_is_open_at", { p_gym_id: gymId });
  if (error) {
    console.error("[venues] Could not check whether the venue is open:", error.message);
    return fail(error, "Couldn't check whether this gym is open.");
  }
  return { ok: true, value: typeof data === "boolean" ? data : null };
}

// ---------------------------------------------------------------------------
// Stage 4d: gym reviews (MO1.4.2.3) and the venue's owner for messaging
// (MO1.4.2.6). gym_reviews is unreadable by every client role; the two reader
// functions apply redaction, venue visibility and minor-name suppression.

export interface ReviewSummary {
  /** One decimal; 0 with no reviews. Redacted reviews count for nothing. */
  average: number;
  total: number;
  /** count_5 … count_1, index 0 = 5 stars. */
  counts: [number, number, number, number, number];
}

export interface GymReview {
  id: string;
  /** Null when redacted. */
  rating: number | null;
  body: string | null;
  /** A first name; null for a minor (a stored decision) or when redacted. */
  authorName: string | null;
  authorIsMember: boolean;
  createdAt: string;
  editedAt: string | null;
  redacted: boolean;
  helpfulCount: number;
  viewerFoundHelpful: boolean;
  isMine: boolean;
}

/** The sorts gym_reviews_page() accepts; anything else is ATX93 ("With photos" isn't built). */
export type ReviewSort = "recent" | "highest" | "lowest";

export async function fetchReviewSummary(gymId: string): Promise<Result<ReviewSummary>> {
  type Row = { average: number | string | null; total: number; count_5: number; count_4: number; count_3: number; count_2: number; count_1: number };
  const { data, error } = await rpc<Row[] | Row>("gym_review_summary", { p_gym_id: gymId });
  if (error) {
    console.error("[venues] Could not read the review summary:", error.message);
    return fail(error, "Couldn't load reviews right now.");
  }
  const r = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    value: {
      average: num(r?.average ?? null) ?? 0,
      total: r?.total ?? 0,
      counts: [r?.count_5 ?? 0, r?.count_4 ?? 0, r?.count_3 ?? 0, r?.count_2 ?? 0, r?.count_1 ?? 0],
    },
  };
}

export async function fetchReviewsPage(gymId: string, sort: ReviewSort, limit = 20, offset = 0): Promise<Result<GymReview[]>> {
  type Row = {
    id: string;
    rating: number | null;
    body: string | null;
    author_name: string | null;
    author_is_member: boolean;
    created_at: string;
    edited_at: string | null;
    redacted: boolean;
    helpful_count: number;
    viewer_found_helpful: boolean;
    is_mine: boolean;
  };
  const { data, error } = await rpc<Row[]>("gym_reviews_page", { p_gym_id: gymId, p_sort: sort, p_limit: limit, p_offset: offset });
  if (error) {
    console.error("[venues] Could not read reviews:", error.message);
    return fail(error, "Couldn't load reviews right now.");
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      authorName: r.author_name,
      authorIsMember: r.author_is_member,
      createdAt: r.created_at,
      editedAt: r.edited_at,
      redacted: r.redacted,
      helpfulCount: r.helpful_count,
      viewerFoundHelpful: r.viewer_found_helpful,
      isMine: r.is_mine,
    })),
  };
}

/** Any signed-in account may review a visible venue, once (ATX92); 1–5 (ATX91); 5 an hour (ATX02). */
export async function writeGymReview(gymId: string, rating: number, body: string): Promise<Result<string>> {
  const { data, error } = await rpc<string>("write_gym_review", { p_gym_id: gymId, p_rating: rating, p_body: body.trim() });
  if (error) return fail(error, "Couldn't post your review. Try again.");
  return { ok: true, value: data ?? "" };
}

/** Own review only; a redacted one can't be edited (ATX93). */
export async function editGymReview(reviewId: string, rating: number, body: string): Promise<Result<null>> {
  const { error } = await rpc<null>("edit_gym_review", { p_review_id: reviewId, p_rating: rating, p_body: body.trim() });
  if (error) return fail(error, "Couldn't save your review. Try again.");
  return { ok: true, value: null };
}

export async function deleteGymReview(reviewId: string): Promise<Result<null>> {
  const { error } = await rpc<null>("delete_gym_review", { p_review_id: reviewId });
  if (error) return fail(error, "Couldn't delete your review. Try again.");
  return { ok: true, value: null };
}

/** Returns whether the vote is now set. Refuses own and redacted reviews (ATX93). */
export async function toggleReviewHelpful(reviewId: string): Promise<Result<boolean>> {
  const { data, error } = await rpc<boolean>("toggle_gym_review_helpful", { p_review_id: reviewId });
  if (error) return fail(error, "Couldn't record that. Try again.");
  return { ok: true, value: !!data };
}

/**
 * The profile that owns a venue's business: who MO1.4.2.6's Message starts a
 * thread with (start_message_thread). May be a professional account (the
 * doc: a coach who owns the gym), so account_type is not checked.
 */
export async function fetchBusinessOwner(businessId: string): Promise<string | null> {
  const { data, error } = await supabase.from("business_profiles").select("profile_id").eq("id", businessId).maybeSingle();
  if (error) {
    console.warn("[venues] Could not read the venue's owner:", error.message);
    return null;
  }
  return data?.profile_id ?? null;
}
