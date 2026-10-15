import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { hostedImageUrl, stage4Message, storagePath, type Billing, type GymMembershipStatus, type PassState, type PlanLite } from "./venueLogic";
import type { HoursRow } from "./hours";
import { isOffline } from "../network-error";
import { readPassCache, writePassCache } from "./passCache";

// Venues, gym memberships and the pass: v5.1 backend stage 4a and 4b
// (Database docs/HANDOVER_API.md, "4a · Venues" and "4b · Memberships,
// checkout and the pass").
//
// VENUES ARE public.gyms. marketplace_venues (the Explore view) carries none
// of the 4a columns, so the gym page and the Gyms tab read the table itself.
// B13: WHICH venues Explore lists is the view's decision, not the table's
// RLS: gyms_select_public also shows a member the venue they use (hidden from
// Explore or not, listed or not) and gyms_select_hidden_insider shows an
// insider their hidden venue. So fetchVenues() takes the ids (and is_featured)
// from marketplace_venues and reads only those rows; fetchVenue() (the gym
// page) stays on the table, so a member can still open their own venue.
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
  /** B13 MK-02: gyms.amenities, amenity_vocabulary() keys. */
  amenities: string[];
  /** B13 MK-02: gyms.first_visit (≤300), or null. */
  firstVisit: string | null;
  /** B13 MK-06: a live featured week (marketplace_venues.is_featured); false on the gym page's own read. */
  isFeatured: boolean;
}

export interface VenuePlan extends PlanLite {
  businessId: string;
  /** Commitment terms, information only (not enforced): MB-05 follow-up 5. */
  minimumTermMonths: number | null;
  noticeDays: number | null;
}

export interface GymMembership {
  id: string;
  gymId: string;
  gymName: string;
  planName: string;
  status: GymMembershipStatus;
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
  /** V6-30: set when this row is the device's offline copy (ISO time it was saved). */
  cachedAt?: string;
  /** Set to end when the period runs out (end_gym_membership at period end): "Ends {date}". */
  cancelAtPeriodEnd: boolean;
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
  amenities: string[] | null;
  first_visit: string | null;
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
  /** 20261121020000: appended last. Null-safe for an older stack. */
  cancel_at_period_end?: boolean | null;
};

const VENUE_COLUMNS =
  "id, name, location, bio, lat, lng, business_id, venue_kind, public_phones, access_qr, access_nfc, access_bluetooth, timezone, cover_url, logo_url, amenities, first_visit";

/** A4's two buckets and B13's business-photos are public: an object's URL is built, not signed. */
const publicUrl = (bucket: "business-logos" | "gym-covers" | "business-photos", value: string | null): string | null => {
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
  amenities: r.amenities ?? [],
  firstVisit: r.first_visit,
  isFeatured: false,
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
  in: (col: string, v: string[]) => VenueQuery & PromiseLike<{ data: VenueRow[] | null; error: PostgrestError | null }>;
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

/**
 * Every venue Explore lists (MO1.4.2): featured first, then by name. The ids
 * and is_featured come from marketplace_venues (B13: no hidden venue, no
 * unlisted business's venue, whoever is asking); the rows from public.gyms.
 */
export async function fetchVenues(): Promise<Result<Venue[]>> {
  type Listed = { venue_id: string; is_featured: boolean | null };
  const listed = await (supabase as unknown as {
    from: (v: "marketplace_venues") => { select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: Listed[] | null; error: PostgrestError | null }> } };
  })
    .from("marketplace_venues")
    .select("venue_id, is_featured")
    .eq("kind", "gym");
  if (listed.error) {
    console.error("[venues] Could not read the listed venues:", listed.error.message);
    return fail(listed.error, "Couldn't load gyms right now.");
  }
  const featured = new Map((listed.data ?? []).map((r) => [r.venue_id, r.is_featured === true]));
  if (featured.size === 0) return { ok: true, value: [] };
  const { data, error } = await gymsTable().select(VENUE_COLUMNS).in("id", [...featured.keys()]).order("name");
  if (error) {
    console.error("[venues] Could not read venues:", error.message);
    return fail(error, "Couldn't load gyms right now.");
  }
  const rows = (data ?? []).filter((r) => featured.has(r.id));
  const logos = await businessLogos(rows);
  const venues = rows.map((r) => ({ ...toVenue(r, logos), isFeatured: featured.get(r.id) === true }));
  return { ok: true, value: [...venues.filter((v) => v.isFeatured), ...venues.filter((v) => !v.isFeatured)] };
}

/** One approved photo of a venue (B13 MK-03), as a public URL. */
export interface VenuePhoto {
  id: string;
  url: string;
  caption: string | null;
  position: number;
}

