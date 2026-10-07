import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { formatPrice } from "../../utils/price";
import { stage4Message } from "../venues/venueLogic";

// Marketplace discovery: what a consumer can actually find and book.
//
// TWO VIEWS, NOT ONE. marketplace_venues is the unified one — a UNION ALL of
// business_profiles and gyms, discriminated by `kind`, with each side's
// specific columns null in the other's context: lat/lng are null for a
// business (business_profiles has no coordinates), and can_host_classes /
// upcoming_class_count are false/0 for a gym. marketplace_classes is separate
// and carries the bookable classes. Checked against the definitions rather
// than assumed from the name.
//
// WHAT THE VIEWS ALREADY DECIDE, so this file does not re-decide it:
//   marketplace_classes filters `business_is_listed(business_id)` AND
//   `event_date >= CURRENT_DATE`, so a delisted business's classes and every
//   past class are gone before the client sees them. No date or listing
//   filter is written here; adding one would be a second, drifting copy of a
//   rule the database already enforces.
//
//   marketplace_venues filters businesses on `b.active` and applies NO filter
//   to gyms beyond RLS (since stage 4a, gyms_select_public hides a venue an
//   admin hid). The Gyms tab and gym page read public.gyms directly through
//   services/venues, because this view carries none of the 4a columns.
//
// SPOTS ARE COMPUTED SERVER-SIDE. spots_remaining is
// `GREATEST(max_capacity - class_booked_count(id), 0)` and is_full is the same
// comparison, both from the view. Counting bookings on the client would drift
// the moment somebody else booked, and would be wrong for exactly the class
// that is about to fill up.

export type VenueKind = "business" | "gym";

export interface MarketplaceClass {
  classId: string;
  businessId: string;
  businessName: string;
  location: string | null;
  title: string;
  classType: string | null;
  date: string;
  startTime: string;
  endTime: string;
  /** Formatted for display; empty when the class is free. */
  price: string;
  /** The raw number, for filtering. Null when free. */
  priceValue: number | null;
  paymentType: string | null;
  notes: string | null;
  maxCapacity: number;
  bookedCount: number;
  spotsRemaining: number;
  isFull: boolean;
}

export interface MarketplaceVenue {
  kind: VenueKind;
  venueId: string;
  name: string;
  venueType: string;
  location: string | null;
  /** Gyms only — business_profiles holds no coordinates. */
  lat: number | null;
  lng: number | null;
  bio: string | null;
  perk: string | null;
  canHostClasses: boolean;
  upcomingClassCount: number;
}

type ClassRow = {
  class_id: string;
  business_id: string;
  business_name: string;
  location: string | null;
  title: string;
  class_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  price: number | string | null;
  payment_type: string | null;
  notes: string | null;
  max_capacity: number;
  booked_count: number;
  spots_remaining: number;
  is_full: boolean;
};

type VenueRow = {
  kind: VenueKind;
  venue_id: string;
  name: string;
  venue_type: string;
  location: string | null;
  lat: number | string | null;
  lng: number | string | null;
  bio: string | null;
  perk: string | null;
  can_host_classes: boolean;
  upcoming_class_count: number;
};

// Times arrive as HH:MM:SS from a `time` column; every input and comparison in
// these screens is HH:MM. Same trim services/calendar and business-classes use.
const toHHMM = (t: string) => t.slice(0, 5);
const toNumber = (v: number | string | null): number | null =>
  v === null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null;

const toClass = (r: ClassRow): MarketplaceClass => ({
  classId: r.class_id,
  businessId: r.business_id,
  businessName: r.business_name,
  location: r.location,
  title: r.title,
  classType: r.class_type,
  date: r.event_date,
  startTime: toHHMM(r.start_time),
  endTime: toHHMM(r.end_time),
  price: formatPrice(r.price),
  priceValue: toNumber(r.price),
  paymentType: r.payment_type,
  notes: r.notes,
  maxCapacity: r.max_capacity,
  bookedCount: r.booked_count,
  spotsRemaining: r.spots_remaining,
  isFull: r.is_full,
});

const toVenue = (r: VenueRow): MarketplaceVenue => ({
  kind: r.kind,
  venueId: r.venue_id,
  name: r.name,
  venueType: r.venue_type,
  location: r.location,
  lat: toNumber(r.lat),
  lng: toNumber(r.lng),
  bio: r.bio,
  perk: r.perk,
  canHostClasses: r.can_host_classes,
  upcomingClassCount: r.upcoming_class_count,
});

const CLASS_COLUMNS =
  "class_id, business_id, business_name, location, title, class_type, event_date, start_time, end_time, price, payment_type, notes, max_capacity, booked_count, spots_remaining, is_full";
