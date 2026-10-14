import { supabase } from "../../../lib/supabase/client";
import { resolveMyBusinessId } from "../business-profile";
import { formatPrice, parsePrice } from "../../utils/price";
import type { BusinessClassRow } from "./types";
export type { BusinessClassRow } from "./types";

// A business's scheduled classes: the real business_classes rows.
//
// WHAT THIS REPLACES. `businessClasses` was a localStorage array with ids
// minted as `bc` plus a timestamp. Two business screens wrote to it
// (BusinessClassesTab and BusinessCalendarTab) and the affiliated
// professional's own calendar read it — from their own device, where a
// business's array is empty. So the feature's whole point, "a class a business
// schedules shows on the professional's calendar too", worked only if both
// accounts were the same browser profile. It never crossed a device.
//
// THE PROFESSIONAL ID IS A REAL FOREIGN KEY NOW, which is the change that
// makes that work: business_classes.professional_id references profiles(id)
// ON DELETE SET NULL, and the ids come from services/business-team, which
// reads business_employees. The old code compared against the string "me",
// the stand-in the local affiliation system used — no real uuid will ever
// equal it, so every one of those comparisons had to be replaced rather than
// left to quietly match nothing.
//
// WHAT HAS NO HOME HERE, measured rather than assumed: BusinessClass.clientIds.
// The table for it exists — business_class_bookings — but its INSERT policy is
// `auth.uid() = client_id`, and `authenticated` is granted only DELETE and
// SELECT on it, no INSERT at all. A booking is something a client makes; a
// business owner can see and cancel bookings but cannot create one. The
// "add clients to this class" picker in BusinessCalendarTab was therefore
// never going to persist from that side, and is removed rather than left
// writing to nothing.


export interface ClassDraft {
  /**
   * v6 AN3-068 S1: a client-made id, so a Retry after a lost response never
   * makes a second class (a 23505 on the retry means the first one landed).
   */
  id?: string;
  title: string;
  classType: string;
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  professionalId?: string;
  notes?: string;
  price?: string;
  paymentType?: string;
}

/** v6 V6-164: the six fixed class types (ClassFlowsV6 `typeOpts`). */
export const CLASS_TYPES = ["HIIT", "Yoga", "Spin", "Strength", "Pilates", "Mobility"] as const;

/** v6 AN3-036 … 040: capacity is 1 to 200 (the 200 cap is the form's until B9's CHECK). */
export const CAPACITY_MIN = 1;
export const CAPACITY_MAX = 200;

export type ClassField = "name" | "date" | "times" | "capacity" | "price";

/** The ClassFlowsV6 field messages (`er`), one per field. */
export const CLASS_FIELD_MESSAGES = {
  name: "Give the class a name.",
  date: "Pick today or a later date.",
  times: "The class can't end before it starts.",
  capacityLow: "At least 1 spot.",
  capacityHigh: "Maximum is 200 spots per class.",
  price: "Use numbers only, e.g. 15 or 15.50.",
} as const;

/**
 * Every field's problem at once (AN3-049 S1: validate all fields before any
 * network call). `today` (YYYY-MM-DD) refuses a past date; omit it to skip
 * that check (an edit of an existing row keeps its own date).
 */
export function validateClassDraft(draft: ClassDraft, today?: string): Partial<Record<ClassField, string>> {
  const out: Partial<Record<ClassField, string>> = {};
  if (!draft.title.trim()) out.name = CLASS_FIELD_MESSAGES.name;
  if (today && draft.date < today) out.date = CLASS_FIELD_MESSAGES.date;
  // A 0-minute class is not a class (AN3-064 row 6): equal times fail too,
  // although the table's CHECK allows start = end.
  if (draft.endTime <= draft.startTime) out.times = CLASS_FIELD_MESSAGES.times;
  if (!Number.isFinite(draft.maxCapacity) || !Number.isInteger(draft.maxCapacity) || draft.maxCapacity < CAPACITY_MIN) {
    out.capacity = CLASS_FIELD_MESSAGES.capacityLow;
  } else if (draft.maxCapacity > CAPACITY_MAX) {
    out.capacity = CLASS_FIELD_MESSAGES.capacityHigh;
  }
  if (!parsePrice(draft.price ?? "").ok) out.price = CLASS_FIELD_MESSAGES.price;
  return out;
}

export type ClassesResult =
  | { ok: true; businessId: string | null; classes: BusinessClassRow[] }
  | { ok: false; message: string };

const COLUMNS =
  "id, title, class_type, event_date, start_time, end_time, max_capacity, professional_id, notes, price, payment_type, cancellation_hours";