/**
 * B13 MK-03: the venue's approved photos, by position: the business's photos
 * for this venue and its business-wide ones (gym_id null). RLS shows the
 * public only approved photos of a listed business (an insider would also
 * see its own in-review ones, so the status is asked for explicitly). Files
 * are in the PUBLIC business-photos bucket. A failed read costs only the
 * photos: the hero keeps its cover.
 */
export async function fetchVenuePhotos(businessId: string, gymId: string): Promise<VenuePhoto[]> {
  type Row = { id: string; path: string; caption: string | null; position: number; gym_id: string | null };
  type Q = {
    from: (t: "business_photos") => {
      select: (c: string) => {
        eq: (k: string, v: string) => {
          eq: (k: string, v: string) => {
            or: (f: string) => { order: (k: string) => PromiseLike<{ data: Row[] | null; error: PostgrestError | null }> };
          };
        };
      };
    };
  };
  const { data, error } = await (supabase as unknown as Q)
    .from("business_photos")
    .select("id, path, caption, position, gym_id")
    .eq("business_id", businessId)
    .eq("status", "approved")
    // The id comes from the URL: only a UUID goes into the filter string.
    .or(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gymId) ? `gym_id.is.null,gym_id.eq.${gymId}` : "gym_id.is.null")
    .order("position");
  if (error) {
    console.warn("[venues] Could not read the venue's photos:", error.message);
    return [];
  }
  return (data ?? []).flatMap((r) => {
    const url = publicUrl("business-photos", r.path);
    return url ? [{ id: r.id, url, caption: r.caption?.trim() || null, position: r.position }] : [];
  });
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
  // B7 MB-03: only plans on sale reach Explore. A paused plan is not sold
  // (members keep it and renewals continue), a hidden one is off Explore, an
  // archived one is gone; purchase_gym_membership does not refuse them yet.
  const { data, error } = await supabase
    .from("membership_plans")
    .select("id, business_id, name, price, billing, minimum_term_months, notice_days")
    .in("business_id", ids)
    .filter("status", "eq", "active")
    .filter("visible_on_explore", "eq", true);
  if (error) {
    console.error("[venues] Could not read plans:", error.message);
    return fail(error, "Couldn't load memberships right now.");
  }
  return {
    ok: true,
    // minimum_term_months / notice_days are newer than the generated types.
    value: ((data ?? []) as unknown as { id: string; business_id: string; name: string; price: number | string; billing: string; minimum_term_months: number | null; notice_days: number | null }[]).map((p) => ({
      id: p.id,
      businessId: p.business_id,
      minimumTermMonths: p.minimum_term_months ?? null,
      noticeDays: p.notice_days ?? null,
      name: p.name,
      price: Number(p.price),
      billing: p.billing as Billing,
    })),
  };
}

/**
 * The caller's memberships, newest first (MO1.4.2.2.2 / .2.3, Profile).
 *
 * V6-30: when the server can't be reached, the last read from this device
 * (at most PASS_CACHE_HOURS old, active memberships only) is returned with
 * `cachedAt` set, so the pass still shows at a door with no signal.
 */
export async function fetchMyGymMemberships(): Promise<Result<GymMembership[]>> {
  const { data, error } = await rpc<MembershipRow[]>("my_gym_memberships");
  const uid = (await supabase.auth.getSession().catch(() => null))?.data.session?.user.id ?? null;
  if (error) {
    console.error("[venues] Could not read your memberships:", error.message);
    if (uid && isOffline(error)) {
      const cached = readPassCache<GymMembership>(uid, (m) => m.expiresOn);
      if (cached) return { ok: true, value: cached.rows.map((m) => ({ ...m, cachedAt: cached.savedAt })) };
    }
    return fail(error, "Couldn't load your memberships right now.");
  }
  const value: GymMembership[] = (data ?? []).map((r) => ({
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
    cancelAtPeriodEnd: r.cancel_at_period_end === true,
  }));
  if (uid) writePassCache(uid, value.filter((m) => m.status === "active"));
  return { ok: true, value };
}

/**
 * B10: rotate_gym_pass_token(membership) → the new token. The member kills a
 * leaked pass: the old code reads "not recognised" at the desk from then on.
 * The device's offline copy (V6-30) takes the new token, keeping its age.
 * A database without the function (PGRST202 / 42883) answers `missing`.
 */
