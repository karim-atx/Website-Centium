import { supabase } from "../../../lib/supabase/client";
import { formatPrice } from "../../utils/price";

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
//   to gyms — every gym row is public. That table is empty today, which is a
//   real state the UI has to render honestly rather than a bug.
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

export type BookResult = { ok: true } | { ok: false; message: string };

/**
 * Books a place on a class.
 *
 * A PLAIN INSERT, WHICH IS EASY TO MISREAD AS UNGRANTED. `role_table_grants`
 * shows only SELECT and DELETE for `authenticated` on
 * business_class_bookings — the INSERT is COLUMN-scoped, on
 * (business_class_id, client_id), and column grants do not appear in that
 * view. Checked in `column_privileges`; this project has been caught by that
 * exact blind spot before.
 *
 * client_id IS IN THE PAYLOAD because the policy checks
 * `auth.uid() = client_id` and the column has no default, so omitting it is a
 * NOT NULL violation rather than an implicit self-reference.
 *
 * CAPACITY IS THE SERVER'S TO ENFORCE. business_class_bookings_enforce_capacity
 * takes a row lock on the class and refuses with ATX13 when it is full, so two
 * people taking the last place cannot both win. The client's `is_full` is a
 * label, never the gate — this translates the refusal rather than trying to
 * prevent it.
 */
export async function bookClass(classId: string, userId: string): Promise<BookResult> {
  const { error } = await supabase
    .from("business_class_bookings")
    .insert({ business_class_id: classId, client_id: userId });

  if (!error) return { ok: true };

  console.error("[marketplace] Could not book the class:", error.message);
  switch (error.code ?? "") {
    case "ATX13":
      return { ok: false, message: "That class just filled up." };
    case "23505":
      return { ok: false, message: "You've already booked this class." };
    case "42501":
      return { ok: false, message: "You can't book this class." };
    default:
      if (/jwt|not authenticated/i.test(error.message ?? "")) {
        return { ok: false, message: "Your session expired. Sign in again to book." };
      }
      return { ok: false, message: "Couldn't book that class. Try again." };
  }
}

/**
 * Cancels this account's own booking.
 *
 * Filtered by class alone: the DELETE policy is `auth.uid() = client_id`, so
 * somebody else's booking matches nothing.
 */
export async function cancelBooking(classId: string, userId: string): Promise<BookResult> {
  const { error } = await supabase
    .from("business_class_bookings")
    .delete()
    .eq("business_class_id", classId)
    .eq("client_id", userId);

  if (error) {
    console.error("[marketplace] Could not cancel the booking:", error.message);
    return { ok: false, message: "Couldn't cancel that booking. Try again." };
  }
  return { ok: true };
}