const VENUE_COLUMNS =
  "kind, venue_id, name, venue_type, location, lat, lng, bio, perk, can_host_classes, upcoming_class_count";

// Neither view is in database.types.ts — both are newer than the last
// regeneration, as my_business_memberships and professional_reviews_readable
// were. Cast to the call shapes this file makes rather than hand-editing a
// generated file the next regeneration would overwrite.
type ReadOnlyView<T> = {
  select: (columns: string) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

const classesView = () =>
  (
    supabase as unknown as { from: (v: "marketplace_classes") => ReadOnlyView<ClassRow> }
  ).from("marketplace_classes");

const venuesView = () =>
  (
    supabase as unknown as { from: (v: "marketplace_venues") => ReadOnlyView<VenueRow> }
  ).from("marketplace_venues");

/**
 * Every bookable class.
 *
 * READ WHOLE AND FILTERED IN MEMORY, deliberately. The filters this screen
 * offers are a text match, a class type and a price ceiling over a list that
 * is already bounded — one business's upcoming classes, not a catalogue — and
 * pushing them into PostgREST would mean a round trip per keystroke plus
 * `ilike` patterns assembled from user input. "No new search infrastructure"
 * is the instruction and this is the version of it that does not build any.
 */
export async function fetchMarketplaceClasses(): Promise<
  { ok: true; classes: MarketplaceClass[] } | { ok: false; message: string }
> {
  const { data, error } = await classesView().select(CLASS_COLUMNS);
  if (error) {
    console.error("[marketplace] Could not read classes:", error.message);
    return { ok: false, message: "Couldn't load classes right now." };
  }
  return { ok: true, classes: (data ?? []).map(toClass) };
}

/** Businesses and gyms in one list, discriminated by `kind`. */
export async function fetchMarketplaceVenues(): Promise<
  { ok: true; venues: MarketplaceVenue[] } | { ok: false; message: string }
> {
  const { data, error } = await venuesView().select(VENUE_COLUMNS);
  if (error) {
    console.error("[marketplace] Could not read venues:", error.message);
    return { ok: false, message: "Couldn't load places right now." };
  }
  return { ok: true, venues: (data ?? []).map(toVenue) };
}

/**
 * Which of these classes this account has already booked.
 *
 * FROM THE BOOKINGS TABLE, NOT has_class_booking(). The function answers for
 * one class, and a list of twenty would be twenty round trips; the SELECT
 * policy on business_class_bookings is `auth.uid() = client_id`, so reading
 * the table directly returns this account's own bookings and nobody else's.
 */
export async function fetchMyBookedClassIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("business_class_bookings")
    .select("business_class_id");

  if (error) {
    console.warn("[marketplace] Could not read your bookings:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((b) => b.business_class_id as string));
}

// ---------------------------------------------------------------------------
// Stage 4c (Database docs/HANDOVER_API.md "4c · Classes, bookings, cancelling
// and the waitlist"). BOOKING GOES THROUGH book_class() ONLY: the direct
// INSERT this file used to make is now capacity-safe (a trigger) but not
// equivalent — it writes no calendar entry, copies no price and does not
// convert a waitlist offer. book_class() adds the class to the member's
// Calendar with alert 'min_15' (the backend's choice, left as it is).
// Cancelling likewise goes through cancel_class_booking(), which removes the
// calendar entry, records the cancellation and offers the seat to the
// waitlist. Not in the production-generated types yet, hence the cast.

export type ClassResult<T = true> = { ok: true; value: T } | { ok: false; message: string; code?: string };

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

async function call<T>(fn: string, args: Record<string, unknown>, fallback: string): Promise<ClassResult<T>> {
  const { data, error } = await rpc<T>(fn, args);
  if (error) {
    console.error(`[marketplace] ${fn} failed:`, error.message);
    return { ok: false, code: error.code, message: stage4Message(error.code, error.message, fallback) };
  }
  return { ok: true, value: data as T };
}

/**
 * MO1.4.4.1 (and the waitlist confirm path: an offer the caller holds does
 * not count against the seats). 'cash' = pay at the studio; Whish is stage 5.
 * ATX85 no such class, ATX86 started, ATX87 already booked, ATX88 full.
 */
export function bookClass(classId: string): Promise<ClassResult<string>> {
  return call<string>("book_class", { p_class_id: classId, p_method: "cash" }, "Couldn't book that class. Try again.");
}

export interface CancelOutcome {
  wasFree: boolean;
  hoursBefore: number | null;
  windowHours: number;
}

/** MO1.4.4.3 Cancel booking. A late cancellation is still accepted (BR-14 is about money). ATX89: no booking. */
export async function cancelClassBooking(classId: string): Promise<ClassResult<CancelOutcome>> {
  type Row = { was_free: boolean; hours_before: number | string | null; window_hours: number };
  const r = await call<Row[] | Row>("cancel_class_booking", { p_class_id: classId }, "Couldn't cancel that booking. Try again.");
  if (!r.ok) return r;
  const row = Array.isArray(r.value) ? r.value[0] : r.value;
  return {
    ok: true,
    value: {
      wasFree: !!row?.was_free,
      hoursBefore: row ? toNumber(row.hours_before) : null,
      windowHours: row?.window_hours ?? 12,
    },
  };
}

/** MO1.4.4.4 Join waitlist → the position MO1.4.4.5 shows ("#3"). Idempotent. */
export function joinClassWaitlist(classId: string): Promise<ClassResult<number>> {
  return call<number>("join_class_waitlist", { p_class_id: classId }, "Couldn't join the waitlist. Try again.");
}

/** MO1.4.4.5 Leave waitlist. ATX90 when not waiting. */
export function leaveClassWaitlist(classId: string): Promise<ClassResult<null>> {
  return call<null>("leave_class_waitlist", { p_class_id: classId }, "Couldn't leave the waitlist. Try again.");
}

export interface ClassLive {
  /** class_seats_left(): capacity − bookings − live waitlist offers. */
  seatsLeft: number | null;
  /** class_cancellation_hours(): BR-14's window, the single resolution point. */
  windowHours: number;
  /** class_starts_at(): the real moment, in the venue's timezone. */
  startsAt: string | null;
  /** my_class_waitlist_position(): null when not waiting. */
  waitlistPosition: number | null;
  /** business_classes.gym_id (4c), so the venue line can open the gym page. */
  gymId: string | null;
}

/** The four per-class reads the class page needs, in parallel. */
export async function fetchClassLive(classId: string): Promise<ClassLive> {
  const args = { p_class_id: classId };
  const [seats, hours, starts, pos, gym] = await Promise.all([
    rpc<number>("class_seats_left", args),
    rpc<number>("class_cancellation_hours", args),
    rpc<string>("class_starts_at", args),
    rpc<number>("my_class_waitlist_position", args),
    (supabase as unknown as { from: (t: "business_classes") => { select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: { gym_id: string | null }[] | null; error: PostgrestError | null }> } } })
      .from("business_classes")
      .select("gym_id")
      .eq("id", classId),
  ]);
  for (const e of [seats.error, hours.error, starts.error, pos.error, gym.error]) {
    if (e) console.warn("[marketplace] class detail read failed:", e.message);
  }
  return {
    seatsLeft: seats.error ? null : (seats.data ?? null),
    windowHours: hours.data ?? 12,
    startsAt: starts.data ?? null,
    // The doc says NULL when not waiting; the local function returns 0 (a
    // count over no rows), so anything below 1 means "not waiting".
    waitlistPosition: pos.data && pos.data > 0 ? pos.data : null,
    gymId: gym.data?.[0]?.gym_id ?? null,
  };
}