export async function rotatePassToken(membershipId: string): Promise<Result<string> | { ok: false; missing: true; message: string }> {
  const { data, error } = await rpc<string>("rotate_gym_pass_token", { p_membership_id: membershipId });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return { ok: false, missing: true, message: "Getting a new pass code is coming soon." };
    console.error("[venues] Could not rotate a pass token:", error.message);
    return fail(error, "Couldn't get a new pass code. Try again.");
  }
  if (!data) return { ok: false, message: "Couldn't get a new pass code. Try again." };
  const uid = (await supabase.auth.getSession().catch(() => null))?.data.session?.user.id ?? null;
  if (uid) {
    const cached = readPassCache<GymMembership>(uid, (m) => m.expiresOn);
    if (cached) {
      const rows = cached.rows.map((m) => (m.id === membershipId ? { ...m, passToken: data } : m));
      writePassCache(uid, rows, new Date(cached.savedAt));
    }
  }
  return { ok: true, value: data };
}

/**
 * The commitment terms of each membership's plan (minimum_term_months,
 * notice_days), as information only: they are not enforced (MB-05 follow-up
 * 5, a contractual question). my_gym_memberships() names the plan, not its id,
 * so plans are matched by name within the venue's business; a name two plans
 * share is left out. Keyed by membership id; a read that fails yields nothing.
 */
export async function fetchMembershipTerms(memberships: GymMembership[]): Promise<Map<string, { minimumTermMonths: number | null; noticeDays: number | null }>> {
  const out = new Map<string, { minimumTermMonths: number | null; noticeDays: number | null }>();
  const gymIds = [...new Set(memberships.map((m) => m.gymId))];
  if (gymIds.length === 0) return out;
  type Loose = { from: (t: string) => { select: (c: string) => { in: (col: string, v: string[]) => PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }> } } };
  const db = supabase as unknown as Loose;
  const g = await db.from("gyms").select("id, business_id").in("id", gymIds);
  if (g.error) return out;
  const bizOf = new Map((g.data as { id: string; business_id: string | null }[]).map((r) => [r.id, r.business_id]));
  const bizIds = [...new Set([...bizOf.values()].filter((b): b is string => !!b))];
  if (bizIds.length === 0) return out;
  const p = await db.from("membership_plans").select("business_id, name, minimum_term_months, notice_days").in("business_id", bizIds);
  if (p.error) return out;
  const rows = p.data as { business_id: string; name: string; minimum_term_months: number | null; notice_days: number | null }[];
  for (const m of memberships) {
    const biz = bizOf.get(m.gymId);
    const same = rows.filter((r) => r.business_id === biz && r.name === m.planName);
    if (same.length === 1) out.set(m.id, { minimumTermMonths: same[0].minimum_term_months, noticeDays: same[0].notice_days });
  }
  return out;
}

/** Each venue's managing business (gyms.business_id); a read that fails yields nothing. */
export async function fetchGymBusinessIds(gymIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(gymIds)];
  if (ids.length === 0) return out;
  type Loose = { from: (t: string) => { select: (c: string) => { in: (col: string, v: string[]) => PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }> } } };
  const g = await (supabase as unknown as Loose).from("gyms").select("id, business_id").in("id", ids);
  if (g.error) return out;
  for (const r of g.data as { id: string; business_id: string | null }[]) if (r.business_id) out.set(r.id, r.business_id);
  return out;
}

/**
 * B7 MB-05: the member ends their own venue membership (end_gym_membership;
 * either side may). At the period end by default: the status stays 'active'
 * and the pass works until expires_on; `now` cancels it today. Returns the
 * resulting status.
 */
export async function endMyGymMembership(membershipId: string, atPeriodEnd: boolean): Promise<Result<GymMembershipStatus>> {
  const { data, error } = await rpc<GymMembershipStatus>("end_gym_membership", {
    p_membership_id: membershipId,
    p_reason: null,
    p_at_period_end: atPeriodEnd,
  });
  if (error || !data) {
    if (error) console.error("[venues] Could not end the membership:", error.message);
    if (error && isOffline(error)) return { ok: false, code: error.code, message: "You're offline. Try again when you're back online." };
    const message =
      error?.code === "ATX10"
        ? "This membership has already ended."
        : error?.code === "ATX25"
          ? "This membership has no end date, so it can't end at the period end."
          : "Couldn't end your membership. Try again.";
    return { ok: false, code: error?.code, message };
  }
  return { ok: true, value: data };
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
  /** B14: the business's public reply; null when there is none or Centium removed it. */
  reply: { body: string; at: string } | null;
  /** B14: the class the review was written from (write_class_review). */
  classTitle: string | null;
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
    reply_body: string | null;
    reply_at: string | null;
    class_title: string | null;
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
      reply: r.reply_body && r.reply_at ? { body: r.reply_body, at: r.reply_at } : null,
      classTitle: r.class_title?.trim() || null,
    })),
  };
}

/**
 * B14 follow-up: the reviews of a business with no venue, signed out too
 * (business_reviews_public: the same rules as gym_reviews_page, a removed
 * review keeps its row and loses its content, a minor's name is never shown,
 * the reply included). It has no helpful votes, member tag or class.
 */