type Row = {
  id: string;
  title: string;
  class_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  professional_id: string | null;
  notes: string | null;
  price: number | string | null;
  payment_type: string | null;
  cancellation_hours?: number | null;
};

/**
 * What goes INTO the columns, which is not what comes out of them: a write
 * sends price as a number, a read receives PostgREST's string. One shared Row
 * type for both directions would let the insert offer the column a string it
 * will not take.
 */
type WriteRow = {
  title: string;
  class_type: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  professional_id: string | null;
  notes: string | null;
  price: number | null;
  payment_type: string | null;
};

// Times arrive as HH:MM:SS from a `time` column; every input and comparison in
// these screens is HH:MM. Trimmed once here, the same way services/calendar
// does it, rather than at each of the call sites.
const toHHMM = (t: string) => t.slice(0, 5);

const toClass = (r: Row): BusinessClassRow => ({
  id: r.id,
  title: r.title,
  classType: r.class_type ?? "",
  date: r.event_date,
  startTime: toHHMM(r.start_time),
  endTime: toHHMM(r.end_time),
  maxCapacity: r.max_capacity,
  professionalId: r.professional_id,
  notes: r.notes,
  price: formatPrice(r.price),
  paymentType: r.payment_type,
  cancellationHours: r.cancellation_hours ?? null,
});

/**
 * The content columns, or a message saying why the draft cannot be written.
 *
 * THREE CHECK CONSTRAINTS LIVE ON THIS TABLE and all three are reachable from
 * the compose sheet: `max_capacity > 0` (the capacity box accepts an empty
 * string, which became 0), `start_time <= end_time` (nothing stopped an owner
 * picking 10:00 to 09:00), and `price >= 0`. Caught here so they read as form
 * errors instead of a 23514 the screen would have to translate.
 */
function toRow(draft: ClassDraft): { ok: true; row: WriteRow } | { ok: false; message: string } {
  const title = draft.title.trim();
  // v6: the ClassFlowsV6 strings; the first problem only here (the class
  // sheet shows every field's own line from validateClassDraft first).
  const problems = validateClassDraft(draft);
  const first = problems.name ?? problems.times ?? problems.capacity ?? problems.price;
  if (first) return { ok: false, message: first };

  const price = parsePrice(draft.price ?? "");
  if (!price.ok) return { ok: false, message: CLASS_FIELD_MESSAGES.price };

  return {
    ok: true,
    row: {
      title,
      class_type: draft.classType.trim() || null,
      event_date: draft.date,
      start_time: draft.startTime,
      end_time: draft.endTime,
      max_capacity: draft.maxCapacity,
      professional_id: draft.professionalId || null,
      notes: draft.notes?.trim() || null,
      price: price.value,
      // Only meaningful alongside a price, and both screens already treat it
      // that way — a payment type on a free class is noise in the column.
      payment_type: price.value === null ? null : draft.paymentType ?? null,
    },
  };
}

/** Every class this account's business has scheduled. */
export async function fetchMyClasses(userId: string): Promise<ClassesResult> {
  const business = await resolveMyBusinessId(userId);
  if (!business.ok) {
    return { ok: false, message: "Couldn't load your classes. Check your connection and try again." };
  }
  if (!business.id) return { ok: true, businessId: null, classes: [] };

  const { data, error } = await supabase
    .from("business_classes")
    .select(COLUMNS)
    .eq("business_id", business.id)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[business-classes] Could not read classes:", error.message);
    return { ok: false, message: "Couldn't load your classes. Check your connection and try again." };
  }
  return { ok: true, businessId: business.id, classes: (data ?? []).map((r) => toClass(r as unknown as Row)) };
}

/**
 * Classes a business has put this professional on.
 *
 * THE OTHER DIRECTION THROUGH THE SAME TABLE, and the reason it works at all
 * is that business_classes_select_public is `USING (true)` — a professional
 * does not own these rows and has no policy granting them anything else. They
 * read their own assignments by filtering on professional_id; they cannot edit
 * or delete them, which is what the calendar already assumed and can now
 * actually rely on.
 *
 * The business's name is embedded so the professional's calendar can say who
 * scheduled it, the way it used to read from the local businessDirectory.
 */
export async function fetchClassesAssignedToMe(
  userId: string
): Promise<{ ok: true; classes: (BusinessClassRow & { businessName: string })[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("business_classes")
    .select(COLUMNS + ", business_profiles!inner(business_name)")
    .eq("professional_id", userId)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[business-classes] Could not read assigned classes:", error.message);
    return { ok: false };
  }

  const rows = (data ?? []) as unknown as (Row & {
    business_profiles: { business_name: string } | null;
  })[];

  return {
    ok: true,
    classes: rows.map((r) => ({
      ...toClass(r),
      businessName: r.business_profiles?.business_name ?? "your affiliated business",
    })),
  };
}