export interface GymClass {
  classId: string;
  title: string;
  date: string;
  startTime: string;
  /** Formatted; "Free" when there's no price. */
  price: string;
  seatsLeft: number;
}

/**
 * MO1.4.2.1.1 "This week": a venue's classes from today to six days on
 * (business_classes.gym_id, 4c), with class_seats_left() for each — the
 * view's spots don't count live waitlist offers.
 */
export async function fetchGymClassesThisWeek(gymId: string, todayIso: string, endIso: string): Promise<ClassResult<GymClass[]>> {
  type Row = { id: string; title: string; event_date: string; start_time: string; price: number | string | null };
  const q = (supabase as unknown as {
    from: (t: "business_classes") => {
      select: (c: string) => {
        eq: (k: string, v: string) => {
          gte: (k: string, v: string) => {
            lte: (k: string, v: string) => {
              order: (k: string) => { order: (k: string) => PromiseLike<{ data: Row[] | null; error: PostgrestError | null }> };
            };
          };
        };
      };
    };
  }).from("business_classes");
  const { data, error } = await q
    .select("id, title, event_date, start_time, price")
    .eq("gym_id", gymId)
    .gte("event_date", todayIso)
    .lte("event_date", endIso)
    .order("event_date")
    .order("start_time");
  if (error) {
    console.error("[marketplace] Could not read the gym's classes:", error.message);
    return { ok: false, message: "Couldn't load this week's classes." };
  }
  const rows = data ?? [];
  const seats = await Promise.all(rows.map((r) => rpc<number>("class_seats_left", { p_class_id: r.id })));
  return {
    ok: true,
    value: rows.map((r, i) => ({
      classId: r.id,
      title: r.title,
      date: r.event_date,
      startTime: toHHMM(r.start_time),
      price: formatPrice(r.price) || "Free",
      seatsLeft: seats[i].data ?? 0,
    })),
  };
}