export async function fetchBusinessReviewsPage(businessId: string, sort: ReviewSort, limit = 20, offset = 0): Promise<Result<GymReview[]>> {
  type Row = {
    id: string;
    rating: number | null;
    body: string | null;
    author_name: string | null;
    created_at: string;
    edited_at: string | null;
    redacted: boolean;
    is_mine: boolean;
    reply_body: string | null;
    reply_at: string | null;
  };
  const { data, error } = await rpc<Row[]>("business_reviews_public", { p_business_id: businessId, p_sort: sort, p_limit: limit, p_offset: offset });
  if (error) {
    console.error("[venues] Could not read the business's reviews:", error.message);
    return fail(error, "Couldn't load reviews right now.");
  }
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      authorName: r.author_name,
      authorIsMember: false,
      createdAt: r.created_at,
      editedAt: r.edited_at,
      redacted: r.redacted,
      helpfulCount: 0,
      viewerFoundHelpful: false,
      isMine: !!r.is_mine,
      reply: r.reply_body && r.reply_at ? { body: r.reply_body, at: r.reply_at } : null,
      classTitle: null,
    })),
  };
}

/** One of the signed-in author's own reviews (my_reviews, B14 follow-up): venue or business. */
export interface MyReview {
  reviewId: string;
  gymId: string | null;
  businessId: string | null;
  rating: number | null;
  body: string | null;
  redacted: boolean;
}

/** The signed-in author's reviews; edit or delete them with edit_gym_review / delete_gym_review. */
export async function fetchMyReviews(): Promise<Result<MyReview[]>> {
  type Row = { review_id: string; gym_id: string | null; business_id: string | null; rating: number | null; body: string | null; redacted: boolean };
  const { data, error } = await rpc<Row[]>("my_reviews", {});
  if (error) return fail(error, "Couldn't load your reviews.");
  return {
    ok: true,
    value: (data ?? []).map((r) => ({ reviewId: r.review_id, gymId: r.gym_id, businessId: r.business_id, rating: r.rating, body: r.body, redacted: !!r.redacted })),
  };
}

/** Any signed-in account may review a visible venue, once (ATX92); 1–5 (ATX91); 5 an hour (ATX02). */
export async function writeGymReview(gymId: string, rating: number, body: string): Promise<Result<string>> {
  const { data, error } = await rpc<string>("write_gym_review", { p_gym_id: gymId, p_rating: rating, p_body: body.trim() });
  if (error) return fail(error, "Couldn't post your review. Try again.");
  return { ok: true, value: data ?? "" };
}

/** Whether a listed business has a venue Explore can show (write_business_review is for those without). Null: unknown. */
export async function businessHasVenue(businessId: string): Promise<boolean | null> {
  const { data, error } = await gymsTable().select("id").eq("business_id", businessId);
  if (error) {
    console.warn("[venues] Could not read the business's venues:", error.message);
    return null;
  }
  return (data ?? []).length > 0;
}

/**
 * B14 RP-01: a review of a business with no venue, once per person (ATX92);
 * staff of the business are refused (ATX03). Read back with
 * business_reviews_public; the author's own is edited (my_reviews).
 */
export async function writeBusinessReview(businessId: string, rating: number, body: string): Promise<Result<string>> {
  const { data, error } = await rpc<string>("write_business_review", { p_business_id: businessId, p_rating: rating, p_body: body.trim() });
  if (error) {
    const own =
      error.code === "ATX92"
        ? "You've already reviewed this business."
        : error.code === "ATX03"
          ? "You can't review a business you work for."
          : error.code === "ATX08"
            ? "This business isn't listed on Explore right now."
            : null;
    return own ? { ok: false, code: error.code, message: own } : fail(error, "Couldn't post your review. Try again.");
  }
  return { ok: true, value: data ?? "" };
}

/**
 * B14 RP-04 "Rate your visit": a review from a class booking, once the class
 * has happened (ATX10). One review per person per venue (or business): an
 * existing one is edited and tagged with this class and its instructor.
 */
export async function writeClassReview(bookingId: string, rating: number, body: string): Promise<Result<string>> {
  const { data, error } = await rpc<string>("write_class_review", { p_booking_id: bookingId, p_rating: rating, p_body: body.trim() });
  if (error) {
    const own =
      error.code === "ATX10"
        ? "You can rate a class once it has happened."
        : error.code === "ATX94"
          ? "That booking couldn't be found."
          : error.code === "22023"
            ? "Write a few words, up to 2,000 characters."
            : null;
    return own ? { ok: false, code: error.code, message: own } : fail(error, "Couldn't post your review. Try again.");
  }
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