export async function createClass(
  businessId: string,
  draft: ClassDraft
): Promise<{ ok: true; created: BusinessClassRow } | { ok: false; message: string }> {
  const built = toRow(draft);
  if (!built.ok) return built;

  const { data, error } = await supabase
    .from("business_classes")
    .insert({ business_id: businessId, ...(draft.id ? { id: draft.id } : null), ...built.row })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    // A Retry whose first attempt had landed: the id already exists. Read it
    // back and treat it as the success it was (AN3-068 S1).
    if (error?.code === "23505" && draft.id) {
      const again = await supabase.from("business_classes").select(COLUMNS).eq("id", draft.id).maybeSingle();
      if (!again.error && again.data) return { ok: true, created: toClass(again.data as unknown as Row) };
    }
    console.error("[business-classes] Could not create the class:", error?.message);
    return { ok: false, message: CLASS_SAVE_FAILED };
  }
  return { ok: true, created: toClass(data as unknown as Row) };
}

/** AN3-068 row 1 (ClassFlowsV6 `sheet-fail`). */
export const CLASS_SAVE_FAILED = "Couldn't save the class. Check your connection and tap Retry. Everything you entered is kept.";

/**
 * Changes one session (OURS-AN3 A9: the owner's UPDATE policy and grant cover
 * every column written here). A capacity under the booked count is refused
 * by business_classes_guard_capacity_reduction (ATX13); `code: "capacity"`
 * lets the sheet show it as the capacity error.
 */
export async function updateClass(
  classId: string,
  draft: ClassDraft
): Promise<{ ok: true; updated: BusinessClassRow } | { ok: false; message: string; code?: "capacity" | "permission" }> {
  const built = toRow(draft);
  if (!built.ok) return built;
  const { data, error } = await supabase.from("business_classes").update(built.row).eq("id", classId).select(COLUMNS).maybeSingle();
  if (error || !data) {
    console.error("[business-classes] Could not update the class:", error?.message);
    if (error?.code === "ATX13") return { ok: false, message: error.message, code: "capacity" };
    if (!error && !data) return { ok: false, message: "Couldn't save your changes. Only the business owner can change classes right now.", code: "permission" };
    return { ok: false, message: "Couldn't save your changes. Check your connection and tap Retry. Everything you entered is kept." };
  }
  return { ok: true, updated: toClass(data as unknown as Row) };
}

/**
 * Names (or clears) who teaches one session: the Substitute sheet's Assign
 * (OP1-089 to 093). Only professional_id is written; the guard trigger
 * refuses anyone not on this business's team (ATX76).
 */
export async function assignInstructor(
  classId: string,
  professionalId: string | null
): Promise<{ ok: true; updated: BusinessClassRow } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("business_classes")
    .update({ professional_id: professionalId })
    .eq("id", classId)
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) {
    console.error("[business-classes] Could not assign the instructor:", error?.message);
    return { ok: false, message: "Couldn't assign. Check your connection and try again." };
  }
  return { ok: true, updated: toClass(data as unknown as Row) };
}

/** One booking as the owner sees it (business_class_bookings_select_business_owner). */
export interface ClassBookingLite {
  classId: string;
  createdAt: string;
}

/**
 * The bookings on these classes: the counts every Schedule row, figure and
 * fill bar uses (class_booked_count() per row would be one call per session).
 */
export async function fetchClassBookings(classIds: string[]): Promise<{ ok: true; bookings: ClassBookingLite[] } | { ok: false }> {
  if (classIds.length === 0) return { ok: true, bookings: [] };
  const out: ClassBookingLite[] = [];
  // In chunks, so a long schedule never builds one enormous URL.
  for (let i = 0; i < classIds.length; i += 150) {
    const { data, error } = await supabase
      .from("business_class_bookings")
      .select("business_class_id, created_at")
      .in("business_class_id", classIds.slice(i, i + 150));
    if (error) {
      console.error("[business-classes] Could not read bookings:", error.message);
      return { ok: false };
    }
    for (const r of data ?? []) out.push({ classId: r.business_class_id as string, createdAt: r.created_at as string });
  }
  return { ok: true, bookings: out };
}

/** Someone who can be named on a class: an accepted member of this business's team. */
export interface Instructor {
  professionalId: string;
  firstName: string;
}

/**
 * The people a class can be run by. B0 consent: only an accepted employment
 * (accepted_at set) counts; an invited professional is not on the team yet
 * and the guard trigger would refuse them. First names from
 * public_profile_summary, as services/business-team reads them.
 */
export async function fetchInstructors(businessId: string): Promise<{ ok: true; instructors: Instructor[] } | { ok: false }> {
  const db = supabase as unknown as {
    from: (t: "business_employees") => {
      select: (c: string) => {
        eq: (k: string, v: string) => {
          not: (k: string, op: string, v: null) => PromiseLike<{ data: { professional_id: string }[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
  const rows = await db.from("business_employees").select("professional_id").eq("business_id", businessId).not("accepted_at", "is", null);
  if (rows.error) {
    console.error("[business-classes] Could not read the team:", rows.error.message);
    return { ok: false };
  }
  const ids = (rows.data ?? []).map((r) => r.professional_id).filter(Boolean);
  if (ids.length === 0) return { ok: true, instructors: [] };
  const names = await supabase.from("public_profile_summary").select("id, first_name").in("id", ids);
  if (names.error) {
    console.error("[business-classes] Could not read team names:", names.error.message);
    return { ok: false };
  }
  const byId = new Map((names.data ?? []).map((p) => [p.id as string, ((p.first_name as string | null) ?? "").trim()]));
  return {
    ok: true,
    instructors: ids
      .map((id) => ({ professionalId: id, firstName: byId.get(id) || "Unnamed" }))
      .sort((a, b) => a.firstName.localeCompare(b.firstName)),
  };
}

/** B6 instructor_availability (ISO weekday 1 = Monday) and instructor_unavailable_dates. */
export interface AvailabilityData {
  windows: { professionalId: string; weekday: number; startsAt: string; endsAt: string }[];
  offDates: { professionalId: string; date: string }[];
}

/**
 * Who said they can teach when (B6, readable by the owner through
 * business_can(schedule)). Used to grey out busy instructors in the
 * substitute picker until instructors_free_for() (B9) answers it server-side.
 */
export async function fetchInstructorAvailability(businessId: string): Promise<{ ok: true; value: AvailabilityData } | { ok: false }> {
  type Q<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
  const db = supabase as unknown as {
    from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => Q<Record<string, unknown>> } };
  };
  const [w, d] = await Promise.all([
    db.from("instructor_availability").select("professional_id, weekday, starts_at, ends_at").eq("business_id", businessId),
    db.from("instructor_unavailable_dates").select("professional_id, on_date").eq("business_id", businessId),
  ]);
  if (w.error || d.error) {
    console.error("[business-classes] Could not read availability:", w.error?.message ?? d.error?.message);
    return { ok: false };
  }
  return {
    ok: true,
    value: {
      windows: (w.data ?? []).map((r) => ({
        professionalId: String(r.professional_id),
        weekday: Number(r.weekday),
        startsAt: String(r.starts_at).slice(0, 5),
        endsAt: String(r.ends_at).slice(0, 5),
      })),
      offDates: (d.data ?? []).map((r) => ({ professionalId: String(r.professional_id), date: String(r.on_date) })),
    },
  };
}

/**
 * The venues' default late-cancel window (gyms.default_cancellation_hours),
 * which every class without its own value uses (class_cancellation_hours():
 * class, else venue, else 12). Read for the Class rules page.
 */
export async function fetchVenueCancellationDefault(businessId: string): Promise<number | null> {
  const db = supabase as unknown as {
    from: (t: "gyms") => {
      select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: { default_cancellation_hours: number | null }[] | null; error: { message: string } | null }> };
    };
  };
  const { data, error } = await db.from("gyms").select("default_cancellation_hours").eq("business_id", businessId);
  if (error) return null;
  const v = (data ?? []).map((r) => r.default_cancellation_hours).find((h) => h !== null && h !== undefined);
  return v ?? null;
}

export async function deleteClass(classId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from("business_classes").delete().eq("id", classId);
  if (error) {
    console.error("[business-classes] Could not delete the class:", error.message);
    return { ok: false, message: "Couldn't delete the class. Try again." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The client's side of a class: what they have actually booked.
// ---------------------------------------------------------------------------

/** A class this account holds a booking for. */
export interface BookedClass extends BusinessClassRow {
  /** business_class_bookings.id — the booking, not the class. */
  bookingId: string;
  bookedAt: string;
  businessId: string;
  businessName: string;
  /**
   * business_profiles.active — whether the business is still listed on
   * Explore.
   *
   * SURFACED RATHER THAN FILTERED. A business that switches its listing off
   * does not cancel the classes people already booked, so the row stays on
   * the client's calendar; what changes is that they can no longer find that
   * business anywhere else in the app. Hiding the flag would leave them
   * looking at a session they cannot look up.
   */
  businessActive: boolean;
}

type ScheduleRow = Row & {
  booking_id: string;
  booked_at: string;
  class_id: string;
  business_id: string;
  business_name: string;
  business_active: boolean;
};

/**
 * Every class this account has booked.
 *
 * READ FROM my_class_schedule, NOT FROM THE TABLES. The view is
 * `security_invoker = false` and owned by postgres, and its WHERE clause is
 * `bk.client_id = auth.uid()` — so it is self-scoping by construction and
 * needs no filter from this side. That matters beyond convenience:
 * business_class_bookings grants `authenticated` only SELECT and DELETE, and
 * joining business_profiles from the client's own role would be a second
 * round trip through policies written for other readers. The view does the
 * join once, as the definer, and hands back exactly the columns a client is
 * meant to see.
 *
 * NO WRITE PATH HERE, deliberately. A booking's INSERT policy is
 * `auth.uid() = client_id` and `authenticated` holds no INSERT grant on the
 * table at all, so nothing in the app can create one yet; cancelling — the
 * DELETE the client does hold — is its own action on its own surface, not
 * something a calendar overlay should offer.
 *
 * STAGE 4c: A BOOKING MADE BY book_class() IS ALREADY ON THE CALENDAR, as a
 * real calendar_events row (with a 15-minute alert) that the booking points
 * at through calendar_event_id. Those are left out here, or the class would
 * show twice; only older bookings without one are overlaid.
 */
export interface LinkedBooking {
  calendarEventId: string;
  bookingId: string;
  /** The booked class, for the Calendar's "View booking" (its class page). */
  classId: string;
  businessName: string;
  businessActive: boolean;
}

export async function fetchMyBookedClasses(): Promise<
  { ok: true; classes: BookedClass[]; linked: LinkedBooking[] } | { ok: false }
> {
  // my_class_schedule is absent from database.types.ts — the view is newer
  // than the last regeneration, as professional_reviews and ambassador_grants
  // were. The query is real; only the typing is missing, so the client is cast
  // rather than the generated file hand-edited.
  const client = supabase as unknown as {
    from: (view: "my_class_schedule") => {
      select: (columns: string) => PromiseLike<{
        data: ScheduleRow[] | null;
        error: { message: string } | null;
      }>;
    };
  };

  const { data, error } = await client
    .from("my_class_schedule")
    .select(
      "booking_id, booked_at, class_id, title, class_type, event_date, start_time, end_time, notes, price, payment_type, max_capacity, professional_id, business_id, business_name, business_active"
    );

  if (error) {
    console.error("[business-classes] Could not read booked classes:", error.message);
    return { ok: false };
  }

  // calendar_event_id (4c) is newer than the generated types.
  const linked = await (supabase as unknown as {
    from: (t: "business_class_bookings") => {
      select: (c: string) => PromiseLike<{ data: { id: string; calendar_event_id: string | null }[] | null; error: { message: string } | null }>;
    };
  })
    .from("business_class_bookings")
    .select("id, calendar_event_id");
  if (linked.error) {
    console.error("[business-classes] Could not read booking calendar links:", linked.error.message);
    return { ok: false };
  }
  const onCalendar = new Set((linked.data ?? []).filter((b) => b.calendar_event_id).map((b) => b.id));
  const eventOf = new Map((linked.data ?? []).filter((b) => b.calendar_event_id).map((b) => [b.id, b.calendar_event_id!]));

  return {
    ok: true,
    // v6 MO1.6 B3 (PB-O-62, front end): the calendar rows book_class() made.
    // The Calendar shows them read-only with the Booked badge, since a
    // booking is changed or cancelled through the booking, not the event.
    linked: (data ?? [])
      .filter((r) => eventOf.has(r.booking_id))
      .map((r) => ({
        calendarEventId: eventOf.get(r.booking_id)!,
        bookingId: r.booking_id,
        classId: r.class_id,
        businessName: r.business_name,
        businessActive: r.business_active,
      })),
    classes: (data ?? []).filter((r) => !onCalendar.has(r.booking_id)).map((r) => ({
      // toClass wants the class's own id; the view exposes it as class_id
      // because booking_id is the row's identity here.
      ...toClass({ ...r, id: r.class_id }),
      bookingId: r.booking_id,
      bookedAt: r.booked_at,
      businessId: r.business_id,
      businessName: r.business_name,
      businessActive: r.business_active,
    })),
  };
}
